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
 * קבלת תאריך נוכחי בזמן ישראל
 * @returns תאריך נוכחי בזמן ישראל
 */
export const getCurrentIsraelTime = (): Date => {
  return toIsraelTime(new Date());
};
