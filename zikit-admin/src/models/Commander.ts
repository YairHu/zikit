import { Soldier } from './Soldier';

// מפקד הוא חייל עם תכונות פיקוד
export interface Commander extends Soldier {
  // תכונות נוספות למפקד
  commandLevel?: 'mefaked_tzevet' | 'mefaked_pluga' | 'mefaked_company' | 'mefaked_battalion';
  subordinates?: string[]; // רשימת כפיפים ישירים
  commandExperience?: number; // שנות ניסיון בפיקוד
  leadershipTraining?: string[]; // קורסי מנהיגות שעבר
  performanceReviews?: {
    date: string;
    reviewer: string;
    rating: number;
    comments: string;
  }[];
  commandHistory?: {
    unit: string;
    position: string;
    startDate: string;
    endDate?: string;
  }[];
} 