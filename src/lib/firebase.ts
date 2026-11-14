import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { IMAGE_BY_KEY, VACANT_SPACES } from '../data/spaces';
import {
  DiagnosisReport,
  ProposalDocument,
  SpaceImageKey,
  VacantSpace,
} from '../types/space';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function ensureUserProfile(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const displayName = (user.displayName || '강원이어라 사용자').slice(0, 80);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

function makeDocId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function seedStarterSpacesIfMissing(currentUserUid: string): Promise<void> {
  for (const space of VACANT_SPACES) {
    const ref = doc(db, 'spaces', space.id);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: space.id,
          ownerUid: currentUserUid,
          name: space.name,
          shortLabel: space.shortLabel,
          district: space.district,
          districtName: space.districtName,
          address: space.address,
          floor: space.floor,
          pyeong: space.pyeong,
          sqm: space.sqm,
          dailyPrice: space.dailyPrice,
          purposes: space.purposes,
          facilities: space.facilities,
          highlight: space.highlight,
          landlordNote: space.landlordNote,
          footTraffic: space.footTraffic,
          imageKey: space.imageKey,
          lat: space.coords.lat,
          lng: space.coords.lng,
          isSeeded: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `spaces/${space.id}`);
    }
  }
}

export interface RegisterSpacePayload {
  name: string;
  district: 'chuncheon' | 'wonju';
  districtName: string;
  address: string;
  floor: string;
  pyeong: number;
  dailyPrice: number;
  purposes: Array<'생일카페' | '팝업스토어' | '전시' | '공방'>;
  facilities: string[];
  highlight: string;
  landlordNote: string;
  footTraffic: string;
  imageKey: SpaceImageKey;
  lat: number;
  lng: number;
}

export async function registerSpaceInDb(
  payload: RegisterSpacePayload,
  ownerUid: string
): Promise<VacantSpace> {
  const spaceId = makeDocId('space');
  const shortLabel = `${payload.districtName.split(' ')[1] || payload.districtName} ${payload.floor}`.slice(0, 40);
  const sqm = Number((payload.pyeong * 3.3058).toFixed(1));
  const dailyPrice = Math.max(10000, Math.round(payload.dailyPrice));

  const docData = {
    id: spaceId,
    ownerUid,
    name: payload.name.slice(0, 100),
    shortLabel,
    district: payload.district,
    districtName: payload.districtName.slice(0, 40),
    address: payload.address.slice(0, 200),
    floor: payload.floor.slice(0, 20),
    pyeong: payload.pyeong,
    sqm,
    dailyPrice,
    purposes: payload.purposes.slice(0, 6),
    facilities: payload.facilities.slice(0, 10),
    highlight: payload.highlight.slice(0, 200),
    landlordNote: payload.landlordNote.slice(0, 400),
    footTraffic: payload.footTraffic.slice(0, 200),
    imageKey: payload.imageKey,
    lat: payload.lat,
    lng: payload.lng,
    isSeeded: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'spaces', spaceId), docData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `spaces/${spaceId}`);
  }

  return {
    ...docData,
    imageUrl: IMAGE_BY_KEY[payload.imageKey],
    coords: { lat: payload.lat, lng: payload.lng },
  };
}

export async function deleteSpaceInDb(spaceId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'spaces', spaceId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `spaces/${spaceId}`);
  }
}

export async function saveDiagnosisInDb(
  input: { location: string; floor: string; pyeong: number; features: string },
  report: DiagnosisReport,
  ownerUid: string
): Promise<string> {
  const diagnosisId = makeDocId('diag');
  try {
    await setDoc(doc(db, 'diagnoses', diagnosisId), {
      id: diagnosisId,
      ownerUid,
      location: input.location.slice(0, 200),
      floor: input.floor.slice(0, 20),
      pyeong: input.pyeong,
      features: input.features.slice(0, 400),
      summaryTitle: report.summaryTitle.slice(0, 200),
      headline: report.districtInsight.headline.slice(0, 200),
      recommendedDailyRate: Math.max(10000, Math.round(report.pricingSimulation.recommendedDailyRate)),
      monthlyPotentialRevenue: Math.max(0, Math.round(report.pricingSimulation.monthlyPotentialRevenue)),
      createdAt: serverTimestamp(),
    });
    return diagnosisId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `diagnoses/${diagnosisId}`);
  }
}

export async function deleteDiagnosisInDb(diagnosisId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'diagnoses', diagnosisId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `diagnoses/${diagnosisId}`);
  }
}

