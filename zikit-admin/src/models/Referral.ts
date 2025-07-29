export interface Referral {
  id: string;
  soldierId: string;
  soldierName: string;
  personalNumber: string;
  team: string;
  date: string; // תאריך ההפניה
  location: string; // מיקום ההפניה
  reason: string; // סיבת ההפניה
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
} 