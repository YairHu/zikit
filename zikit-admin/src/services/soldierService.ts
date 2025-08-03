import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Soldier } from '../models/Soldier';
import { mockGetAllSoldiers, mockGetSoldierById, mockAddSoldier, mockUpdateSoldier, mockDeleteSoldier } from './mockDatabase';

const soldiersCollection = collection(db, 'soldiers');

// Use mock database for development
const USE_MOCK = true;

export const getAllSoldiers = async (): Promise<Soldier[]> => {
  if (USE_MOCK) {
    return mockGetAllSoldiers();
  }
  
  const snapshot = await getDocs(soldiersCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Soldier));
};

export const getSoldierById = async (id: string): Promise<Soldier | null> => {
  if (USE_MOCK) {
    return mockGetSoldierById(id);
  }
  
  const soldierDoc = await getDoc(doc(soldiersCollection, id));
  return soldierDoc.exists() ? ({ id: soldierDoc.id, ...soldierDoc.data() } as Soldier) : null;
};

export const addSoldier = async (soldier: Omit<Soldier, 'id'>): Promise<string> => {
  if (USE_MOCK) {
    return mockAddSoldier(soldier);
  }
  
  const docRef = await addDoc(soldiersCollection, soldier);
  return docRef.id;
};

export const updateSoldier = async (id: string, soldier: Partial<Soldier>) => {
  if (USE_MOCK) {
    return mockUpdateSoldier(id, soldier);
  }
  
  await updateDoc(doc(soldiersCollection, id), soldier);
};

export const deleteSoldier = async (id: string) => {
  if (USE_MOCK) {
    return mockDeleteSoldier(id);
  }
  
  await deleteDoc(doc(soldiersCollection, id));
};

export const getSoldiersByFramework = async (frameworkId: string): Promise<Soldier[]> => {
  const allSoldiers = await getAllSoldiers();
  return allSoldiers.filter(soldier => soldier.frameworkId === frameworkId);
};

export const updateSoldierFramework = async (soldierId: string, frameworkId: string | undefined) => {
  await updateSoldier(soldierId, { frameworkId });
}; 