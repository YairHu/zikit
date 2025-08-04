import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Duty } from '../models/Duty';

const COLLECTION_NAME = 'duties';

export const getAllDuties = async (): Promise<Duty[]> => {
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
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting duty:', error);
    throw error;
  }
};

export const getDutiesByFramework = async (frameworkId: string): Promise<Duty[]> => {
  try {
    // קבל את כל התורנויות וסנן בצד הלקוח
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const allDuties = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Duty))
      .filter(duty => 
        duty.status === 'פעילה' &&
        (duty.frameworkId === frameworkId || duty.team === frameworkId || duty.participants.some(p => p.soldierId && p.soldierId.startsWith(frameworkId)))
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