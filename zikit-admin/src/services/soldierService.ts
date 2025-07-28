import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Soldier } from '../models/Soldier';

const soldiersCollection = collection(db, 'soldiers');

export const getAllSoldiers = async (): Promise<Soldier[]> => {
  const snapshot = await getDocs(soldiersCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Soldier));
};

export const getSoldierById = async (id: string): Promise<Soldier | null> => {
  const soldierDoc = await getDoc(doc(soldiersCollection, id));
  return soldierDoc.exists() ? ({ id: soldierDoc.id, ...soldierDoc.data() } as Soldier) : null;
};

export const addSoldier = async (soldier: Omit<Soldier, 'id'>): Promise<string> => {
  const docRef = await addDoc(soldiersCollection, soldier);
  return docRef.id;
};

export const updateSoldier = async (id: string, soldier: Partial<Soldier>) => {
  await updateDoc(doc(soldiersCollection, id), soldier);
};

export const deleteSoldier = async (id: string) => {
  await deleteDoc(doc(soldiersCollection, id));
}; 