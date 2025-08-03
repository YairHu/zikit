import { Soldier } from '../models/Soldier';
import { Activity } from '../models/Activity';
import { Duty } from '../models/Duty';
import { Referral } from '../models/Referral';

// Mock database for development
const USE_MOCK = true;

// Mock soldiers with updated model
export const mockSoldiers: Soldier[] = [
  {
    id: 'mefaked_pluga',
    name: 'מפקד פלוגה',
    personalNumber: '1000001',
    frameworkId: '1', // פלוגת זיק"ת
    role: 'מפקד פלוגה',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B', 'C'],
    certifications: ['קורס מפקדי פלוגות'],
    presence: 'בבסיס',
    braurTest: {
      strength: 'passed',
      running: '12:30'
    },
    vacationDays: {
      total: 30,
      used: 5,
      status: 'good'
    }
  },
  {
    id: 'samal_pluga',
    name: 'סגן מפקד פלוגה',
    personalNumber: '1000002',
    frameworkId: '1', // פלוגת זיק"ת
    role: 'סגן מפקד פלוגה',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B', 'C'],
    certifications: ['קורס מפקדי צוותים'],
    presence: 'בבסיס',
    braurTest: {
      strength: 'passed',
      running: '13:00'
    },
    vacationDays: {
      total: 30,
      used: 10,
      status: 'good'
    }
  }
];

// Mock activities with updated model
export const mockActivities: Activity[] = [
  {
    id: '1',
    name: 'מארב ירי בדרך הרצים',
    frameworkId: '2', // פלגה א
    location: 'בית אל',
    region: 'בנימין',
    activityType: 'מארב ירי',
    plannedDate: '2024-01-20',
    plannedTime: '20:00',
    duration: 6,
    commanderId: 'mefaked_pluga',
    commanderName: 'מפקד פלוגה',
    taskLeaderId: 'samal_pluga',
    taskLeaderName: 'סגן מפקד פלוגה',
    participants: [],
    status: 'מתוכננת',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  }
];

// Mock duties with updated model
export const mockDuties: Duty[] = [
  {
    id: '1',
    type: 'מטבח',
    location: 'בסיס',
    startDate: '2024-01-20',
    startTime: '06:00',
    endTime: '18:00',
    frameworkId: '2', // פלגה א
    participants: [],
    status: 'פעילה',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  }
];

// Mock referrals with updated model  
export const mockReferrals: Referral[] = [
  {
    id: '1',
    soldierId: 'mefaked_pluga',
    soldierName: 'מפקד פלוגה',
    personalNumber: '1000001',
    frameworkId: '1', // פלוגת זיק"ת
    date: '2024-01-20',
    location: 'מרפאה',
    reason: 'בדיקה רפואית',
    status: 'pending',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  }
];

// Mock functions
export const mockGetAllSoldiers = async (): Promise<Soldier[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...mockSoldiers]), 100);
  });
};

export const mockGetSoldierById = async (id: string): Promise<Soldier | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const soldier = mockSoldiers.find(s => s.id === id);
      resolve(soldier || null);
    }, 100);
  });
};

export const mockAddSoldier = async (soldier: Omit<Soldier, 'id'>): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newId = `soldier_${Date.now()}`;
      mockSoldiers.push({ ...soldier, id: newId } as Soldier);
      resolve(newId);
    }, 100);
  });
};

export const mockUpdateSoldier = async (id: string, updates: Partial<Soldier>): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = mockSoldiers.findIndex(s => s.id === id);
      if (index !== -1) {
        mockSoldiers[index] = { ...mockSoldiers[index], ...updates };
      }
      resolve();
    }, 100);
  });
};

export const mockDeleteSoldier = async (id: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = mockSoldiers.findIndex(s => s.id === id);
      if (index !== -1) {
        mockSoldiers.splice(index, 1);
      }
      resolve();
    }, 100);
  });
};

export const mockGetActivitiesByTeam = async (frameworkId: string): Promise<Activity[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const activities = mockActivities.filter(a => 
        a.frameworkId === frameworkId || a.team === frameworkId
      );
      resolve(activities);
    }, 100);
  });
};

export const mockGetDutiesByTeam = async (frameworkId: string): Promise<Duty[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const duties = mockDuties.filter(d => 
        d.frameworkId === frameworkId || d.team === frameworkId
      );
      resolve(duties);
    }, 100);
  });
};

export const mockGetReferralsByTeam = async (frameworkId: string): Promise<Referral[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const referrals = mockReferrals.filter(r => 
        r.frameworkId === frameworkId || r.team === frameworkId
      );
      resolve(referrals);
    }, 100);
  });
};