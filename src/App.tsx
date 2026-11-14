import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { onSnapshot, query, where } from 'firebase/firestore';
import { MobileTopBar } from './components/MobileTopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ExploreTab } from './components/ExploreTab';
import { LandlordDiagnoseTab } from './components/LandlordDiagnoseTab';
import { YouthProposalTab } from './components/YouthProposalTab';
import { ActivityTab } from './components/ActivityTab';
import { VACANT_SPACES } from './data/spaces';
import {
  auth,
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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('explore');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [dbSpaces, setDbSpaces] = useState<VacantSpace[]>([]);
  const [sentProposals, setSentProposals] = useState<ProposalRecord[]>([]);
  const [receivedProposals, setReceivedProposals] = useState<ProposalRecord[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([]);

  const [selectedSpaceForProposal, setSelectedSpaceForProposal] = useState<VacantSpace | null>(null);
  const [focusedSpaceId, setFocusedSpaceId] = useState<string | null>(null);

  // 1. Track Firebase Auth state and seed starter spaces on first verified login
  useEffect(() => {
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
        handleFirestoreError(error, OperationType.GET, path);
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
    try {
      const signedIn = await signInWithGoogle();
      return signedIn;
    } catch (err) {
      console.warn('Google sign-in cancelled or failed:', err);
      return null;
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
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
      </div>
    </div>
  );
}
