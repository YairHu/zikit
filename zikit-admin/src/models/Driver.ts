import { Soldier } from './Soldier';

// נהג הוא חייל עם הכשרת נהג והיתרים לנהיגה
export interface Driver extends Soldier {
  // תכונות נוספות לנהג
  drivingExperience?: number; // שנות ניסיון בנהיגה
  vehicleTypes?: string[]; // סוגי רכבים מורשים לנהוג
  lastMedicalCheck?: string; // תאריך בדיקה רפואית אחרונה
  licenseRenewalDate?: string; // תאריך חידוש רישיון
  accidentHistory?: string[]; // היסטוריית תאונות
  trainingCertificates?: string[]; // תעודות הכשרה נוספות
} 