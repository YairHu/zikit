export interface Mission {
  id: string;
  name: string; // שם משימה
  description: string; // תיאור
  dueDate: string; // תאריך יעד
  assignedBy: string; // נותן המשימה
  assignedTo?: string[]; // מי אמור לבצע את המשימה (מערך של UIDs)
  frameworkId?: string; // מזהה המסגרת/צוות שאמור לבצע
  team?: string; // לתאימות לאחור - יוסר בעתיד
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
} 