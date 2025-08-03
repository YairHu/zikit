import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { Soldier } from '../models/Soldier';
import { Vehicle } from '../models/Vehicle';

// נתוני חיילים דמו - מעודכן עם כל השדות
export const demoSoldiers: Omit<Soldier, 'id'>[] = [
  // מפקדי פלוגה
  {
    name: 'מפקד פלוגה',
    personalNumber: '1000001',
    frameworkId: '1', // פלוגת זיק"ת
    role: 'מפקד פלוגה',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B', 'C'],
    certifications: ['קורס מפקדי פלוגות'],
    presence: 'פעיל',
    family: 'נשוי + 2 ילדים',
    militaryBackground: 'שירות קרבי 8 שנים',
    notes: 'מפקד מנוסה עם ניסיון בפיקוד על פלוגות',
    medicalProfile: 'A1',
    braurTest: {
      strength: 'passed',
      running: '12:45'
    },
    vacationDays: {
      total: 30,
      used: 8,
      status: 'good'
    }
  },
  {
    name: 'סגן מפקד פלוגה',
    personalNumber: '1000002',
    frameworkId: '1', // פלוגת זיק"ת
    role: 'סגן מפקד פלוגה',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B', 'C'],
    certifications: ['קורס מפקדי צוותים'],
    presence: 'פעיל',
    family: 'רווק',
    militaryBackground: 'שירות קרבי 6 שנים',
    notes: 'סגן מפקד מסור ומוכשר',
    medicalProfile: 'A1',
    braurTest: {
      strength: 'passed',
      running: '13:20'
    },
    vacationDays: {
      total: 30,
      used: 15,
      status: 'good'
    }
  },
  
  // מפל"ג
  {
    name: 'רספ',
    personalNumber: '1000006',
    frameworkId: 'מפקדה',
    role: 'רספ',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
    licenses: ['B'],
    certifications: ['קורס רספ'],
    presence: 'פעיל',
    family: 'נשוי + 1 ילד',
    militaryBackground: 'שירות קרבי 7 שנים',
    notes: 'רספ מנוסה עם ידע טכנולוגי מתקדם',
    medicalProfile: 'A1',
    braurTest: {
      strength: 'passed',
      running: '13:15'
    },
    vacationDays: {
      total: 30,
      used: 12,
      status: 'good'
    }
  },
  {
    name: 'קצין ניהול',
    personalNumber: '1000008',
    frameworkId: 'מפקדה',
    role: 'קצין ניהול',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'בנאי'],
    licenses: ['B'],
    certifications: ['קורס קציני ניהול'],
    presence: 'פעיל',
    family: 'נשוי + 3 ילדים',
    militaryBackground: 'שירות קרבי 9 שנים',
    notes: 'קצין ניהול מנוסה עם ידע בבנייה',
    medicalProfile: 'A1',
    braurTest: {
      strength: 'passed',
      running: '14:10'
    },
    vacationDays: {
      total: 30,
      used: 5,
      status: 'good'
    }
  },
  
  // צוות 10
  {
    name: 'מפקד צוות 10',
    personalNumber: '1000015',
    frameworkId: 'צוות 10',
    role: 'מפקד צוות',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B'],
    certifications: ['קורס מפקדי צוותים'],
    presence: 'פעיל',
    family: 'רווק',
    militaryBackground: 'שירות קרבי 4 שנים',
    notes: 'מפקד צוות צעיר ומוכשר',
    medicalProfile: 'A1',

    braurTest: {
      strength: 'passed',
      running: '12:30'
    },
    vacationDays: {
      total: 30,
      used: 18,
      status: 'good'
    }
  },
  {
    name: 'סמל צוות 10',
    personalNumber: '1000016',
    frameworkId: 'צוות 10',
    role: 'סמל',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'חובש'],
    licenses: ['B'],
    certifications: ['קורס סמלים'],
    presence: 'פעיל',
    family: 'נשוי',
    militaryBackground: 'שירות קרבי 5 שנים',
    notes: 'סמל מנוסה עם הכשרה רפואית',
    medicalProfile: 'A1',
    braurTest: {
      strength: 'passed',
      running: '13:45'
    },
    vacationDays: {
      total: 30,
      used: 10,
      status: 'good'
    }
  },
  {
    name: 'חייל 1 צוות 10',
    personalNumber: '1000019',
    frameworkId: 'צוות 10',
    role: 'חייל',
    profile: '97',
    qualifications: ['רוגר', 'נהג', 'חובש'],
    licenses: ['B', 'C'],
    certifications: ['הסמכת רוגר'],
    presence: 'פעיל',
    family: 'רווק',
    militaryBackground: 'שירות קרבי 2 שנים',
    notes: 'חייל מוכשר עם רישיון נהיגה מתקדם',
    medicalProfile: 'A1',
    drivingLicenses: ['35', 'דימקס'],
    braurTest: {
      strength: 'passed',
      running: '13:00'
    },
    vacationDays: {
      total: 30,
      used: 22,
      status: 'warning'
    }
  },
  {
    name: 'חייל 2 צוות 10',
    personalNumber: '1000020',
    frameworkId: 'צוות 10',
    role: 'חייל',
    profile: '97',
    qualifications: ['קלע', 'צלם', 'מטמין'],
    licenses: ['B'],
    certifications: ['הסמכת קלע'],
    presence: 'פעיל',
    family: 'רווק',
    militaryBackground: 'שירות קרבי 2 שנים',
    notes: 'קלע מצוין עם יכולות צילום',
    medicalProfile: 'A1',
    braurTest: {
      strength: 'passed',
      running: '14:20'
    },
    vacationDays: {
      total: 30,
      used: 8,
      status: 'good'
    }
  },
  
  // צוות 20
  {
    name: 'מפקד צוות 20',
    personalNumber: '1000024',
    frameworkId: 'צוות 20',
    role: 'מפקד צוות',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B'],
    certifications: ['קורס מפקדי צוותים'],
    presence: 'פעיל',
    family: 'נשוי + 1 ילד',
    militaryBackground: 'שירות קרבי 5 שנים',
    notes: 'מפקד צוות מנוסה עם משפחה',
    medicalProfile: 'A1',

    braurTest: {
      strength: 'passed',
      running: '12:55'
    },
    vacationDays: {
      total: 30,
      used: 25,
      status: 'critical'
    }
  },
  {
    name: 'חייל 1 צוות 20',
    personalNumber: '1000028',
    frameworkId: 'צוות 20',
    role: 'חייל',
    profile: '97',
    qualifications: ['רוגר', 'נהג', 'חובש'],
    licenses: ['B', 'C'],
    certifications: ['הסמכת רוגר'],
    presence: 'פעיל',
    family: 'רווק',
    militaryBackground: 'שירות קרבי 3 שנים',
    notes: 'נהג מנוסה עם היתרים מתקדמים',
    medicalProfile: 'A1',
    drivingLicenses: ['35', 'דימקס', 'סוואנה'],
    braurTest: {
      strength: 'passed',
      running: '13:10'
    },
    vacationDays: {
      total: 30,
      used: 15,
      status: 'good'
    }
  },
  
  // צוות 30
  {
    name: 'מפקד צוות 30',
    personalNumber: '1000033',
    frameworkId: 'צוות 30',
    role: 'מפקד צוות',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B'],
    certifications: ['קורס מפקדי צוותים'],
    presence: 'פעיל',
    family: 'רווק',
    militaryBackground: 'שירות קרבי 4 שנים',
    notes: 'מפקד צוות צעיר עם פוטנציאל',
    medicalProfile: 'A1',

    braurTest: {
      strength: 'passed',
      running: '13:25'
    },
    vacationDays: {
      total: 30,
      used: 20,
      status: 'warning'
    }
  },
  {
    name: 'חייל 1 צוות 30',
    personalNumber: '1000037',
    frameworkId: 'צוות 30',
    role: 'חייל',
    profile: '97',
    qualifications: ['רוגר', 'נהג', 'חובש'],
    licenses: ['B', 'C'],
    certifications: ['הסמכת רוגר'],
    presence: 'פעיל',
    family: 'רווק',
    militaryBackground: 'שירות קרבי 2 שנים',
    notes: 'חייל מוכשר עם יכולות נהיגה',
    medicalProfile: 'A1',
    drivingLicenses: ['דימקס', 'סוואנה'],
    braurTest: {
      strength: 'passed',
      running: '13:40'
    },
    vacationDays: {
      total: 30,
      used: 12,
      status: 'good'
    }
  }
];

