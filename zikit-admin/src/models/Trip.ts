export interface Trip {
  id: string;
  vehicleId?: string;
  vehicleNumber?: string;
  vehicleType?: string; // סוג הרכב
  driverId?: string;
  driverName?: string;
  commanderId?: string; // מפקד הנסיעה
  commanderName?: string; // שם מפקד הנסיעה
  location: string;
  departureTime: string; // שדה חובה
  returnTime: string; // שדה חובה
  purpose: string;
  purposeType?: 'פעילות מבצעית' | 'נסיעה מנהלתית' | 'פינוי' | 'אחר';
  purposeOther?: string;
  status: 'מתוכננת' | 'בביצוע' | 'הסתיימה';
  linkedActivityId?: string; // קישור לפעילות מבצעית
  team?: string; // צוות שמבצע את הנסיעה
  frameworkId?: string; // מזהה המסגרת שמבצעת את הנסיעה
  createdAt: string;
  updatedAt: string;
  // שדות חדשים לניהול אוטומטי
  autoStatusChanged?: boolean; // האם הסטטוס השתנה אוטומטית
  actualDepartureTime?: string; // זמן יציאה בפועל (מעודכן ידנית)
  actualReturnTime?: string; // זמן חזרה בפועל (מעודכן ידנית)
  autoStatusUpdateTime?: string; // זמן עדכון הסטטוס האוטומטי
} 