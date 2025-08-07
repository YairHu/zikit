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

// מפה של תפקידים להיררכיה (עדכון מדויק)
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

// מערכת הרשאות חדשה
export interface Permission {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

export interface RolePermissions {
  // ניווט
  navigation: {
    soldiers: boolean; // כוח אדם
    teams: boolean; // צוותים
    trips: boolean; // נסיעות ורכבים
    missions: boolean; // משימות
    activities: boolean; // פעילויות
    activityStatistics: boolean; // סטטיסטיקות פעילויות
    duties: boolean; // תורנויות
    referrals: boolean; // הפניות
    forms: boolean; // טפסים
    hamal: boolean; // מסך חמ"ל
    frameworkManagement: boolean; // ניהול מבנה פלוגה
    pendingSoldiers: boolean; // חיילים ממתינים
    soldierLinking: boolean; // קישור חיילים
    userManagement: boolean; // ניהול משתמשים
    dataSeeder: boolean; // הכנסת נתונים
  };
  
  // הרשאות תוכן
  content: {
    viewOwnDataOnly: boolean; // רואה רק נתונים אישיים
    viewTeamData: boolean; // רואה נתוני צוות
    viewPlagaData: boolean; // רואה נתוני פלגה
    viewAllData: boolean; // רואה כל הנתונים
  };
  
