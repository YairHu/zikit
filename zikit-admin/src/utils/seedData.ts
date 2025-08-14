import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { Soldier } from '../models/Soldier';
import { Vehicle } from '../models/Vehicle';
import { Framework } from '../models/Framework';

// נתוני חיילים דמו - מעודכן עם כל השדות
export const demoSoldiers: Omit<Soldier, 'id'>[] = [
  // מפקדי פלוגה
  {
    name: 'מפקד פלוגה',
    personalNumber: '1000000',
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
    
         // שדות מטופס הקליטה
     email: 'commander@example.com',
     fullName: 'מפקד פלוגה',
     phone: '050-1234567',
     birthDate: '15/03/1985',
     address: 'רחוב הראשי 123, תל אביב',
     additionalInfo: 'מפקד מנוסה עם יכולות פיקודיות מצוינות',
    
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
    name: 'מפקד פלגה א',
    personalNumber: '1000001',
    role: 'מפקד פלגה א',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B', 'C'],
    certifications: ['קורס מפקדי פלוגות'],
    presence: 'פעיל',
    family: 'נשוי + 2 ילדים',
    militaryBackground: 'שירות קרבי 8 שנים',
    notes: 'מפקד מנוסה עם ניסיון בפיקוד על פלוגות',
    medicalProfile: 'A1',
    
         // שדות מטופס הקליטה
     email: 'pluga1@example.com',
     fullName: 'מפקד פלגה א',
     phone: '050-2345678',
     birthDate: '22/07/1987',
     address: 'רחוב השלום 45, ירושלים',
     additionalInfo: 'מפקד פלגה א מנוסה',
    
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
    name: 'מפקד פלגה ב',
    personalNumber: '1000002',
    role: 'מפקד פלגה ב',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B', 'C'],
    certifications: ['קורס מפקדי פלוגות'],
    presence: 'פעיל',
    family: 'נשוי + 1 ילד',
    militaryBackground: 'שירות קרבי 7 שנים',
    notes: 'מפקד פלוגה ב מנוסה עם יכולות פיקודיות מצוינות',
    medicalProfile: 'A1',
    braurTest: {
      strength: 'passed',
      running: '12:30'
    },
    vacationDays: {
      total: 30,
      used: 12,
      status: 'good'
    }
  },
  {
    name: 'מפקד פלגה ז"א',
    personalNumber: '1000003',
    role: 'מפקד פלגה ז"א',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר', 'זיהוי אווירי'],
    licenses: ['B', 'C'],
    certifications: ['קורס מפקדי פלוגות', 'קורס זיהוי אווירי'],
    presence: 'פעיל',
    family: 'רווק',
    militaryBackground: 'שירות קרבי 6 שנים',
    notes: 'מפקד פלוגה ז"א עם התמחות בזיהוי אווירי',
    medicalProfile: 'A1',
    braurTest: {
      strength: 'passed',
      running: '13:00'
    },
    vacationDays: {
      total: 30,
      used: 18,
      status: 'warning'
    }
  },
  {
    name: 'סגן מפקד פלוגה',
    personalNumber: '1000004',
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
  },
  
  // צוות 40
  {
    name: 'מפקד צוות 40',
    personalNumber: '1000040',
    role: 'מפקד צוות',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B'],
    certifications: ['קורס מפקדי צוותים'],
    presence: 'פעיל',
    family: 'נשוי + 1 ילד',
    militaryBackground: 'שירות קרבי 5 שנים',
    notes: 'מפקד צוות מנוסה עם יכולות פיקודיות מצוינות',
    medicalProfile: 'A1',
    braurTest: {
      strength: 'passed',
      running: '12:55'
    },
    vacationDays: {
      total: 30,
      used: 10,
      status: 'good'
    }
  },
  {
    name: 'חייל 1 צוות 40',
    personalNumber: '1000041',
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
      running: '13:30'
    },
    vacationDays: {
      total: 30,
      used: 8,
      status: 'good'
    }
  },
  {
    name: 'חייל 2 צוות 40',
    personalNumber: '1000042',
    role: 'חייל',
    profile: '97',
    qualifications: ['רוגר', 'נהג'],
    licenses: ['B'],
    certifications: ['הסמכת רוגר'],
    presence: 'פעיל',
    family: 'רווק',
    militaryBackground: 'שירות קרבי 1 שנה',
    notes: 'חייל חדש עם פוטנציאל',
    medicalProfile: 'A1',
    braurTest: {
      strength: 'passed',
      running: '14:00'
    },
    vacationDays: {
      total: 30,
      used: 5,
      status: 'good'
    }
  },
  
  // צוות 50
  {
    name: 'מפקד צוות 50',
    personalNumber: '1000050',
    role: 'מפקד צוות',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B'],
    certifications: ['קורס מפקדי צוותים'],
    presence: 'פעיל',
    family: 'רווק',
    militaryBackground: 'שירות קרבי 3 שנים',
    notes: 'מפקד צוות צעיר עם יכולות פיקודיות טובות',
    medicalProfile: 'A1',
    braurTest: {
      strength: 'passed',
      running: '13:15'
    },
    vacationDays: {
      total: 30,
      used: 15,
      status: 'good'
    }
  },
  {
    name: 'חייל 1 צוות 50',
    personalNumber: '1000051',
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
      running: '13:45'
    },
    vacationDays: {
      total: 30,
      used: 12,
      status: 'good'
    }
  },
  {
    name: 'חייל 2 צוות 50',
    personalNumber: '1000052',
    role: 'חייל',
    profile: '97',
    qualifications: ['רוגר', 'נהג'],
    licenses: ['B'],
    certifications: ['הסמכת רוגר'],
    presence: 'פעיל',
    family: 'רווק',
    militaryBackground: 'שירות קרבי 1 שנה',
    notes: 'חייל חדש עם פוטנציאל',
    medicalProfile: 'A1',
    braurTest: {
      strength: 'passed',
      running: '14:10'
    },
    vacationDays: {
      total: 30,
      used: 6,
      status: 'good'
    }
  }
];

