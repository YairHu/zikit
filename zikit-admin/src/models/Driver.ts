export interface Driver {
  id: string;
  soldierId: string;
  licenseTypes: string[];
  status: 'available' | 'on_mission' | 'resting';
  restUntil?: string; // תאריך/שעה עד מתי במנוחה
} 