import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Soldier } from '../models/Soldier';
import { getAuth } from 'firebase/auth';
import { localStorageService, updateTableTimestamp } from './cacheService';
import { getAllFrameworks } from './frameworkService';

const soldiersCollection = collection(db, 'soldiers');

export const getAllSoldiers = async (): Promise<Soldier[]> => {
  return localStorageService.getFromLocalStorage('soldiers', async () => {
    try {
      console.log('📡 [DB] טוען חיילים מהשרת (עם מסגרת)');
      // רק חיילים שכבר שובצו למסגרת (יש להם frameworkId)
      const snapshot = await getDocs(soldiersCollection);
      const allSoldiers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Soldier));
      const filteredSoldiers = allSoldiers.filter(soldier => soldier.frameworkId && soldier.frameworkId.trim() !== '');
      console.log(`✅ [DB] נטענו ${filteredSoldiers.length} חיילים מהשרת`);
      return filteredSoldiers;
    } catch (error) {
      console.error('❌ [DB] שגיאה בטעינת חיילים:', error);
      return [];
    }
  });
};

// פונקציה נפרדת לקבלת כל החיילים (כולל ממתינים) - לשימוש פנימי
export const getAllSoldiersIncludingPending = async (): Promise<Soldier[]> => {
  console.log('🔍 [LOCAL_STORAGE] מבקש רשימת כל החיילים (כולל ממתינים)');
  return localStorageService.getFromLocalStorage('soldiers_all', async () => {
    try {
      console.log('📡 [DB] טוען כל החיילים מהשרת (כולל ממתינים)');
      const snapshot = await getDocs(soldiersCollection);
      const allSoldiers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Soldier));
      console.log(`✅ [DB] נטענו ${allSoldiers.length} חיילים מהשרת (כולל ממתינים)`);
      return allSoldiers;
    } catch (error) {
      console.error('❌ [DB] שגיאה בטעינת כל החיילים:', error);
      return [];
    }
  });
};

export const getSoldierById = async (id: string): Promise<Soldier | null> => {
  const soldierDoc = await getDoc(doc(soldiersCollection, id));
  return soldierDoc.exists() ? ({ id: soldierDoc.id, ...soldierDoc.data() } as Soldier) : null;
};

export const addSoldier = async (soldier: Omit<Soldier, 'id'>): Promise<string> => {
  console.log('➕ [DB] מוסיף חייל חדש:', soldier.name || soldier.email);
  const docRef = await addDoc(soldiersCollection, soldier);
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי חיילים');
  await updateTableTimestamp('soldiers');
  localStorageService.invalidateLocalStorage('soldiers');
  localStorageService.invalidateLocalStorage('soldiers_all');
  localStorageService.invalidateLocalStorage('soldiers_with_frameworks');
  
  console.log(`✅ [DB] חייל נוסף בהצלחה עם ID: ${docRef.id}`);
  return docRef.id;
};

export const updateSoldier = async (id: string, soldier: Partial<Soldier>) => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('משתמש לא מחובר');
    }

    console.log(`✏️ [DB] מעדכן חייל ${id}:`, Object.keys(soldier));

    const updateData = {
      ...soldier,
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(doc(soldiersCollection, id), updateData);
    
    // עדכון טבלת העדכונים וניקוי מטמון מקומי
    console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי חיילים');
    await updateTableTimestamp('soldiers');
    localStorageService.invalidateLocalStorage('soldiers');
    localStorageService.invalidateLocalStorage('soldiers_all');
    localStorageService.invalidateLocalStorage('soldiers_with_frameworks');
    
    console.log(`✅ [DB] חייל ${id} עודכן בהצלחה`);
  } catch (error) {
    console.error('❌ [DB] שגיאה בעדכון חייל:', error);
    throw error;
  }
};

export const deleteSoldier = async (id: string) => {
  console.log(`🗑️ [DB] מוחק חייל ${id}`);
  await deleteDoc(doc(soldiersCollection, id));
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי חיילים');
  await updateTableTimestamp('soldiers');
  localStorageService.invalidateLocalStorage('soldiers');
  localStorageService.invalidateLocalStorage('soldiers_all');
  localStorageService.invalidateLocalStorage('soldiers_with_frameworks');
  
  console.log(`✅ [DB] חייל ${id} נמחק בהצלחה`);
};

export const getSoldiersByFramework = async (frameworkId: string): Promise<Soldier[]> => {
  const allSoldiers = await getAllSoldiers();
  return allSoldiers.filter(soldier => soldier.frameworkId === frameworkId);
};

export const updateSoldierFramework = async (soldierId: string, frameworkId: string | undefined) => {
  await updateSoldier(soldierId, { frameworkId });
};

export const getAllSoldiersWithFrameworkNames = async (): Promise<(Soldier & { frameworkName?: string })[]> => {
  return localStorageService.getFromLocalStorage('soldiers_with_frameworks', async () => {
    try {
      console.log('📡 [DB] טוען חיילים עם שמות מסגרות מהשרת');
      
      // קבלת כל החיילים והמסגרות במקביל
      const [allSoldiers, allFrameworks] = await Promise.all([
        getAllSoldiers(),
        getAllFrameworks()
      ]);
      
      // יצירת מפה של מסגרות לשמות
      const frameworkMap = new Map(allFrameworks.map((f: any) => [f.id, f.name]));
      
      // הוספת שמות המסגרות לחיילים
      const soldiersWithFrameworkNames = allSoldiers.map((soldier: any) => {
        if (soldier.frameworkId && soldier.frameworkId.trim() !== '') {
          const frameworkName = frameworkMap.get(soldier.frameworkId) || 'לא נמצא';
          return { ...soldier, frameworkName };
        }
        return { ...soldier, frameworkName: 'לא מוגדר' };
      });
      
      console.log(`✅ [DB] נטענו ${soldiersWithFrameworkNames.length} חיילים עם שמות מסגרות מהשרת`);
      return soldiersWithFrameworkNames;
    } catch (error) {
      console.error('❌ [DB] שגיאה בטעינת חיילים עם שמות מסגרות:', error);
      return [];
    }
  });
}; 