export interface Vehicle {
  id: string;
  type: string;
  number: string;
  mileage: number; // קילומטרז
  lastMaintenance: string; // תאריך טיפול אחרון
  nextMaintenance: string; // תאריך טיפול הבא
  status: 'available' | 'on_mission' | 'maintenance';
  currentMissionId?: string;
  driverId?: string;
  returnEstimate?: string; // צפי חזרה
  seats: number; // מספר מקומות ברכב
  requiredLicense?: string; // היתר נדרש לנהיגה ברכב זה
} 