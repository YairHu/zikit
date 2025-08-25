import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Soldier } from '../models/Soldier';
import { getAuth } from 'firebase/auth';
import { localStorageService, updateTableTimestamp } from './cacheService';
import { getAllFrameworks } from './frameworkService';
import { 
  PresenceStatus, 
  STATUS_HIERARCHY as PRESENCE_STATUS_HIERARCHY, 
  requiresAbsenceDate, 
  isAbsenceStatus, 
  isRegularStatus,
  getDefaultStatus, 
  getDefaultAbsenceStatus,
  getStatusPriority,
  compareStatusPriority,
  getHighestPriorityStatus,
  mapStatusForReport,
  getUnavailabilityReason,
  getAllStatuses,
  getStatusColor as getPresenceStatusColor,
  getStatusLabel
} from '../utils/presenceStatus';

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

// שימוש בהיררכיית הסטטוסים מהמחלקה המרכזית
export const STATUS_HIERARCHY = PRESENCE_STATUS_HIERARCHY;

export type SoldierStatus = PresenceStatus;

// פונקציה לעדכון אוטומטי של כל החיילים
export const updateAllSoldiersStatusesAutomatically = async (): Promise<void> => {
  try {
    console.log('🔄 [AUTO] מתחיל עדכון סטטוס כל החיילים אוטומטי');
    
    // מניעת קריאות מרובות במקביל
    if ((updateAllSoldiersStatusesAutomatically as any).isRunning) {
      console.log('🔄 [AUTO] עדכון כבר רץ - דילוג');
      return;
    }
    (updateAllSoldiersStatusesAutomatically as any).isRunning = true;
    
    const allSoldiers = await getAllSoldiers();
    const now = new Date();
    let updatedSoldiers = 0;
    
    for (const soldier of allSoldiers) {
      let shouldUpdate = false;
      let newStatus: SoldierStatus = soldier.presence as SoldierStatus || 'בבסיס';
      
      // בדיקת היעדרות (קורס/גימלים/חופש)
      if (soldier.absenceUntil) {
        const absenceUntil = new Date(soldier.absenceUntil);
        if (now >= absenceUntil) {
          // ההיעדרות הסתיימה - חזרה לסטטוס הקודם או לבסיס
          newStatus = soldier.previousStatus as SoldierStatus || getDefaultStatus();
          shouldUpdate = true;
          console.log(`🔄 [AUTO] חייל ${soldier.name} (${soldier.id}) - היעדרות הסתיימה, חזרה ל-${newStatus}`);
        } else if (!isAbsenceStatus(soldier.presence as PresenceStatus)) {
          // החייל בהיעדרות אבל הסטטוס לא מעודכן
          // נקבע את הסטטוס לפי סוג ההיעדרות (אם יש אינדיקציה) או נשאיר את הנוכחי
          if (isRegularStatus(soldier.presence as PresenceStatus)) {
            // אם החייל בסטטוס רגיל, נקבע אותו לקורס (ברירת מחדל)
            newStatus = getDefaultAbsenceStatus();
            shouldUpdate = true;
            console.log(`🔄 [AUTO] חייל ${soldier.name} (${soldier.id}) - עדכון לקורס`);
          }
        }
      }
      
      // בדיקת מנוחת נהג
      if (!shouldUpdate && soldier.qualifications?.includes('נהג') && soldier.restUntil) {
        const restUntil = new Date(soldier.restUntil);
        if (now >= restUntil) {
          // המנוחה הסתיימה - חזרה לבסיס
          newStatus = 'בבסיס';
          shouldUpdate = true;
          console.log(`🔄 [AUTO] נהג ${soldier.name} (${soldier.id}) - מנוחה הסתיימה, חזרה לבסיס`);
        } else if (soldier.presence !== 'במנוחה') {
          // הנהג במנוחה אבל הסטטוס לא מעודכן
          newStatus = 'במנוחה';
          shouldUpdate = true;
          console.log(`🔄 [AUTO] נהג ${soldier.name} (${soldier.id}) - עדכון למנוחה`);
        }
      }
      
      if (shouldUpdate) {
        // שמירת הסטטוס הנוכחי כ-previousStatus לפני העדכון
        const updateData: any = {
          presence: newStatus,
          previousStatus: soldier.presence || 'בבסיס'
        };
        
        // ניקוי שדות תאריך אם הסטטוס הסתיים
        if (!requiresAbsenceDate(newStatus) && soldier.absenceUntil) {
          updateData.absenceUntil = undefined;
        }
        if (newStatus !== 'במנוחה' && soldier.restUntil) {
          updateData.restUntil = null;
          if (soldier.qualifications?.includes('נהג')) {
            updateData.status = 'available';
          }
        }
        
        await updateSoldier(soldier.id, updateData);
        updatedSoldiers++;
      }
    }
    
    if (updatedSoldiers > 0) {
      console.log(`✅ [AUTO] עדכון ${updatedSoldiers} חיילים הושלם`);
    } else {
      console.log('✅ [AUTO] אין חיילים שצריכים עדכון');
    }
  } catch (error) {
    console.error('❌ [AUTO] שגיאה בעדכון סטטוס חיילים:', error);
  } finally {
    // שחרור הדגל
    (updateAllSoldiersStatusesAutomatically as any).isRunning = false;
  }
};

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
    isAutoUpdate?: boolean; // האם זה חלק מעדכון אוטומטי
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

    // בדיקה מיוחדת לקורס, גימלים, חופש ואחר - אל תעדכן אותם אלא אם כן זה סיום פעילות במפורש
    if (isAbsenceStatus(currentStatus) && 
        !context?.isEnding && 
        !isAbsenceStatus(newStatus)) {
      console.log(`🚫 [STATUS] חייל בסטטוס ${currentStatus} - לא מעדכן ל-${newStatus} (רק סיום פעילות מותר)`);
      return;
    }

    if (context?.isEnding) {
      // אם זה סיום פעילות - בדוק אם החייל בקורס/גימלים/חופש/אחר, אם כן החזר אותו לסטטוס המקורי
      if (isAbsenceStatus(currentStatus)) {
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
      presence: finalStatus,
      previousStatus: currentStatus // שמירת הסטטוס הקודם
    };

    // הוספת עדכון סטטוס נהג אם יש
    if (Object.keys(driverStatusUpdate).length > 0) {
      Object.assign(updateData, driverStatusUpdate);
    }

    // עדכון החייל
    await updateSoldier(soldierId, updateData);
    
    console.log(`✅ [STATUS] עדכון הושלם: ${soldierId} -> ${finalStatus}`, updateData);
    
    // עדכון אוטומטי של כל החיילים אחרי שינוי סטטוס (רק אם זה לא חלק מעדכון אוטומטי)
    if (!context?.isEnding && !context?.isAutoUpdate) {
      // קריאה לעדכון אוטומטי של כל החיילים
      setTimeout(async () => {
        try {
          await updateAllSoldiersStatusesAutomatically();
        } catch (error) {
          console.error('שגיאה בעדכון אוטומטי אחרי שינוי סטטוס:', error);
        }
      }, 1000); // השהייה של שנייה כדי למנוע קריאות מרובות
    }
  } catch (error) {
    console.error(`❌ [STATUS] שגיאה בעדכון סטטוס חייל ${soldierId}:`, error);
    throw error;
  }
};

