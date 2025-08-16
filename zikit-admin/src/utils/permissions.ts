import { User } from '../models/User';
import { UserRole, getUserPermissions, hasPermission, canViewContent } from '../models/UserRole';

// פונקציות עזר לבדיקת הרשאות

/**
 * בודק אם משתמש יכול לראות נתונים של משתמש אחר
 */
export const canViewUserData = (viewer: User, target: User): boolean => {
  // אדמין רואה הכל
  if (viewer.role === UserRole.ADMIN) return true;
  
  // מ"פ וסמ"פ רואים את כל הפלוגה
  if (viewer.role === UserRole.MEFAKED_PLUGA || viewer.role === UserRole.SAMAL_PLUGA) {
    return true;
  }
  
  // מפקד פלגה רואה את הפלגה שלו
  if (viewer.role === UserRole.MEFAKED_PELAGA) {
    return viewer.pelaga === target.pelaga;
  }
  
  // מפקד צוות רואה את הצוות שלו
  if (viewer.role === UserRole.MEFAKED_TZEVET) {
    return viewer.team === target.team;
  }
  
  // סמל ומפקד חיילים רואים את הצוות שלהם
  if (viewer.role === UserRole.SAMAL || viewer.role === UserRole.MEFAKED_CHAYAL) {
    return viewer.team === target.team;
  }
  
  // חייל רואה רק את עצמו
  if (viewer.role === UserRole.CHAYAL) {
    return viewer.uid === target.uid;
  }
  
  // חמ"ל רואה את כל הפלוגה (לצורכי תצוגה)
  if (viewer.role === UserRole.HAMAL) {
    return true;
  }
  
  return false;
};

/**
 * בודק אם משתמש יכול לערוך נתונים של משתמש אחר
 */
export const canEditUserData = (viewer: User, target: User): boolean => {
  const permissions = getUserPermissions(viewer.role as UserRole);
  
  // חייל לא יכול לערוך כלום
  if (viewer.role === UserRole.CHAYAL) {
    return false;
  }
  
  // חמ"ל לא יכול לערוך
  if (viewer.role === UserRole.HAMAL) {
    return false;
  }
  
  // אם אין הרשאת עריכה, לא יכול לערוך
  if (!permissions.actions.canEdit) {
    return false;
  }
  
  // בודק אם יכול לראות את הנתונים
  return canViewUserData(viewer, target);
};

/**
 * בודק אם משתמש יכול לראות פעילות
 */
export const canViewActivity = (user: User, activity: any): boolean => {
  const permissions = getUserPermissions(user.role as UserRole);
  
  // אם רואה כל הנתונים
  if (permissions.content.viewAllData) {
    return true;
  }
  
  // אם רואה רק נתונים אישיים
  if (permissions.content.viewOwnDataOnly) {
    // בודק אם המשתמש משובץ בפעילות
    const isParticipant = activity.participants?.some((participant: any) => 
      participant.soldierId === user.uid
    );
    
    return isParticipant || 
           activity.creatorUid === user.uid ||
           activity.teamId === user.team;
  }
  
  // אם רואה נתוני צוות
  if (permissions.content.viewTeamData) {
    return activity.teamId === user.team;
  }
  
  // אם רואה נתוני פלגה
  if (permissions.content.viewPlagaData) {
    return activity.pelagaId === user.pelaga;
  }
  
  return false;
};

/**
 * בודק אם משתמש יכול לערוך פעילות
 */
export const canEditActivity = (user: User, activity: any): boolean => {
  const permissions = getUserPermissions(user.role as UserRole);
  
  // חייל לא יכול לערוך פעילויות
  if (user.role === UserRole.CHAYAL) {
    return false;
  }
  
  // חמ"ל לא יכול לערוך
  if (user.role === UserRole.HAMAL) {
    return false;
  }
  
  // אם אין הרשאת עריכה, לא יכול לערוך
  if (!permissions.actions.canEdit) {
    return false;
  }
  
  // בודק אם יכול לראות את הפעילות
  return canViewActivity(user, activity);
};

/**
 * בודק אם משתמש יכול לראות משימה
 */
export const canViewMission = (user: User, mission: any): boolean => {
  const permissions = getUserPermissions(user.role as UserRole);
  
  // אם רואה כל הנתונים
  if (permissions.content.viewAllData) {
    return true;
  }
  
  // אם רואה רק נתונים אישיים
  if (permissions.content.viewOwnDataOnly) {
    // בודק אם המשתמש מוקצה למשימה
    const isAssigned = mission.assignedTo?.includes(user.uid) || 
                      mission.assignedBy === user.uid;
    
    // בודק אם המשימה שייכת לצוות של המשתמש
    const isTeamMission = mission.frameworkId === user.team ||
                         mission.team === user.team;
    
    return isAssigned || isTeamMission;
  }
  
  // אם רואה נתוני צוות
  if (permissions.content.viewTeamData) {
    return mission.frameworkId === user.team || mission.team === user.team;
  }
  
  // אם רואה נתוני פלגה
  if (permissions.content.viewPlagaData) {
    return mission.frameworkId === user.pelaga || mission.team === user.pelaga;
  }
  
  return false;
};

/**
 * בודק אם משתמש יכול לראות נסיעה
 */
export const canViewTrip = (user: User, trip: any): boolean => {
  const permissions = getUserPermissions(user.role as UserRole);
  
  // אם רואה כל הנתונים
  if (permissions.content.viewAllData) {
    return true;
  }
  
  // אם רואה רק נתונים אישיים
  if (permissions.content.viewOwnDataOnly) {
    return trip.participants?.includes(user.uid) || 
           trip.driverUid === user.uid ||
           trip.teamId === user.team;
  }
  
  // אם רואה נתוני צוות
  if (permissions.content.viewTeamData) {
    return trip.teamId === user.team;
  }
  
  // אם רואה נתוני פלגה
  if (permissions.content.viewPlagaData) {
    return trip.pelagaId === user.pelaga;
  }
  
  return false;
};

