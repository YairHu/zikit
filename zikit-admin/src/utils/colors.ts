// פונקציות צבע מרכזיות למערכת
export const getPresenceColor = (presence?: string) => {
  switch (presence) {
    case 'בבסיס':
      return '#4CAF50'; // ירוק
    case 'בפעילות':
      return '#F44336'; // אדום
    case 'בנסיעה':
      return '#FF9800'; // כתום
    case 'בתורנות':
      return '#9C27B0'; // סגול
    case 'במנוחה':
      return '#2196F3'; // כחול
    case 'חופש':
      return '#00BCD4'; // טורקיז ייחודי לחופש
    case 'גימלים':
      return '#FFD600'; // צהוב ייחודי לגימלים
    case 'אחר':
      return '#9C27B0'; // סגול
    default:
      return '#9E9E9E'; // אפור
  }
};

export const getProfileColor = (profile: string) => {
  const num = parseInt(profile);
  if (num >= 97) return '#4CAF50';
  if (num >= 82) return '#FF9800';
  if (num >= 72) return '#F44336';
  return '#9E9E9E';
};

export const getRoleColor = (role: string) => {
  switch (role) {
    case 'מפקד צוות': return '#d32f2f';
    case 'סמל': return '#1976d2';
    case 'חייל': return '#388e3c';
    case 'מפקד פלוגה': return '#7b1fa2';
    default: return '#757575';
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'מתוכננת': return 'primary';
    case 'בביצוע': return 'warning';
    case 'הסתיימה': return 'success';
    case 'בוטלה': return 'error';
    case 'פעילה': return 'info';
    case 'pending': return 'warning';
    case 'in_progress': return 'info';
    case 'completed': return 'success';
    case 'cancelled': return 'error';
    default: return 'default';
  }
};

export const getVacationStatusColor = (status: 'good' | 'warning' | 'critical') => {
  switch (status) {
    case 'good': return '#4CAF50';
    case 'warning': return '#FF9800';
    case 'critical': return '#F44336';
    default: return '#9E9E9E';
  }
};

// פונקציה לצבעי סטטוס נהגים
export const getDriverStatusColor = (status?: string) => {
  switch (status) {
    case 'available':
      return '#4CAF50'; // ירוק - זמין
    case 'on_trip':
      return '#FF9800'; // כתום - בנסיעה
    case 'resting':
      return '#2196F3'; // כחול - במנוחה
    default:
      return '#9E9E9E'; // אפור - לא מוגדר
  }
};

// פונקציה לטקסט סטטוס נהגים
export const getDriverStatusText = (status?: string) => {
  switch (status) {
    case 'available':
      return 'זמין';
    case 'on_trip':
      return 'בנסיעה';
    case 'resting':
      return 'במנוחה';
    default:
      return 'לא מוגדר';
  }
}; 