// פונקציה לקבלת הסטטוס הנוכחי של חייל
export const getSoldierCurrentStatus = (soldier: Soldier): SoldierStatus => {
  if (!soldier.presence) return getDefaultStatus();
  
  // אם זה נהג במנוחה - בדיקה אם המנוחה הסתיימה
  if (soldier.presence === 'במנוחה' && soldier.restUntil) {
    const now = new Date();
    const restUntil = new Date(soldier.restUntil);
    if (now >= restUntil) {
      return getDefaultStatus();
    }
  }
  
  // בדיקה שהערך תקין - כולל סטטוסים מיוחדים
  const validStatuses = getAllStatuses();
  if (validStatuses.includes(soldier.presence as SoldierStatus)) {
    return soldier.presence as SoldierStatus;
  }
  
  // אם הערך לא תקין - חזרה לבסיס
  return getDefaultStatus();
};

// פונקציה לקבלת צבע סטטוס
export const getStatusColor = (status: SoldierStatus | string): string => {
  return getPresenceStatusColor(status as PresenceStatus);
};

// פונקציה לקבלת טקסט סטטוס
export const getStatusText = (status: SoldierStatus): string => {
  return getStatusLabel(status);
}; 

// פונקציה לעדכון ידני של כל החיילים (לשימוש בכל מקום במערכת)
export const refreshAllSoldiersStatuses = async (): Promise<void> => {
  try {
    console.log('🔄 [MANUAL] עדכון ידני של סטטוס כל החיילים');
    await updateAllSoldiersStatusesAutomatically();
    console.log('✅ [MANUAL] עדכון ידני הושלם');
  } catch (error) {
    console.error('❌ [MANUAL] שגיאה בעדכון ידני:', error);
    throw error;
  }
}; 

// פונקציה לעדכון אוטומטי של סטטוסי נוכחות
export const updateAbsenceStatusesAutomatically = async (): Promise<void> => {
  try {
    console.log('🔄 [AUTO] עדכון אוטומטי של סטטוסי נוכחות...');
    
    const allSoldiers = await getAllSoldiers();
    const now = new Date();
    let updatedCount = 0;
    
    for (const soldier of allSoldiers) {
      // בדיקה אם החייל בסטטוס היעדרות
      if (soldier.presence && isAbsenceStatus(soldier.presence as any)) {
        if (soldier.absenceUntil) {
          const untilTime = new Date(soldier.absenceUntil);
          
          // בדיקה אם ההיעדרות הסתיימה
          if (now > untilTime) {
            console.log(`✅ [AUTO] היעדרות הסתיימה לחייל ${soldier.name} - מחזיר לבסיס`);
            await updateSoldier(soldier.id, {
              presence: 'בבסיס',
              absenceUntil: undefined,
              previousStatus: undefined
            });
            updatedCount++;
          } else {
            // ההיעדרות פעילה - אין צורך לעדכן
            console.log(`⏳ [AUTO] היעדרות פעילה לחייל ${soldier.name} - ${soldier.presence}`);
          }
        }
      }
    }
    
    console.log(`✅ [AUTO] עדכון אוטומטי הושלם - ${updatedCount} חיילים עודכנו`);
  } catch (error) {
    console.error('❌ [AUTO] שגיאה בעדכון אוטומטי של סטטוסי נוכחות:', error);
  }
};

// פונקציה להפעלת עדכון אוטומטי כל דקה
export const startAutomaticStatusUpdates = (): (() => void) => {
  console.log('🚀 [AUTO] הפעלת עדכון אוטומטי של סטטוסי נוכחות...');
  
  // הפעלה ראשונית
  updateAbsenceStatusesAutomatically();
  
  // הפעלה כל דקה
  const interval = setInterval(updateAbsenceStatusesAutomatically, 60000);
  
  // פונקציה לעצירת העדכון האוטומטי
  return () => {
    console.log('🛑 [AUTO] עצירת עדכון אוטומטי של סטטוסי נוכחות...');
    clearInterval(interval);
  };
}; 