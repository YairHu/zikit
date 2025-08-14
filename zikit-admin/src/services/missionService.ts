import { Mission } from '../models/Mission';
import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

const missionsCollection = collection(db, 'missions');

export const getAllMissions = async (): Promise<Mission[]> => {
  const snapshot = await getDocs(missionsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
};

export const getMissionById = async (id: string): Promise<Mission | null> => {
  const missionDoc = await getDoc(doc(missionsCollection, id));
  return missionDoc.exists() ? ({ id: missionDoc.id, ...missionDoc.data() } as Mission) : null;
};

export const addMission = async (mission: Omit<Mission, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const docRef = await addDoc(missionsCollection, {
    ...mission,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return docRef.id;
};

export const updateMission = async (id: string, updates: Partial<Mission>): Promise<void> => {
  await updateDoc(doc(missionsCollection, id), {
    ...updates,
    updatedAt: new Date().toISOString()
  });
};

export const deleteMission = async (id: string): Promise<void> => {
  await deleteDoc(doc(missionsCollection, id));
};

export const getMissionsBySoldier = async (soldierId: string): Promise<Mission[]> => {
  try {
    // קבל את כל המשימות וסנן בצד הלקוח
    const querySnapshot = await getDocs(missionsCollection);
    const allMissions = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Mission))
      .filter(mission => 
        mission.assignedTo?.includes(soldierId)
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    return allMissions;
  } catch (error) {
    console.error('Error getting missions by soldier:', error);
    return [];
  }
};

export const getMissionsByFramework = async (frameworkId: string): Promise<Mission[]> => {
  try {
    // קבל את כל המשימות וסנן בצד הלקוח
    const querySnapshot = await getDocs(missionsCollection);
    const allMissions = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Mission))
      .filter(mission => 
        mission.frameworkId === frameworkId || mission.team === frameworkId
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    return allMissions;
  } catch (error) {
    console.error('Error getting missions by framework:', error);
    return [];
  }
}; 