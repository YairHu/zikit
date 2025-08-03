export interface DutyParticipant {
  soldierId: string;
  soldierName: string;
  personalNumber: string;
}

export interface Duty {
  id: string;
  type: string; // מטבח, רסר, פלוגה, אחר
  location: string;
  startDate: string;
  startTime: string;
  endTime?: string; // לא חובה
  participants: DutyParticipant[];
  requiredEquipment?: string; // לא חובה
  notes?: string; // לא חובה
  frameworkId?: string; // מזהה המסגרת שמבצעת את התורנות
  team?: string; // לתאימות לאחור - יוסר בעתיד
  status: 'פעילה' | 'הסתיימה' | 'בוטלה';
  createdAt: string;
  updatedAt: string;
} 