export interface Mission {
  id: string;
  name: string; // שם משימה
  description: string; // תיאור
  dueDate: string; // תאריך יעד
  assignedBy: string; // נותן המשימה
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
} 