import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip } from '../models/Trip';
import { Vehicle } from '../models/Vehicle';
import { Driver } from '../models/Driver';
import { Activity } from '../models/Activity';

import { updateSoldier } from './soldierService';
import { updateActivity } from './activityService';

const TRIPS_COLLECTION = 'trips';

export const getAllTrips = async (): Promise<Trip[]> => {
  try {
    const q = query(collection(db, TRIPS_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Trip[];
  } catch (error) {
    console.error('שגיאה בטעינת נסיעות:', error);
    throw error;
  }
};

export const getTripsByActivity = async (activityId: string): Promise<Trip[]> => {
  try {
    // קבל את כל הנסיעות וסנן בצד הלקוח
    const querySnapshot = await getDocs(collection(db, TRIPS_COLLECTION));
    const allTrips = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Trip))
      .filter(trip => trip.linkedActivityId === activityId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return allTrips;
  } catch (error) {
    console.error('שגיאה בטעינת נסיעות לפעילות:', error);
    throw error;
  }
};

export const addTrip = async (trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = Timestamp.now().toDate().toISOString();
    
    // סינון ערכים undefined כדי למנוע שגיאות Firebase
    const cleanedTrip = Object.fromEntries(
      Object.entries(trip).filter(([_, value]) => value !== undefined)
    );
    
    const tripData = {
      ...cleanedTrip,
      createdAt: now,
      updatedAt: now
    };
    
    const docRef = await addDoc(collection(db, TRIPS_COLLECTION), tripData);
    return docRef.id;
  } catch (error) {
    console.error('שגיאה בהוספת נסיעה:', error);
    throw error;
  }
};

export const updateTrip = async (id: string, trip: Partial<Trip>): Promise<void> => {
  try {
    // סינון ערכים undefined כדי למנוע שגיאות Firebase
    const cleanedTrip = Object.fromEntries(
      Object.entries(trip).filter(([_, value]) => value !== undefined)
    );
    
    const tripRef = doc(db, TRIPS_COLLECTION, id);
    await updateDoc(tripRef, {
      ...cleanedTrip,
      updatedAt: Timestamp.now().toDate().toISOString()
    });
    
    // אם משתנה הנהג, נעדכן את עמוד האישי של הנהגים
    if (trip.driverId) {
      await handleDriverChange(id, trip.driverId);
    }
  } catch (error) {
    console.error('שגיאה בעדכון נסיעה:', error);
    throw error;
  }
};

// פונקציה לטיפול בשינוי נהג בנסיעה
const handleDriverChange = async (tripId: string, newDriverId: string): Promise<void> => {
  try {
    // קבלת כל הנסיעות כדי למצוא את הנסיעה הנוכחית
    const allTrips = await getAllTrips();
    const currentTrip = allTrips.find(t => t.id === tripId);
    
    if (!currentTrip || !currentTrip.linkedActivityId) {
      return; // אין פעילות מקושרת
    }
    
    // קבלת הפעילות המקושרת
    const { getAllActivities } = await import('./activityService');
    const allActivities = await getAllActivities();
    const linkedActivity = allActivities.find(a => a.id === currentTrip.linkedActivityId);
    
    if (!linkedActivity) {
      return; // הפעילות לא נמצאה
    }
    
    // מציאת הנהג הישן (אם יש) - נחפש נהג שקשור לנסיעה הזו
    const oldDriver = linkedActivity.participants.find(p => 
      p.role === 'נהג' && 
      linkedActivity.mobility?.includes(`TRIP_ID:${tripId}`)
    );
    
    // הסרת הנהג הישן מעמוד האישי שלו
    if (oldDriver) {
      const { getAllSoldiers } = await import('./soldierService');
      const allSoldiers = await getAllSoldiers();
      const oldDriverSoldier = allSoldiers.find(s => s.id === oldDriver.soldierId);
      
      if (oldDriverSoldier) {
        const oldDriverActivities = oldDriverSoldier.activities || [];
        const updatedOldDriverActivities = oldDriverActivities.filter(activityId => activityId !== linkedActivity.id);
        await updateSoldier(oldDriver.soldierId, {
          activities: updatedOldDriverActivities
        });
      }
    }
    
    // הוספת הנהג החדש לעמוד האישי שלו
    const { getAllSoldiers } = await import('./soldierService');
    const allSoldiers = await getAllSoldiers();
    const newDriverSoldier = allSoldiers.find(s => s.id === newDriverId);
    
    if (newDriverSoldier) {
      const currentActivities = newDriverSoldier.activities || [];
      if (!currentActivities.includes(linkedActivity.id)) {
        await updateSoldier(newDriverId, {
          activities: [...currentActivities, linkedActivity.id]
        });
      }
    }
    
    // עדכון רשימת המשתתפים בפעילות
    const updatedParticipants = [...linkedActivity.participants];
    
    // הסרת הנהג הישן מהמשתתפים
    if (oldDriver) {
      const participantIndex = updatedParticipants.findIndex(p => p.soldierId === oldDriver.soldierId);
      if (participantIndex !== -1) {
        updatedParticipants.splice(participantIndex, 1);
      }
    }
    
    // הוספת הנהג החדש למשתתפים
    if (newDriverSoldier) {
      const driverExists = updatedParticipants.some(p => p.soldierId === newDriverId);
      if (!driverExists) {
        updatedParticipants.push({
          soldierId: newDriverId,
          soldierName: newDriverSoldier.name,
          personalNumber: newDriverSoldier.personalNumber,
          role: 'נהג'
        });
      }
    }
    
    // עדכון הפעילות
    await updateActivity(linkedActivity.id, { participants: updatedParticipants });
    
  } catch (error) {
    console.error('שגיאה בעדכון נהגים:', error);
  }
};

export const deleteTrip = async (id: string): Promise<void> => {
  try {
    const tripRef = doc(db, TRIPS_COLLECTION, id);
    await deleteDoc(tripRef);
  } catch (error) {
    console.error('שגיאה במחיקת נסיעה:', error);
    throw error;
  }
};

// בדיקת זמינות נהג ורכב
export const checkAvailability = async (
  vehicleId: string,
  driverId: string,
  departureTime: string,
  returnTime: string,
  excludeTripId?: string
): Promise<{ isAvailable: boolean; conflicts: Trip[] }> => {
  try {
    const q = query(
      collection(db, TRIPS_COLLECTION),
      where('status', 'in', ['מתוכננת', 'בביצוע'])
    );
    const querySnapshot = await getDocs(q);
    
    const conflicts = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Trip))
      .filter(trip => {
        if (excludeTripId && trip.id === excludeTripId) return false;
        
        // בדיקה אם הנסיעה חופפת בזמן
        const tripStart = new Date(trip.departureTime || '');
        const tripEnd = new Date(trip.returnTime || '');
        const newStart = new Date(departureTime);
        const newEnd = new Date(returnTime);
        
        const timeOverlap = tripStart < newEnd && tripEnd > newStart;
        
        // בדיקה אם אותו רכב או נהג משובץ
        const sameVehicle = trip.vehicleId === vehicleId;
        const sameDriver = trip.driverId === driverId;
        
        return timeOverlap && (sameVehicle || sameDriver);
      });
    
    return {
      isAvailable: conflicts.length === 0,
      conflicts
    };
  } catch (error) {
    console.error('שגיאה בבדיקת זמינות:', error);
    throw error;
  }
}; 