  // הרשאות פעולות
  actions: {
    canEdit: boolean; // יכול לערוך
    canDelete: boolean; // יכול למחוק
    canCreate: boolean; // יכול ליצור
    canAssignRoles: boolean; // יכול לשבץ תפקידים
    canViewSensitiveData: boolean; // יכול לראות מידע רגיש
    canChangeViewMode: boolean; // יכול לשנות נקודת מבט
    canRemoveUsers: boolean; // יכול להסיר משתמשים מהמערכת
  };
}

// הגדרת הרשאות לכל תפקיד
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.ADMIN]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: true,
      duties: true,
      referrals: true,
      forms: true,
      hamal: true,
      frameworkManagement: true,
      pendingSoldiers: true,
      soldierLinking: true,
      userManagement: true,
      dataSeeder: true,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: false,
      viewPlagaData: false,
      viewAllData: true,
    },
    actions: {
      canEdit: true,
      canDelete: true,
      canCreate: true,
      canAssignRoles: true,
      canViewSensitiveData: true,
      canChangeViewMode: true,
      canRemoveUsers: true,
    },
  },
  
  [UserRole.MEFAKED_PLUGA]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: true,
      duties: true,
      referrals: true,
      forms: true,
      hamal: true,
      frameworkManagement: true,
      pendingSoldiers: true,
      soldierLinking: true,
      userManagement: true,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: false,
      viewPlagaData: false,
      viewAllData: true,
    },
    actions: {
      canEdit: true,
      canDelete: true,
      canCreate: true,
      canAssignRoles: true,
      canViewSensitiveData: true,
      canChangeViewMode: false,
      canRemoveUsers: true,
    },
  },
  
  [UserRole.SAMAL_PLUGA]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: true,
      duties: true,
      referrals: true,
      forms: true,
      hamal: true,
      frameworkManagement: false,
      pendingSoldiers: true,
      soldierLinking: true,
      userManagement: false,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: false,
      viewPlagaData: false,
      viewAllData: true,
    },
    actions: {
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canAssignRoles: false,
      canViewSensitiveData: true,
      canChangeViewMode: false,
      canRemoveUsers: false,
    },
  },
  
  [UserRole.MEFAKED_PELAGA]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: true,
      duties: true,
      referrals: true,
      forms: true,
      hamal: false,
      frameworkManagement: false,
      pendingSoldiers: false,
      soldierLinking: false,
      userManagement: false,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: false,
      viewPlagaData: true,
      viewAllData: false,
    },
    actions: {
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canAssignRoles: false,
      canViewSensitiveData: false,
      canChangeViewMode: false,
      canRemoveUsers: false,
    },
  },
  
  [UserRole.RASP]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: true,
      duties: true,
      referrals: true,
      forms: true,
      hamal: false,
      frameworkManagement: false,
      pendingSoldiers: false,
      soldierLinking: false,
      userManagement: false,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: false,
      viewPlagaData: true,
      viewAllData: false,
    },
    actions: {
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canAssignRoles: false,
      canViewSensitiveData: false,
      canChangeViewMode: false,
      canRemoveUsers: false,
    },
  },
  
  [UserRole.SARASP]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: true,
      duties: true,
      referrals: true,
      forms: true,
      hamal: false,
      frameworkManagement: false,
      pendingSoldiers: false,
      soldierLinking: false,
      userManagement: false,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: false,
      viewPlagaData: true,
      viewAllData: false,
    },
    actions: {
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canAssignRoles: false,
      canViewSensitiveData: false,
      canChangeViewMode: false,
      canRemoveUsers: false,
    },
  },
  
  [UserRole.KATZIN_NIHUL]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: true,
      duties: true,
      referrals: true,
      forms: true,
      hamal: false,
      frameworkManagement: false,
      pendingSoldiers: false,
      soldierLinking: false,
      userManagement: false,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: false,
      viewPlagaData: true,
      viewAllData: false,
    },
    actions: {
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canAssignRoles: false,
      canViewSensitiveData: false,
      canChangeViewMode: false,
      canRemoveUsers: false,
    },
  },
  
  [UserRole.MANIP]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: true,
      duties: true,
      referrals: true,
      forms: true,
      hamal: false,
      frameworkManagement: false,
      pendingSoldiers: false,
      soldierLinking: false,
      userManagement: false,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: false,
      viewPlagaData: true,
      viewAllData: false,
    },
    actions: {
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canAssignRoles: false,
      canViewSensitiveData: false,
      canChangeViewMode: false,
      canRemoveUsers: false,
    },
  },
  
  [UserRole.HOFPAL]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: true,
      duties: true,
      referrals: true,
      forms: true,
      hamal: false,
      frameworkManagement: false,
      pendingSoldiers: false,
      soldierLinking: false,
      userManagement: false,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: false,
      viewPlagaData: true,
      viewAllData: false,
    },
    actions: {
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canAssignRoles: false,
      canViewSensitiveData: false,
      canChangeViewMode: false,
      canRemoveUsers: false,
    },
  },
  
  [UserRole.PAP]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: true,
      duties: true,
      referrals: true,
      forms: true,
      hamal: false,
      frameworkManagement: false,
      pendingSoldiers: false,
      soldierLinking: false,
      userManagement: false,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: false,
      viewPlagaData: true,
      viewAllData: false,
    },
    actions: {
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canAssignRoles: false,
      canViewSensitiveData: false,
      canChangeViewMode: false,
      canRemoveUsers: false,
    },
  },
  
  [UserRole.MEFAKED_TZEVET]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: false,
      duties: true,
      referrals: true,
      forms: false,
      hamal: false,
      frameworkManagement: false,
      pendingSoldiers: false,
      soldierLinking: false,
      userManagement: false,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: true,
      viewPlagaData: false,
      viewAllData: false,
    },
    actions: {
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canAssignRoles: false,
      canViewSensitiveData: false,
      canChangeViewMode: false,
      canRemoveUsers: false,
    },
  },
  
  [UserRole.SAMAL]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: false,
      duties: true,
      referrals: true,
      forms: false,
      hamal: false,
      frameworkManagement: false,
      pendingSoldiers: false,
      soldierLinking: false,
      userManagement: false,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: true,
      viewPlagaData: false,
      viewAllData: false,
    },
    actions: {
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canAssignRoles: false,
      canViewSensitiveData: false,
      canChangeViewMode: false,
      canRemoveUsers: false,
    },
  },
  
  [UserRole.MEFAKED_CHAYAL]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: false,
      duties: true,
      referrals: true,
      forms: false,
      hamal: false,
      frameworkManagement: false,
      pendingSoldiers: false,
      soldierLinking: false,
      userManagement: false,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: true,
      viewPlagaData: false,
      viewAllData: false,
    },
    actions: {
      canEdit: true,
      canDelete: false,
      canCreate: true,
      canAssignRoles: false,
      canViewSensitiveData: false,
      canChangeViewMode: false,
      canRemoveUsers: false,
    },
  },
  
  [UserRole.CHAYAL]: {
    navigation: {
      soldiers: false,
      teams: true, // רק "צוות" - הצוות שלו
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: false,
      duties: true,
      referrals: true,
      forms: false,
      hamal: false,
      frameworkManagement: false,
      pendingSoldiers: false,
      soldierLinking: false,
      userManagement: false,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: true,
      viewTeamData: false,
      viewPlagaData: false,
      viewAllData: false,
    },
    actions: {
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canAssignRoles: false,
      canViewSensitiveData: false,
      canChangeViewMode: false,
      canRemoveUsers: false,
    },
  },
  
  [UserRole.HAMAL]: {
    navigation: {
      soldiers: true,
      teams: true,
      trips: true,
      missions: true,
      activities: true,
      activityStatistics: true,
      duties: true,
      referrals: true,
      forms: true,
      hamal: true,
      frameworkManagement: false,
      pendingSoldiers: false,
      soldierLinking: false,
      userManagement: false,
      dataSeeder: false,
    },
    content: {
      viewOwnDataOnly: false,
      viewTeamData: false,
      viewPlagaData: false,
      viewAllData: true,
    },
    actions: {
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canAssignRoles: false,
      canViewSensitiveData: true,
      canChangeViewMode: false, 
      canRemoveUsers: false,
    },
  },
};

// פונקציות עזר להרשאות
export const getUserPermissions = (role: UserRole): RolePermissions => {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[UserRole.CHAYAL];
};

export const hasPermission = (userRole: UserRole, permission: keyof RolePermissions['navigation'] | keyof RolePermissions['actions']): boolean => {
  const permissions = getUserPermissions(userRole);
  
  if (permission in permissions.navigation) {
    return permissions.navigation[permission as keyof RolePermissions['navigation']];
  }
  
  if (permission in permissions.actions) {
    return permissions.actions[permission as keyof RolePermissions['actions']];
  }
  
  return false;
};

export const canViewContent = (userRole: UserRole, contentType: keyof RolePermissions['content']): boolean => {
  const permissions = getUserPermissions(userRole);
  return permissions.content[contentType];
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