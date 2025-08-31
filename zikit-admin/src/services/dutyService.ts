import { Duty, DutyParticipant } from '../models/Duty';
import { dataLayer } from './dataAccessLayer';
import { updateSoldierStatus } from './soldierService';
import { isDutyActive, getCurrentIsraelTime } from '../utils/dateUtils';

const COLLECTION_NAME = 'duties';

export const getAllDuties = async (): Promise<Duty[]> => {
  return dataLayer.getAll(COLLECTION_NAME, {
    orderBy: [{ field: 'createdAt', direction: 'desc' }]
  }) as unknown as Promise<Duty[]>;
};

export const getDutyById = async (id: string): Promise<Duty | null> => {
  return dataLayer.getById(COLLECTION_NAME, id) as unknown as Promise<Duty | null>;
};

export const addDuty = async (duty: Omit<Duty, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  return dataLayer.create(COLLECTION_NAME, duty as any);
};

export const updateDuty = async (id: string, duty: Partial<Duty>): Promise<void> => {
  return dataLayer.update(COLLECTION_NAME, id, duty as any);
};

export const deleteDuty = async (id: string): Promise<void> => {
  return dataLayer.delete(COLLECTION_NAME, id);
};

export const getDutiesByFramework = async (frameworkId: string): Promise<Duty[]> => {
  try {
    // קבל את כל התורנויות וסנן בצד הלקוח
    const allDuties = await dataLayer.getAll(COLLECTION_NAME) as unknown as Duty[];
    const filteredDuties = allDuties
      .filter(duty => 
        duty.status === 'פעילה' &&
        (duty.frameworkId === frameworkId || duty.participants.some(p => p.soldierId && p.soldierId.startsWith(frameworkId)))
      )
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    return filteredDuties;
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
    const allDuties = await dataLayer.getAll(COLLECTION_NAME) as unknown as Duty[];
    const filteredDuties = allDuties
      .filter(duty => 
        duty.status === 'פעילה' &&
        duty.participants.some(p => p.soldierId === soldierId)
      )
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    return filteredDuties;
  } catch (error) {
    console.error('Error getting duties by soldier:', error);
    return [];
  }
};

// פונקציה לעדכון סטטוס תורנויות אוטומטי
export const updateDutyStatusesAutomatically = async (): Promise<void> => {
  try {
    console.log('🔄 [AUTO] מתחיל עדכון סטטוס תורנויות אוטומטי');
    
    const duties = await getAllDuties();
    let updatedDuties = 0;
    
    for (const duty of duties) {
      let shouldUpdate = false;
      let newStatus: 'פעילה' | 'הסתיימה' | 'בוטלה' = duty.status;
      
      // בדיקה אם התורנות הסתיימה (עבר זמן הסיום)
      const now = getCurrentIsraelTime();
      const dutyDate = new Date(duty.startDate);
      const startDateTime = new Date(`${duty.startDate}T${duty.startTime}`);
      const endDateTime = duty.endTime 
        ? new Date(`${duty.startDate}T${duty.endTime}`)
        : new Date(startDateTime.getTime() + (8 * 60 * 60 * 1000)); // 8 שעות ברירת מחדל
      
      const isDutyEnded = now > endDateTime;
      const isDutyStarted = now >= startDateTime;
      
      console.log(`🔍 [AUTO] בדיקת תורנות ${duty.id}: תאריך=${duty.startDate}, זמן=${duty.startTime}-${duty.endTime}, התחילה=${isDutyStarted}, הסתיימה=${isDutyEnded}, סטטוס=${duty.status}`);
      
      // בדיקה אם צריך לעדכן סטטוס
      if (duty.status === 'פעילה' && isDutyEnded) {
        // זמן סיום הגיע - עדכון להסתיימה
        newStatus = 'הסתיימה';
        shouldUpdate = true;
        console.log(`🔄 [AUTO] עדכון תורנות ${duty.id} להסתיימה`);
      }
      
      if (shouldUpdate) {
        await updateDuty(duty.id, { status: newStatus });
        updatedDuties++;
        
        // עדכון נוכחות המשתתפים
        if (duty.participants) {
          for (const participant of duty.participants) {
            if (newStatus === 'הסתיימה') {
              // המשתתף מסיים תורנות - חזרה לבסיס
              await updateSoldierStatus(participant.soldierId, 'בבסיס', { 
                dutyId: duty.id,
                isEnding: true
              });
            }
          }
        }
      }
      
              // עדכון סטטוס חיילים בתחילת התורנות
        if (duty.status === 'פעילה' && isDutyStarted && !isDutyEnded && duty.participants) {
          for (const participant of duty.participants) {
            // בדיקה אם החייל צריך להיות בתורנות
            const { getSoldierById, getSoldierCurrentStatus } = await import('./soldierService');
            const soldier = await getSoldierById(participant.soldierId);
            if (soldier) {
              const currentStatus = getSoldierCurrentStatus(soldier);
              
              if (currentStatus !== 'בתורנות') {
                console.log(`🔄 [AUTO] עדכון חייל ${participant.soldierName} לסטטוס בתורנות`);
                await updateSoldierStatus(participant.soldierId, 'בתורנות', { 
                  dutyId: duty.id
                });
              }
            }
          }
        }
    }
    
    if (updatedDuties > 0) {
      console.log(`✅ [AUTO] עדכון ${updatedDuties} תורנויות הושלם`);
      // עדכון סטטוס כל החיילים אחרי עדכון תורנויות
      const { updateAllSoldiersStatusesAutomatically } = await import('./soldierService');
      await updateAllSoldiersStatusesAutomatically();
    } else {
      console.log('✅ [AUTO] אין תורנויות שצריכות עדכון');
    }
  } catch (error) {
    console.error('❌ [AUTO] שגיאה בעדכון סטטוס תורנויות:', error);
  }
}; 