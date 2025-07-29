import { Referral } from '../models/Referral';
import { USE_MOCK } from './mockDatabase';

// Mock functions
const mockReferrals: Referral[] = [
  {
    id: '1',
    soldierId: '1',
    soldierName: 'יוסי כהן',
    personalNumber: '123456789',
    team: 'צוות 10',
    date: '2024-01-15',
    location: 'בית חולים רמב"ם',
    reason: 'בדיקה רפואית שגרתית',
    status: 'completed',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-15T14:00:00Z'
  },
  {
    id: '2',
    soldierId: '2',
    soldierName: 'דוד לוי',
    personalNumber: '987654321',
    team: 'צוות 20',
    date: '2024-01-20',
    location: 'מרפאה צבאית',
    reason: 'בדיקת שיניים',
    status: 'pending',
    createdAt: '2024-01-18T09:00:00Z',
    updatedAt: '2024-01-18T09:00:00Z'
  },
  {
    id: '3',
    soldierId: '3',
    soldierName: 'אברהם ישראלי',
    personalNumber: '456789123',
    team: 'צוות 30',
    date: '2024-01-25',
    location: 'בית חולים סורוקה',
    reason: 'בדיקת לב',
    status: 'in_progress',
    createdAt: '2024-01-22T11:00:00Z',
    updatedAt: '2024-01-24T16:00:00Z'
  }
];

export const mockGetAllReferrals = async (): Promise<Referral[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...mockReferrals]), 100);
  });
};

export const mockGetReferralById = async (id: string): Promise<Referral | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const referral = mockReferrals.find(r => r.id === id);
      resolve(referral || null);
    }, 100);
  });
};

export const mockGetReferralsBySoldier = async (soldierId: string): Promise<Referral[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const referrals = mockReferrals.filter(r => r.soldierId === soldierId);
      resolve(referrals);
    }, 100);
  });
};

export const mockGetReferralsByTeam = async (team: string): Promise<Referral[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const referrals = mockReferrals.filter(r => r.team === team);
      resolve(referrals);
    }, 100);
  });
};

export const mockAddReferral = async (referral: Omit<Referral, 'id' | 'createdAt' | 'updatedAt'>): Promise<Referral> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newReferral: Referral = {
        ...referral,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      mockReferrals.push(newReferral);
      resolve(newReferral);
    }, 100);
  });
};

export const mockUpdateReferral = async (id: string, updates: Partial<Referral>): Promise<Referral> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockReferrals.findIndex(r => r.id === id);
      if (index === -1) {
        reject(new Error('Referral not found'));
        return;
      }
      mockReferrals[index] = {
        ...mockReferrals[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      resolve(mockReferrals[index]);
    }, 100);
  });
};

export const mockDeleteReferral = async (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockReferrals.findIndex(r => r.id === id);
      if (index === -1) {
        reject(new Error('Referral not found'));
        return;
      }
      mockReferrals.splice(index, 1);
      resolve();
    }, 100);
  });
};

// Firebase functions (placeholder for future use)
const getAllReferralsFirebase = async (): Promise<Referral[]> => {
  // TODO: Implement Firebase logic
  return [];
};

const getReferralByIdFirebase = async (id: string): Promise<Referral | null> => {
  // TODO: Implement Firebase logic
  return null;
};

const getReferralsBySoldierFirebase = async (soldierId: string): Promise<Referral[]> => {
  // TODO: Implement Firebase logic
  return [];
};

const getReferralsByTeamFirebase = async (team: string): Promise<Referral[]> => {
  // TODO: Implement Firebase logic
  return [];
};

const addReferralFirebase = async (referral: Omit<Referral, 'id' | 'createdAt' | 'updatedAt'>): Promise<Referral> => {
  // TODO: Implement Firebase logic
  throw new Error('Firebase not implemented');
};

const updateReferralFirebase = async (id: string, updates: Partial<Referral>): Promise<Referral> => {
  // TODO: Implement Firebase logic
  throw new Error('Firebase not implemented');
};

const deleteReferralFirebase = async (id: string): Promise<void> => {
  // TODO: Implement Firebase logic
  throw new Error('Firebase not implemented');
};

// Export functions based on USE_MOCK flag
export const getAllReferrals = USE_MOCK ? mockGetAllReferrals : getAllReferralsFirebase;
export const getReferralById = USE_MOCK ? mockGetReferralById : getReferralByIdFirebase;
export const getReferralsBySoldier = USE_MOCK ? mockGetReferralsBySoldier : getReferralsBySoldierFirebase;
export const getReferralsByTeam = USE_MOCK ? mockGetReferralsByTeam : getReferralsByTeamFirebase;
export const addReferral = USE_MOCK ? mockAddReferral : addReferralFirebase;
export const updateReferral = USE_MOCK ? mockUpdateReferral : updateReferralFirebase;
export const deleteReferral = USE_MOCK ? mockDeleteReferral : deleteReferralFirebase; 