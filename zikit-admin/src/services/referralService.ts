import { Referral } from '../models/Referral';
import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { localStorageService, updateTableTimestamp } from './cacheService';
import { updateSoldierStatus } from './soldierService';
import { getCurrentIsraelTime, isTimeInRange } from '../utils/dateUtils';

const referralsCollection = collection(db, 'referrals');

export const getAllReferrals = async (): Promise<Referral[]> => {
  console.log('🔍 [LOCAL_STORAGE] מבקש רשימת הפניות');
  return localStorageService.getFromLocalStorage('referrals', async () => {
    try {
      console.log('📡 [DB] טוען הפניות מהשרת');
      const snapshot = await getDocs(referralsCollection);
      const referrals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
      
      console.log(`✅ [DB] נטענו ${referrals.length} הפניות מהשרת`);
      return referrals;
    } catch (error) {
      console.error('❌ [DB] Error getting referrals:', error);
      return [];
    }
  });
};

export const getReferralById = async (id: string): Promise<Referral | null> => {
  const referralDoc = await getDoc(doc(referralsCollection, id));
  return referralDoc.exists() ? ({ id: referralDoc.id, ...referralDoc.data() } as Referral) : null;
};

export const getReferralsBySoldier = async (soldierId: string): Promise<Referral[]> => {
  const q = query(referralsCollection, where('soldierId', '==', soldierId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
};

export const getReferralsByTeam = async (team: string): Promise<Referral[]> => {
  const q = query(referralsCollection, where('team', '==', team));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
};

export const addReferral = async (referral: Omit<Referral, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const docRef = await addDoc(referralsCollection, {
    ...referral,
    createdAt: getCurrentIsraelTime().toISOString(),
    updatedAt: getCurrentIsraelTime().toISOString()
  });
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי הפניות');
  await updateTableTimestamp('referrals');
  localStorageService.invalidateLocalStorage('referrals');
  
  return docRef.id;
};

export const updateReferral = async (id: string, updates: Partial<Referral>): Promise<void> => {
  await updateDoc(doc(referralsCollection, id), {
    ...updates,
    updatedAt: getCurrentIsraelTime().toISOString()
  });
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי הפניות');
  await updateTableTimestamp('referrals');
  localStorageService.invalidateLocalStorage('referrals');
};

export const deleteReferral = async (id: string): Promise<void> => {
  await deleteDoc(doc(referralsCollection, id));
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי הפניות');
  await updateTableTimestamp('referrals');
  localStorageService.invalidateLocalStorage('referrals');
};

// פונקציה לבדיקה אם הפניה פעילה כרגע
const isReferralActive = (date: string, departureTime: string, returnTime: string): boolean => {
  const now = getCurrentIsraelTime();
  const referralDate = new Date(date);
  
  // בדיקה אם זה אותו יום
  if (now.toDateString() !== referralDate.toDateString()) {
    return false;
  }
  
  // יצירת תאריכים עם שעות
  const departureDateTime = new Date(date + 'T' + departureTime);
  const returnDateTime = new Date(date + 'T' + returnTime);
  
  return isTimeInRange(now, departureDateTime, returnDateTime);
}; 