import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Form } from '../models/Form';

const formsCollection = collection(db, 'forms');

export const getAllForms = async (): Promise<Form[]> => {
  const snapshot = await getDocs(formsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Form));
};

export const getFormById = async (id: string): Promise<Form | null> => {
  const formDoc = await getDoc(doc(formsCollection, id));
  return formDoc.exists() ? ({ id: formDoc.id, ...formDoc.data() } as Form) : null;
};

export const addForm = async (form: Omit<Form, 'id'>): Promise<string> => {
  const docRef = await addDoc(formsCollection, form);
  return docRef.id;
};

export const updateForm = async (id: string, form: Partial<Form>) => {
  await updateDoc(doc(formsCollection, id), form);
};

export const deleteForm = async (id: string) => {
  await deleteDoc(doc(formsCollection, id));
}; 