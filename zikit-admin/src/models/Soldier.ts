export interface Soldier {
  id: string;
  name: string;
  personalNumber: string;
  team: string;
  role: string;
  profile: string;
  qualifications: string[];
  licenses: string[];
  certifications: string[];
  family?: string;
  militaryBackground?: string;
  dates?: Record<string, string>; // לדוג' תאריכים חשובים
  documents?: string[]; // קישורים לקבצים
  notes?: string;
  medicalProfile?: string; // מידע רפואי (רק למ"פ)
} 