import { Soldier } from './Soldier';

// מומחה הוא חייל עם התמחות מיוחדת
export interface Specialist extends Soldier {
  // תכונות נוספות למומחה
  specialization?: string; // תחום ההתמחות
  expertiseLevel?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  specialCertifications?: {
    name: string;
    issuingAuthority: string;
    issueDate: string;
    expiryDate?: string;
    level: string;
  }[];
  specialTraining?: {
    course: string;
    institution: string;
    duration: string;
    completionDate: string;
    grade?: string;
  }[];
  equipmentQualified?: string[]; // ציוד מורשה לתפעל
  maintenanceSkills?: string[]; // כישורי תחזוקה
} 