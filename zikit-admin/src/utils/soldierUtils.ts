import { Soldier } from '../models/Soldier';

export interface SoldierWithStatusInfo extends Soldier {
  isUnavailable?: boolean;
  unavailabilityReason?: string;
  unavailabilityUntil?: string;
}

/**
 * פונקציה לבדיקת סטטוס נוכחות של חייל והחזרת מידע על זמינות
 */
export const getSoldierAvailabilityInfo = (soldier: Soldier, activityDate?: string): SoldierWithStatusInfo => {
  const result: SoldierWithStatusInfo = { ...soldier };
  
  // בדיקה אם החייל בגימלים או בחופש
  if (soldier.presence === 'גימלים' || soldier.presence === 'חופש') {
    // אם יש תאריך פעילות, בדוק אם החייל עדיין לא זמין
    if (activityDate && activityDate.trim() !== '' && soldier.presenceUntil) {
      try {
        const activityDateTime = new Date(activityDate);
        const untilDateTime = new Date(soldier.presenceUntil);
        
        // בדיקה שהתאריכים תקינים
        if (!isNaN(activityDateTime.getTime()) && !isNaN(untilDateTime.getTime())) {
          // אם הפעילות אחרי תום החופשה/גימלים - החייל זמין
          if (activityDateTime > untilDateTime) {
            result.isUnavailable = false;
            return result;
          }
        }
      } catch (error) {
        console.warn('שגיאה בבדיקת תאריכים:', error);
      }
    }
    
    result.isUnavailable = true;
    result.unavailabilityReason = soldier.presence === 'גימלים' ? 'בגימלים' : 'בחופש';
    
    // אם יש תאריך סיום לגימלים/חופש
    if (soldier.presenceUntil) {
      try {
        const untilDate = new Date(soldier.presenceUntil);
        if (!isNaN(untilDate.getTime())) {
          result.unavailabilityUntil = untilDate.toLocaleDateString('he-IL');
        }
      } catch (error) {
        console.warn('שגיאה בעיבוד תאריך סיום:', error);
      }
    }
  }
  
  return result;
};

/**
 * פונקציה ליצירת תווית לחייל לא זמין
 */
export const getUnavailableSoldierLabel = (soldier: SoldierWithStatusInfo): string => {
  if (!soldier.isUnavailable) {
    return soldier.name;
  }
  
  let label = `${soldier.name} (${soldier.unavailabilityReason}`;
  if (soldier.unavailabilityUntil) {
    label += ` עד ${soldier.unavailabilityUntil}`;
  }
  label += ')';
  
  return label;
};

/**
 * פונקציה לסינון חיילים זמינים בלבד
 */
export const filterAvailableSoldiers = (soldiers: Soldier[], activityDate?: string): Soldier[] => {
  return soldiers.filter(soldier => {
    const availabilityInfo = getSoldierAvailabilityInfo(soldier, activityDate);
    return !availabilityInfo.isUnavailable;
  });
};

/**
 * פונקציה לקבלת כל החיילים עם מידע על זמינות
 */
export const getAllSoldiersWithAvailability = (soldiers: Soldier[], activityDate?: string): SoldierWithStatusInfo[] => {
  return soldiers.map(soldier => getSoldierAvailabilityInfo(soldier, activityDate));
};
