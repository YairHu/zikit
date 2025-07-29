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
  createdAt: string;
  updatedAt: string;
} 