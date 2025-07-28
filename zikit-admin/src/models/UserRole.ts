export enum UserRole {
  // הנהלה עליונה
  ADMIN = 'admin',
  MEFAKED_PLUGA = 'mefaked_pluga', // מ"פ
  SAMAL_PLUGA = 'samal_pluga', // סמ"פ
  
  // מפקדי פלגות ומפל"ג
  MEFAKED_PELAGA = 'mefaked_pelaga', // מפקד פלגה
  RASP = 'rasp', // רס"פ
  SARASP = 'sarasp', // סרס"פ
  KATZIN_NIHUL = 'katzin_nihul', // קצין ניהול
  MANIP = 'manip', // מני"פ
  HOFPAL = 'hofpal', // חופ"ל
  PAP = 'pap', // פ"פ
  
  // מפקדי צוותים
  MEFAKED_TZEVET = 'mefaked_tzevet', // מפקד צוות (10, 20, וכו')
  
  // סגל
  SAMAL = 'samal', // סמל
  MEFAKED_CHAYAL = 'mefaked_chayal', // מפקד (בסגל)
  
  // חיילים
  CHAYAL = 'chayal', // חייל רגיל
  
  // מערכות תמיכה
  HAMAL = 'hamal', // חמ"ל
}

// מפה של תפקידים להיררכיה
export const ROLE_HIERARCHY = {
  [UserRole.ADMIN]: 100,
  [UserRole.MEFAKED_PLUGA]: 90,
  [UserRole.SAMAL_PLUGA]: 85,
  [UserRole.MEFAKED_PELAGA]: 80,
  [UserRole.RASP]: 75,
  [UserRole.SARASP]: 70,
  [UserRole.KATZIN_NIHUL]: 65,
  [UserRole.MANIP]: 60,
  [UserRole.HOFPAL]: 55,
  [UserRole.PAP]: 50,
  [UserRole.MEFAKED_TZEVET]: 40,
  [UserRole.SAMAL]: 30,
  [UserRole.MEFAKED_CHAYAL]: 25,
  [UserRole.CHAYAL]: 10,
  [UserRole.HAMAL]: 5,
};

// פונקציה לבדיקה אם תפקיד A גבוה מתפקיד B
export const isHigherRole = (roleA: UserRole, roleB: UserRole): boolean => {
  return ROLE_HIERARCHY[roleA] > ROLE_HIERARCHY[roleB];
};

// פונקציה להחזרת שם התפקיד בעברית
export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames = {
    [UserRole.ADMIN]: 'אדמין',
    [UserRole.MEFAKED_PLUGA]: 'מפקד פלוגה',
    [UserRole.SAMAL_PLUGA]: 'סמל פלוגה',
    [UserRole.MEFAKED_PELAGA]: 'מפקד פלגה',
    [UserRole.RASP]: 'רס"פ',
    [UserRole.SARASP]: 'סרס"פ',
    [UserRole.KATZIN_NIHUL]: 'קצין ניהול',
    [UserRole.MANIP]: 'מני"פ',
    [UserRole.HOFPAL]: 'חופ"ל',
    [UserRole.PAP]: 'פ"פ',
    [UserRole.MEFAKED_TZEVET]: 'מפקד צוות',
    [UserRole.SAMAL]: 'סמל',
    [UserRole.MEFAKED_CHAYAL]: 'מפקד',
    [UserRole.CHAYAL]: 'חייל',
    [UserRole.HAMAL]: 'חמ"ל',
  };
  return roleNames[role] || role;
}; 