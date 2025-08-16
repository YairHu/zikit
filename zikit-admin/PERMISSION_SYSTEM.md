# מערכת ההרשאות החדשה - zikit

## סקירה כללית

מערכת ההרשאות החדשה מבוססת על מודל AWS IAM Policy ומאפשרת ניהול גמיש ומדויק של הרשאות במערכת. המערכת תומכת בהרשאות מותאמות אישית לכל משתמש, מדיניויות ברירת מחדל, ותנאים מורכבים.

## ארכיטקטורה

### 1. מודל ההרשאות (PermissionPolicy.ts)

#### סוגי משאבים (ResourceType)
```typescript
enum ResourceType {
  // משאבים כלליים
  ALL = '*',
  
  // משאבי ניווט
  NAVIGATION = 'navigation',
  SOLDIERS = 'soldiers',
  TEAMS = 'teams',
  TRIPS = 'trips',
  MISSIONS = 'missions',
  ACTIVITIES = 'activities',
  ACTIVITY_STATISTICS = 'activity_statistics',
  DUTIES = 'duties',
  REFERRALS = 'referrals',
  FORMS = 'forms',
  HAMAL = 'hamal',
  FRAMEWORK_MANAGEMENT = 'framework_management',
  SOLDIER_LINKING = 'soldier_linking',
  USER_MANAGEMENT = 'user_management',
  DATA_SEEDER = 'data_seeder',
  
  // משאבי תוכן
  CONTENT = 'content',
  OWN_DATA = 'own_data',
  TEAM_DATA = 'team_data',
  PLAGA_DATA = 'plaga_data',
  ALL_DATA = 'all_data',
  
  // משאבי פעולות
  ACTIONS = 'actions',
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  ASSIGN_ROLES = 'assign_roles',
  VIEW_SENSITIVE_DATA = 'view_sensitive_data',
  CHANGE_VIEW_MODE = 'change_view_mode',
  REMOVE_USERS = 'remove_users',
  MANAGE_PERMISSIONS = 'manage_permissions',
}
```

#### סוגי פעולות (ActionType)
```typescript
enum ActionType {
  ALL = '*',
  ALLOW = 'Allow',
  DENY = 'Deny',
}
```

#### תנאי הרשאה (PermissionCondition)
```typescript
interface PermissionCondition {
  // תנאים מבוססי תפקיד
  roleEquals?: UserRole;
  roleIn?: UserRole[];
  roleNotIn?: UserRole[];
  
  // תנאים מבוססי מסגרת
  frameworkIdEquals?: string;
  frameworkIdIn?: string[];
  teamEquals?: string;
  teamIn?: string[];
  pelagaEquals?: string;
  pelagaIn?: string[];
  
  // תנאים מבוססי משתמש
  userIdEquals?: string;
  userIdIn?: string[];
  isOwner?: boolean;
  
  // תנאים מבוססי זמן
  timeBefore?: Date;
  timeAfter?: Date;
  
  // תנאים נוספים
  hasSoldierDoc?: boolean;
  isActive?: boolean;
}
```

#### הצהרת הרשאה (PermissionStatement)
```typescript
interface PermissionStatement {
  Effect: ActionType;
  Action: string | string[];
  Resource: string | string[];
  Condition?: PermissionCondition;
}
```

#### מדיניות הרשאות (PermissionPolicy)
```typescript
interface PermissionPolicy {
  id: string;
  name: string;
  description?: string;
  version: string;
  Statement: PermissionStatement[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
  tags?: Record<string, string>;
}
```

### 2. מעריך הרשאות (PermissionEvaluator)

המעריך בודק הרשאות לפי המדיניויות המותאמות למשתמש:

```typescript
class PermissionEvaluator {
  canPerformAction(user: any, action: string, resource: string, context?: Record<string, any>): boolean
}
```

## מדיניויות ברירת מחדל

### 1. מדיניות חייל (DEFAULT_SOLDIER_POLICY)
- **הרשאות**: צפייה בנתונים אישיים בלבד
- **הגבלות**: אין גישה לניהול, עריכה, או יצירה
- **תנאים**: רק לבעלים (isOwner: true)

### 2. מדיניות מפקד מסגרת (DEFAULT_FRAMEWORK_COMMANDER_POLICY)
- **הרשאות**: צפייה בנתוני המסגרת שלו
- **תוכן**: כל הנתונים הקשורים למסגרת הספציפית
- **הגבלות**: צפייה בלבד, ללא עריכה

### 3. מדיניות אדמין (ADMIN_POLICY)
- **הרשאות**: גישה מלאה לכל המשאבים
- **פעולות**: כל הפעולות מותרות
- **תנאים**: אין הגבלות

## שימוש במערכת

### 1. בדיקת הרשאות
```typescript
import { canUserPerformAction } from '../services/userService';

const hasPermission = await canUserPerformAction(
  user, 
  'read:soldiers', 
  'soldiers',
  { ownerId: 'some-user-id' }
);
```

