import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Soldier } from '../models/Soldier';
import { getAuth } from 'firebase/auth';

const soldiersCollection = collection(db, 'soldiers');

export const getAllSoldiers = async (): Promise<Soldier[]> => {
  try {
    // רק חיילים שכבר שובצו למסגרת (יש להם frameworkId)
    const snapshot = await getDocs(soldiersCollection);
    const allSoldiers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Soldier));
    return allSoldiers.filter(soldier => soldier.frameworkId && soldier.frameworkId.trim() !== '');
  } catch (error) {
    console.warn('שגיאה בטעינת חיילים:', error);
    return [];
  }
};

// פונקציה נפרדת לקבלת כל החיילים (כולל ממתינים) - לשימוש פנימי
export const getAllSoldiersIncludingPending = async (): Promise<Soldier[]> => {
  try {
    const snapshot = await getDocs(soldiersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Soldier));
  } catch (error) {
    console.warn('שגיאה בטעינת כל החיילים:', error);
    return [];
  }
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
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('משתמש לא מחובר');
    }

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
  try {
    // רק חיילים שכבר שובצו למסגרת (יש להם frameworkId)
    const snapshot = await getDocs(soldiersCollection);
    const allSoldiers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Soldier));
    const soldiers = allSoldiers.filter(soldier => soldier.frameworkId && soldier.frameworkId.trim() !== '');
    
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
  } catch (error) {
    console.warn('שגיאה בטעינת חיילים עם שמות מסגרות:', error);
    return [];
  }
}; 