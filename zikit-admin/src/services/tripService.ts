import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip } from '../models/Trip';
import { Vehicle } from '../models/Vehicle';
import { Soldier } from '../models/Soldier';
import { Activity } from '../models/Activity';
import { formatToIsraelString } from '../utils/dateUtils';

import { updateSoldier, getAllSoldiers, updateSoldierStatus } from './soldierService';
import { updateActivity } from './activityService';
import { localStorageService, updateTableTimestamp } from './cacheService';

const TRIPS_COLLECTION = 'trips';

export const getAllTrips = async (): Promise<Trip[]> => {
  console.log('🔍 [LOCAL_STORAGE] מבקש רשימת נסיעות');
  return localStorageService.getFromLocalStorage('trips', async () => {
    try {
      console.log('📡 [DB] טוען נסיעות מהשרת');
      const q = query(collection(db, TRIPS_COLLECTION), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const trips = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Trip[];
      
      console.log(`✅ [DB] נטענו ${trips.length} נסיעות מהשרת`);
      return trips;
    } catch (error) {
      console.error('❌ [DB] שגיאה בטעינת נסיעות:', error);
      throw error;
    }
  });
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

export const getTripsByTeam = async (teamName: string): Promise<Trip[]> => {
  try {
    // קבל את כל הנסיעות וסנן בצד הלקוח
    const querySnapshot = await getDocs(collection(db, TRIPS_COLLECTION));
    const allTrips = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Trip))
      .filter(trip => trip.team === teamName)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return allTrips;
  } catch (error) {
    console.error('שגיאה בטעינת נסיעות לצוות:', error);
    return [];
  }
};

export const getTripsBySoldier = async (soldierId: string): Promise<Trip[]> => {
  try {
    // קבל את כל הנסיעות וסנן בצד הלקוח
    const querySnapshot = await getDocs(collection(db, TRIPS_COLLECTION));
    const allTrips = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Trip))
      .filter(trip => trip.driverId === soldierId || trip.commanderId === soldierId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return allTrips;
  } catch (error) {
    console.error('שגיאה בטעינת נסיעות לחייל:', error);
    return [];
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
    
    // עדכון טבלת העדכונים וניקוי מטמון מקומי
    console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי נסיעות');
    await updateTableTimestamp('trips');
    localStorageService.invalidateLocalStorage('trips');
    
    // עדכון סטטוס נהג אם יש נהג
    if ((tripData as any).driverId) {
      const newTrip = { id: docRef.id, ...tripData } as Trip;
      await updateDriverStatusByTrip(newTrip);
    }
    
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
    
    // עדכון טבלת העדכונים וניקוי מטמון מקומי
    console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי נסיעות');
    await updateTableTimestamp('trips');
    localStorageService.invalidateLocalStorage('trips');
    
    // אם משתנה הנהג, נעדכן את עמוד האישי של הנהגים
    if (trip.driverId) {
      await handleDriverChange(id, trip.driverId);
    }
    
    // עדכון סטטוס נהג לפי הנסיעה
    if (trip.driverId) {
      const updatedTrip = { id, ...trip };
      await updateDriverStatusByTrip(updatedTrip as Trip);
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
    
    // עדכון סטטוס נהגים
    if (oldDriver) {
              await updateSoldier(oldDriver.soldierId, {
          status: 'available'
        });
    }
    
    if (newDriverSoldier) {
      // בדיקה אם הנהג בנסיעה פעילה
      const driverTrips = await getTripsBySoldier(newDriverSoldier.id);
      const activeTrip = driverTrips.find(trip => {
        const now = new Date();
        const tripStart = new Date(trip.departureTime);
        const tripEnd = new Date(trip.returnTime);
        return now >= tripStart && now <= tripEnd && trip.status === 'בביצוע';
      });
      
              if (activeTrip) {
          await updateSoldier(newDriverSoldier.id, {
            status: 'on_trip'
          });
        } else {
          await updateSoldier(newDriverSoldier.id, {
            status: 'available'
          });
        }
    }
    
  } catch (error) {
    console.error('שגיאה בעדכון נהגים:', error);
  }
};

