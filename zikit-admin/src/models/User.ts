import { UserRole } from './UserRole';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  
  // מידע אישי וצבאי
  personalNumber?: string; // מספר אישי
  rank?: string; // דרגה (רב"ט, סמ"ר וכו')
  
  // מבנה ארגוני
  team?: string; // צוות (למפקד צוות/חייל) - "10", "20", "30" וכו'
  pelaga?: string; // פלגה (A, B, C וכו') 
  unit?: string; // יחידה/חטיבה
  
  // מבנה היררכיה - מי הממונה עליו
  commanderUid?: string; // UID של הממונה הישיר
  subordinatesUids?: string[]; // רשימת UIDs של הכפופים
  
  // הרשאות מיוחדות
  canAssignRoles?: boolean; // האם יכול לשבץ תפקידים (מ"פ, סמ"פ, אדמין)
  canViewSensitiveData?: boolean; // האם יכול לראות מידע רגיש (מ"פ, סמ"פ)
  canRemoveUsers?: boolean; // האם יכול להסיר משתמשים מהמערכת (אדמין, מ"פ)
  
  // קישור לרשומת החייל
  soldierDocId?: string;
  
  // מטאדטה
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

// ממשק להגדרת מבנה הפלוגה
export interface PlagaStructure {
  id: string;
  name: string; // "פלוגה א", "פלוגה ב" וכו'
  commanderUid: string; // מפקד הפלוגה
  teams: TeamStructure[];
}

export interface TeamStructure {
  id: string; // "10", "20", "30" וכו'
  name: string; // "צוות 10", "צוות 20" וכו'
  commanderUid: string; // מפקד הצוות
  samalUid?: string; // סמל הצוות
  squadLeaders: string[]; // מפקדי חיילים
  soldiers: string[]; // חיילים
  plagaId: string; // השייכות לפלגה
}

// פונקציות עזר למבנה ההיררכיה
export const getUserHierarchyLevel = (user: User): number => {
  const { ROLE_HIERARCHY } = require('./UserRole');
  return ROLE_HIERARCHY[user.role] || 0;
};

export const canUserSeeOtherUser = (viewer: User, target: User): boolean => {
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