// מחלקה מרכזית לניהול סטטוסי נוכחות של חיילים
export type PresenceStatus = 
  | 'בבסיס'
  | 'בפעילות'
  | 'בנסיעה'
  | 'בתורנות'
  | 'בהפניה'
  | 'במנוחה'
  | 'קורס'
  | 'גימלים'
  | 'חופש'
  | 'אחר';

// הגדרת הסטטוסים שדורשים תאריך סיום
export const ABSENCE_STATUSES: PresenceStatus[] = ['קורס', 'גימלים', 'חופש'];

// הגדרת הסטטוסים שדורשים טקסט נוסף
export const CUSTOM_TEXT_STATUSES: PresenceStatus[] = ['קורס', 'אחר'];

// היררכיית סטטוסים (לפי עדיפות)
export const STATUS_HIERARCHY: Record<PresenceStatus, number> = {
  'בבסיס': 1,
  'במנוחה': 2,
  'בתורנות': 3,
  'בהפניה': 4,
  'בנסיעה': 5,
  'בפעילות': 6,
  'חופש': 7,
  'גימלים': 8,
  'אחר': 9,
  'קורס': 10, // קורס - הגבוה ביותר
};

// צבעים לכל סטטוס
export const STATUS_COLORS: Record<PresenceStatus, string> = {
  'בבסיס': '#4CAF50', // ירוק
  'בפעילות': '#2196F3', // כחול
  'בנסיעה': '#FF9800', // כתום
  'בתורנות': '#9C27B0', // סגול
  'בהפניה': '#FF6B35', // כתום כהה
  'במנוחה': '#607D8B', // אפור כחול
  'קורס': '#E91E63', // ורוד ייחודי לקורס
  'גימלים': '#FF5722', // אדום כתום
  'חופש': '#00BCD4', // ציאן
  'אחר': '#795548', // חום
};

// תוויות בעברית
export const STATUS_LABELS: Record<PresenceStatus, string> = {
  'בבסיס': 'בבסיס',
  'בפעילות': 'בפעילות',
  'בנסיעה': 'בנסיעה',
  'בתורנות': 'בתורנות',
  'בהפניה': 'בהפניה',
  'במנוחה': 'במנוחה',
  'קורס': 'קורס',
  'גימלים': 'גימלים',
  'חופש': 'חופש',
  'אחר': 'אחר',
};

// פונקציות עזר

/**
 * בדיקה אם סטטוס דורש תאריך סיום
 */
export const requiresAbsenceDate = (status: PresenceStatus): boolean => {
  return ABSENCE_STATUSES.includes(status);
};

/**
 * בדיקה אם סטטוס דורש טקסט נוסף
 */
export const requiresCustomText = (status: PresenceStatus): boolean => {
  return CUSTOM_TEXT_STATUSES.includes(status);
};

/**
 * קבלת צבע לסטטוס
 */
export const getStatusColor = (status: PresenceStatus): string => {
  return STATUS_COLORS[status] || '#757575'; // ברירת מחדל אפור
};

/**
 * קבלת תווית לסטטוס
 */
export const getStatusLabel = (status: PresenceStatus): string => {
  return STATUS_LABELS[status] || status;
};

/**
 * קבלת כל הסטטוסים הזמינים
 */
export const getAllStatuses = (): PresenceStatus[] => {
  return Object.keys(STATUS_LABELS) as PresenceStatus[];
};

/**
 * קבלת סטטוסים שדורשים תאריך סיום
 */
export const getAbsenceStatuses = (): PresenceStatus[] => {
  return [...ABSENCE_STATUSES];
};

/**
 * קבלת סטטוסים שדורשים טקסט נוסף
 */
export const getCustomTextStatuses = (): PresenceStatus[] => {
  return [...CUSTOM_TEXT_STATUSES];
};

/**
 * בדיקה אם סטטוס הוא היעדרות
 */