/**
 * בודק אם משתמש יכול לראות תורנות
 */
export const canViewDuty = (user: User, duty: any): boolean => {
  const permissions = getUserPermissions(user.role as UserRole);
  
  // אם רואה כל הנתונים
  if (permissions.content.viewAllData) {
    return true;
  }
  
  // אם רואה רק נתונים אישיים
  if (permissions.content.viewOwnDataOnly) {
    // בודק אם המשתמש משתתף בתורנות
    const isParticipant = duty.participants?.some((p: any) => p.soldierId === user.uid);
    
    // בודק אם התורנות שייכת לצוות של המשתמש
    const isTeamDuty = duty.frameworkId === user.team ||
                      duty.team === user.team;
    
    return isParticipant || isTeamDuty;
  }
  
  // אם רואה נתוני צוות
  if (permissions.content.viewTeamData) {
    return duty.frameworkId === user.team || duty.team === user.team;
  }
  
  // אם רואה נתוני פלגה
  if (permissions.content.viewPlagaData) {
    return duty.frameworkId === user.pelaga || duty.team === user.pelaga;
  }
  
  return false;
};

/**
 * בודק אם משתמש יכול לראות הפניה
 */
export const canViewReferral = (user: User, referral: any): boolean => {
  const permissions = getUserPermissions(user.role as UserRole);
  
  // אם רואה כל הנתונים
  if (permissions.content.viewAllData) {
    return true;
  }
  
  // אם רואה רק נתונים אישיים
  if (permissions.content.viewOwnDataOnly) {
    // בודק אם ההפניה שייכת למשתמש
    const isOwnReferral = referral.soldierId === user.uid;
    
    // בודק אם ההפניה שייכת לצוות של המשתמש
    const isTeamReferral = referral.frameworkId === user.team ||
                          referral.team === user.team;
    
    return isOwnReferral || isTeamReferral;
  }
  
  // אם רואה נתוני צוות
  if (permissions.content.viewTeamData) {
    return referral.frameworkId === user.team || referral.team === user.team;
  }
  
  // אם רואה נתוני פלגה
  if (permissions.content.viewPlagaData) {
    return referral.frameworkId === user.pelaga || referral.team === user.pelaga;
  }
  
  return false;
};

/**
 * בודק אם משתמש יכול לראות צוות
 */
export const canViewTeam = (user: User, team: any): boolean => {
  const permissions = getUserPermissions(user.role as UserRole);
  
  // אם רואה כל הנתונים
  if (permissions.content.viewAllData) {
    return true;
  }
  
  // אם רואה רק נתונים אישיים
  if (permissions.content.viewOwnDataOnly) {
    return team.id === user.team;
  }
  
  // אם רואה נתוני צוות
  if (permissions.content.viewTeamData) {
    return team.id === user.team;
  }
  
  // אם רואה נתוני פלגה
  if (permissions.content.viewPlagaData) {
    return team.pelagaId === user.pelaga;
  }
  
  return false;
};

/**
 * מסנן רשימה לפי הרשאות המשתמש
 */
export const filterByPermissions = <T>(
  user: User, 
  items: T[], 
  filterFunction: (user: User, item: T) => boolean
): T[] => {
  return items.filter(item => filterFunction(user, item));
};

/**
 * בודק אם משתמש יכול ליצור פריט חדש
 */
export const canCreateItem = (user: User, itemType: string): boolean => {
  const permissions = getUserPermissions(user.role as UserRole);
  return permissions.actions.canCreate;
};

/**
 * בודק אם משתמש יכול לערוך פריט
 */
export const canEditItem = (user: User, item: any, itemType: string): boolean => {
  const permissions = getUserPermissions(user.role as UserRole);
  
  if (!permissions.actions.canEdit) {
    return false;
  }
  
  // חייל לא יכול לערוך כלום
  if (user.role === UserRole.CHAYAL) {
    return false;
  }
  
  // חמ"ל לא יכול לערוך
  if (user.role === UserRole.HAMAL) {
    return false;
  }
  
  // בודק אם יכול לראות את הפריט
  switch (itemType) {
    case 'activity':
      return canViewActivity(user, item);
    case 'mission':
      return canViewMission(user, item);
    case 'trip':
      return canViewTrip(user, item);
    case 'duty':
      return canViewDuty(user, item);
    case 'referral':
      return canViewReferral(user, item);
    case 'team':
      return canViewTeam(user, item);
    default:
      return false;
  }
};

/**
 * בודק אם משתמש יכול למחוק פריט
 */
export const canDeleteItem = (user: User, item: any, itemType: string): boolean => {
  const permissions = getUserPermissions(user.role as UserRole);
  
  if (!permissions.actions.canDelete) {
    return false;
  }
  
  // חייל לא יכול למחוק כלום
  if (user.role === UserRole.CHAYAL) {
    return false;
  }
  
  // חמ"ל לא יכול למחוק
  if (user.role === UserRole.HAMAL) {
    return false;
  }
  
  // בודק אם יכול לראות את הפריט
  switch (itemType) {
    case 'activity':
      return canViewActivity(user, item);
    case 'mission':
      return canViewMission(user, item);
    case 'trip':
      return canViewTrip(user, item);
    case 'duty':
      return canViewDuty(user, item);
    case 'referral':
      return canViewReferral(user, item);
    case 'team':
      return canViewTeam(user, item);
    default:
      return false;
  }
}; 