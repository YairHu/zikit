export interface Vehicle {
  id: string;
  type: string;
  number: string;
  status: 'available' | 'on_mission' | 'maintenance';
  currentMissionId?: string;
  driverId?: string;
  returnEstimate?: string; // צפי חזרה
} 