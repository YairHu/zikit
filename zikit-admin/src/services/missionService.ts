import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Mission } from '../models/Mission';

const missionsCollection = collection(db, 'missions');

export const getAllMissions = async (): Promise<Mission[]> => {
  const snapshot = await getDocs(missionsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
};

export const getMissionById = async (id: string): Promise<Mission | null> => {
  const missionDoc = await getDoc(doc(missionsCollection, id));
  return missionDoc.exists() ? ({ id: missionDoc.id, ...missionDoc.data() } as Mission) : null;
};

export const addMission = async (mission: Omit<Mission, 'id'>): Promise<string> => {
  const docRef = await addDoc(missionsCollection, mission);
  return docRef.id;
};

export const updateMission = async (id: string, mission: Partial<Mission>) => {
  await updateDoc(doc(missionsCollection, id), mission);
};

export const deleteMission = async (id: string) => {
  await deleteDoc(doc(missionsCollection, id));
}; 