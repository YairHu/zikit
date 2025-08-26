/**
 * פונקציות לטיפול בזמן ישראל
 */

/**
 * המרת תאריך לזמן ישראל
 * @param date - תאריך להמרה
 * @returns תאריך בזמן ישראל
 */
export const toIsraelTime = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
};

/**
 * יצירת תאריך ישראל מתאריך string
 * @param dateString - מחרוזת תאריך (YYYY-MM-DD)
 * @returns תאריך בזמן ישראל
 */
export const createIsraelDate = (dateString: string): Date => {
  const date = new Date(dateString + 'T00:00:00');
  return toIsraelTime(date);
};

/**
 * בדיקה אם תאריך הוא היום בזמן ישראל
 * @param date - תאריך לבדיקה
 * @returns true אם זה היום
 */
export const isTodayInIsrael = (date: Date): boolean => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const israelToday = toIsraelTime(today);
  const israelDate = toIsraelTime(date);
  
  return israelDate.getTime() === israelToday.getTime();
};

/**
 * המרת תאריך לפורמט datetime-local (זמן ישראל)
 * @param dateString - מחרוזת תאריך
 * @returns מחרוזת בפורמט datetime-local
 */
export const formatDateTimeForInput = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const israelTime = toIsraelTime(date);
  
  // המרה לפורמט datetime-local
  const year = israelTime.getFullYear();
  const month = String(israelTime.getMonth() + 1).padStart(2, '0');
  const day = String(israelTime.getDate()).padStart(2, '0');
  const hours = String(israelTime.getHours()).padStart(2, '0');
  const minutes = String(israelTime.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * המרת תאריך לפורמט תצוגה עברי (זמן ישראל)
 * @param date - תאריך להמרה
 * @param options - אפשרויות תצוגה
 * @returns מחרוזת בפורמט עברי
 */
export const formatToIsraelString = (
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const israelTime = toIsraelTime(dateObj);
  
  return israelTime.toLocaleString('he-IL', {
    ...options,
    timeZone: 'Asia/Jerusalem'
  });
};

/**
 * קבלת השעה הנוכחית בזמן ישראל
 * @returns תאריך עם השעה הנוכחית בזמן ישראל
 */
export const getCurrentIsraelTime = (): Date => {
  return toIsraelTime(new Date());
};

/**
 * בדיקה אם זמן נתון נמצא בטווח זמן מסוים
 * @param currentTime - הזמן הנוכחי לבדיקה
 * @param startTime - זמן התחלה
 * @param endTime - זמן סיום
 * @returns true אם הזמן הנוכחי בטווח
 */
export const isTimeInRange = (
  currentTime: Date | string,
  startTime: Date | string,
  endTime: Date | string
): boolean => {
  const current = typeof currentTime === 'string' ? new Date(currentTime) : currentTime;
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  
  return current >= start && current <= end;
};

/**
 * בדיקה אם פעילות פעילה כרגע (בטווח הזמן שלה)
 * @param activityStartDate - תאריך התחלת הפעילות
 * @param activityStartTime - שעת התחלת הפעילות
 * @param activityDuration - משך הפעילות בשעות
 * @returns true אם הפעילות פעילה כרגע
 */
export const isActivityActive = (
  activityStartDate: string,
  activityStartTime: string,
  activityDuration: number
): boolean => {
  const now = getCurrentIsraelTime();
  const startDateTime = new Date(`${activityStartDate}T${activityStartTime}`);
  const endDateTime = new Date(startDateTime.getTime() + (activityDuration * 60 * 60 * 1000));
  
  return isTimeInRange(now, startDateTime, endDateTime);
};

/**
 * בדיקה אם תורנות פעילה כרגע (בטווח הזמן שלה)
 * @param dutyStartDate - תאריך התחלת התורנות
 * @param dutyStartTime - שעת התחלת התורנות
 * @param dutyEndTime - שעת סיום התורנות
 * @returns true אם התורנות פעילה כרגע
 */
export const isDutyActive = (
  dutyStartDate: string,
  dutyStartTime: string,
  dutyEndTime?: string
): boolean => {
  const now = getCurrentIsraelTime();
  const startDateTime = new Date(`${dutyStartDate}T${dutyStartTime}`);
  const endDateTime = dutyEndTime 
    ? new Date(`${dutyStartDate}T${dutyEndTime}`)
    : new Date(startDateTime.getTime() + (8 * 60 * 60 * 1000)); // 8 שעות ברירת מחדל
  
  return isTimeInRange(now, startDateTime, endDateTime);
};

/**
 * קבלת תאריך התחלת השבוע (ראשון) בזמן ישראל
 * @param date - תאריך כלשהו בשבוע
 * @returns תאריך ראשון בשבוע
 */
export const getWeekStart = (date: Date = new Date()): Date => {
  const israelDate = toIsraelTime(date);
  const dayOfWeek = israelDate.getDay(); // 0 = ראשון, 1 = שני, וכו'
  const weekStart = new Date(israelDate);
  weekStart.setDate(israelDate.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

/**
 * קבלת תאריך סיום השבוע (שבת) בזמן ישראל
 * @param date - תאריך כלשהו בשבוע
 * @returns תאריך שבת בשבוע
 */
export const getWeekEnd = (date: Date = new Date()): Date => {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
};

/**
 * קבלת כל ימות השבוע בזמן ישראל
 * @param date - תאריך כלשהו בשבוע
 * @returns מערך של 7 תאריכים (ראשון עד שבת)
 */
export const getWeekDays = (date: Date = new Date()): Date[] => {
  const weekStart = getWeekStart(date);
  const days: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  
  return days;
};

/**
 * בדיקה אם שני תאריכים הם באותו יום
 * @param date1 - תאריך ראשון
 * @param date2 - תאריך שני
 * @returns true אם הם באותו יום
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  const israelDate1 = toIsraelTime(date1);
  const israelDate2 = toIsraelTime(date2);
  
  return israelDate1.getFullYear() === israelDate2.getFullYear() &&
         israelDate1.getMonth() === israelDate2.getMonth() &&
         israelDate1.getDate() === israelDate2.getDate();
};

/**
 * קבלת שם היום בעברית
 * @param date - תאריך
 * @returns שם היום בעברית
 */
export const getHebrewDayName = (date: Date): string => {
  const israelDate = toIsraelTime(date);
  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return dayNames[israelDate.getDay()];
};

/**
 * קבלת מספר השבוע בשנה
 * @param date - תאריך
 * @returns מספר השבוע בשנה
 */
export const getWeekNumber = (date: Date = new Date()): number => {
  const israelDate = toIsraelTime(date);
  const startOfYear = new Date(israelDate.getFullYear(), 0, 1);
  const days = Math.floor((israelDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
};
