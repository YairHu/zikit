import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Vehicle } from '../models/Vehicle';
// Temporary: return empty arrays for mock functions

const vehiclesCollection = collection(db, 'vehicles');

// Use mock database for development
const USE_MOCK = false;

export const getAllVehicles = async (): Promise<Vehicle[]> => {
  if (USE_MOCK) {
    return [];
  }
  
  const snapshot = await getDocs(vehiclesCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
};

export const getVehicleById = async (id: string): Promise<Vehicle | null> => {
  const vehicleDoc = await getDoc(doc(vehiclesCollection, id));
  return vehicleDoc.exists() ? ({ id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle) : null;
};

export const addVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<string> => {
  if (USE_MOCK) {
    return '';
  }
  
  const docRef = await addDoc(vehiclesCollection, vehicle);
  return docRef.id;
};

export const updateVehicle = async (id: string, vehicle: Partial<Vehicle>) => {
  if (USE_MOCK) {
    return undefined;
  }
  
  await updateDoc(doc(vehiclesCollection, id), vehicle);
};

export const deleteVehicle = async (id: string) => {
  if (USE_MOCK) {
    return undefined;
  }
  
  await deleteDoc(doc(vehiclesCollection, id));
}; 