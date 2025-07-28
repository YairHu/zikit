import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Duty } from '../models/Duty';

const dutiesCollection = collection(db, 'duties');

export const getAllDuties = async (): Promise<Duty[]> => {
  const snapshot = await getDocs(dutiesCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Duty));
};

export const getDutyById = async (id: string): Promise<Duty | null> => {
  const dutyDoc = await getDoc(doc(dutiesCollection, id));
  return dutyDoc.exists() ? ({ id: dutyDoc.id, ...dutyDoc.data() } as Duty) : null;
};

export const addDuty = async (duty: Omit<Duty, 'id'>): Promise<string> => {
  const docRef = await addDoc(dutiesCollection, duty);
  return docRef.id;
};

export const updateDuty = async (id: string, duty: Partial<Duty>) => {
  await updateDoc(doc(dutiesCollection, id), duty);
};

export const deleteDuty = async (id: string) => {
  await deleteDoc(doc(dutiesCollection, id));
}; 