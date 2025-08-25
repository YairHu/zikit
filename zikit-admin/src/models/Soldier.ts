import { BasePerson } from './BasePerson';

// חייל הוא אדם בסיסי עם תכונות נוספות
export interface Soldier extends BasePerson {
  dates?: Record<string, string>; // לדוג' תאריכים חשובים
  documents?: string[]; // קישורים לקבצים
  trips?: string[]; // מזהי נסיעות שהחייל משתתף בהן
  activities?: string[]; // מזהי פעילויות שהחייל משתתף בהן
  
  // שדות נהג (רק לנהגים)
  status?: 'available' | 'on_trip' | 'resting'; // זמין, בנסיעה, במנוחה
  restUntil?: string; // עד מתי במנוחה (אוטומטי - 7 שעות משעת חזרה)
  drivingLicenses?: string[]; // היתרים לנהיגה (רק לנהגים)

  // שדות סטטוס מיוחדים
  absenceUntil?: string; // עד מתי בהיעדרות (קורס/גימלים/חופש)
  previousStatus?: string; // הסטטוס הקודם לפני היעדרות
} 