import { BasePerson } from './BasePerson';

// חייל הוא אדם בסיסי עם תכונות נוספות
export interface Soldier extends BasePerson {
  drivingLicenses?: string[]; // היתרים לנהיגה (רק לנהגים)
  dates?: Record<string, string>; // לדוג' תאריכים חשובים
  documents?: string[]; // קישורים לקבצים
} 