// נתוני רכבים דמו - מעודכן עם כל השדות
export const demoVehicles: Omit<Vehicle, 'id'>[] = [
  // 3 רכבים מסוג סוואנה
  {
    type: 'סוואנה',
    number: '12-345-67',
    mileage: 85000,
    lastMaintenance: '2024-01-15',
    nextMaintenance: '2024-04-15',
    status: 'available',
    seats: 8
  },
  {
    type: 'סוואנה',
    number: '12-345-68',
    mileage: 92000,
    lastMaintenance: '2024-01-20',
    nextMaintenance: '2024-04-20',
    status: 'available',
    seats: 8
  },
  {
    type: 'סוואנה',
    number: '12-345-69',
    mileage: 78000,
    lastMaintenance: '2023-12-10',
    nextMaintenance: '2024-03-10',
    status: 'maintenance',
    seats: 8
  },
  
  // 1 זאב
  {
    type: 'זאב',
    number: '12-345-70',
    mileage: 65000,
    lastMaintenance: '2024-01-25',
    nextMaintenance: '2024-04-25',
    status: 'available',
    seats: 6
  },
  
  // 2 רכבי דוד
  {
    type: 'דוד',
    number: '12-345-71',
    mileage: 120000,
    lastMaintenance: '2024-01-05',
    nextMaintenance: '2024-04-05',
    status: 'available',
    seats: 4
  },
  {
    type: 'דוד',
    number: '12-345-72',
    mileage: 95000,
    lastMaintenance: '2024-01-12',
    nextMaintenance: '2024-04-12',
    status: 'on_mission',
    seats: 4
  },
  
  // 1 דימקס אפורה
  {
    type: 'דימקס אפורה',
    number: '12-345-73',
    mileage: 110000,
    lastMaintenance: '2024-01-08',
    nextMaintenance: '2024-04-08',
    status: 'available',
    seats: 12
  },
  
  // 1 דימקס לבנה
  {
    type: 'דימקס לבנה',
    number: '12-345-74',
    mileage: 88000,
    lastMaintenance: '2024-01-18',
    nextMaintenance: '2024-04-18',
    status: 'available',
    seats: 12
  },
  
  // 1 סופה
  {
    type: 'סופה',
    number: '12-345-75',
    mileage: 72000,
    lastMaintenance: '2024-01-30',
    nextMaintenance: '2024-04-30',
    status: 'available',
    seats: 6
  }
];

