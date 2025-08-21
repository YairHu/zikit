import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Vehicle } from '../models/Vehicle';
import { localStorageService, updateTableTimestamp } from './cacheService';

const vehiclesCollection = collection(db, 'vehicles');

export const getAllVehicles = async (): Promise<Vehicle[]> => {
  console.log('🔍 [LOCAL_STORAGE] מבקש רשימת רכבים');
  return localStorageService.getFromLocalStorage('vehicles', async () => {
    try {
      console.log('📡 [DB] טוען רכבים מהשרת');
      const snapshot = await getDocs(vehiclesCollection);
      const vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      
      console.log(`✅ [DB] נטענו ${vehicles.length} רכבים מהשרת`);
      return vehicles;
    } catch (error) {
      console.error('❌ [DB] Error getting vehicles:', error);
      return [];
    }
  });
};

export const getVehicleById = async (id: string): Promise<Vehicle | null> => {
  const vehicleDoc = await getDoc(doc(vehiclesCollection, id));
  return vehicleDoc.exists() ? ({ id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle) : null;
};

export const addVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<string> => {
  const docRef = await addDoc(vehiclesCollection, vehicle);
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי רכבים');
  await updateTableTimestamp('vehicles');
  localStorageService.invalidateLocalStorage('vehicles');
  
  return docRef.id;
};

export const updateVehicle = async (id: string, vehicle: Partial<Vehicle>) => {
  await updateDoc(doc(vehiclesCollection, id), vehicle);
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי רכבים');
  await updateTableTimestamp('vehicles');
  localStorageService.invalidateLocalStorage('vehicles');
};

export const deleteVehicle = async (id: string) => {
  await deleteDoc(doc(vehiclesCollection, id));
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי רכבים');
  await updateTableTimestamp('vehicles');
  localStorageService.invalidateLocalStorage('vehicles');
}; 