export const deleteTrip = async (id: string): Promise<void> => {
  try {
    // קבלת פרטי הנסיעה לפני המחיקה
    const allTrips = await getAllTrips();
    const tripToDelete = allTrips.find(t => t.id === id);
    
    const tripRef = doc(db, TRIPS_COLLECTION, id);
    await deleteDoc(tripRef);
    
    // עדכון טבלת העדכונים וניקוי מטמון מקומי
    console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי נסיעות');
    await updateTableTimestamp('trips');
    localStorageService.invalidateLocalStorage('trips');
    
    // עדכון סטטוס נהג אם הנסיעה נמחקה
    if (tripToDelete && tripToDelete.driverId) {
      await updateSoldier(tripToDelete.driverId, {
        status: 'available'
      });
    }
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

// בדיקת זמינות נהג ורכב מתקדמת
export const checkAdvancedAvailability = async (
  vehicleId: string,
  driverId: string,
  departureTime: string,
  returnTime: string,
  excludeTripId?: string
): Promise<{ 
  isAvailable: boolean; 
  conflicts: Trip[]; 
  driverRestConflict?: boolean;
  vehicleConflict?: boolean;
  driverConflict?: boolean;
  licenseMismatch?: boolean;
  message?: string;
}> => {
  try {
    // קבלת כל הנסיעות - כולל הסתיימו לבדיקת מנוחה
    const q = query(
      collection(db, TRIPS_COLLECTION),
      where('status', 'in', ['מתוכננת', 'בביצוע', 'הסתיימה'])
    );
    const querySnapshot = await getDocs(q);
    
    const allTrips = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
    
    // קבלת מידע על הנהג והרכב
    const { getAllSoldiers } = await import('./soldierService');
    const { getAllVehicles } = await import('./vehicleService');
    const allSoldiers = await getAllSoldiers();
    const allVehicles = await getAllVehicles();
    const driver = allSoldiers.find(s => s.id === driverId);
    const vehicle = allVehicles.find(v => v.id === vehicleId);
    
    const newStart = new Date(departureTime);
    const newEnd = new Date(returnTime);
    
    let conflicts: Trip[] = [];
    let driverRestConflict = false;
    let vehicleConflict = false;
    let driverConflict = false;
    let licenseMismatch = false;
    let message = '';
    
    // בדיקת התנגשויות נסיעות - רק נסיעות פעילות
    const activeTrips = allTrips.filter(trip => trip.status === 'מתוכננת' || trip.status === 'בביצוע');
    for (const trip of activeTrips) {
      if (excludeTripId && trip.id === excludeTripId) continue;
      
      const tripStart = new Date(trip.departureTime);
      const tripEnd = new Date(trip.returnTime);
      
      const timeOverlap = tripStart < newEnd && tripEnd > newStart;
      
      if (timeOverlap) {
        // בדיקת התנגשות רכב - רק אם יש רכב לבדיקה
        if (vehicleId && trip.vehicleId === vehicleId) {
          vehicleConflict = true;
          conflicts.push(trip);
        }
        
        // בדיקת התנגשות נהג - רק אם יש נהג לבדיקה
        if (driverId && trip.driverId === driverId) {
          driverConflict = true;
          conflicts.push(trip);
        }
      }
    }
    
    // בדיקת התאמת היתר נהיגה - רק אם יש גם רכב וגם נהג
    if (vehicleId && driverId && vehicle?.requiredLicense && driver?.drivingLicenses) {
      if (!driver.drivingLicenses.includes(vehicle.requiredLicense)) {
        licenseMismatch = true;
        message = `הנהג אינו מחזיק בהיתר הנדרש: ${vehicle.requiredLicense}`;
      }
    }

    // בדיקת מנוחת נהג - כולל כל סוגי הנסיעות (רק אם יש נהג)
    if (driverId && driver) {
      // בדיקה אם יש נסיעות שהסתיימו לאחרונה
      const recentCompletedTrips = allTrips.filter(trip => 
        trip.driverId === driverId && 
        trip.status === 'הסתיימה' &&
        new Date(trip.returnTime) < newStart
      );
      
      // בדיקה אם יש נסיעות מתוכננות או בביצוע שמסתיימות לפני הנסיעה החדשה
      const upcomingTrips = allTrips.filter(trip => 
        trip.driverId === driverId && 
        (trip.status === 'מתוכננת' || trip.status === 'בביצוע') &&
        new Date(trip.returnTime) < newStart &&
        trip.id !== excludeTripId
      );
      
      // מציאת הנסיעה האחרונה שהסתיימה או עומדת להסתיים
      const allRelevantTrips = [...recentCompletedTrips, ...upcomingTrips];
      const lastTrip = allRelevantTrips.sort((a, b) => 
        new Date(b.returnTime).getTime() - new Date(a.returnTime).getTime()
      )[0];
      
      if (lastTrip) {
        const lastReturnTime = new Date(lastTrip.returnTime);
        const restEndTime = new Date(lastReturnTime.getTime() + (7 * 60 * 60 * 1000)); // 7 שעות
        
        if (newStart < restEndTime) {
          driverRestConflict = true;
          const tripType = lastTrip.status === 'הסתיימה' ? 'הסתיימה' : 'מתוכננת להסתיים';
          message = `הנהג במנוחה עד ${formatToIsraelString(restEndTime)} (לאחר נסיעה ש${tripType} ב-${formatToIsraelString(lastReturnTime)})`;
        }
      } else if (driver.status === 'resting' && driver.restUntil) {
        // בדיקה של מנוחה קיימת
        const restUntil = new Date(driver.restUntil);
        if (newStart < restUntil) {
          driverRestConflict = true;
          message = `הנהג במנוחה עד ${formatToIsraelString(restUntil)}`;
        }
      }
    }
    
    // בניית הודעה
    if (licenseMismatch) {
      // ההודעה כבר נקבעה למעלה
    } else if (vehicleConflict && driverConflict) {
      message = 'הרכב והנהג כבר משובצים לנסיעה אחרת בזמן זה';
    } else if (vehicleConflict) {
      message = 'הרכב כבר משובץ לנסיעה אחרת בזמן זה';
    } else if (driverConflict) {
      message = 'הנהג כבר משובץ לנסיעה אחרת בזמן זה';
    } else if (driverRestConflict) {
      // ההודעה כבר נקבעה למעלה
    } else if (conflicts.length > 0) {
      // אם יש התנגשויות אבל לא נקבעה הודעה ספציפית
      message = 'יש התנגשות עם נסיעה קיימת';
    }
    
    return {
      isAvailable: conflicts.length === 0 && !driverRestConflict && !licenseMismatch,
      conflicts,
      driverRestConflict,
      vehicleConflict,
      driverConflict,
      licenseMismatch,
      message
    };
  } catch (error) {
    console.error('שגיאה בבדיקת זמינות מתקדמת:', error);
    throw error;
  }
};

// פונקציה לעדכון סטטוס נהגים אוטומטית
export const updateDriverStatuses = async (): Promise<void> => {
  try {
    // קריאה לפונקציה הכללית שמעדכנת את כל החיילים
    const { updateAllSoldiersStatusesAutomatically } = await import('./soldierService');
    await updateAllSoldiersStatusesAutomatically();
  } catch (error) {
    console.error('שגיאה בעדכון סטטוס נהגים:', error);
  }
};

// פונקציה לעדכון סטטוס נהגים לפי נסיעה ספציפית
export const updateDriverStatusByTrip = async (trip: Trip): Promise<void> => {
  try {
    if (!trip.driverId) return;
    
    const now = new Date();
    const tripStart = new Date(trip.departureTime);
    const tripEnd = new Date(trip.returnTime);
    
    if (trip.status === 'בביצוע' && now >= tripStart && now <= tripEnd) {
      // הנהג בנסיעה
      await updateSoldierStatus(trip.driverId, 'בנסיעה', { tripId: trip.id });
    } else if (trip.status === 'הסתיימה' && now > tripEnd) {
      // הנסיעה הסתיימה - חזרה לבסיס (עם מנוחה אם נדרש)
      await updateSoldierStatus(trip.driverId, 'בבסיס', { 
        tripId: trip.id,
        isEnding: true,
        tripEndTime: trip.returnTime
      });
    } else {
      // הנסיעה לא פעילה - חזרה לבסיס
      await updateSoldierStatus(trip.driverId, 'בבסיס', { tripId: trip.id });
    }
  } catch (error) {
    console.error('שגיאה בעדכון סטטוס נהג לפי נסיעה:', error);
  }
};

// פונקציה להגדרת מנוחת נהג אוטומטית
export const setDriverRest = async (driverId: string, returnTime: string): Promise<void> => {
  try {
    await updateSoldierStatus(driverId, 'בבסיס', {
      isEnding: true,
      tripEndTime: returnTime
    });
  } catch (error) {
    console.error('שגיאה בהגדרת מנוחת נהג:', error);
  }
};

// פונקציה לסינון נהגים לפי היתר נדרש לרכב
export const getDriversWithRequiredLicense = async (requiredLicense: string): Promise<Soldier[]> => {
  try {
    const { getAllSoldiers } = await import('./soldierService');
    const allSoldiers = await getAllSoldiers();
    
    return allSoldiers.filter(soldier => 
      soldier.qualifications?.includes('נהג') && 
      soldier.drivingLicenses?.includes(requiredLicense)
    );
  } catch (error) {
    console.error('שגיאה בסינון נהגים לפי היתר:', error);
    return [];
  }
};

// פונקציה לסינון רכבים לפי היתרי נהג
export const getVehiclesCompatibleWithDriver = async (driverLicenses: string[]): Promise<Vehicle[]> => {
  try {
    const { getAllVehicles } = await import('./vehicleService');
    const allVehicles = await getAllVehicles();
    
    return allVehicles.filter(vehicle => {
      // אם לרכב אין היתר נדרש - הוא תואם לכל נהג
      if (!vehicle.requiredLicense) {
        return true;
      }
      
      // אם לרכב יש היתר נדרש - בדוק שהנהג מחזיק בו
      return driverLicenses.includes(vehicle.requiredLicense);
    });
  } catch (error) {
    console.error('שגיאה בסינון רכבים לפי היתר נהג:', error);
    return [];
  }
};

// פונקציה לעדכון סטטוס נסיעות אוטומטי
export const updateTripStatusesAutomatically = async (): Promise<void> => {
  try {
    console.log('🔄 [AUTO] מתחיל עדכון סטטוס נסיעות אוטומטי');
    
    const trips = await getAllTrips();
    const now = new Date();
    let updatedTrips = 0;
    
    for (const trip of trips) {
      let shouldUpdate = false;
      let newStatus: 'מתוכננת' | 'בביצוע' | 'הסתיימה' = trip.status;
      let autoStatusChanged = trip.autoStatusChanged || false;
      
      const departureTime = new Date(trip.departureTime);
      const returnTime = new Date(trip.returnTime);
      
      // בדיקה אם צריך לעדכן סטטוס
      if (trip.status === 'מתוכננת' && now >= departureTime) {
        // זמן יציאה הגיע - עדכון לביצוע
        newStatus = 'בביצוע';
        autoStatusChanged = true;
        shouldUpdate = true;
        console.log(`🔄 [AUTO] עדכון נסיעה ${trip.id} מ-מתוכננת ל-בביצוע`);
      } else if (trip.status === 'בביצוע' && now >= returnTime) {
        // זמן חזרה הגיע - עדכון להסתיימה
        newStatus = 'הסתיימה';
        autoStatusChanged = true;
        shouldUpdate = true;
        console.log(`🔄 [AUTO] עדכון נסיעה ${trip.id} מ-בביצוע ל-הסתיימה`);
      }
      
      if (shouldUpdate) {
        await updateTrip(trip.id, {
          status: newStatus,
          autoStatusChanged: autoStatusChanged,
          autoStatusUpdateTime: now.toISOString()
        });
        updatedTrips++;
      }
    }
    
    if (updatedTrips > 0) {
      console.log(`✅ [AUTO] עדכון ${updatedTrips} נסיעות הושלם`);
      // עדכון סטטוס כל החיילים אחרי עדכון נסיעות
      const { updateAllSoldiersStatusesAutomatically } = await import('./soldierService');
      await updateAllSoldiersStatusesAutomatically();
    } else {
      console.log('✅ [AUTO] אין נסיעות שצריכות עדכון');
    }
  } catch (error) {
    console.error('❌ [AUTO] שגיאה בעדכון סטטוס נסיעות:', error);
  }
};

// פונקציה לעדכון זמנים בפועל
export const updateTripActualTimes = async (
  tripId: string, 
  actualDepartureTime?: string, 
  actualReturnTime?: string
): Promise<void> => {
  try {
    const updateData: Partial<Trip> = {};
    
    if (actualDepartureTime) {
      updateData.actualDepartureTime = actualDepartureTime;
    }
    
    if (actualReturnTime) {
      updateData.actualReturnTime = actualReturnTime;
    }
    
    // אם שני הזמנים מעודכנים, ביטול הסימון האוטומטי
    if (actualDepartureTime && actualReturnTime) {
      updateData.autoStatusChanged = false;
      updateData.autoStatusUpdateTime = undefined;
    }
    
    await updateTrip(tripId, updateData);
    console.log(`✅ [AUTO] עדכון זמנים בפועל לנסיעה ${tripId}`);
  } catch (error) {
    console.error('❌ [AUTO] שגיאה בעדכון זמנים בפועל:', error);
    throw error;
  }
}; 