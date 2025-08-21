import { Mission } from '../models/Mission';
import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { localStorageService, updateTableTimestamp } from './cacheService';

const missionsCollection = collection(db, 'missions');

export const getAllMissions = async (): Promise<Mission[]> => {
  console.log('🔍 [LOCAL_STORAGE] מבקש רשימת משימות');
  return localStorageService.getFromLocalStorage('missions', async () => {
    try {
      console.log('📡 [DB] טוען משימות מהשרת');
      const snapshot = await getDocs(missionsCollection);
      const missions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
      
      console.log(`✅ [DB] נטענו ${missions.length} משימות מהשרת`);
      return missions;
    } catch (error) {
      console.error('❌ [DB] Error getting missions:', error);
      return [];
    }
  });
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
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי משימות');
  await updateTableTimestamp('missions');
  localStorageService.invalidateLocalStorage('missions');
  
  return docRef.id;
};

export const updateMission = async (id: string, updates: Partial<Mission>): Promise<void> => {
  await updateDoc(doc(missionsCollection, id), {
    ...updates,
    updatedAt: new Date().toISOString()
  });
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי משימות');
  await updateTableTimestamp('missions');
  localStorageService.invalidateLocalStorage('missions');
};

export const deleteMission = async (id: string): Promise<void> => {
  await deleteDoc(doc(missionsCollection, id));
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי משימות');
  await updateTableTimestamp('missions');
  localStorageService.invalidateLocalStorage('missions');
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