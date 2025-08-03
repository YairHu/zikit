import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Duty } from '../models/Duty';
// Temporary: return empty arrays for mock functions

const COLLECTION_NAME = 'duties';

// Use mock database for development
const USE_MOCK = false;

export const getAllDuties = async (): Promise<Duty[]> => {
  // Return empty array for now - using Firebase only
  return [];
  
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Duty[];
  } catch (error) {
    console.error('Error getting duties:', error);
    return [];
  }
};

export const getDutyById = async (id: string): Promise<Duty | null> => {
  // Return null for now - using Firebase only
  return null;
  
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Duty;
    }
    return null;
  } catch (error) {
    console.error('Error getting duty:', error);
    return null;
  }
};

export const addDuty = async (duty: Omit<Duty, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (USE_MOCK) {
    return '';
  }
  
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...duty,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding duty:', error);
    throw error;
  }
};

export const updateDuty = async (id: string, duty: Partial<Duty>): Promise<void> => {
  if (USE_MOCK) {
    return undefined;
  }
  
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...duty,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating duty:', error);
    throw error;
  }
};

export const deleteDuty = async (id: string): Promise<void> => {
  if (USE_MOCK) {
    return undefined;
  }
  
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting duty:', error);
    throw error;
  }
};

export const getDutiesByFramework = async (frameworkId: string): Promise<Duty[]> => {
  // זמנית החזר רשימה ריקה
  return [];
  
  try {
    // קבל את כל התורנויות וסנן בצד הלקוח
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const allDuties = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Duty))
      .filter(duty => 
        duty.status === 'פעילה' &&
        (duty.team === frameworkId || duty.participants.some(p => p.soldierId && p.soldierId.startsWith(frameworkId)))
      )
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    return allDuties;
  } catch (error) {
    console.error('Error getting duties by framework:', error);
    return [];
  }
};

// Keep backward compatibility  
export const getDutiesByTeam = getDutiesByFramework;

export const getDutiesBySoldier = async (soldierId: string): Promise<Duty[]> => {
  if (USE_MOCK) {
    return [];
  }
  
  try {
    // קבל את כל התורנויות וסנן בצד הלקוח
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const allDuties = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Duty))
      .filter(duty => 
        duty.status === 'פעילה' &&
        duty.participants.some(p => p.soldierId === soldierId)
      )
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    return allDuties;
  } catch (error) {
    console.error('Error getting duties by soldier:', error);
    return [];
  }
}; 