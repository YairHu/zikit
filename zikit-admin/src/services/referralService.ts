import { Referral } from '../models/Referral';
import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

const referralsCollection = collection(db, 'referrals');

export const getAllReferrals = async (): Promise<Referral[]> => {
  const snapshot = await getDocs(referralsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
};

export const getReferralById = async (id: string): Promise<Referral | null> => {
  const referralDoc = await getDoc(doc(referralsCollection, id));
  return referralDoc.exists() ? ({ id: referralDoc.id, ...referralDoc.data() } as Referral) : null;
};

export const getReferralsBySoldier = async (soldierId: string): Promise<Referral[]> => {
  const q = query(referralsCollection, where('soldierId', '==', soldierId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
};

export const getReferralsByTeam = async (team: string): Promise<Referral[]> => {
  const q = query(referralsCollection, where('team', '==', team));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
};

export const addReferral = async (referral: Omit<Referral, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const docRef = await addDoc(referralsCollection, {
    ...referral,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return docRef.id;
};

export const updateReferral = async (id: string, updates: Partial<Referral>): Promise<void> => {
  await updateDoc(doc(referralsCollection, id), {
    ...updates,
    updatedAt: new Date().toISOString()
  });
};

export const deleteReferral = async (id: string): Promise<void> => {
  await deleteDoc(doc(referralsCollection, id));
}; 