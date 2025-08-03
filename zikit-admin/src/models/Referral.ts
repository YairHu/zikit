export interface Referral {
  id: string;
  soldierId: string;
  soldierName: string;
  personalNumber: string;
  frameworkId?: string; // מזהה המסגרת של החייל
  team?: string; // לתאימות לאחור - יוסר בעתיד
  date: string; // תאריך ההפניה
  location: string; // מיקום ההפניה
  reason: string; // סיבת ההפניה
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
} 