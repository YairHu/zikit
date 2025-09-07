// מודל בסיסי לכל האנשים במערכת
export interface BasePerson {
  id: string;
  name: string;
  personalNumber: string;
  rank?: string; // דרגה
  frameworkId?: string; // מזהה המסגרת שאליה שייך האדם
  role: string;
  profile: string;
  qualifications: string[];
  licenses: string[];
  certifications: string[];
  drivingLicenses?: string[]; // היתרים לנהיגה
  presence?: string;
  presenceOther?: string;
  currentActivityName?: string; // שם הפעילות הנוכחית (הסטטוס הוא "בפעילות")
  absenceUntil?: string; // תאריך עד מתי החייל בהיעדרות (קורס/גימלים/חופש) - כולל שעה (ברירת מחדל 23:59)
  family?: string;
  militaryBackground?: string;
  notes?: string;
  medicalProfile?: string;
  
  // שדות מטופס הקליטה
  email?: string;
  fullName?: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  additionalInfo?: string;
  
  braurTest?: {
    strength: 'passed' | 'failed';
    running: string;
  };
  vacationDays?: {
    total: number;
    used: number;
    status: 'good' | 'warning' | 'critical';
  };
  // קישור לפעילויות
  activities?: string[]; // מזהי פעילויות שהאדם משתתף בהן
  // קישור לנסיעות
  trips?: string[]; // מזהי נסיעות שהאדם משתתף בהן
} 