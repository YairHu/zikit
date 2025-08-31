import { Activity, ActivityDeliverable } from '../models/Activity';
import { dataLayer } from './dataAccessLayer';
import { isActivityActive } from '../utils/dateUtils';
import { updateSoldierStatus } from './soldierService';

const COLLECTION_NAME = 'activities';

// פונקציה ריכוזית לעדכון סטטוס פעילות
export const updateActivityStatus = async (activityId: string, newStatus: Activity['status']): Promise<void> => {
  try {
    // עדכון הפעילות עצמה
    await updateActivity(activityId, { status: newStatus });
    
    // כאן ניתן להוסיף לוגיקה נוספת לעדכון מקומות אחרים
    // למשל: עדכון סטטוס רכב, עדכון נוכחות חיילים וכו'
    console.log(`סטטוס פעילות ${activityId} עודכן ל-${newStatus}`);
  } catch (error) {
    console.error('שגיאה בעדכון סטטוס פעילות:', error);
    throw error;
  }
};

// פונקציה לקבלת פעילויות שהסתיימו לסטטיסטיקות
export const getCompletedActivities = async (): Promise<Activity[]> => {
  try {
    const activities = await dataLayer.query(COLLECTION_NAME, {
      where: [{ field: 'status', operator: '==', value: 'הסתיימה' }],
      orderBy: [{ field: 'plannedDate', direction: 'desc' }]
    }) as unknown as Activity[];
    
    return activities;
  } catch (error) {
    console.error('Error getting completed activities:', error);
    return [];
  }
};

// פונקציה להוספת תוצר לפעילות
export const addActivityDeliverable = async (
  activityId: string,
  deliverable: Omit<ActivityDeliverable, 'id' | 'createdAt'>
): Promise<void> => {
  try {
    const activity = await getActivityById(activityId);
    if (!activity) {
      throw new Error('פעילות לא נמצאה');
    }
    
    const newDeliverable: ActivityDeliverable = {
      ...deliverable,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    const updatedDeliverables = [...(activity.deliverables || []), newDeliverable];
    await updateActivity(activityId, { deliverables: updatedDeliverables });
  } catch (error) {
    console.error('שגיאה בהוספת תוצר:', error);
    throw error;
  }
};

export const getAllActivities = async (): Promise<Activity[]> => {
  return dataLayer.getAll(COLLECTION_NAME, {
    orderBy: [{ field: 'createdAt', direction: 'desc' }]
  }) as unknown as Promise<Activity[]>;
};

export const getActivityById = async (id: string): Promise<Activity | null> => {
  return dataLayer.getById(COLLECTION_NAME, id) as unknown as Promise<Activity | null>;
};

export const addActivity = async (activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  return dataLayer.create(COLLECTION_NAME, activity as any);
};

export const updateActivity = async (id: string, activity: Partial<Activity>): Promise<void> => {
  return dataLayer.update(COLLECTION_NAME, id, activity as any);
};

export const deleteActivity = async (id: string): Promise<void> => {
  return dataLayer.delete(COLLECTION_NAME, id);
};

export const getActivitiesByFramework = async (frameworkId: string): Promise<Activity[]> => {
  try {
    // קבל את כל הפעילויות וסנן בצד הלקוח
    const allActivities = await dataLayer.getAll(COLLECTION_NAME) as unknown as Activity[];
    const filteredActivities = allActivities
      .filter(activity => 
        ['מתוכננת', 'בביצוע'].includes(activity.status) &&
        (activity.frameworkId === frameworkId || activity.team === frameworkId || 
         activity.participants.some(p => p.soldierId && p.soldierId.startsWith(frameworkId)))
      )
      .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());
    
    return filteredActivities;
  } catch (error) {
    console.error('Error getting activities by framework:', error);
    return [];
  }
};

// Keep backward compatibility
export const getActivitiesByTeam = getActivitiesByFramework;

export const getActivitiesBySoldier = async (soldierId: string): Promise<Activity[]> => {
  try {
    // קבל את כל הפעילויות וסנן בצד הלקוח
    const allActivities = await dataLayer.getAll(COLLECTION_NAME) as unknown as Activity[];
    const filteredActivities = allActivities
      .filter(activity => 
        ['מתוכננת', 'בביצוע'].includes(activity.status) &&
        (activity.commanderId === soldierId || 
         activity.taskLeaderId === soldierId ||
         activity.participants.some(p => p.soldierId === soldierId))
      )
      .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());
    
    return filteredActivities;
  } catch (error) {
    console.error('Error getting activities by soldier:', error);
    return [];
  }
};

// פונקציה לעדכון סטטוס פעילויות אוטומטי - הוסרה לפי בקשה
// export const updateActivityStatusesAutomatically = async (): Promise<void> => {
//   try {
//     console.log('🔄 [AUTO] מתחיל עדכון סטטוס פעילויות אוטומטי');
//     
//     const activities = await getAllActivities();
//     let updatedActivities = 0;
//     
//     for (const activity of activities) {
//       let shouldUpdate = false;
//       let newStatus: 'מתוכננת' | 'בביצוע' | 'הסתיימה' | 'בוטלה' = activity.status;
//       
//       // בדיקה אם הפעילות פעילה כרגע
//       const isActive = isActivityActive(
//         activity.plannedDate,
//         activity.plannedTime,
//         activity.duration
//       );
//       
//       // בדיקה אם צריך לעדכן סטטוס
//       if (activity.status === 'מתוכננת' && isActive) {
//         // הפעילות התחילה - עדכון לביצוע
//         newStatus = 'בביצוע';
//         shouldUpdate = true;
//         console.log(`🔄 [AUTO] עדכון פעילות ${activity.id} מ-מתוכננת ל-בביצוע`);
//       } else if (activity.status === 'בביצוע' && !isActive) {
//         // הפעילות הסתיימה - עדכון להסתיימה
//         newStatus = 'הסתיימה';
//         shouldUpdate = true;
//         console.log(`🔄 [AUTO] עדכון פעילות ${activity.id} מ-בביצוע ל-הסתיימה`);
//       }
//       
//       if (shouldUpdate) {
//         await updateActivity(activity.id, { status: newStatus });
//         updatedActivities++;
//         
//         // עדכון נוכחות המשתתפים (לא כולל מוביל משימה)
//         if (activity.participants) {
//           for (const participant of activity.participants) {
//             // בדיקה שהמשתתף אינו מוביל משימה
//             const isTaskLeader = activity.taskLeaderId === participant.soldierId;
//             
//             if (!isTaskLeader) {
//               if (newStatus === 'בביצוע') {
//                 // המשתתף נכנס לפעילות
//                 await updateSoldierStatus(participant.soldierId, 'בפעילות', { 
//                   activityId: activity.id
//                 });
//               } else if (newStatus === 'הסתיימה') {
//                 // המשתתף מסיים פעילות - חזרה לבסיס
//                 await updateSoldierStatus(participant.soldierId, 'בבסיס', { 
//                   activityId: activity.id,
//                   isEnding: true
//                 });
//               }
//             }
//           }
//         }
//       }
//     }
//     
//     if (updatedActivities > 0) {
//       console.log(`✅ [AUTO] עדכון ${updatedActivities} פעילויות הושלם`);
//     } else {
//       console.log('✅ [AUTO] אין פעילויות שצריכות עדכון');
//     }
//   } catch (error) {
//     console.error('❌ [AUTO] שגיאה בעדכון סטטוס פעילויות:', error);
//   }
// }; 