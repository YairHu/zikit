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
  try {
    const updateData = {
      ...soldier,
      updatedAt: new Date().toISOString()
    };
    await updateDoc(doc(soldiersCollection, id), updateData);
    console.log(`חייל ${id} עודכן בהצלחה`);
  } catch (error) {
    console.error('שגיאה בעדכון חייל:', error);
    throw error;
  }
};

export const deleteSoldier = async (id: string) => {
  await deleteDoc(doc(soldiersCollection, id));
};

export const getSoldiersByFramework = async (frameworkId: string): Promise<Soldier[]> => {
  const allSoldiers = await getAllSoldiers();
  return allSoldiers.filter(soldier => soldier.frameworkId === frameworkId);
};

export const updateSoldierFramework = async (soldierId: string, frameworkId: string | undefined) => {
  await updateSoldier(soldierId, { frameworkId });
};

export const getAllSoldiersWithFrameworkNames = async (): Promise<(Soldier & { frameworkName?: string })[]> => {
  const snapshot = await getDocs(soldiersCollection);
  const soldiers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Soldier));
  
  // הוספת שמות המסגרות
  const soldiersWithFrameworkNames = await Promise.all(
    soldiers.map(async (soldier) => {
      if (soldier.frameworkId) {
        // קבלת שם המסגרת ישירות מ-Firebase
        try {
          const frameworkRef = doc(db, 'frameworks', soldier.frameworkId);
          const frameworkDoc = await getDoc(frameworkRef);
          const frameworkName = frameworkDoc.exists() ? frameworkDoc.data().name : 'לא נמצא';
          return { ...soldier, frameworkName };
        } catch (error) {
          console.error('שגיאה בקבלת שם מסגרת:', error);
          return { ...soldier, frameworkName: 'שגיאה' };
        }
      }
      return { ...soldier, frameworkName: 'לא מוגדר' };
    })
  );
  
  return soldiersWithFrameworkNames;
}; 