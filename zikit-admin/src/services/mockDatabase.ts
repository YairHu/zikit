import { Soldier } from '../models/Soldier';
import { Vehicle } from '../models/Vehicle';
import { Activity, ActivityParticipant } from '../models/Activity';
import { Duty, DutyParticipant } from '../models/Duty';
import { Mission } from '../models/Mission';
import { Referral } from '../models/Referral';

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
  // Seed Soldiers
  mockSoldiers = [
    {
      id: '1',
      name: 'דוד כהן',
      personalNumber: '123456789',
      team: 'צוות 10',
      role: 'מפקד צוות',
      profile: 'לוחם',
      qualifications: ['נהג', 'חובש'],
      licenses: ['B', 'C'],
      certifications: ['חובש'],
      drivingLicenses: ['35', 'דימקס'],
      family: 'נשוי + 2',
      militaryBackground: 'חייל קרבי',
      notes: 'מפקד מנוסה',
      medicalProfile: 'כשיר',
      documents: []
    },
    {
      id: '2',
      name: 'יוסי לוי',
      personalNumber: '987654321',
      team: 'צוות 10',
      role: 'חייל',
      profile: 'לוחם',
      qualifications: ['נהג'],
      licenses: ['B'],
      certifications: [],
      drivingLicenses: ['35'],
      family: 'רווק',
      militaryBackground: 'חייל קרבי',
      notes: '',
      medicalProfile: 'כשיר',
      documents: []
    },
    {
      id: '3',
      name: 'אבי ישראלי',
      personalNumber: '111222333',
      team: 'צוות 20',
      role: 'מפקד צוות',
      profile: 'לוחם',
      qualifications: ['נהג', 'חובש'],
      licenses: ['B', 'C'],
      certifications: ['חובש'],
      drivingLicenses: ['35', 'דימקס'],
      family: 'נשוי + 1',
      militaryBackground: 'חייל קרבי',
      notes: 'מפקד מנוסה',
      medicalProfile: 'כשיר',
      documents: []
    },
    {
      id: '4',
      name: 'מיכאל רוזן',
      personalNumber: '444555666',
      team: 'צוות 20',
      role: 'חייל',
      profile: 'לוחם',
      qualifications: ['נהג'],
      licenses: ['B'],
      certifications: [],
      drivingLicenses: ['35'],
      family: 'רווק',
      militaryBackground: 'חייל קרבי',
      notes: '',
      medicalProfile: 'כשיר',
      documents: []
    },
    {
      id: '5',
      name: 'דניאל כהן',
      personalNumber: '777888999',
      team: 'צוות 30',
      role: 'מפקד צוות',
      profile: 'לוחם',
      qualifications: ['נהג', 'חובש'],
      licenses: ['B', 'C'],
      certifications: ['חובש'],
      drivingLicenses: ['35', 'דימקס'],
      family: 'נשוי + 3',
      militaryBackground: 'חייל קרבי',
      notes: 'מפקד מנוסה',
      medicalProfile: 'כשיר',
      documents: []
    },
    {
      id: '6',
      name: 'יונתן לוי',
      personalNumber: '123123123',
      team: 'צוות 30',
      role: 'חייל',
      profile: 'לוחם',
      qualifications: ['נהג'],
      licenses: ['B'],
      certifications: [],
      drivingLicenses: ['35'],
      family: 'רווק',
      militaryBackground: 'חייל קרבי',
      notes: '',
      medicalProfile: 'כשיר',
      documents: []
    },
    {
      id: '7',
      name: 'עומר דוד',
      personalNumber: '456456456',
      team: 'צוות 40',
      role: 'מפקד צוות',
      profile: 'לוחם',
      qualifications: ['נהג', 'חובש'],
      licenses: ['B', 'C'],
      certifications: ['חובש'],
      drivingLicenses: ['35', 'דימקס'],
      family: 'נשוי + 1',
      militaryBackground: 'חייל קרבי',
      notes: 'מפקד מנוסה',
      medicalProfile: 'כשיר',
      documents: []
    },
    {
      id: '8',
      name: 'אלון כהן',
      personalNumber: '789789789',
      team: 'צוות 40',
      role: 'חייל',
      profile: 'לוחם',
      qualifications: ['נהג'],
      licenses: ['B'],
      certifications: [],
      drivingLicenses: ['35'],
      family: 'רווק',
      militaryBackground: 'חייל קרבי',
      notes: '',
      medicalProfile: 'כשיר',
      documents: []
    },
    {
      id: '9',
      name: 'נועם ישראלי',
      personalNumber: '321321321',
      team: 'צוות 50',
      role: 'מפקד צוות',
      profile: 'לוחם',
      qualifications: ['נהג', 'חובש'],
      licenses: ['B', 'C'],
      certifications: ['חובש'],
      drivingLicenses: ['35', 'דימקס'],
      family: 'נשוי + 2',
      militaryBackground: 'חייל קרבי',
      notes: 'מפקד מנוסה',
      medicalProfile: 'כשיר',
      documents: []
    },
    {
      id: '10',
      name: 'עידו רוזן',
      personalNumber: '654654654',
      team: 'צוות 50',
      role: 'חייל',
      profile: 'לוחם',
      qualifications: ['נהג'],
      licenses: ['B'],
      certifications: [],
      drivingLicenses: ['35'],
      family: 'רווק',
      militaryBackground: 'חייל קרבי',
      notes: '',
      medicalProfile: 'כשיר',
      documents: []
    }
  ];

  // Seed Vehicles
  mockVehicles = [
    {
      id: '1',
      type: 'ג\'יפ',
      number: '12-345-67',
      mileage: 125000,
      lastMaintenance: '2024-01-01',
      nextMaintenance: '2024-04-01',
      status: 'available'
    },
    {
      id: '2',
      type: 'משאית',
      number: '34-567-89',
      mileage: 89000,
      lastMaintenance: '2023-12-15',
      nextMaintenance: '2024-03-15',
      status: 'maintenance'
    },
    {
      id: '3',
      type: 'ג\'יפ',
      number: '45-678-90',
      mileage: 67000,
      lastMaintenance: '2024-01-10',
      nextMaintenance: '2024-04-10',
      status: 'available'
    },
    {
      id: '4',
      type: 'משאית',
      number: '56-789-01',
      mileage: 145000,
      lastMaintenance: '2023-11-20',
      nextMaintenance: '2024-02-20',
      status: 'available'
    },
    {
      id: '5',
      type: 'ג\'יפ',
      number: '67-890-12',
      mileage: 45000,
      lastMaintenance: '2024-01-05',
      nextMaintenance: '2024-04-05',
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
      plannedDate: '2024-01-15',
      plannedTime: '08:00',
      duration: 4,
      commanderId: '1',
      commanderName: 'דוד כהן',
      taskLeaderId: '2',
      taskLeaderName: 'יוסי לוי',
      vehicleId: '1',
      vehicleNumber: '12-345-67',
      driverId: '2',
      driverName: 'יוסי לוי',
      participants: [
        {
          soldierId: '2',
          soldierName: 'יוסי לוי',
          personalNumber: '987654321',
          role: 'נהג'
        }
      ],
      status: 'מתוכננת',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-10T10:00:00Z'
    }
  ];

  // Seed Duties
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
          soldierId: '1',
          soldierName: 'דוד כהן',
          personalNumber: '123456789'
        },
        {
          soldierId: '2',
          soldierName: 'יוסי לוי',
          personalNumber: '987654321'
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
          soldierId: '1',
          soldierName: 'דוד כהן',
          personalNumber: '123456789'
        }
      ],
      requiredEquipment: 'נשק, אפוד',
      notes: 'תורנות לילה',
      team: 'צוות 10',
      status: 'פעילה',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-10T10:00:00Z'
    }
  ];

  // Seed Missions
  mockMissions = [
    {
      id: '1',
      name: 'בדיקת ציוד רכבים',
      description: 'בדיקה תקופתית של ציוד הבטיחות ברכבים',
      dueDate: '2024-01-20',
      assignedBy: 'מפקד הפלוגה',
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
    }
  ];

  // Seed Referrals
  mockReferrals = [
    {
      id: '1',
      soldierId: '1',
      soldierName: 'דוד כהן',
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
      soldierName: 'יוסי לוי',
      personalNumber: '987654321',
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
      soldierId: '3',
      soldierName: 'אבי ישראלי',
      personalNumber: '111222333',
      team: 'צוות 20',
      date: '2024-01-25',
      location: 'בית חולים סורוקה',
      reason: 'בדיקת לב',
      status: 'in_progress',
      createdAt: '2024-01-22T11:00:00Z',
      updatedAt: '2024-01-24T16:00:00Z'
    }
  ];
};

// Initialize mock data
seedMockData(); 