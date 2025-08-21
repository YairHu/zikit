import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Form } from '../models/Form';
import { localStorageService, updateTableTimestamp } from './cacheService';

const formsCollection = collection(db, 'forms');

export const getAllForms = async (): Promise<Form[]> => {
  console.log('🔍 [LOCAL_STORAGE] מבקש רשימת טפסים');
  return localStorageService.getFromLocalStorage('forms', async () => {
    try {
      console.log('📡 [DB] טוען טפסים מהשרת');
      const snapshot = await getDocs(formsCollection);
      const forms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Form));
      
      console.log(`✅ [DB] נטענו ${forms.length} טפסים מהשרת`);
      return forms;
    } catch (error) {
      console.error('❌ [DB] Error getting forms:', error);
      return [];
    }
  });
};

export const getFormById = async (id: string): Promise<Form | null> => {
  const formDoc = await getDoc(doc(formsCollection, id));
  return formDoc.exists() ? ({ id: formDoc.id, ...formDoc.data() } as Form) : null;
};

export const addForm = async (form: Omit<Form, 'id'>): Promise<string> => {
  const docRef = await addDoc(formsCollection, form);
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי טפסים');
  await updateTableTimestamp('forms');
  localStorageService.invalidateLocalStorage('forms');
  
  return docRef.id;
};

export const updateForm = async (id: string, form: Partial<Form>) => {
  await updateDoc(doc(formsCollection, id), form);
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי טפסים');
  await updateTableTimestamp('forms');
  localStorageService.invalidateLocalStorage('forms');
};

export const deleteForm = async (id: string) => {
  await deleteDoc(doc(formsCollection, id));
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי טפסים');
  await updateTableTimestamp('forms');
  localStorageService.invalidateLocalStorage('forms');
}; 