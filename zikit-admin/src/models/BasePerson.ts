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
  // שדות חדשים
  framework?: {
    pluga?: string; // פלוגה
    pelaga?: string; // פלגה
    miflag?: string; // מפלג
    tzevet?: string; // צוות
  };
  commanders?: {
    mefakedTzevet?: string; // מפקד צוות
    mefakedMiflag?: string; // מפקד מפלג
    samal?: string; // סמ"פ
    mefakedPluga?: string; // מ"פ
  };
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