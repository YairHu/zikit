export interface Mission {
  id: string;
  name: string; // שם משימה
  description: string; // תיאור
  dueDate: string; // תאריך יעד
  assignedBy: string; // שם המשתמש שיצר את המשימה
  assignedByUid: string; // UID של המשתמש שיצר את המשימה
  assignedToSoldiers: string[]; // רשימת UIDs של החיילים שמקבלים את המשימה
  frameworkId?: string; // מזהה המסגרת/צוות שאמור לבצע
  team?: string; // לתאימות לאחור - יוסר בעתיד
  createdAt: string;
  updatedAt: string;
} 