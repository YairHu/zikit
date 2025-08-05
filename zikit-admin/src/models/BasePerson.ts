// מודל בסיסי לכל האנשים במערכת
export interface BasePerson {
  id: string;
  name: string;
  personalNumber: string;
  frameworkId?: string; // מזהה המסגרת שאליה שייך האדם
  role: string;
  profile: string;
  qualifications: string[];
  licenses: string[];
  certifications: string[];
  presence?: string;
  presenceOther?: string;
  family?: string;
  militaryBackground?: string;
  notes?: string;
  medicalProfile?: string;
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