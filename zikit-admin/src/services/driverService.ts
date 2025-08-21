import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Driver } from '../models/Driver';
import { localStorageService, updateTableTimestamp } from './cacheService';

const driversCollection = collection(db, 'drivers');

export const getAllDrivers = async (): Promise<Driver[]> => {
  console.log('🔍 [LOCAL_STORAGE] מבקש רשימת נהגים');
  return localStorageService.getFromLocalStorage('drivers', async () => {
    try {
      console.log('📡 [DB] טוען נהגים מהשרת');
      const snapshot = await getDocs(driversCollection);
      const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
      
      console.log(`✅ [DB] נטענו ${drivers.length} נהגים מהשרת`);
      return drivers;
    } catch (error) {
      console.error('❌ [DB] Error getting drivers:', error);
      return [];
    }
  });
};

export const getDriverById = async (id: string): Promise<Driver | null> => {
  const driverDoc = await getDoc(doc(driversCollection, id));
  return driverDoc.exists() ? ({ id: driverDoc.id, ...driverDoc.data() } as Driver) : null;
};

export const addDriver = async (driver: Omit<Driver, 'id'>): Promise<string> => {
  const docRef = await addDoc(driversCollection, driver);
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי נהגים');
  await updateTableTimestamp('drivers');
  localStorageService.invalidateLocalStorage('drivers');
  
  return docRef.id;
};

export const updateDriver = async (id: string, driver: Partial<Driver>) => {
  await updateDoc(doc(driversCollection, id), driver);
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי נהגים');
  await updateTableTimestamp('drivers');
  localStorageService.invalidateLocalStorage('drivers');
};

export const deleteDriver = async (id: string) => {
  await deleteDoc(doc(driversCollection, id));
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי נהגים');
  await updateTableTimestamp('drivers');
  localStorageService.invalidateLocalStorage('drivers');
}; 