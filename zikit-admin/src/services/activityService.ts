import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Activity, ActivityDeliverable } from '../models/Activity';
// Temporary: return empty arrays for mock functions

const COLLECTION_NAME = 'activities';

// Use mock database for development - disabled temporarily
const USE_MOCK = false;

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
  if (USE_MOCK) {
    const allActivities: Activity[] = []; // Empty for now
    return allActivities.filter((activity: Activity) => activity.status === 'הסתיימה');
  }
  
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'הסתיימה'),
      orderBy('plannedDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Activity[];
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
  // Return empty array for now - using Firebase only
  return [];
  
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Activity[];
  } catch (error) {
    console.error('Error getting activities:', error);
    return [];
  }
};

export const getActivityById = async (id: string): Promise<Activity | null> => {
  // Return null for now - using Firebase only
  return null;
  
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Activity;
    }
    return null;
  } catch (error) {
    console.error('Error getting activity:', error);
    return null;
  }
};

export const addActivity = async (activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  // Return empty string for now - using Firebase only
  return '';
  
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...activity,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding activity:', error);
    throw error;
  }
};

export const updateActivity = async (id: string, activity: Partial<Activity>): Promise<void> => {
  // Return empty for now - using Firebase only
  return;
  
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...activity,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
};

export const deleteActivity = async (id: string): Promise<void> => {
  // Return empty for now - using Firebase only
  return;
  
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
};

export const getActivitiesByFramework = async (frameworkId: string): Promise<Activity[]> => {
  // זמנית החזר רשימה ריקה
  return [];
  
  try {
    // קבל את כל הפעילויות וסנן בצד הלקוח
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const allActivities = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Activity))
      .filter(activity => 
        ['מתוכננת', 'בביצוע'].includes(activity.status) &&
        (activity.team === frameworkId || 
         activity.participants.some(p => p.soldierId && p.soldierId.startsWith(frameworkId)))
      )
      .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());
    
    return allActivities;
  } catch (error) {
    console.error('Error getting activities by framework:', error);
    return [];
  }
};

// Keep backward compatibility
export const getActivitiesByTeam = getActivitiesByFramework;

export const getActivitiesBySoldier = async (soldierId: string): Promise<Activity[]> => {
  // Return empty array for now - using Firebase only
  return [];
  
  try {
    // קבל את כל הפעילויות וסנן בצד הלקוח
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const allActivities = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Activity))
      .filter(activity => 
        ['מתוכננת', 'בביצוע'].includes(activity.status) &&
        (activity.commanderId === soldierId || 
         activity.taskLeaderId === soldierId ||
         activity.participants.some(p => p.soldierId === soldierId))
      )
      .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());
    
    return allActivities;
  } catch (error) {
    console.error('Error getting activities by soldier:', error);
    return [];
  }
}; 