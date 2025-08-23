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
      console.log('📡 [DB] טוען כל החיילים מהשרת');
      const snapshot = await getDocs(soldiersCollection);
      const allSoldiers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Soldier));
      console.log(`✅ [DB] נטענו ${allSoldiers.length} חיילים מהשרת`);
      return allSoldiers;
    } catch (error) {
      console.error('❌ [DB] שגיאה בטעינת חיילים:', error);
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

// היררכיית סטטוסים - מלמעלה למטה (גבוה יותר = עדיפות גבוהה יותר)
export const STATUS_HIERARCHY = {
  'אחר': 8,        // אחר - הגבוה ביותר (לא מתאפס אוטומטית)
  'גימלים': 7,     // גימלים - הגבוה ביותר
  'חופש': 6,       // חופש - גבוה מאוד
  'בפעילות': 5,
  'בנסיעה': 4,
  'בתורנות': 3,
  'בבסיס': 2,
  'במנוחה': 1
} as const;

export type SoldierStatus = keyof typeof STATUS_HIERARCHY;

// פונקציה מרכזית לעדכון סטטוס חייל
export const updateSoldierStatus = async (
  soldierId: string, 
  newStatus: SoldierStatus,
  context?: {
    tripId?: string;
    dutyId?: string;
    activityId?: string;
    isEnding?: boolean; // האם זה סיום של פעילות/נסיעה/תורנות
    tripEndTime?: string; // זמן סיום נסיעה (למנוחת נהג)
  }
): Promise<void> => {
  try {
    console.log(`🔄 [STATUS] עדכון סטטוס חייל ${soldierId} ל-${newStatus}`, context);
    
    // קבלת החייל הנוכחי
    const currentSoldier = await getSoldierById(soldierId);
    if (!currentSoldier) {
      console.error(`❌ [STATUS] לא נמצא חייל עם מזהה ${soldierId}`);
      return;
    }

    const currentStatus = currentSoldier.presence as SoldierStatus;
    const currentHierarchy = STATUS_HIERARCHY[currentStatus] || 0;
    const newHierarchy = STATUS_HIERARCHY[newStatus];

    console.log(`📊 [STATUS] היררכיה נוכחית: ${currentStatus} (${currentHierarchy}) -> ${newStatus} (${newHierarchy})`);

    // בדיקת היררכיה
    let shouldUpdate = false;
    let finalStatus = newStatus;

    // בדיקה מיוחדת לגימלים, חופש ואחר - אל תעדכן אותם אלא אם כן זה סיום פעילות במפורש
    if ((currentStatus === 'גימלים' || currentStatus === 'חופש' || currentStatus === 'אחר') && 
        !context?.isEnding && 
        newStatus !== 'גימלים' && 
        newStatus !== 'חופש' && 
        newStatus !== 'אחר') {
      console.log(`🚫 [STATUS] חייל בסטטוס ${currentStatus} - לא מעדכן ל-${newStatus} (רק סיום פעילות מותר)`);
      return;
    }

    if (context?.isEnding) {
      // אם זה סיום פעילות - בדוק אם החייל בגימלים/חופש/אחר, אם כן החזר אותו לסטטוס המקורי
      if (currentStatus === 'גימלים' || currentStatus === 'חופש' || currentStatus === 'אחר') {
        finalStatus = currentStatus; // השאר בסטטוס המקורי
        console.log(`✅ [STATUS] סיום פעילות - מחזיר ל-${finalStatus}`);
      }
      shouldUpdate = true;
      console.log(`✅ [STATUS] סיום פעילות - מעדכן סטטוס`);
    } else if (newHierarchy > currentHierarchy) {
      // אם הסטטוס החדש גבוה יותר בהיררכיה
      shouldUpdate = true;
      console.log(`✅ [STATUS] סטטוס חדש גבוה יותר - מעדכן`);
    } else if (newHierarchy === currentHierarchy) {
      // אם אותו סטטוס - מעדכן רק אם זה שונה
      shouldUpdate = newStatus !== currentStatus;
      console.log(`🔄 [STATUS] אותו סטטוס - מעדכן רק אם שונה: ${shouldUpdate}`);
    } else {
      // אם הסטטוס החדש נמוך יותר - לא מעדכן
      console.log(`❌ [STATUS] סטטוס חדש נמוך יותר - לא מעדכן`);
      return;
    }

    if (!shouldUpdate) {
      console.log(`⏭️ [STATUS] לא מעדכן - אין צורך`);
      return;
    }

    // עדכון סטטוס נהג אם רלוונטי
    let driverStatusUpdate = {};
    if (currentSoldier.qualifications?.includes('נהג')) {
      if (newStatus === 'בנסיעה') {
        driverStatusUpdate = { status: 'on_trip' };
      } else if (newStatus === 'בבסיס' && context?.tripEndTime) {
        // נהג חוזר לבסיס אחרי נסיעה - מנוחה של 7 שעות
        const tripEndTime = new Date(context.tripEndTime);
        const restUntil = new Date(tripEndTime.getTime() + (7 * 60 * 60 * 1000));
        driverStatusUpdate = { 
          status: 'resting',
          restUntil: restUntil.toISOString()
        };
        finalStatus = 'במנוחה';
      } else if (newStatus === 'בבסיס' && currentSoldier.restUntil) {
        // בדיקה אם הנהג עדיין במנוחה
        const now = new Date();
        const restUntil = new Date(currentSoldier.restUntil);
        if (now < restUntil) {
          finalStatus = 'במנוחה';
        } else {
          driverStatusUpdate = { 
            status: 'available',
            restUntil: null
          };
        }
      } else if (newStatus === 'בבסיס') {
        driverStatusUpdate = { status: 'available' };
      }
    }

    // עדכון הנתונים
    const updateData: any = {
      presence: finalStatus
    };

    // הוספת עדכון סטטוס נהג אם יש
    if (Object.keys(driverStatusUpdate).length > 0) {
      Object.assign(updateData, driverStatusUpdate);
    }

    // עדכון החייל
    await updateSoldier(soldierId, updateData);
    
    console.log(`✅ [STATUS] עדכון הושלם: ${soldierId} -> ${finalStatus}`, updateData);
  } catch (error) {
    console.error(`❌ [STATUS] שגיאה בעדכון סטטוס חייל ${soldierId}:`, error);
    throw error;
  }
};

// פונקציה לקבלת הסטטוס הנוכחי של חייל
export const getSoldierCurrentStatus = (soldier: Soldier): SoldierStatus => {
  if (!soldier.presence) return 'בבסיס';
  
  // אם זה נהג במנוחה - בדיקה אם המנוחה הסתיימה
  if (soldier.presence === 'במנוחה' && soldier.restUntil) {
    const now = new Date();
    const restUntil = new Date(soldier.restUntil);
    if (now >= restUntil) {
      return 'בבסיס';
    }
  }
  
  // בדיקה שהערך תקין - כולל סטטוסים מיוחדים
  const validStatuses: SoldierStatus[] = ['בפעילות', 'בנסיעה', 'בתורנות', 'בבסיס', 'במנוחה', 'גימלים', 'חופש', 'אחר'];
  if (validStatuses.includes(soldier.presence as SoldierStatus)) {
    return soldier.presence as SoldierStatus;
  }
  
  // אם הערך לא תקין - חזרה לבסיס
  return 'בבסיס';
};

// פונקציה לקבלת צבע סטטוס
export const getStatusColor = (status: SoldierStatus | string): string => {
  switch (status) {
    case 'בפעילות':
      return '#F44336'; // אדום
    case 'בנסיעה':
      return '#FF9800'; // כתום
    case 'בתורנות':
      return '#9C27B0'; // סגול
    case 'בבסיס':
      return '#4CAF50'; // ירוק
    case 'במנוחה':
      return '#2196F3'; // כחול
    case 'גימלים':
      return '#FFD600'; // צהוב
    case 'חופש':
      return '#00BCD4'; // כחול בהיר
    case 'אחר':
      return '#9C27B0'; // סגול
    default:
      return '#9E9E9E'; // אפור
  }
};

// פונקציה לקבלת טקסט סטטוס
export const getStatusText = (status: SoldierStatus): string => {
  switch (status) {
    case 'בפעילות':
      return 'בפעילות';
    case 'בנסיעה':
      return 'בנסיעה';
    case 'בתורנות':
      return 'בתורנות';
    case 'בבסיס':
      return 'בבסיס';
    case 'במנוחה':
      return 'במנוחה';
    case 'גימלים':
      return 'גימלים';
    case 'חופש':
      return 'חופש';
    case 'אחר':
      return 'אחר';
    default:
      return 'לא מוגדר';
  }
}; 