// נתוני מסגרות דמו
export const demoFrameworks: Omit<Framework, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'פלוגת זיקית',
    level: 'company',
    commanderId: '1000000',
    isActive: true
  },
  {
    name: 'פלגה א',
    level: 'platoon',
    commanderId: '1000001',
    isActive: true
  },
  {
    name: 'פלגה ב',
    level: 'platoon',
    commanderId: '1000002',
    isActive: true
  },
  {
    name: 'פלגת ז"א',
    level: 'platoon',
    commanderId: '1000003',
    isActive: true
  },
  {
    name: 'מפלג',
    level: 'other',
    commanderId: '1000004',
    isActive: true
  },
  {
    name: 'צוות 10',
    level: 'team',
    commanderId: '1000015',
    isActive: true
  },
  {
    name: 'צוות 20',
    level: 'team',
    commanderId: '1000024',
    isActive: true
  },
  {
    name: 'צוות 30',
    level: 'team',
    commanderId: '1000033',
    isActive: true
  },
  {
    name: 'צוות 40',
    level: 'team',
    commanderId: '1000040',
    isActive: true
  },
  {
    name: 'צוות 50',
    level: 'team',
    commanderId: '1000050',
    isActive: true
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

export const seedFrameworks = async () => {
  try {
    console.log('מתחיל הכנסת נתוני מסגרות...');
    
    // מחיקת נתונים קיימים
    const existingFrameworks = await getDocs(collection(db, 'frameworks'));
    for (const doc of existingFrameworks.docs) {
      await deleteDoc(doc.ref);
    }
    console.log('נמחקו נתונים קיימים');
    
    // הכנסת נתונים חדשים
    for (const framework of demoFrameworks) {
      await addDoc(collection(db, 'frameworks'), {
        ...framework,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    console.log(`הוכנסו ${demoFrameworks.length} מסגרות בהצלחה`);
    return true;
  } catch (error) {
    console.error('שגיאה בהכנסת נתוני מסגרות:', error);
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
    frameworkId: '10',
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
    status: 'מתוכננת',
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
    frameworkId: '20',
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
  },
  {
    name: 'פעילות פיקוד פלוגתי',
    frameworkId: '1',
    location: 'מחנה הפלוגה',
    region: 'מנשה',
    activityType: 'אחר',
    activityTypeOther: 'אימון פיקודי',
    plannedDate: '2024-01-25',
    plannedTime: '09:00',
    duration: 8,
    commanderId: '1000001',
    commanderName: 'מפקד פלוגה א',
    taskLeaderId: '1000004',
    taskLeaderName: 'סגן מפקד פלוגה',
    mobility: '',
    participants: [
      {
        soldierId: '1000001',
        soldierName: 'מפקד פלוגה א',
        personalNumber: '1000001',
        role: 'מפקד'
      },
      {
        soldierId: '1000002',
        soldierName: 'מפקד פלוגה ב',
        personalNumber: '1000002',
        role: 'מפקד פלוגה'
      },
      {
        soldierId: '1000003',
        soldierName: 'מפקד פלוגה ז"א',
        personalNumber: '1000003',
        role: 'מפקד פלוגה ז"א'
      },
      {
        soldierId: '1000004',
        soldierName: 'סגן מפקד פלוגה',
        personalNumber: '1000004',
        role: 'סגן מפקד'
      }
    ],
    status: 'מתוכננת',
    deliverables: [
      {
        id: '3',
        type: 'text',
        content: 'אימון פיקודי מוצלח. כל מפקדי הפלוגות השתתפו וקיבלו הנחיות חדשות.',
        title: 'דוח אימון פיקודי',
        createdAt: '2024-01-25T17:00:00Z',
        createdBy: 'מפקד פלוגה א'
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
    frameworkId: '10',
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
    frameworkId: '10',
    status: 'פעילה'
  },
  {
    type: 'פלוגה',
    location: 'מפקדת הפלוגה',
    startDate: '2024-01-26',
    startTime: '08:00',
    endTime: '16:00',
    participants: [
      {
        soldierId: '1000001',
        soldierName: 'מפקד פלוגה א',
        personalNumber: '1000001'
      },
      {
        soldierId: '1000002',
        soldierName: 'מפקד פלוגה ב',
        personalNumber: '1000002'
      },
      {
        soldierId: '1000003',
        soldierName: 'מפקד פלוגה ז"א',
        personalNumber: '1000003'
      }
    ],
    requiredEquipment: 'מחשבים, מכשירי קשר',
    notes: 'תורנות פיקוד פלוגתי',
    frameworkId: '1',
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
    frameworkId: '10',
    date: '2024-01-15',
    location: 'בית חולים רמב"ם',
    reason: 'בדיקה רפואית שגרתית',
    status: 'completed'
  },
  {
    soldierId: '1000016',
    soldierName: 'סמל צוות 10',
    personalNumber: '1000016',
    frameworkId: '10',
    date: '2024-01-20',
    location: 'מרפאה צבאית',
    reason: 'בדיקת שיניים',
    status: 'pending'
  },
  {
    soldierId: '1000024',
    soldierName: 'מפקד צוות 20',
    personalNumber: '1000024',
    frameworkId: '20',
    date: '2024-01-25',
    location: 'בית חולים סורוקה',
    reason: 'בדיקת לב',
    status: 'in_progress'
  },
  {
    soldierId: '1000003',
    soldierName: 'מפקד פלוגה ז"א',
    personalNumber: '1000003',
    frameworkId: '1',
    date: '2024-01-28',
    location: 'בית חולים רמב"ם',
    reason: 'בדיקת עיניים - עדכון אישור זיהוי אווירי',
    status: 'pending'
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
  
  const frameworksResult = await seedFrameworks();
  const soldiersResult = await seedSoldiers();
  const vehiclesResult = await seedVehicles();
  const activitiesResult = await seedActivities();
  const dutiesResult = await seedDuties();
  const missionsResult = await seedMissions();
  const referralsResult = await seedReferrals();
  
  if (frameworksResult && soldiersResult && vehiclesResult && activitiesResult && dutiesResult && missionsResult && referralsResult) {
    console.log('כל הנתונים הוכנסו בהצלחה!');
    return true;
  } else {
    console.error('הייתה שגיאה בהכנסת הנתונים');
    return false;
  }
}; 