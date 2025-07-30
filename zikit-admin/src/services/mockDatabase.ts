import { Soldier } from '../models/Soldier';
import { Vehicle } from '../models/Vehicle';
import { Activity } from '../models/Activity';
import { Duty } from '../models/Duty';
import { Mission } from '../models/Mission';
import { Referral } from '../models/Referral';

// פונקציה לחישוב מצב ימי החופש
const calculateVacationStatus = (totalDays: number): 'good' | 'warning' | 'critical' => {
  const currentDate = new Date();
  const endOfYear = new Date(currentDate.getFullYear(), 11, 31); // 31 בדצמבר
  const daysUntilEndOfYear = Math.ceil((endOfYear.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  const monthsUntilEndOfYear = daysUntilEndOfYear / 30;
  
  // אם נותר חצי שנה או פחות
  if (monthsUntilEndOfYear <= 6) {
    // אם יש יותר מ-9 ימי חופש - מצב קריטי
    if (totalDays > 9) return 'critical';
    // אם יש 6-9 ימי חופש - אזהרה
    if (totalDays > 6) return 'warning';
  }
  
  return 'good';
};

// Mock Database Configuration
export const USE_MOCK = true; // Set to false to use Firebase

// Mock Data
let mockSoldiers: Soldier[] = [];
let mockVehicles: Vehicle[] = [];
let mockActivities: Activity[] = [];
let mockDuties: Duty[] = [];
let mockMissions: Mission[] = [];
let mockReferrals: Referral[] = [];

// Soldier Operations
export const mockGetAllSoldiers = async (): Promise<Soldier[]> => {
  return [...mockSoldiers];
};

export const mockGetSoldierById = async (id: string): Promise<Soldier | null> => {
  return mockSoldiers.find(s => s.id === id) || null;
};

export const mockAddSoldier = async (soldier: Omit<Soldier, 'id'>): Promise<string> => {
  const newSoldier: Soldier = {
    ...soldier,
    id: Date.now().toString()
  };
  mockSoldiers.push(newSoldier);
  return newSoldier.id;
};

export const mockUpdateSoldier = async (id: string, updates: Partial<Soldier>): Promise<void> => {
  const index = mockSoldiers.findIndex(s => s.id === id);
  if (index !== -1) {
    mockSoldiers[index] = { ...mockSoldiers[index], ...updates };
  }
};

export const mockDeleteSoldier = async (id: string): Promise<void> => {
  mockSoldiers = mockSoldiers.filter(s => s.id !== id);
};

// Vehicle Operations
export const mockGetAllVehicles = async (): Promise<Vehicle[]> => {
  // עדכון הסטטוס של הרכבים בהתאם לפעילויות
  const updatedVehicles = mockVehicles.map(vehicle => {
    // בדיקה אם הרכב משובץ לפעילות פעילה
    const assignedActivity = mockActivities.find(activity => 
      activity.vehicleId === vehicle.id && 
      ['מתוכננת', 'בביצוע'].includes(activity.status)
    );
    
    if (assignedActivity) {
      return {
        ...vehicle,
        status: 'on_mission' as const,
        currentMissionId: assignedActivity.id,
        returnEstimate: assignedActivity.plannedDate
      };
    } else {
      return {
        ...vehicle,
        status: 'available' as const,
        currentMissionId: undefined,
        returnEstimate: undefined
      };
    }
  });
  
  return updatedVehicles;
};

export const mockAddVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<string> => {
  const newVehicle: Vehicle = {
    ...vehicle,
    id: Date.now().toString()
  };
  mockVehicles.push(newVehicle);
  return newVehicle.id;
};

export const mockUpdateVehicle = async (id: string, updates: Partial<Vehicle>): Promise<void> => {
  const index = mockVehicles.findIndex(v => v.id === id);
  if (index !== -1) {
    mockVehicles[index] = { ...mockVehicles[index], ...updates };
  }
};

export const mockDeleteVehicle = async (id: string): Promise<void> => {
  mockVehicles = mockVehicles.filter(v => v.id !== id);
};

// Activity Operations
export const mockGetAllActivities = async (): Promise<Activity[]> => {
  return [...mockActivities];
};

export const mockGetActivityById = async (id: string): Promise<Activity | null> => {
  return mockActivities.find(a => a.id === id) || null;
};

export const mockAddActivity = async (activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const newActivity: Activity = {
    ...activity,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockActivities.push(newActivity);
  
  // עדכון הסטטוס של הרכב אם יש רכב משובץ
  if (newActivity.vehicleId) {
    const vehicleIndex = mockVehicles.findIndex(v => v.id === newActivity.vehicleId);
    if (vehicleIndex !== -1) {
      mockVehicles[vehicleIndex].status = 'on_mission';
    }
  }
  
  return newActivity.id;
};

export const mockUpdateActivity = async (id: string, updates: Partial<Activity>): Promise<void> => {
  const activityIndex = mockActivities.findIndex(a => a.id === id);
  if (activityIndex === -1) {
    throw new Error('Activity not found');
  }
  
  const oldActivity = mockActivities[activityIndex];
  const updatedActivity = { ...oldActivity, ...updates, updatedAt: new Date().toISOString() };
  mockActivities[activityIndex] = updatedActivity;
  
  // עדכון הסטטוס של הרכב
  const oldVehicleId = oldActivity.vehicleId;
  const newVehicleId = updatedActivity.vehicleId;
  const newStatus = updatedActivity.status;
  
  // אם הרכב השתנה או הסטטוס השתנה
  if (oldVehicleId !== newVehicleId || oldActivity.status !== newStatus) {
    // שחרור הרכב הישן אם הוא לא משובץ לפעילות אחרת
    if (oldVehicleId && oldVehicleId !== newVehicleId) {
      const isStillAssigned = mockActivities.some(a => 
        a.id !== id && 
        a.vehicleId === oldVehicleId && 
        ['מתוכננת', 'בביצוע'].includes(a.status)
      );
      
      if (!isStillAssigned) {
        const oldVehicleIndex = mockVehicles.findIndex(v => v.id === oldVehicleId);
        if (oldVehicleIndex !== -1) {
          mockVehicles[oldVehicleIndex].status = 'available';
        }
      }
    }
    
    // עדכון הרכב החדש
    if (newVehicleId && ['מתוכננת', 'בביצוע'].includes(newStatus)) {
      const newVehicleIndex = mockVehicles.findIndex(v => v.id === newVehicleId);
      if (newVehicleIndex !== -1) {
        mockVehicles[newVehicleIndex].status = 'on_mission';
      }
    } else if (newVehicleId && ['הסתיימה', 'בוטלה'].includes(newStatus)) {
      // שחרור הרכב אם הפעילות הסתיימה או בוטלה
      const newVehicleIndex = mockVehicles.findIndex(v => v.id === newVehicleId);
      if (newVehicleIndex !== -1) {
        mockVehicles[newVehicleIndex].status = 'available';
      }
    }
  }
};

export const mockDeleteActivity = async (id: string): Promise<void> => {
  const activityIndex = mockActivities.findIndex(a => a.id === id);
  if (activityIndex === -1) {
    throw new Error('Activity not found');
  }
  
  const deletedActivity = mockActivities[activityIndex];
  
  // שחרור הרכב אם הוא לא משובץ לפעילות אחרת
  if (deletedActivity.vehicleId) {
    const isStillAssigned = mockActivities.some(a => 
      a.id !== id && 
      a.vehicleId === deletedActivity.vehicleId && 
      ['מתוכננת', 'בביצוע'].includes(a.status)
    );
    
    if (!isStillAssigned) {
      const vehicleIndex = mockVehicles.findIndex(v => v.id === deletedActivity.vehicleId);
      if (vehicleIndex !== -1) {
        mockVehicles[vehicleIndex].status = 'available';
      }
    }
  }
  
  mockActivities.splice(activityIndex, 1);
};

export const mockGetActivitiesByTeam = async (team: string): Promise<Activity[]> => {
  return mockActivities.filter(a => 
    ['מתוכננת', 'בביצוע'].includes(a.status) &&
    (a.team === team || 
     // אם יש חיילים מהצוות שמשתתפים בפעילות
     a.participants.some(p => {
       const soldier = mockSoldiers.find(s => s.id === p.soldierId);
       return soldier && soldier.team === team;
     }) ||
     // אם המפקד, מוביל המשימה או הנהג הם מהצוות
     (() => {
       const commander = mockSoldiers.find(s => s.id === a.commanderId);
       const taskLeader = mockSoldiers.find(s => s.id === a.taskLeaderId);
       const driver = mockSoldiers.find(s => s.id === a.driverId);
       return (commander && commander.team === team) ||
              (taskLeader && taskLeader.team === team) ||
              (driver && driver.team === team);
     })())
  );
};

export const mockGetActivitiesBySoldier = async (soldierId: string): Promise<Activity[]> => {
  return mockActivities.filter(a => 
    ['מתוכננת', 'בביצוע'].includes(a.status) &&
    (a.commanderId === soldierId || 
     a.taskLeaderId === soldierId ||
     a.participants.some(p => p.soldierId === soldierId))
  );
};

// Duty Operations
export const mockGetAllDuties = async (): Promise<Duty[]> => {
  return [...mockDuties];
};

export const mockGetDutyById = async (id: string): Promise<Duty | null> => {
  return mockDuties.find(d => d.id === id) || null;
};

export const mockAddDuty = async (duty: Omit<Duty, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = new Date().toISOString();
  const newDuty: Duty = {
    ...duty,
    id: Date.now().toString(),
    createdAt: now,
    updatedAt: now
  };
  mockDuties.push(newDuty);
  return newDuty.id;
};

export const mockUpdateDuty = async (id: string, updates: Partial<Duty>): Promise<void> => {
  const index = mockDuties.findIndex(d => d.id === id);
  if (index !== -1) {
    mockDuties[index] = { 
      ...mockDuties[index], 
      ...updates,
      updatedAt: new Date().toISOString()
    };
  }
};

export const mockDeleteDuty = async (id: string): Promise<void> => {
  mockDuties = mockDuties.filter(d => d.id !== id);
};

export const mockGetDutiesByTeam = async (team: string): Promise<Duty[]> => {
  return mockDuties.filter(d => 
    d.status === 'פעילה' &&
    (d.team === team || 
     // אם יש חיילים מהצוות שמשתתפים בתורנות
     d.participants.some(p => {
       const soldier = mockSoldiers.find(s => s.id === p.soldierId);
       return soldier && soldier.team === team;
     }))
  );
};

export const mockGetDutiesBySoldier = async (soldierId: string): Promise<Duty[]> => {
  return mockDuties.filter(d => 
    d.status === 'פעילה' &&
    d.participants.some(p => p.soldierId === soldierId)
  );
};

// Mission Operations
export const mockGetAllMissions = async (): Promise<Mission[]> => {
  return [...mockMissions];
};

export const mockGetMissionById = async (id: string): Promise<Mission | null> => {
  return mockMissions.find(m => m.id === id) || null;
};

export const mockAddMission = async (mission: Omit<Mission, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const newMission: Mission = {
    ...mission,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockMissions.push(newMission);
  return newMission.id;
};

export const mockUpdateMission = async (id: string, updates: Partial<Mission>): Promise<void> => {
  const index = mockMissions.findIndex(m => m.id === id);
  if (index !== -1) {
    mockMissions[index] = { 
      ...mockMissions[index], 
      ...updates,
      updatedAt: new Date().toISOString()
    };
  }
};

export const mockDeleteMission = async (id: string): Promise<void> => {
  mockMissions = mockMissions.filter(m => m.id !== id);
};

// Referral Operations
export const mockGetAllReferrals = async (): Promise<Referral[]> => {
  return [...mockReferrals];
};

export const mockGetReferralById = async (id: string): Promise<Referral | null> => {
  return mockReferrals.find(r => r.id === id) || null;
};

export const mockAddReferral = async (referral: Omit<Referral, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const newReferral: Referral = {
    ...referral,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  mockReferrals.push(newReferral);
  return newReferral.id;
};

export const mockUpdateReferral = async (id: string, updates: Partial<Referral>): Promise<void> => {
  const index = mockReferrals.findIndex(r => r.id === id);
  if (index !== -1) {
    mockReferrals[index] = { 
      ...mockReferrals[index], 
      ...updates,
      updatedAt: new Date().toISOString()
    };
  }
};

export const mockDeleteReferral = async (id: string): Promise<void> => {
  mockReferrals = mockReferrals.filter(r => r.id !== id);
};

export const mockGetReferralsBySoldier = async (soldierId: string): Promise<Referral[]> => {
  return mockReferrals.filter(r => r.soldierId === soldierId);
};

export const mockGetReferralsByTeam = async (team: string): Promise<Referral[]> => {
  return mockReferrals.filter(r => r.team === team);
};

// Seed Mock Data
export const seedMockData = () => {
  // נתוני חיילים דמו מלאים מ-seedData
  mockSoldiers = [
    // מפקדי פלוגה
    {
      id: '1',
      name: 'מפקד פלוגה',
      personalNumber: '1000001',
      team: 'מפקדה',
      role: 'מפקד פלוגה',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי פלוגות'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה א',
        miflag: 'מפלג א',
        tzevet: 'מפקדה'
      },
      commanders: {
        mefakedTzevet: '',
        mefakedMiflag: '',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: ''
      },
      vacationDays: {
        total: 30,
        used: 10,
        status: calculateVacationStatus(20)
      },
      presence: 'בבסיס'
    },
    {
      id: '2',
      name: 'סגן מפקד פלוגה',
      personalNumber: '1000002',
      team: 'מפקדה',
      role: 'סגן מפקד פלוגה',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי צוותים'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה א',
        miflag: 'מפלג א',
        tzevet: 'מפקדה'
      },
      commanders: {
        mefakedTzevet: '',
        mefakedMiflag: '',
        samal: '',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 8,
        status: calculateVacationStatus(22)
      },
      presence: 'בבסיס'
    },
    {
      id: '3',
      name: 'מפקד פלגה א',
      personalNumber: '1000003',
      team: 'פלגה א',
      role: 'מפקד פלגה',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי צוותים'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה א',
        miflag: 'מפלג א',
        tzevet: 'פלגה א'
      },
      commanders: {
        mefakedTzevet: '',
        mefakedMiflag: '',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 12,
        status: calculateVacationStatus(18)
      },
      presence: 'בבסיס'
    },
    {
      id: '4',
      name: 'מפקד פלגה ב',
      personalNumber: '1000004',
      team: 'פלגה ב',
      role: 'מפקד פלגה',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי צוותים'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה ב',
        miflag: 'מפלג ב',
        tzevet: 'פלגה ב'
      },
      commanders: {
        mefakedTzevet: '',
        mefakedMiflag: '',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 15,
        status: calculateVacationStatus(15)
      },
      presence: 'בבסיס'
    },
    {
      id: '5',
      name: 'מפקד פלגה זווית',
      personalNumber: '1000005',
      team: 'פלגה זווית',
      role: 'מפקד פלגה',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי צוותים'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה זווית',
        miflag: 'מפלג זווית',
        tzevet: 'פלגה זווית'
      },
      commanders: {
        mefakedTzevet: '',
        mefakedMiflag: '',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 7,
        status: calculateVacationStatus(23)
      },
      presence: 'בבסיס'
    },
    // מפל"ג
    {
      id: '6',
      name: 'רספ',
      personalNumber: '1000006',
      team: 'מפקדה',
      role: 'רספ',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
      licenses: ['B'],
      certifications: ['קורס רספ'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה א',
        miflag: 'מפלג א',
        tzevet: 'מפקדה'
      },
      commanders: {
        mefakedTzevet: '',
        mefakedMiflag: '',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 9,
        status: calculateVacationStatus(21)
      },
      presence: 'בבסיס'
    },
    {
      id: '7',
      name: 'סרספ',
      personalNumber: '1000007',
      team: 'מפקדה',
      role: 'סרספ',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
      licenses: ['B'],
      certifications: ['קורס סרספ'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה א',
        miflag: 'מפלג א',
        tzevet: 'מפקדה'
      },
      commanders: {
        mefakedTzevet: '',
        mefakedMiflag: '',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 11,
        status: calculateVacationStatus(19)
      },
      presence: 'בבסיס'
    },
    // צוות 10
    {
      id: '15',
      name: 'מפקד צוות 10',
      personalNumber: '1000015',
      team: 'צוות 10',
      role: 'מפקד צוות',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B'],
      certifications: ['קורס מפקדי צוותים'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה א',
        miflag: 'מפלג א',
        tzevet: 'צוות 10'
      },
      commanders: {
        mefakedTzevet: '',
        mefakedMiflag: 'מפקד פלגה א',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 6,
        status: calculateVacationStatus(24)
      },
      presence: 'בבסיס'
    },
    {
      id: '16',
      name: 'סמל צוות 10',
      personalNumber: '1000016',
      team: 'צוות 10',
      role: 'סמל',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'חובש'],
      licenses: ['B'],
      certifications: ['קורס סמלים'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה א',
        miflag: 'מפלג א',
        tzevet: 'צוות 10'
      },
      commanders: {
        mefakedTzevet: 'מפקד צוות 10',
        mefakedMiflag: 'מפקד פלגה א',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 8,
        status: calculateVacationStatus(22)
      },
      presence: 'בבסיס'
    },
    {
      id: '19',
      name: 'חייל 1 צוות 10',
      personalNumber: '1000019',
      team: 'צוות 10',
      role: 'חייל',
      profile: '97',
      qualifications: ['רוגר', 'נהג', 'חובש'],
      licenses: ['B', 'C'],
      certifications: ['הסמכת רוגר'],
      drivingLicenses: ['35', 'דימקס'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה א',
        miflag: 'מפלג א',
        tzevet: 'צוות 10'
      },
      commanders: {
        mefakedTzevet: 'מפקד צוות 10',
        mefakedMiflag: 'מפקד פלגה א',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 12,
        status: calculateVacationStatus(18)
      },
      presence: 'בבסיס'
    },
    {
      id: '20',
      name: 'חייל 2 צוות 10',
      personalNumber: '1000020',
      team: 'צוות 10',
      role: 'חייל',
      profile: '97',
      qualifications: ['קלע', 'צלם', 'מטמין'],
      licenses: ['B'],
      certifications: ['הסמכת קלע'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה א',
        miflag: 'מפלג א',
        tzevet: 'צוות 10'
      },
      commanders: {
        mefakedTzevet: 'מפקד צוות 10',
        mefakedMiflag: 'מפקד פלגה א',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 5,
        status: calculateVacationStatus(25)
      },
      presence: 'בבסיס'
    },
    // צוות 20
    {
      id: '24',
      name: 'מפקד צוות 20',
      personalNumber: '1000024',
      team: 'צוות 20',
      role: 'מפקד צוות',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B'],
      certifications: ['קורס מפקדי צוותים'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה ב',
        miflag: 'מפלג ב',
        tzevet: 'צוות 20'
      },
      commanders: {
        mefakedTzevet: '',
        mefakedMiflag: 'מפקד פלגה ב',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 10,
        status: calculateVacationStatus(20)
      },
      presence: 'בבסיס'
    },
    {
      id: '28',
      name: 'חייל 1 צוות 20',
      personalNumber: '1000028',
      team: 'צוות 20',
      role: 'חייל',
      profile: '97',
      qualifications: ['רוגר', 'נהג', 'חובש'],
      licenses: ['B', 'C'],
      certifications: ['הסמכת רוגר'],
      drivingLicenses: ['35', 'דימקס', 'סוואנה'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה ב',
        miflag: 'מפלג ב',
        tzevet: 'צוות 20'
      },
      commanders: {
        mefakedTzevet: 'מפקד צוות 20',
        mefakedMiflag: 'מפקד פלגה ב',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 7,
        status: calculateVacationStatus(23)
      },
      presence: 'בבסיס'
    },
    // צוות 30
    {
      id: '33',
      name: 'מפקד צוות 30',
      personalNumber: '1000033',
      team: 'צוות 30',
      role: 'מפקד צוות',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B'],
      certifications: ['קורס מפקדי צוותים'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה א',
        miflag: 'מפלג א',
        tzevet: 'צוות 30'
      },
      commanders: {
        mefakedTzevet: '',
        mefakedMiflag: 'מפקד פלגה א',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 9,
        status: calculateVacationStatus(21)
      },
      presence: 'בבסיס'
    },
    {
      id: '37',
      name: 'חייל 1 צוות 30',
      personalNumber: '1000037',
      team: 'צוות 30',
      role: 'חייל',
      profile: '97',
      qualifications: ['רוגר', 'נהג', 'חובש'],
      licenses: ['B', 'C'],
      certifications: ['הסמכת רוגר'],
      drivingLicenses: ['דימקס', 'סוואנה'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה א',
        miflag: 'מפלג א',
        tzevet: 'צוות 30'
      },
      commanders: {
        mefakedTzevet: 'מפקד צוות 30',
        mefakedMiflag: 'מפקד פלגה א',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 14,
        status: calculateVacationStatus(16)
      },
      presence: 'בבסיס'
    },
    // צוות 40
    {
      id: '42',
      name: 'מפקד צוות 40',
      personalNumber: '1000042',
      team: 'צוות 40',
      role: 'מפקד צוות',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B'],
      certifications: ['קורס מפקדי צוותים'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה ב',
        miflag: 'מפלג ב',
        tzevet: 'צוות 40'
      },
      commanders: {
        mefakedTzevet: '',
        mefakedMiflag: 'מפקד פלגה ב',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 11,
        status: calculateVacationStatus(19)
      },
      presence: 'בבסיס'
    },
    {
      id: '46',
      name: 'חייל 1 צוות 40',
      personalNumber: '1000046',
      team: 'צוות 40',
      role: 'חייל',
      profile: '97',
      qualifications: ['מטמין', 'טכנולוג', 'בנאי'],
      licenses: ['B'],
      certifications: ['הסמכת מטמין'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה ב',
        miflag: 'מפלג ב',
        tzevet: 'צוות 40'
      },
      commanders: {
        mefakedTzevet: 'מפקד צוות 40',
        mefakedMiflag: 'מפקד פלגה ב',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 6,
        status: calculateVacationStatus(24)
      },
      presence: 'בבסיס'
    },
    // צוות 50
    {
      id: '51',
      name: 'מפקד צוות 50',
      personalNumber: '1000051',
      team: 'צוות 50',
      role: 'מפקד צוות',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B'],
      certifications: ['קורס מפקדי צוותים'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה זווית',
        miflag: 'מפלג זווית',
        tzevet: 'צוות 50'
      },
      commanders: {
        mefakedTzevet: '',
        mefakedMiflag: 'מפקד פלגה זווית',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 8,
        status: calculateVacationStatus(22)
      },
      presence: 'בבסיס'
    },
    {
      id: '55',
      name: 'חייל 1 צוות 50',
      personalNumber: '1000055',
      team: 'צוות 50',
      role: 'חייל',
      profile: '97',
      qualifications: ['רוגר', 'נהג', 'חובש'],
      licenses: ['B', 'C'],
      certifications: ['הסמכת רוגר'],
      drivingLicenses: ['35', 'דימקס', 'סוואנה'],
      framework: {
        pluga: 'פלוגה א',
        pelaga: 'פלגה זווית',
        miflag: 'מפלג זווית',
        tzevet: 'צוות 50'
      },
      commanders: {
        mefakedTzevet: 'מפקד צוות 50',
        mefakedMiflag: 'מפקד פלגה זווית',
        samal: 'סגן מפקד פלוגה',
        mefakedPluga: 'מפקד פלוגה'
      },
      vacationDays: {
        total: 30,
        used: 13,
        status: calculateVacationStatus(17)
      },
      presence: 'בבסיס'
    }
  ];

  // נתוני רכבים דמו מלאים מ-seedData
  mockVehicles = [
    {
      id: '1',
      type: 'סוואנה',
      number: '12-345-67',
      mileage: 85000,
      lastMaintenance: '2024-01-15',
      nextMaintenance: '2024-04-15',
      status: 'available'
    },
    {
      id: '2',
      type: 'סוואנה',
      number: '12-345-68',
      mileage: 92000,
      lastMaintenance: '2024-01-20',
      nextMaintenance: '2024-04-20',
      status: 'available'
    },
    {
      id: '3',
      type: 'סוואנה',
      number: '12-345-69',
      mileage: 78000,
      lastMaintenance: '2023-12-10',
      nextMaintenance: '2024-03-10',
      status: 'maintenance'
    },
    {
      id: '4',
      type: 'זאב',
      number: '12-345-70',
      mileage: 65000,
      lastMaintenance: '2024-01-25',
      nextMaintenance: '2024-04-25',
      status: 'available'
    },
    {
      id: '5',
      type: 'דוד',
      number: '12-345-71',
      mileage: 120000,
      lastMaintenance: '2024-01-05',
      nextMaintenance: '2024-04-05',
      status: 'available'
    },
    {
      id: '6',
      type: 'דוד',
      number: '12-345-72',
      mileage: 95000,
      lastMaintenance: '2024-01-12',
      nextMaintenance: '2024-04-12',
      status: 'on_mission'
    },
    {
      id: '7',
      type: 'דימקס אפורה',
      number: '12-345-73',
      mileage: 110000,
      lastMaintenance: '2024-01-08',
      nextMaintenance: '2024-04-08',
      status: 'available'
    },
    {
      id: '8',
      type: 'דימקס לבנה',
      number: '12-345-74',
      mileage: 88000,
      lastMaintenance: '2024-01-18',
      nextMaintenance: '2024-04-18',
      status: 'available'
    },
    {
      id: '9',
      type: 'סופה',
      number: '12-345-75',
      mileage: 72000,
      lastMaintenance: '2024-01-30',
      nextMaintenance: '2024-04-30',
      status: 'available'
    }
  ];

  // Seed Activities
  mockActivities = [
    {
      id: '1',
      name: 'סיור ביטחון',
      team: 'צוות 10',
      location: 'גבעת המורה',
      region: 'מנשה',
      activityType: 'מארב ירי',
      plannedDate: '2024-01-15',
      plannedTime: '08:00',
      duration: 4,
      commanderId: '1000015',
      commanderName: 'מפקד צוות 10',
      taskLeaderId: '1000016',
      taskLeaderName: 'סמל צוות 10',
      vehicleId: '1',
      vehicleNumber: '12-345-67',
      driverId: '1000019',
      driverName: 'חייל 1 צוות 10',
      participants: [
        {
          soldierId: '1000015',
          soldierName: 'מפקד צוות 10',
          personalNumber: '1000015',
          role: 'מפקד'
        },
        {
          soldierId: '1000016',
          soldierName: 'סמל צוות 10',
          personalNumber: '1000016',
          role: 'חובש'
        },
        {
          soldierId: '1000019',
          soldierName: 'חייל 1 צוות 10',
          personalNumber: '1000019',
          role: 'נהג'
        }
      ],
      status: 'הסתיימה',
      deliverables: [
        {
          id: '1',
          type: 'text',
          content: 'הפעילות הושלמה בהצלחה. זוהו 3 נקודות חשודות שטופלו.',
          title: 'דוח סיכום',
          createdAt: '2024-01-15T12:00:00Z',
          createdBy: 'מפקד צוות 10'
        }
      ],
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-15T12:00:00Z'
    },
    {
      id: '2',
      name: 'אבטחת אירוע',
      team: 'צוות 20',
      location: 'מרכז העיר',
      region: 'שומרון',
      activityType: 'אמלמ',
      plannedDate: '2024-01-20',
      plannedTime: '14:00',
      duration: 6,
      commanderId: '1000024',
      commanderName: 'מפקד צוות 20',
      taskLeaderId: '1000025',
      taskLeaderName: 'סמל צוות 20',
      vehicleId: '2',
      vehicleNumber: '12-345-68',
      driverId: '1000028',
      driverName: 'חייל 1 צוות 20',
      participants: [
        {
          soldierId: '1000024',
          soldierName: 'מפקד צוות 20',
          personalNumber: '1000024',
          role: 'מפקד'
        },
        {
          soldierId: '1000025',
          soldierName: 'סמל צוות 20',
          personalNumber: '1000025',
          role: 'חובש'
        },
        {
          soldierId: '1000028',
          soldierName: 'חייל 1 צוות 20',
          personalNumber: '1000028',
          role: 'נהג'
        }
      ],
      status: 'הסתיימה',
      deliverables: [
        {
          id: '2',
          type: 'text',
          content: 'האירוע הובטח בהצלחה. לא היו אירועים חריגים.',
          title: 'דוח אבטחה',
          createdAt: '2024-01-20T20:00:00Z',
          createdBy: 'מפקד צוות 20'
        }
      ],
      createdAt: '2024-01-12T10:00:00Z',
      updatedAt: '2024-01-20T20:00:00Z'
    },
    {
      id: '3',
      name: 'סיור גבול',
      team: 'צוות 30',
      location: 'גבול הצפון',
      region: 'הבקעה והעמקים',
      activityType: 'זווית אחרת',
      plannedDate: '2024-01-25',
      plannedTime: '06:00',
      duration: 8,
      commanderId: '1000033',
      commanderName: 'מפקד צוות 30',
      taskLeaderId: '1000034',
      taskLeaderName: 'סמל צוות 30',
      vehicleId: '4',
      vehicleNumber: '12-345-70',
      driverId: '1000041',
      driverName: 'חייל 5 צוות 30',
      participants: [
        {
          soldierId: '1000033',
          soldierName: 'מפקד צוות 30',
          personalNumber: '1000033',
          role: 'מפקד'
        },
        {
          soldierId: '1000034',
          soldierName: 'סמל צוות 30',
          personalNumber: '1000034',
          role: 'חובש'
        },
        {
          soldierId: '1000041',
          soldierName: 'חייל 5 צוות 30',
          personalNumber: '1000041',
          role: 'נהג'
        }
      ],
      status: 'בביצוע',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-25T06:00:00Z'
    },
    {
      id: '4',
      name: 'תרגיל שטח',
      team: 'צוות 40',
      location: 'אזור אימונים',
      region: 'יהודה',
      activityType: 'אחר',
      activityTypeOther: 'תרגיל ניווט',
      plannedDate: '2024-01-30',
      plannedTime: '07:00',
      duration: 5,
      commanderId: '1000042',
      commanderName: 'מפקד צוות 40',
      taskLeaderId: '1000043',
      taskLeaderName: 'סמל צוות 40',
      vehicleId: '5',
      vehicleNumber: '12-345-71',
      driverId: '1000048',
      driverName: 'חייל 3 צוות 40',
      participants: [
        {
          soldierId: '1000042',
          soldierName: 'מפקד צוות 40',
          personalNumber: '1000042',
          role: 'מפקד'
        },
        {
          soldierId: '1000043',
          soldierName: 'סמל צוות 40',
          personalNumber: '1000043',
          role: 'חובש'
        },
        {
          soldierId: '1000048',
          soldierName: 'חייל 3 צוות 40',
          personalNumber: '1000048',
          role: 'נהג'
        }
      ],
      status: 'מתוכננת',
      createdAt: '2024-01-18T10:00:00Z',
      updatedAt: '2024-01-18T10:00:00Z'
    },
    {
      id: '5',
      name: 'בדיקת ציוד',
      team: 'צוות 50',
      location: 'מחסן הציוד',
      region: 'בנימין',
      activityType: 'אמלמ',
      plannedDate: '2024-02-05',
      plannedTime: '09:00',
      duration: 3,
      commanderId: '1000051',
      commanderName: 'מפקד צוות 50',
      taskLeaderId: '1000052',
      taskLeaderName: 'סמל צוות 50',
      participants: [
        {
          soldierId: '1000051',
          soldierName: 'מפקד צוות 50',
          personalNumber: '1000051',
          role: 'מפקד'
        },
        {
          soldierId: '1000052',
          soldierName: 'סמל צוות 50',
          personalNumber: '1000052',
          role: 'חובש'
        },
        {
          soldierId: '1000055',
          soldierName: 'חייל 1 צוות 50',
          personalNumber: '1000055',
          role: 'טכנאי'
        }
      ],
      status: 'הסתיימה',
      deliverables: [
        {
          id: '3',
          type: 'text',
          content: 'כל הציוד נמצא תקין. נדרש להחליף 2 פנסים.',
          title: 'דוח בדיקה',
          createdAt: '2024-02-05T12:00:00Z',
          createdBy: 'מפקד צוות 50'
        }
      ],
      createdAt: '2024-01-20T10:00:00Z',
      updatedAt: '2024-02-05T12:00:00Z'
    },
    {
      id: '6',
      name: 'סיור לילה',
      team: 'צוות 10',
      location: 'שטח פתוח',
      region: 'עציון',
      activityType: 'מארב ירי',
      plannedDate: '2024-02-10',
      plannedTime: '22:00',
      duration: 6,
      commanderId: '1000015',
      commanderName: 'מפקד צוות 10',
      taskLeaderId: '1000016',
      taskLeaderName: 'סמל צוות 10',
      vehicleId: '1',
      vehicleNumber: '12-345-67',
      driverId: '1000019',
      driverName: 'חייל 1 צוות 10',
      participants: [
        {
          soldierId: '1000015',
          soldierName: 'מפקד צוות 10',
          personalNumber: '1000015',
          role: 'מפקד'
        },
        {
          soldierId: '1000016',
          soldierName: 'סמל צוות 10',
          personalNumber: '1000016',
          role: 'חובש'
        },
        {
          soldierId: '1000019',
          soldierName: 'חייל 1 צוות 10',
          personalNumber: '1000019',
          role: 'נהג'
        }
      ],
      status: 'הסתיימה',
      deliverables: [
        {
          id: '4',
          type: 'text',
          content: 'הסיור הושלם בהצלחה. לא זוהו פעילויות חשודות.',
          title: 'דוח לילה',
          createdAt: '2024-02-11T04:00:00Z',
          createdBy: 'מפקד צוות 10'
        }
      ],
      createdAt: '2024-01-25T10:00:00Z',
      updatedAt: '2024-02-11T04:00:00Z'
    },
    {
      id: '7',
      name: 'אימון שטח',
      team: 'צוות 20',
      location: 'אזור אימונים',
      region: 'אפרים',
      activityType: 'זווית אחרת',
      plannedDate: '2024-02-15',
      plannedTime: '08:00',
      duration: 7,
      commanderId: '1000024',
      commanderName: 'מפקד צוות 20',
      taskLeaderId: '1000025',
      taskLeaderName: 'סמל צוות 20',
      vehicleId: '3',
      vehicleNumber: '12-345-69',
      driverId: '1000028',
      driverName: 'חייל 1 צוות 20',
      participants: [
        {
          soldierId: '1000024',
          soldierName: 'מפקד צוות 20',
          personalNumber: '1000024',
          role: 'מפקד'
        },
        {
          soldierId: '1000025',
          soldierName: 'סמל צוות 20',
          personalNumber: '1000025',
          role: 'חובש'
        },
        {
          soldierId: '1000028',
          soldierName: 'חייל 1 צוות 20',
          personalNumber: '1000028',
          role: 'נהג'
        }
      ],
      status: 'הסתיימה',
      deliverables: [
        {
          id: '5',
          type: 'text',
          content: 'האימון הושלם בהצלחה. כל המשתתפים עברו את המבחנים.',
          title: 'דוח אימון',
          createdAt: '2024-02-15T15:00:00Z',
          createdBy: 'מפקד צוות 20'
        }
      ],
      createdAt: '2024-01-30T10:00:00Z',
      updatedAt: '2024-02-15T15:00:00Z'
    },
    {
      id: '8',
      name: 'בדיקת תקשורת',
      team: 'צוות 30',
      location: 'מרכז התקשורת',
      region: 'מנשה',
      activityType: 'אחר',
      activityTypeOther: 'בדיקת מערכות',
      plannedDate: '2024-02-20',
      plannedTime: '10:00',
      duration: 4,
      commanderId: '1000033',
      commanderName: 'מפקד צוות 30',
      taskLeaderId: '1000034',
      taskLeaderName: 'סמל צוות 30',
      participants: [
        {
          soldierId: '1000033',
          soldierName: 'מפקד צוות 30',
          personalNumber: '1000033',
          role: 'מפקד'
        },
        {
          soldierId: '1000034',
          soldierName: 'סמל צוות 30',
          personalNumber: '1000034',
          role: 'חובש'
        },
        {
          soldierId: '1000039',
          soldierName: 'חייל 3 צוות 30',
          personalNumber: '1000039',
          role: 'טכנאי'
        }
      ],
      status: 'בביצוע',
      createdAt: '2024-02-05T10:00:00Z',
      updatedAt: '2024-02-20T10:00:00Z'
    }
  ];

  // Seed Duties - מעודכן עם נתוני החיילים החדשים
  mockDuties = [
    {
      id: '1',
      type: 'מטבח',
      location: 'חדר האוכל',
      startDate: '2024-01-15',
      startTime: '06:00',
      endTime: '14:00',
      participants: [
        {
          soldierId: '1000015',
          soldierName: 'מפקד צוות 10',
          personalNumber: '1000015'
        },
        {
          soldierId: '1000016',
          soldierName: 'סמל צוות 10',
          personalNumber: '1000016'
        }
      ],
      requiredEquipment: 'סינרים, כפפות',
      notes: 'תורנות בוקר',
      team: 'צוות 10',
      status: 'פעילה',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-10T10:00:00Z'
    },
    {
      id: '2',
      type: 'רסר',
      location: 'מגדל השמירה',
      startDate: '2024-01-15',
      startTime: '20:00',
      endTime: '06:00',
      participants: [
        {
          soldierId: '1000015',
          soldierName: 'מפקד צוות 10',
          personalNumber: '1000015'
        }
      ],
      requiredEquipment: 'נשק, אפוד',
      notes: 'תורנות לילה',
      team: 'צוות 10',
      status: 'פעילה',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-10T10:00:00Z'
    },
    {
      id: '3',
      type: 'מטבח',
      location: 'חדר האוכל',
      startDate: '2024-01-16',
      startTime: '06:00',
      endTime: '14:00',
      participants: [
        {
          soldierId: '1000024',
          soldierName: 'מפקד צוות 20',
          personalNumber: '1000024'
        },
        {
          soldierId: '1000025',
          soldierName: 'סמל צוות 20',
          personalNumber: '1000025'
        }
      ],
      requiredEquipment: 'סינרים, כפפות',
      notes: 'תורנות בוקר',
      team: 'צוות 20',
      status: 'פעילה',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-10T10:00:00Z'
    },
    {
      id: '4',
      type: 'רסר',
      location: 'מגדל השמירה',
      startDate: '2024-01-16',
      startTime: '20:00',
      endTime: '06:00',
      participants: [
        {
          soldierId: '1000033',
          soldierName: 'מפקד צוות 30',
          personalNumber: '1000033'
        }
      ],
      requiredEquipment: 'נשק, אפוד',
      notes: 'תורנות לילה',
      team: 'צוות 30',
      status: 'פעילה',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-10T10:00:00Z'
    }
  ];

  // Seed Missions - מעודכן עם נתוני החיילים החדשים
  mockMissions = [
    {
      id: '1',
      name: 'בדיקת ציוד רכבים',
      description: 'בדיקה תקופתית של ציוד הבטיחות ברכבים',
      dueDate: '2024-01-20',
      assignedBy: 'מפקד פלוגה',
      status: 'pending',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-10T10:00:00Z'
    },
    {
      id: '2',
      name: 'עדכון רשימת צוותים',
      description: 'עדכון רשימת החיילים בכל צוות',
      dueDate: '2024-01-25',
      assignedBy: 'קצין כוח אדם',
      status: 'in_progress',
      createdAt: '2024-01-12T10:00:00Z',
      updatedAt: '2024-01-12T10:00:00Z'
    },
    {
      id: '3',
      name: 'בדיקת כשירויות נהגים',
      description: 'בדיקת רישיונות נהיגה והיתרים לכל הנהגים',
      dueDate: '2024-01-30',
      assignedBy: 'סמל רכבים',
      status: 'pending',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '4',
      name: 'עדכון מסגרות ארגוניות',
      description: 'עדכון שדות המסגרת והמפקדים לכל החיילים',
      dueDate: '2024-02-05',
      assignedBy: 'קצין כוח אדם',
      status: 'pending',
      createdAt: '2024-01-18T10:00:00Z',
      updatedAt: '2024-01-18T10:00:00Z'
    }
  ];

  // Seed Referrals - מעודכן עם נתוני החיילים החדשים
  mockReferrals = [
    {
      id: '1',
      soldierId: '1000015',
      soldierName: 'מפקד צוות 10',
      personalNumber: '1000015',
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
      soldierId: '1000016',
      soldierName: 'סמל צוות 10',
      personalNumber: '1000016',
      team: 'צוות 10',
      date: '2024-01-20',
      location: 'מרפאה צבאית',
      reason: 'בדיקת שיניים',
      status: 'pending',
      createdAt: '2024-01-18T09:00:00Z',
      updatedAt: '2024-01-18T09:00:00Z'
    },
    {
      id: '3',
      soldierId: '1000024',
      soldierName: 'מפקד צוות 20',
      personalNumber: '1000024',
      team: 'צוות 20',
      date: '2024-01-25',
      location: 'בית חולים סורוקה',
      reason: 'בדיקת לב',
      status: 'in_progress',
      createdAt: '2024-01-22T11:00:00Z',
      updatedAt: '2024-01-24T16:00:00Z'
    },
    {
      id: '4',
      soldierId: '1000033',
      soldierName: 'מפקד צוות 30',
      personalNumber: '1000033',
      team: 'צוות 30',
      date: '2024-01-28',
      location: 'מרפאה צבאית',
      reason: 'בדיקת עיניים',
      status: 'pending',
      createdAt: '2024-01-25T09:00:00Z',
      updatedAt: '2024-01-25T09:00:00Z'
    },
    {
      id: '5',
      soldierId: '1000042',
      soldierName: 'מפקד צוות 40',
      personalNumber: '1000042',
      team: 'צוות 40',
      date: '2024-01-30',
      location: 'בית חולים תל השומר',
      reason: 'בדיקה אורטופדית',
      status: 'completed',
      createdAt: '2024-01-27T10:00:00Z',
      updatedAt: '2024-01-30T15:00:00Z'
    }
  ];
};

// Initialize mock data
seedMockData(); 