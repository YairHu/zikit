export interface Referral {
  id: string;
  soldierId: string;
  soldierName: string;
  personalNumber: string;
  frameworkId?: string; // מזהה המסגרת של החייל
  team?: string; // לתאימות לאחור - יוסר בעתיד
  date: string; // תאריך ההפניה
  departureTime?: string; // שעת יציאה
  returnTime?: string; // שעת חזרה
  location: string; // מיקום ההפניה
  reason: string; // סיבת ההפניה
  createdAt: string;
  updatedAt: string;
} 