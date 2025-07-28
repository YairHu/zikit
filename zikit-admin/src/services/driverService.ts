import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Driver } from '../models/Driver';

const driversCollection = collection(db, 'drivers');

export const getAllDrivers = async (): Promise<Driver[]> => {
  const snapshot = await getDocs(driversCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
};

export const getDriverById = async (id: string): Promise<Driver | null> => {
  const driverDoc = await getDoc(doc(driversCollection, id));
  return driverDoc.exists() ? ({ id: driverDoc.id, ...driverDoc.data() } as Driver) : null;
};

export const addDriver = async (driver: Omit<Driver, 'id'>): Promise<string> => {
  const docRef = await addDoc(driversCollection, driver);
  return docRef.id;
};

export const updateDriver = async (id: string, driver: Partial<Driver>) => {
  await updateDoc(doc(driversCollection, id), driver);
};

export const deleteDriver = async (id: string) => {
  await deleteDoc(doc(driversCollection, id));
}; 