### 2. יצירת מדיניות מותאמת אישית
```typescript
import { createPermissionPolicy } from '../services/permissionPolicyService';

const policy = {
  name: 'מדיניות מותאמת אישית',
  description: 'הרשאות מיוחדות למשתמש ספציפי',
  version: '1.0',
  Statement: [
    {
      Effect: ActionType.ALLOW,
      Action: [ActionType.READ],
      Resource: [ResourceType.SOLDIERS, ResourceType.TEAMS],
      Condition: {
        frameworkIdEquals: 'framework-123'
      }
    }
  ],
  createdBy: 'admin-uid',
  isActive: true,
  tags: {
    type: 'custom',
    role: UserRole.MEFAKED_TZEVET
  }
};

const policyId = await createPermissionPolicy(policy);
```

### 3. הקצאת מדיניות למשתמש
```typescript
import { assignPolicyToUser } from '../services/userService';

await assignPolicyToUser(userId, policyId, adminUid);
```

## ממשק משתמש

### 1. ניהול הרשאות משתמש (UserPermissionManager)
- הצגת מדיניויות נוכחיות של משתמש
- הוספת/הסרת מדיניויות
- יצירת מדיניות מותאמת אישית

### 2. ניהול מדיניויות גלובליות (GlobalPermissionPolicyManager)
- יצירת מדיניויות ברירת מחדל
- עריכת מדיניויות קיימות
- מחיקת מדיניויות

### 3. הצגת מידע הרשאות (PermissionInfo)
- הצגת הרשאות נוכחיות
- הצגת מדיניויות מותאמות אישית
- מידע על תפקיד ומסגרת

## תאימות לאחור

המערכת החדשה תואמת למערכת הישנה:
- אם למשתמש אין מדיניויות מותאמות אישית, המערכת משתמשת בהרשאות לפי התפקיד
- כל הפונקציות הישנות ממשיכות לעבוד כרגיל
- המעבר למערכת החדשה הוא הדרגתי

## דוגמאות שימוש

### 1. מפקד מסגרת
```typescript
// מדיניות למפקד מסגרת ספציפי
const frameworkCommanderPolicy = {
  name: 'מפקד מסגרת A',
  Statement: [
    {
      Effect: ActionType.ALLOW,
      Action: [ActionType.READ],
      Resource: [
        ResourceType.SOLDIERS,
        ResourceType.TEAMS,
        ResourceType.ACTIVITIES,
        ResourceType.MISSIONS
      ],
      Condition: {
        frameworkIdEquals: 'framework-A'
      }
    }
  ]
};
```

### 2. חייל עם הרשאות מיוחדות
```typescript
// חייל עם הרשאות צפייה בנתוני צוות
const specialSoldierPolicy = {
  name: 'חייל עם הרשאות מיוחדות',
  Statement: [
    {
      Effect: ActionType.ALLOW,
      Action: [ActionType.READ],
      Resource: [ResourceType.TEAMS],
      Condition: {
        teamEquals: '10'
      }
    }
  ]
};
```

### 3. מפקד עם הרשאות עריכה מוגבלות
```typescript
// מפקד שיכול לערוך רק פעילויות של הצוות שלו
const limitedCommanderPolicy = {
  name: 'מפקד עם הרשאות עריכה מוגבלות',
  Statement: [
    {
      Effect: ActionType.ALLOW,
      Action: [ActionType.READ, ActionType.UPDATE],
      Resource: [ResourceType.ACTIVITIES],
      Condition: {
        teamEquals: '20'
      }
    }
  ]
};
```

## אבטחה

### 1. בדיקות הרשאות
- כל פעולה במערכת עוברת בדיקת הרשאות
- בדיקות מתבצעות גם בצד הלקוח וגם בצד השרת
- מערכת היררכית של הרשאות

### 2. לוגים ועקבות
- כל שינוי במדיניויות מתועד
- מעקב אחרי מי יצר/עדכן/מחק מדיניות
- היסטוריית שינויים

### 3. גיבוי ושחזור
- גיבוי אוטומטי של מדיניויות
- אפשרות לשחזור מדיניות קודמת
- גרסאות מדיניות

## הרחבות עתידיות

### 1. תנאים מתקדמים
- תנאים מבוססי זמן (שעות פעילות)
- תנאים מבוססי מיקום
- תנאים מבוססי מצב המערכת

### 2. הרשאות דינמיות
- הרשאות שמשתנות לפי מצב המערכת
- הרשאות זמניות
- הרשאות מבוססות אירועים

### 3. ניהול מתקדם
- תבניות מדיניות
- ייבוא/ייצוא מדיניויות
- ניהול הרשאות קבוצתי

## סיכום

מערכת ההרשאות החדשה מספקת:
- **גמישות**: הרשאות מותאמות אישית לכל משתמש
- **אבטחה**: בדיקות הרשאות מקיפות
- **תאימות**: תמיכה במערכת הישנה
- **ניהול**: ממשק משתמש מתקדם
- **סקלביליות**: תמיכה בהרחבות עתידיות

המערכת מאפשרת ניהול מדויק של הרשאות במערכת zikit תוך שמירה על אבטחה ונוחות שימוש.