export async function submitProposalInDb(
  input: {
    period: string;
    budget: string;
    intent: string;
    applicantName: string;
    proposalText: string;
  },
  proposal: ProposalDocument,
  space: VacantSpace,
  applicantUid: string
): Promise<string> {
  // Ensure target space exists in Firestore (seeds starter space if not yet saved)
  const spaceRef = doc(db, 'spaces', space.id);
  let spaceOwnerUid = space.ownerUid;

  try {
    const existingSpace = await getDoc(spaceRef);
    if (!existingSpace.exists()) {
      spaceOwnerUid = applicantUid;
      await setDoc(spaceRef, {
        id: space.id,
        ownerUid: spaceOwnerUid,
        name: space.name.slice(0, 100),
        shortLabel: space.shortLabel.slice(0, 40),
        district: space.district,
        districtName: space.districtName.slice(0, 40),
        address: space.address.slice(0, 200),
        floor: space.floor.slice(0, 20),
        pyeong: space.pyeong,
        sqm: space.sqm,
        dailyPrice: Math.max(10000, Math.round(space.dailyPrice)),
        purposes: space.purposes.slice(0, 6),
        facilities: space.facilities.slice(0, 10),
        highlight: space.highlight.slice(0, 200),
        landlordNote: space.landlordNote.slice(0, 400),
        footTraffic: space.footTraffic.slice(0, 200),
        imageKey: space.imageKey,
        lat: space.coords.lat,
        lng: space.coords.lng,
        isSeeded: space.isSeeded,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const data = existingSpace.data();
      if (typeof data?.ownerUid === 'string') {
        spaceOwnerUid = data.ownerUid;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `spaces/${space.id}`);
  }

  const proposalId = makeDocId('prop');
  const rawBody = (input.proposalText || proposal.documentTitle || '').trim();
  const safeProposalText =
    rawBody.length >= 10
      ? rawBody.slice(0, 5000)
      : `${proposal.documentTitle}\n${input.intent}`.slice(0, 5000).padEnd(10, ' ');

  try {
    await setDoc(doc(db, 'proposals', proposalId), {
      id: proposalId,
      spaceId: space.id,
      spaceName: space.name.slice(0, 120),
      spaceOwnerUid,
      applicantUid,
      applicantName: input.applicantName.slice(0, 80),
      period: input.period.slice(0, 100),
      budget: input.budget.slice(0, 120),
      intent: input.intent.slice(0, 500),
      documentTitle: proposal.documentTitle.slice(0, 160),
      proposalText: safeProposalText,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return proposalId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `proposals/${proposalId}`);
  }
}

export async function updateProposalStatusInDb(
  proposalId: string,
  status: 'accepted' | 'declined'
): Promise<void> {
  try {
    await updateDoc(doc(db, 'proposals', proposalId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `proposals/${proposalId}`);
  }
}

export function mapFirestoreSpace(data: Record<string, unknown>): VacantSpace {
  const imageKey = (
    ['glass', 'vintage', 'concrete', 'workshop'].includes(String(data.imageKey))
      ? String(data.imageKey)
      : 'glass'
  ) as SpaceImageKey;

  return {
    id: String(data.id),
    ownerUid: String(data.ownerUid || 'seed_landlord'),
    name: String(data.name || ''),
    shortLabel: String(data.shortLabel || ''),
    district: data.district === 'wonju' ? 'wonju' : 'chuncheon',
    districtName: String(data.districtName || '춘천 명동'),
    address: String(data.address || ''),
    floor: String(data.floor || '1층'),
    pyeong: Number(data.pyeong || 20),
    sqm: Number(data.sqm || 66),
    dailyPrice: Number(data.dailyPrice || 70000),
    purposes: Array.isArray(data.purposes)
      ? (data.purposes as VacantSpace['purposes'])
      : ['팝업스토어'],
    facilities: Array.isArray(data.facilities)
      ? (data.facilities as string[])
      : ['냉난방기 완비'],
    highlight: String(data.highlight || ''),
    landlordNote: String(data.landlordNote || ''),
    footTraffic: String(data.footTraffic || ''),
    imageKey,
    imageUrl: IMAGE_BY_KEY[imageKey],
    coords: {
      lat: Number(data.lat || 37.8798),
      lng: Number(data.lng || 127.7276),
    },
    isSeeded: Boolean(data.isSeeded),
  };
}

export function getFirebaseCollectionRef(name: 'spaces' | 'diagnoses' | 'proposals') {
  return collection(db, name);
}
