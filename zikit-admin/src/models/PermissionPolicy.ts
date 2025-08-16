import { UserRole } from './UserRole';

// סוגי משאבים במערכת
export enum ResourceType {
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

// סוגי פעולות
export enum ActionType {
  ALL = '*',
  ALLOW = 'Allow',
  DENY = 'Deny',
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ASSIGN_ROLES = 'assign_roles',
  MANAGE_PERMISSIONS = 'manage_permissions',
}

// תנאי הרשאה (Conditions)
export interface PermissionCondition {
  // תנאים מבוססי תפקיד
  roleEquals?: UserRole;
  roleIn?: UserRole[];
  roleNotIn?: UserRole[];
  
  // תנאים מבוססי מסגרת
  frameworkIdEquals?: string;
  frameworkIdIn?: string[];
  
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

// הצהרת הרשאה בודדת
export interface PermissionStatement {
  // סוג הפעולה
  Effect: ActionType;
  
  // הפעולות המותרות
  Action: string | string[];
  
  // המשאבים שעליהם חלה ההרשאה
  Resource: string | string[];
  
  // תנאים (אופציונלי)
  Condition?: PermissionCondition;
}

// מדיניות הרשאות
export interface PermissionPolicy {
  // מזהה המדיניות
  id: string;
  
  // שם המדיניות
  name: string;
  
  // תיאור
  description?: string;
  
  // גרסה
  version: string;
  
  // הצהרות ההרשאות
  Statement: PermissionStatement[];
  
  // מטאדטה
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
  