// פונקציות להכנסת נתונים
export const seedSoldiers = async () => {
  try {
    console.log('מתחיל הכנסת נתוני חיילים...');
    
    // מחיקת נתונים קיימים
    const existingSoldiers = await getDocs(collection(db, 'soldiers'));
    for (const doc of existingSoldiers.docs) {
      await deleteDoc(doc.ref);
    }
    console.log('נמחקו נתונים קיימים');
    
    // הכנסת נתונים חדשים
    for (const soldier of demoSoldiers) {
      await addDoc(collection(db, 'soldiers'), soldier);
    }
    
    console.log(`הוכנסו ${demoSoldiers.length} חיילים בהצלחה`);
    return true;
  } catch (error) {
    console.error('שגיאה בהכנסת נתוני חיילים:', error);
    return false;
  }
};

export const seedVehicles = async () => {
  try {
    console.log('מתחיל הכנסת נתוני רכבים...');
    
    // מחיקת נתונים קיימים
    const existingVehicles = await getDocs(collection(db, 'vehicles'));
    for (const doc of existingVehicles.docs) {
      await deleteDoc(doc.ref);
    }
    console.log('נמחקו נתונים קיימים');
    
    // הכנסת נתונים חדשים
    for (const vehicle of demoVehicles) {
      await addDoc(collection(db, 'vehicles'), vehicle);
    }
    
    console.log(`הוכנסו ${demoVehicles.length} רכבים בהצלחה`);
    return true;
  } catch (error) {
    console.error('שגיאה בהכנסת נתוני רכבים:', error);
    return false;
  }
};

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

// נתוני פעילויות דמו
export const demoActivities = [
  {
    name: 'סיור ביטחון',
    frameworkId: 'צוות 10',
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
    mobility: '',
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
    ]
  },
  {
    name: 'אבטחת אירוע',
    frameworkId: 'צוות 20',
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
    mobility: '',
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
    ]
  }
];

// נתוני תורנויות דמו
export const demoDuties = [
  {
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
    frameworkId: 'צוות 10',
    status: 'פעילה'
  },
  {
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
    frameworkId: 'צוות 10',
    status: 'פעילה'
  }
];

// נתוני משימות דמו
export const demoMissions = [
  {
    name: 'בדיקת ציוד רכבים',
    description: 'בדיקה תקופתית של ציוד הבטיחות ברכבים',
    dueDate: '2024-01-20',
    assignedBy: 'מפקד פלוגה',
    status: 'pending'
  },
  {
    name: 'עדכון רשימת צוותים',
    description: 'עדכון רשימת החיילים בכל צוות',
    dueDate: '2024-01-25',
    assignedBy: 'קצין כוח אדם',
    status: 'in_progress'
  },
  {
    name: 'בדיקת כשירויות נהגים',
    description: 'בדיקת רישיונות נהיגה והיתרים לכל הנהגים',
    dueDate: '2024-01-30',
    assignedBy: 'סמל רכבים',
    status: 'pending'
  }
];