export const isAbsenceStatus = (status: PresenceStatus): boolean => {
  return requiresAbsenceDate(status);
};

/**
 * קבלת עדיפות סטטוס
 */
export const getStatusPriority = (status: PresenceStatus): number => {
  return STATUS_HIERARCHY[status] || 0;
};

/**
 * השוואת עדיפויות סטטוסים
 */
export const compareStatusPriority = (status1: PresenceStatus, status2: PresenceStatus): number => {
  return getStatusPriority(status1) - getStatusPriority(status2);
};

/**
 * קבלת הסטטוס עם העדיפות הגבוהה ביותר
 */
export const getHighestPriorityStatus = (statuses: PresenceStatus[]): PresenceStatus => {
  if (statuses.length === 0) return 'בבסיס';
  
  return statuses.reduce((highest, current) => {
    return compareStatusPriority(current, highest) > 0 ? current : highest;
  });
};

/**
 * מיפוי סטטוס לדוח (לפי דרישות מערכת)
 */
export const mapStatusForReport = (status: PresenceStatus): string => {
  switch (status) {
    case 'בבסיס':
    case 'בפעילות':
    case 'בתורנות':
    case 'בהפניה':
    case 'בנסיעה':
    case 'במנוחה':
      return 'בבסיס';
    case 'קורס':
      return 'קורס';
    case 'גימלים':
      return 'גימלים';
    case 'חופש':
      return 'חופש';
    default:
      return 'בבסיס';
  }
};

/**
 * קבלת סיבת אי-זמינות
 */
export const getUnavailabilityReason = (status: PresenceStatus): string => {
  switch (status) {
    case 'קורס':
      return 'בקורס';
    case 'גימלים':
      return 'בגימלים';
    case 'חופש':
      return 'חופש';
    default:
      return '';
  }
};

/**
 * בדיקה אם סטטוס הוא סטטוס רגיל (לא היעדרות)
 */
export const isRegularStatus = (status: PresenceStatus): boolean => {
  return !isAbsenceStatus(status);
};

/**
 * קבלת סטטוס ברירת מחדל
 */
export const getDefaultStatus = (): PresenceStatus => {
  return 'בבסיס';
};

/**
 * קבלת סטטוס ברירת מחדל לחייל ללא סטטוס מוגדר
 */
export const getDefaultPresenceStatus = (): PresenceStatus => {
  return 'בבסיס';
};

/**
 * קבלת סטטוס ברירת מחדל להיעדרות
 */
export const getDefaultAbsenceStatus = (): PresenceStatus => {
  return 'קורס';
};

/**
 * יצירת אופציות לתפריט בחירה
 */
export const createStatusOptions = () => {
  return getAllStatuses().map(status => ({
    value: status,
    label: getStatusLabel(status),
    color: getStatusColor(status)
  }));
};

/**
 * יצירת אופציות לתפריט בחירה עם סינון
 */
export const createFilteredStatusOptions = (filter?: (status: PresenceStatus) => boolean) => {
  const statuses = filter ? getAllStatuses().filter(filter) : getAllStatuses();
  return statuses.map(status => ({
    value: status,
    label: getStatusLabel(status),
    color: getStatusColor(status)
  }));
};



/**
 * קבלת תאריך ושעה ברירת מחדל לסיום היעדרות
 */
export const getDefaultAbsenceUntilTime = (): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // השתמש ב-23:59 של היום
  today.setHours(23, 59, 0, 0);
  return today.toISOString();
};

/**
 * בדיקה אם היעדרות פעילה כרגע
 */
export const isAbsenceActive = (absenceUntil?: string): boolean => {
  if (!absenceUntil) return false;
  
  const now = new Date();
  const until = new Date(absenceUntil);
  
  return now <= until;
};



/**
 * קבלת זמן סיום מפורמט ISO
 */
export const parseAbsenceUntilTime = (isoString: string): Date => {
  return new Date(isoString);
};