  // תגיות
  tags?: Record<string, string>;
}

// מדיניות ברירת מחדל לחייל
export const DEFAULT_SOLDIER_POLICY: PermissionPolicy = {
  id: 'default-soldier-policy',
  name: 'מדיניות ברירת מחדל לחייל',
  description: 'הרשאות בסיסיות לחייל רגיל - צפייה בנתונים אישיים בלבד',
  version: '1.0',
  Statement: [
    {
      Effect: ActionType.ALLOW,
      Action: [ActionType.READ],
      Resource: [
        ResourceType.NAVIGATION,
        ResourceType.SOLDIERS,
        ResourceType.TRIPS,
        ResourceType.MISSIONS,
        ResourceType.ACTIVITIES,
        ResourceType.DUTIES,
        ResourceType.REFERRALS
      ],
      Condition: {
        isOwner: true
      }
    },
    {
      Effect: ActionType.DENY,
      Action: [ActionType.ALL],
      Resource: [
        ResourceType.TEAMS,
        ResourceType.ACTIVITY_STATISTICS,
        ResourceType.FORMS,
        ResourceType.HAMAL,
        ResourceType.FRAMEWORK_MANAGEMENT,
        ResourceType.SOLDIER_LINKING,
        ResourceType.USER_MANAGEMENT,
        ResourceType.DATA_SEEDER,
        ResourceType.CREATE,
        ResourceType.UPDATE,
        ResourceType.DELETE,
        ResourceType.ASSIGN_ROLES,
        ResourceType.VIEW_SENSITIVE_DATA,
        ResourceType.CHANGE_VIEW_MODE,
        ResourceType.REMOVE_USERS,
        ResourceType.MANAGE_PERMISSIONS
      ]
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'system',
  isActive: true,
  tags: {
    type: 'default',
    role: UserRole.CHAYAL
  }
};

// מדיניות ברירת מחדל למפקד מסגרת
export const DEFAULT_FRAMEWORK_COMMANDER_POLICY: PermissionPolicy = {
  id: 'default-framework-commander-policy',
  name: 'מדיניות ברירת מחדל למפקד מסגרת',
  description: 'הרשאות למפקד מסגרת - צפייה בנתוני המסגרת שלו בלבד',
  version: '1.0',
  Statement: [
    {
      Effect: ActionType.ALLOW,
      Action: [ActionType.READ],
      Resource: [
        ResourceType.NAVIGATION,
        ResourceType.SOLDIERS,
        ResourceType.TEAMS,
        ResourceType.TRIPS,
        ResourceType.MISSIONS,
        ResourceType.ACTIVITIES,
        ResourceType.DUTIES,
        ResourceType.REFERRALS,
        ResourceType.FORMS
      ],
      Condition: {
        frameworkIdEquals: '${user.frameworkId}'
      }
    },
    {
      Effect: ActionType.ALLOW,
      Action: [ActionType.READ],
      Resource: [ResourceType.FRAMEWORK_MANAGEMENT],
      Condition: {
        frameworkIdEquals: '${user.frameworkId}'
      }
    },
    {
      Effect: ActionType.DENY,
      Action: [ActionType.ALL],
      Resource: [
        ResourceType.ACTIVITY_STATISTICS,
        ResourceType.HAMAL,
        ResourceType.SOLDIER_LINKING,
        ResourceType.USER_MANAGEMENT,
        ResourceType.DATA_SEEDER,
        ResourceType.CREATE,
        ResourceType.UPDATE,
        ResourceType.DELETE,
        ResourceType.ASSIGN_ROLES,
        ResourceType.VIEW_SENSITIVE_DATA,
        ResourceType.CHANGE_VIEW_MODE,
        ResourceType.REMOVE_USERS,
        ResourceType.MANAGE_PERMISSIONS
      ]
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'system',
  isActive: true,
  tags: {
    type: 'default',
    role: 'framework_commander'
  }
};

// מדיניות אדמין
export const ADMIN_POLICY: PermissionPolicy = {
  id: 'admin-policy',
  name: 'מדיניות אדמין',
  description: 'הרשאות מלאות לאדמין',
  version: '1.0',
  Statement: [
    {
      Effect: ActionType.ALLOW,
      Action: [ActionType.ALL],
      Resource: [ResourceType.ALL]
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'system',
  isActive: true,
  tags: {
    type: 'system',
    role: UserRole.ADMIN
  }
};

// פונקציות עזר לבדיקת הרשאות
export class PermissionEvaluator {
  private policies: PermissionPolicy[];

  constructor(policies: PermissionPolicy[] = []) {
    this.policies = policies;
  }

  /**
   * בודק אם משתמש יכול לבצע פעולה על משאב
   */
  canPerformAction(
    user: any,
    action: string,
    resource: string,
    context?: Record<string, any>
  ): boolean {
    // אם אין מדיניות, מחזיר false
    if (this.policies.length === 0) {
      return false;
    }

    // בודק כל מדיניות
    for (const policy of this.policies) {
      if (!policy.isActive) continue;

      for (const statement of policy.Statement) {
        const result = this.evaluateStatement(statement, user, action, resource, context);
        if (result !== null) {
          return result;
        }
      }
    }

    // אם לא נמצאה הצהרה מתאימה, מחזיר false
    return false;
  }

  /**
   * מעריך הצהרת הרשאה בודדת
   */
  private evaluateStatement(
    statement: PermissionStatement,
    user: any,
    action: string,
    resource: string,
    context?: Record<string, any>
  ): boolean | null {
    // בודק אם הפעולה מתאימה
    if (!this.matchesAction(statement.Action, action)) {
      return null;
    }

    // בודק אם המשאב מתאים
    if (!this.matchesResource(statement.Resource, resource)) {
      return null;
    }

    // בודק תנאים
    if (statement.Condition && !this.evaluateCondition(statement.Condition, user, context)) {
      return null;
    }

    // מחזיר את התוצאה לפי סוג ההצהרה
    return statement.Effect === ActionType.ALLOW;
  }

  /**
   * בודק אם פעולה מתאימה להצהרה
   */
  private matchesAction(statementAction: string | string[], action: string): boolean {
    if (statementAction === ActionType.ALL || statementAction === '*') {
      return true;
    }

    if (Array.isArray(statementAction)) {
      return statementAction.includes(action);
    }

    return statementAction === action;
  }

  /**
   * בודק אם משאב מתאים להצהרה
   */
  private matchesResource(statementResource: string | string[], resource: string): boolean {
    if (statementResource === ResourceType.ALL || statementResource === '*') {
      return true;
    }

    if (Array.isArray(statementResource)) {
      return statementResource.includes(resource);
    }

    return statementResource === resource;
  }

  /**
   * מעריך תנאי הרשאה
   */
  private evaluateCondition(
    condition: PermissionCondition,
    user: any,
    context?: Record<string, any>
  ): boolean {
    // בודק תנאי תפקיד
    if (condition.roleEquals && user.role !== condition.roleEquals) {
      return false;
    }

    if (condition.roleIn && !condition.roleIn.includes(user.role)) {
      return false;
    }

    if (condition.roleNotIn && condition.roleNotIn.includes(user.role)) {
      return false;
    }

    // בודק תנאי מסגרת
    if (condition.frameworkIdEquals) {
      // אם התנאי הוא template string, נחליף אותו במזהה המסגרת של המשתמש
      let expectedFrameworkId = condition.frameworkIdEquals;
      if (expectedFrameworkId === '${user.frameworkId}') {
        expectedFrameworkId = user.frameworkId;
      }
      
      if (user.frameworkId !== expectedFrameworkId) {
        return false;
      }
    }

    if (condition.frameworkIdIn && !condition.frameworkIdIn.includes(user.frameworkId)) {
      return false;
    }



    // בודק תנאי משתמש
    if (condition.userIdEquals && user.uid !== condition.userIdEquals) {
      return false;
    }

    if (condition.userIdIn && !condition.userIdIn.includes(user.uid)) {
      return false;
    }

    if (condition.isOwner !== undefined) {
      const isOwner = context?.ownerId === user.uid;
      if (condition.isOwner !== isOwner) {
        return false;
      }
    }

    // בודק תנאים נוספים
    if (condition.hasSoldierDoc !== undefined) {
      const hasDoc = !!user.soldierDocId;
      if (condition.hasSoldierDoc !== hasDoc) {
        return false;
      }
    }

    if (condition.isActive !== undefined) {
      if (condition.isActive !== user.isActive) {
        return false;
      }
    }

    return true;
  }

  /**
   * מוסיף מדיניות
   */
  addPolicy(policy: PermissionPolicy): void {
    this.policies.push(policy);
  }

  /**
   * מסיר מדיניות
   */
  removePolicy(policyId: string): void {
    this.policies = this.policies.filter(p => p.id !== policyId);
  }

  /**
   * מקבל מדיניות לפי מזהה
   */
  getPolicy(policyId: string): PermissionPolicy | undefined {
    return this.policies.find(p => p.id === policyId);
  }

  /**
   * מקבל כל המדיניויות
   */
  getAllPolicies(): PermissionPolicy[] {
    return [...this.policies];
  }
}

// פונקציות עזר גלובליות
export const createDefaultPolicyForRole = (role: UserRole): PermissionPolicy => {
  switch (role) {
    case UserRole.CHAYAL:
      return { ...DEFAULT_SOLDIER_POLICY };
    case UserRole.ADMIN:
      return { ...ADMIN_POLICY };
    default:
      return { ...DEFAULT_SOLDIER_POLICY };
  }
};

export const createFrameworkCommanderPolicy = (frameworkId: string): PermissionPolicy => {
  const policy = { ...DEFAULT_FRAMEWORK_COMMANDER_POLICY };
  policy.id = `framework-commander-${frameworkId}`;
  policy.name = `מדיניות מפקד מסגרת ${frameworkId}`;
  
  // עדכון התנאים עם מזהה המסגרת הספציפי
  policy.Statement = policy.Statement.map(statement => ({
    ...statement,
    Condition: statement.Condition ? {
      ...statement.Condition,
      frameworkIdEquals: frameworkId
    } : { frameworkIdEquals: frameworkId }
  }));

  return policy;
};

// פונקציה ליצירת מדיניות מפקד מסגרת עם template string
export const createFrameworkCommanderPolicyTemplate = (): PermissionPolicy => {
  return {
    ...DEFAULT_FRAMEWORK_COMMANDER_POLICY,
    id: 'framework-commander-template',
    name: 'מדיניות מפקד מסגרת (תבנית)',
    description: 'מדיניות למפקדי מסגרות - יוחלף אוטומטית במזהה המסגרת של המשתמש'
  };
};
