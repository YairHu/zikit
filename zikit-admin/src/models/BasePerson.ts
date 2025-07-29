// מודל בסיסי לכל האנשים במערכת
export interface BasePerson {
  id: string;
  name: string;
  personalNumber: string;
  team: string;
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
} 