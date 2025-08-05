export interface Trip {
  id: string;
  vehicleId?: string;
  vehicleNumber?: string;
  driverId?: string;
  driverName?: string;
  location: string;
  departureTime?: string;
  returnTime?: string;
  purpose: string;
  status: 'מתוכננת' | 'בביצוע' | 'הסתיימה' | 'בוטלה';
  linkedActivityId?: string; // קישור לפעילות מבצעית
  team?: string; // צוות שמבצע את הנסיעה
  frameworkId?: string; // מזהה המסגרת שמבצעת את הנסיעה
  createdAt: string;
  updatedAt: string;
} 