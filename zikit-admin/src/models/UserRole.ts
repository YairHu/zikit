export enum UserRole {
  ADMIN = 'admin',
  CHAYAL = 'chayal',
}

// סוגי נתונים חשופים
export enum DataScope {
  USER_ONLY = 'user_only',           // נתוני משתמש בלבד
  FRAMEWORK_ONLY = 'framework_only', // נתוני המסגרת שלו
  ALL_DATA = 'all_data'              // כלל הנתונים בנתיב זה
}

// רמות הרשאה
export enum PermissionLevel {
  VIEW = 'view',       // צפייה
  EDIT = 'edit',       // עריכה
  DELETE = 'delete',   // מחיקה
  CREATE = 'create'    // הוספה
}

// נתיבי מערכת
export enum SystemPath {
  HOME = 'home',                   // עמוד ראשי
  SOLDIERS = 'soldiers',           // כוח אדם
  SOLDIER_PRESENCE = 'soldier_presence', // נוכחות חיילים
  SOLDIER_DETAILS = 'soldier_details',   // פרטי חיילים
  TEAMS = 'teams',                 // צוותים
  MISSIONS = 'missions',           // משימות
  ACTIVITIES = 'activities',       // פעילויות
  DUTIES = 'duties',               // תורנויות
  TRIPS = 'trips',                 // נסיעות
  REFERRALS = 'referrals',         // הפניות
  FORMS = 'forms',                 // טפסים
  FRAMEWORKS = 'frameworks',       // מסגרות
  USERS = 'users',                 // משתמשים
  VEHICLES = 'vehicles',           // רכבים
  HAMAL = 'hamal',                 // מסך חמ"ל
  CACHE_MONITOR = 'cache_monitor'  // ניטור מטמון מקומי
}

// מדיניות הרשאה
export interface PermissionPolicy {
  id: string;
  name: string;
  description: string;
  paths: SystemPath[]; // מערך של נתיבים במקום נתיב אחד
  dataScope: DataScope;
  permissions: PermissionLevel[]; // הרשאות גלובליות (לפורמט הישן)
  pathPermissions?: Record<SystemPath, PermissionLevel[]>; // הרשאות דינמיות לפי נתיב (פורמט חדש)
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// תפקיד מורחב
export interface Role {
  id: string;
  name: string;
  description: string;
  policies: string[]; // מערך של policy IDs
  isSystem: boolean;  // האם זה תפקיד מערכת שלא ניתן למחיקה
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}


// פונקציות עזר למדיניות
export const getDataScopeDisplayName = (scope: DataScope): string => {
  switch (scope) {
    case DataScope.USER_ONLY:
      return 'נתוני משתמש בלבד';
    case DataScope.FRAMEWORK_ONLY:
      return 'נתוני המסגרת שלו';
    case DataScope.ALL_DATA:
      return 'כלל הנתונים';
    default:
      return scope;
  }
};

export const getPermissionLevelDisplayName = (level: PermissionLevel): string => {
  switch (level) {
    case PermissionLevel.VIEW:
      return 'צפייה';
    case PermissionLevel.EDIT:
      return 'עריכה';
    case PermissionLevel.DELETE:
      return 'מחיקה';
    case PermissionLevel.CREATE:
      return 'הוספה';
    default:
      return level;
  }
};

export const getSystemPathDisplayName = (path: SystemPath): string => {
  switch (path) {
    case SystemPath.HOME:
      return 'עמוד ראשי';
    case SystemPath.SOLDIERS:
      return 'כוח אדם';
    case SystemPath.SOLDIER_PRESENCE:
      return 'נוכחות חיילים';
    case SystemPath.SOLDIER_DETAILS:
      return 'פרטי חיילים';
    case SystemPath.TEAMS:
      return 'מסגרות';
    case SystemPath.MISSIONS:
      return 'משימות';
    case SystemPath.ACTIVITIES:
      return 'פעילויות';
    case SystemPath.DUTIES:
      return 'תורנויות';
    case SystemPath.TRIPS:
      return 'נסיעות';
    case SystemPath.REFERRALS:
      return 'הפניות';
    case SystemPath.FORMS:
      return 'טפסים';
    case SystemPath.FRAMEWORKS:
      return 'מסגרות';
    case SystemPath.USERS:
      return 'משתמשים';
    case SystemPath.VEHICLES:
      return 'רכבים';
    case SystemPath.HAMAL:
      return 'מסך חמ"ל';
    case SystemPath.CACHE_MONITOR:
      return 'ניטור מטמון מקומי';
    default:
      return path;
  }
}; 