// נתוני הפניות דמו
export const demoReferrals = [
  {
    soldierId: '1000015',
    soldierName: 'מפקד צוות 10',
    personalNumber: '1000015',
    frameworkId: 'צוות 10',
    date: '2024-01-15',
    location: 'בית חולים רמב"ם',
    reason: 'בדיקה רפואית שגרתית',
    status: 'completed'
  },
  {
    soldierId: '1000016',
    soldierName: 'סמל צוות 10',
    personalNumber: '1000016',
    frameworkId: 'צוות 10',
    date: '2024-01-20',
    location: 'מרפאה צבאית',
    reason: 'בדיקת שיניים',
    status: 'pending'
  },
  {
    soldierId: '1000024',
    soldierName: 'מפקד צוות 20',
    personalNumber: '1000024',
    frameworkId: 'צוות 20',
    date: '2024-01-25',
    location: 'בית חולים סורוקה',
    reason: 'בדיקת לב',
    status: 'in_progress'
  }
];

export const seedActivities = async () => {
  try {
    console.log('מתחיל הכנסת נתוני פעילויות...');
    
    // מחיקת נתונים קיימים
    const existingActivities = await getDocs(collection(db, 'activities'));
    for (const doc of existingActivities.docs) {
      await deleteDoc(doc.ref);
    }
    console.log('נמחקו נתונים קיימים');
    
    // הכנסת נתונים חדשים
    for (const activity of demoActivities) {
      await addDoc(collection(db, 'activities'), {
        ...activity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    console.log(`הוכנסו ${demoActivities.length} פעילויות בהצלחה`);
    return true;
  } catch (error) {
    console.error('שגיאה בהכנסת נתוני פעילויות:', error);
    return false;
  }
};

export const seedDuties = async () => {
  try {
    console.log('מתחיל הכנסת נתוני תורנויות...');
    
    // מחיקת נתונים קיימים
    const existingDuties = await getDocs(collection(db, 'duties'));
    for (const doc of existingDuties.docs) {
      await deleteDoc(doc.ref);
    }
    console.log('נמחקו נתונים קיימים');
    
    // הכנסת נתונים חדשים
    for (const duty of demoDuties) {
      await addDoc(collection(db, 'duties'), {
        ...duty,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    console.log(`הוכנסו ${demoDuties.length} תורנויות בהצלחה`);
    return true;
  } catch (error) {
    console.error('שגיאה בהכנסת נתוני תורנויות:', error);
    return false;
  }
};

export const seedMissions = async () => {
  try {
    console.log('מתחיל הכנסת נתוני משימות...');
    
    // מחיקת נתונים קיימים
    const existingMissions = await getDocs(collection(db, 'missions'));
    for (const doc of existingMissions.docs) {
      await deleteDoc(doc.ref);
    }
    console.log('נמחקו נתונים קיימים');
    
    // הכנסת נתונים חדשים
    for (const mission of demoMissions) {
      await addDoc(collection(db, 'missions'), {
        ...mission,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    console.log(`הוכנסו ${demoMissions.length} משימות בהצלחה`);
    return true;
  } catch (error) {
    console.error('שגיאה בהכנסת נתוני משימות:', error);
    return false;
  }
};

export const seedReferrals = async () => {
  try {
    console.log('מתחיל הכנסת נתוני הפניות...');
    
    // מחיקת נתונים קיימים
    const existingReferrals = await getDocs(collection(db, 'referrals'));
    for (const doc of existingReferrals.docs) {
      await deleteDoc(doc.ref);
    }
    console.log('נמחקו נתונים קיימים');
    
    // הכנסת נתונים חדשים
    for (const referral of demoReferrals) {
      await addDoc(collection(db, 'referrals'), {
        ...referral,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    console.log(`הוכנסו ${demoReferrals.length} הפניות בהצלחה`);
    return true;
  } catch (error) {
    console.error('שגיאה בהכנסת נתוני הפניות:', error);
    return false;
  }
};

export const seedAllData = async () => {
  console.log('מתחיל הכנסת כל נתוני הדמו...');
  
  const soldiersResult = await seedSoldiers();
  const vehiclesResult = await seedVehicles();
  const activitiesResult = await seedActivities();
  const dutiesResult = await seedDuties();
  const missionsResult = await seedMissions();
  const referralsResult = await seedReferrals();
  
  if (soldiersResult && vehiclesResult && activitiesResult && dutiesResult && missionsResult && referralsResult) {
    console.log('כל הנתונים הוכנסו בהצלחה!');
    return true;
  } else {
    console.error('הייתה שגיאה בהכנסת הנתונים');
    return false;
  }
}; 