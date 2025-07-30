export interface ActivityParticipant {
  soldierId: string;
  soldierName: string;
  personalNumber: string;
  role: string; // תפקיד בפעילות
}

export interface Activity {
  id: string;
  name: string;
  team: string;
  location: string;
  region: 'מנשה' | 'אפרים' | 'שומרון' | 'יהודה' | 'בנימין' | 'עציון' | 'הבקעה והעמקים';
  activityType: 'מארב ירי' | 'אמלמ' | 'זווית אחרת' | 'אחר';
  activityTypeOther?: string; // שדה חופשי כאשר activityType הוא 'אחר'
  plannedDate: string;
  plannedTime: string;
  duration: number; // בשעות
  commanderId: string;
  commanderName: string;
  taskLeaderId: string;
  taskLeaderName: string;
  vehicleId?: string;
  vehicleNumber?: string;
  driverId?: string;
  driverName?: string;
  participants: ActivityParticipant[];
  status: 'מתוכננת' | 'בביצוע' | 'הסתיימה' | 'בוטלה';
  deliverables?: ActivityDeliverable[]; // תוצרים של הפעילות
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDeliverable {
  id: string;
  type: 'text' | 'image';
  content: string; // טקסט או URL של תמונה
  title: string;
  createdAt: string;
  createdBy: string;
} 