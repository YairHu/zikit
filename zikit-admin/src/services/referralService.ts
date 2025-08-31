import { Referral } from '../models/Referral';
import { dataLayer } from './dataAccessLayer';


import { updateSoldierStatus } from './soldierService';
import { getCurrentIsraelTime, isTimeInRange } from '../utils/dateUtils';

const COLLECTION_NAME = 'referrals';

export const getAllReferrals = async (): Promise<Referral[]> => {
  return await dataLayer.getAll(COLLECTION_NAME) as unknown as Promise<Referral[]>;
};

export const getReferralById = async (id: string): Promise<Referral | null> => {
  return await dataLayer.getById(COLLECTION_NAME, id) as unknown as Promise<Referral | null>;
};

export const getReferralsBySoldier = async (soldierId: string): Promise<Referral[]> => {
  const allReferrals = await dataLayer.getAll(COLLECTION_NAME) as unknown as Referral[];
  return allReferrals.filter(referral => referral.soldierId === soldierId);
};

export const getReferralsByTeam = async (team: string): Promise<Referral[]> => {
  const allReferrals = await dataLayer.getAll(COLLECTION_NAME) as unknown as Referral[];
  return allReferrals.filter(referral => referral.team === team);
};

export const addReferral = async (referral: Omit<Referral, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const referralData = {
    ...referral,
    createdAt: getCurrentIsraelTime(),
    updatedAt: getCurrentIsraelTime()
  };
  
  return await dataLayer.create(COLLECTION_NAME, referralData as any);
};

export const updateReferral = async (id: string, updates: Partial<Referral>): Promise<void> => {
  const updateData = {
    ...updates,
    updatedAt: getCurrentIsraelTime()
  };
  
  await dataLayer.update(COLLECTION_NAME, id, updateData as any);
};

export const deleteReferral = async (id: string): Promise<void> => {
  return dataLayer.delete('referrals', id);
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