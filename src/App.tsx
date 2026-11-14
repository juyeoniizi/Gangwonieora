import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { onSnapshot, query, where } from 'firebase/firestore';
import { AlertTriangle, Check, Copy, X } from 'lucide-react';
import { MobileTopBar } from './components/MobileTopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ExploreTab } from './components/ExploreTab';
import { LandlordDiagnoseTab } from './components/LandlordDiagnoseTab';
import { YouthProposalTab } from './components/YouthProposalTab';
import { ActivityTab } from './components/ActivityTab';
import { VACANT_SPACES } from './data/spaces';
import {
  auth,
  checkAuthRedirectResult,
  deleteDiagnosisInDb,
  deleteSpaceInDb,
  ensureUserProfile,
  getFirebaseCollectionRef,
  handleFirestoreError,
  mapFirestoreSpace,
  OperationType,
  seedStarterSpacesIfMissing,
  signInWithGoogle,
  signOutUser,
  updateProposalStatusInDb,
} from './lib/firebase';
import { DiagnosisRecord, ProposalRecord, TabId, VacantSpace } from './types/space';

interface AuthErrorModalState {
  code: string;
  title: string;
  message: string;
  hostname?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('explore');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorModalState | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);

  const [dbSpaces, setDbSpaces] = useState<VacantSpace[]>([]);
  const [sentProposals, setSentProposals] = useState<ProposalRecord[]>([]);
  const [receivedProposals, setReceivedProposals] = useState<ProposalRecord[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([]);

  const [selectedSpaceForProposal, setSelectedSpaceForProposal] = useState<VacantSpace | null>(null);
  const [focusedSpaceId, setFocusedSpaceId] = useState<string | null>(null);

  const reportAuthError = (err: unknown) => {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : 'auth/unknown';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return;
    }

    if (code === 'auth/unauthorized-domain') {
      setAuthError({
        code,
        hostname,
        title: 'Firebase 승인된 도메인 등록 필요',
        message: `현재 접속 주소(${hostname})가 Firebase Authentication의 승인된 도메인에 등록되지 않아 Google 로그인이 차단되었습니다. Firebase Console → Authentication → 설정 → 승인된 도메인에 아래 주소를 추가하면 즉시 로그인됩니다.`,
      });
      return;
    }

    if (code === 'auth/popup-blocked') {
      setAuthError({
        code,
        title: '로그인 팝업이 차단되었습니다',
        message: '브라우저 팝업 차단을 허용하거나 일반 브라우저에서 다시 시도해 주세요.',
      });
      return;
    }

    setAuthError({
      code,
      title: 'Google 로그인 실패',
      message:
        err instanceof Error
          ? `로그인 처리 중 오류가 발생했습니다 (${code}): ${err.message}`
          : `로그인 처리 중 오류가 발생했습니다 (${code}).`,
    });
  };

  // 1. Track Firebase Auth state, redirect result, and seed starter spaces
  useEffect(() => {
    checkAuthRedirectResult().catch(reportAuthError);

    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (nextUser) {
        try {
          await ensureUserProfile(nextUser);
          await seedStarterSpacesIfMissing(nextUser.uid);
        } catch (err) {
          console.warn('Initial user sync skipped:', err);
        }
      } else {
        setSentProposals([]);
        setReceivedProposals([]);
        setDiagnoses([]);
      }
    });
    return () => unsub();
  }, []);

  // 2. Listen to public /spaces collection in real time
  useEffect(() => {
    const path = 'spaces';
    const unsub = onSnapshot(
      getFirebaseCollectionRef('spaces'),
      (snapshot) => {
        const list = snapshot.docs.map((d) =>
          mapFirestoreSpace(d.data() as Record<string, unknown>)
        );
        setDbSpaces(list);
      },
      (error) => {
        console.warn('Firestore spaces listener fallback:', error);
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch {
          // Keep starter spaces visible even if Firestore is temporarily unreachable
        }
      }
    );
    return () => unsub();
  }, []);

  // 3. Listen to authenticated user's proposals & diagnoses
  useEffect(() => {
    if (!authReady || !user) return;

    const unsubSent = onSnapshot(
      query(getFirebaseCollectionRef('proposals'), where('applicantUid', '==', user.uid)),
      (snap) => {
        setSentProposals(snap.docs.map((d) => d.data() as ProposalRecord));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'proposals');
      }
    );

    const unsubReceived = onSnapshot(
      query(getFirebaseCollectionRef('proposals'), where('spaceOwnerUid', '==', user.uid)),
      (snap) => {
        setReceivedProposals(snap.docs.map((d) => d.data() as ProposalRecord));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'proposals');
      }
    );

    const unsubDiag = onSnapshot(
      query(getFirebaseCollectionRef('diagnoses'), where('ownerUid', '==', user.uid)),
      (snap) => {
        setDiagnoses(snap.docs.map((d) => d.data() as DiagnosisRecord));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'diagnoses');
      }
    );

    return () => {
      unsubSent();
      unsubReceived();
      unsubDiag();
    };
  }, [authReady, user]);

  // Merge Firestore spaces with starter spaces if Firestore isn't seeded yet
  const mergedSpaces = useMemo(() => {
    if (dbSpaces.length === 0) return VACANT_SPACES;
    const dbIds = new Set(dbSpaces.map((s) => s.id));
    const missingStarters = VACANT_SPACES.filter((s) => !dbIds.has(s.id));
    // Newly registered non-seeded spaces appear first!
    const customSpaces = dbSpaces.filter((s) => !s.isSeeded);
    const seededDb = dbSpaces.filter((s) => s.isSeeded);
    return [...customSpaces, ...seededDb, ...missingStarters];
  }, [dbSpaces]);

  const mySpaces = useMemo(() => {
    if (!user) return [];
    return dbSpaces.filter((s) => s.ownerUid === user.uid && !s.isSeeded);
  }, [dbSpaces, user]);

  const handleSignIn = async (): Promise<User | null> => {
    setAuthError(null);
    try {
      const signedIn = await signInWithGoogle();
      return signedIn;
    } catch (err) {
      console.warn('Google sign-in failed:', err);
      reportAuthError(err);
      return null;
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  const handleCopyHostname = async () => {
    if (!authError?.hostname) return;
    try {
      await navigator.clipboard.writeText(authError.hostname);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = authError.hostname;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedHost(true);
    setTimeout(() => setCopiedHost(false), 2000);
  };

  const handleStartProposalFromMap = (space: VacantSpace) => {
    setSelectedSpaceForProposal(space);
    setActiveTab('proposal');
  };

  const handleSpaceRegisteredFromDiagnose = (space: VacantSpace) => {
    setFocusedSpaceId(space.id);
    setActiveTab('explore');
  };

  const handleViewSpaceFromActivity = (space: VacantSpace) => {
    setFocusedSpaceId(space.id);
    setActiveTab('explore');
  };

  const pendingReceivedCount = receivedProposals.filter((p) => p.status === 'pending').length;

  return (
    <div className="min-h-[100dvh] w-full bg-slate-100 md:py-3 md:px-4 flex items-center justify-center">
      <div className="w-full h-[100dvh] md:w-[430px] md:h-[min(880px,calc(100dvh-24px))] bg-white md:rounded-[28px] md:border md:border-slate-200 md:shadow-xl overflow-hidden relative flex flex-col">
        <MobileTopBar
          activeTab={activeTab}
          user={user}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />

        <main className="flex-1 min-h-0 relative overflow-hidden">
          {activeTab === 'explore' && (
            <ExploreTab
              spaces={mergedSpaces}
              focusedSpaceId={focusedSpaceId}
              onStartProposal={handleStartProposalFromMap}
            />
          )}
          {activeTab === 'diagnose' && (
            <LandlordDiagnoseTab
              user={user}
              onRequireSignIn={handleSignIn}
              onSpaceRegistered={handleSpaceRegisteredFromDiagnose}
            />
          )}
          {activeTab === 'proposal' && (
            <YouthProposalTab
              spaces={mergedSpaces}
              preselectedSpace={selectedSpaceForProposal}
              user={user}
              onRequireSignIn={handleSignIn}
              onOpenActivity={() => setActiveTab('activity')}
            />
          )}
          {activeTab === 'activity' && (
            <ActivityTab
              user={user}
              onSignIn={handleSignIn}
              sentProposals={sentProposals}
              receivedProposals={receivedProposals}
              diagnoses={diagnoses}
              mySpaces={mySpaces}
              onUpdateProposalStatus={updateProposalStatusInDb}
              onDeleteSpace={deleteSpaceInDb}
              onDeleteDiagnosis={deleteDiagnosisInDb}
              onViewSpaceOnMap={handleViewSpaceFromActivity}
            />
          )}
        </main>

        <MobileBottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          activityCount={pendingReceivedCount}
        />

        {authError && (
          <div
            className="fixed md:absolute inset-0 z-[700] bg-slate-900/60 backdrop-blur-xs flex items-end md:items-center justify-center p-3"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-error-title"
          >
            <div className="bg-white border border-slate-200 rounded-3xl w-full p-5 shadow-2xl space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setAuthError(null)}
                  aria-label="닫기"
                  className="p-1.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h3 id="auth-error-title" className="text-sm font-bold text-slate-900">
                  {authError.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {authError.message}
                </p>
              </div>

              {authError.hostname && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <code className="text-xs font-mono text-[#0F3D6E] truncate">
                    {authError.hostname}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyHostname}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 inline-flex items-center gap-1 shrink-0"
                  >
                    {copiedHost ? (
                      <>
                        <Check className="w-3 h-3 text-[#0D9488]" />
                        <span>복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>도메인 복사</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setAuthError(null)}
                className="w-full h-11 rounded-xl bg-[#0F3D6E] text-white text-xs font-bold"
              >
                확인
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
