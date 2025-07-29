import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Activity } from '../models/Activity';
import { 
  mockGetAllActivities, 
  mockGetActivityById, 
  mockAddActivity, 
  mockUpdateActivity, 
  mockDeleteActivity,
  mockGetActivitiesByTeam,
  mockGetActivitiesBySoldier
} from './mockDatabase';

const COLLECTION_NAME = 'activities';

// Use mock database for development
const USE_MOCK = true;

export const getAllActivities = async (): Promise<Activity[]> => {
  if (USE_MOCK) {
    return mockGetAllActivities();
  }
  
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
  if (USE_MOCK) {
    return mockGetActivityById(id);
  }
  
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
  if (USE_MOCK) {
    return mockAddActivity(activity);
  }
  
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
  if (USE_MOCK) {
    return mockUpdateActivity(id, activity);
  }
  
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
  if (USE_MOCK) {
    return mockDeleteActivity(id);
  }
  
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
};

export const getActivitiesByTeam = async (team: string): Promise<Activity[]> => {
  if (USE_MOCK) {
    return mockGetActivitiesByTeam(team);
  }
  
  try {
    // קבל את כל הפעילויות הפעילות
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', 'in', ['מתוכננת', 'בביצוע']),
      orderBy('plannedDate', 'asc')
    );
    const querySnapshot = await getDocs(q);
    const allActivities = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Activity[];
    
    // סינון פעילויות שמכילות חיילים מהצוות
    // זה יטופל בצד הלקוח כי Firebase לא תומך בסינון מורכב
    return allActivities.filter(activity => {
      // אם הפעילות מוגדרת לצוות זה
      if (activity.team === team) return true;
      
      // אם יש חיילים מהצוות שמשתתפים בפעילות
      // (הסינון המדויק ייעשה בעמוד הצוות)
      return true;
    });
  } catch (error) {
    console.error('Error getting activities by team:', error);
    return [];
  }
};

export const getActivitiesBySoldier = async (soldierId: string): Promise<Activity[]> => {
  if (USE_MOCK) {
    return mockGetActivitiesBySoldier(soldierId);
  }
  
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', 'in', ['מתוכננת', 'בביצוע']),
      orderBy('plannedDate', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Activity))
      .filter(activity => 
        activity.commanderId === soldierId || 
        activity.taskLeaderId === soldierId ||
        activity.participants.some(p => p.soldierId === soldierId)
      );
  } catch (error) {
    console.error('Error getting activities by soldier:', error);
    return [];
  }
}; 