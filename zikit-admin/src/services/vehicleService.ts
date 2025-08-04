import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Vehicle } from '../models/Vehicle';

const vehiclesCollection = collection(db, 'vehicles');

export const getAllVehicles = async (): Promise<Vehicle[]> => {
  const snapshot = await getDocs(vehiclesCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
};

export const getVehicleById = async (id: string): Promise<Vehicle | null> => {
  const vehicleDoc = await getDoc(doc(vehiclesCollection, id));
  return vehicleDoc.exists() ? ({ id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle) : null;
};

export const addVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<string> => {
  const docRef = await addDoc(vehiclesCollection, vehicle);
  return docRef.id;
};

export const updateVehicle = async (id: string, vehicle: Partial<Vehicle>) => {
  await updateDoc(doc(vehiclesCollection, id), vehicle);
};

export const deleteVehicle = async (id: string) => {
  await deleteDoc(doc(vehiclesCollection, id));
}; 