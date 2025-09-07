import { dataLayer } from './dataAccessLayer';
import { 
  PermissionPolicy, 
  Role, 
  SystemPath, 
  DataScope, 
  PermissionLevel,
  UserRole 
} from '../models/UserRole';
import { getCurrentIsraelTime } from '../utils/dateUtils';

// ===== Enhanced Caching for Permissions =====

// In-memory cache for frequently accessed data
const permissionCache = {
  policies: null as PermissionPolicy[] | null,
  roles: null as Role[] | null,
  userPermissions: new Map<string, any>(),
  lastFetch: {
    policies: 0,
    roles: 0
  }
};

// Cache TTL in milliseconds - longer for permissions (4 hours)
const PERMISSION_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours
const USER_PERMISSION_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Helper function to check if cache is valid
const isCacheValid = (lastFetch: number, ttl: number = PERMISSION_CACHE_TTL): boolean => {
  return Date.now() - lastFetch < ttl;
};

// Helper function to clear specific cache
const clearPermissionCache = (type?: 'policies' | 'roles' | 'userPermissions' | 'all') => {
  if (!type || type === 'all') {
    permissionCache.policies = null;
    permissionCache.roles = null;
    permissionCache.userPermissions.clear();
    permissionCache.lastFetch.policies = 0;
    permissionCache.lastFetch.roles = 0;
  } else if (type === 'policies') {
    permissionCache.policies = null;
    permissionCache.lastFetch.policies = 0;
    // Clear derived user permissions
    permissionCache.userPermissions.clear();
  } else if (type === 'roles') {
    permissionCache.roles = null;
    permissionCache.lastFetch.roles = 0;
    // Clear derived user permissions
    permissionCache.userPermissions.clear();
  } else if (type === 'userPermissions') {
    permissionCache.userPermissions.clear();
  }
  
};

// ===== ניהול מדיניות הרשאות =====

export const getAllPolicies = async (): Promise<PermissionPolicy[]> => {
  // Check in-memory cache first
  if (permissionCache.policies && isCacheValid(permissionCache.lastFetch.policies)) {
    return permissionCache.policies;
  }
  
  try {
    const allPolicies = await dataLayer.getAll('permissionPolicies') as unknown as any[];
    
    const policies = allPolicies.map(d => {
      const data: any = d;
      const paths: SystemPath[] = Array.isArray(data.paths)
        ? data.paths
        : (data.path ? [data.path as SystemPath] : []);
      
      // המרה של pathPermissions אם קיים
      const pathPermissions: Partial<Record<SystemPath, PermissionLevel[]>> = {};
      if (data.pathPermissions) {
        Object.keys(data.pathPermissions).forEach(path => {
          pathPermissions[path as SystemPath] = data.pathPermissions[path] || [];
        });
      }
      
      return {
        id: d.id,
        ...data,
        paths,
        pathPermissions: Object.keys(pathPermissions).length > 0 ? pathPermissions as Record<SystemPath, PermissionLevel[]> : undefined,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || new Date())
      } as PermissionPolicy;
    });
    
    // Cache in memory
    permissionCache.policies = policies;
    permissionCache.lastFetch.policies = Date.now();
    
    return policies;
  } catch (error) {
    console.error('❌ [PERMISSION_CACHE] שגיאה בטעינת מדיניות הרשאות:', error);
    throw error;
  }
};

export const getPolicyById = async (policyId: string): Promise<PermissionPolicy | null> => {
  try {
    // שימוש במטמון מקומי למדיניות
    const policies = await getAllPolicies();
    return policies.find(policy => policy.id === policyId) || null;
  } catch (error) {
    console.error('שגיאה בטעינת מדיניות:', error);
    throw error;
  }
};

export const createPolicy = async (
  policy: Omit<PermissionPolicy, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<string> => {
  try {
    const newPolicy = {
      ...policy,
      // המרה של pathPermissions לשמירה
      pathPermissions: policy.pathPermissions ? Object.fromEntries(
        Object.entries(policy.pathPermissions).filter(([_, permissions]) => permissions.length > 0)
      ) : undefined,
      createdAt: getCurrentIsraelTime(),
      updatedAt: getCurrentIsraelTime(),
      createdBy
    };
    
    const policyId = await dataLayer.create('permissionPolicies', newPolicy as any);
    
    // Smart cache invalidation - clear policies and user permissions
    clearPermissionCache('policies');
    
    
    return policyId;
  } catch (error) {
    console.error('❌ [PERMISSION_CACHE] שגיאה ביצירת מדיניות:', error);
    throw error;
  }
};

export const updatePolicy = async (
  policyId: string,
  updates: Partial<Omit<PermissionPolicy, 'id' | 'createdAt' | 'createdBy'>>,
  updatedBy: string
): Promise<void> => {
  try {
    // המרה של pathPermissions לשמירה
    const updateData = {
      ...updates,
      pathPermissions: updates.pathPermissions ? Object.fromEntries(
        Object.entries(updates.pathPermissions).filter(([_, permissions]) => permissions.length > 0)
      ) : undefined,
      updatedAt: getCurrentIsraelTime()
    };
    
    await dataLayer.update('permissionPolicies', policyId, updateData as any);
    
    // Smart cache invalidation - clear policies and user permissions
    clearPermissionCache('policies');
    
  } catch (error) {
    console.error('❌ [PERMISSION_CACHE] שגיאה בעדכון מדיניות:', error);
    throw error;
  }
};

export const deletePolicy = async (policyId: string): Promise<void> => {
  try {
    await dataLayer.delete('permissionPolicies', policyId);
    
    // Smart cache invalidation - clear policies and user permissions
    clearPermissionCache('policies');
    
  } catch (error) {
    console.error('❌ [PERMISSION_CACHE] שגיאה במחיקת מדיניות:', error);
    throw error;
  }
};

// ===== ניהול תפקידים =====

export const getAllRoles = async (): Promise<Role[]> => {
  // Check in-memory cache first
  if (permissionCache.roles && isCacheValid(permissionCache.lastFetch.roles)) {
    return permissionCache.roles;
  }
  
  try {
    const allRoles = await dataLayer.getAll('roles') as unknown as any[];
    
    const roles = allRoles.map(role => ({
      id: role.id,
      ...role,
      createdAt: role.createdAt?.toDate ? role.createdAt.toDate() : (role.createdAt || new Date()),
      updatedAt: role.updatedAt?.toDate ? role.updatedAt.toDate() : (role.updatedAt || new Date())
    })) as Role[];
    
    // Cache in memory
    permissionCache.roles = roles;
    permissionCache.lastFetch.roles = Date.now();
    
    return roles;
  } catch (error) {
    console.error('❌ [PERMISSION_CACHE] שגיאה בטעינת תפקידים:', error);
    throw error;
  }
};

export const getRoleById = async (roleId: string): Promise<Role | null> => {
  try {
    // שימוש במטמון מקומי לתפקידים
    const roles = await getAllRoles();
    return roles.find(role => role.id === roleId) || null;
  } catch (error) {
    console.error('שגיאה בטעינת תפקיד:', error);
    throw error;
  }
};

export const createRole = async (
  role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<string> => {
  try {
    const newRole = {
      ...role,
      createdAt: getCurrentIsraelTime(),
      updatedAt: getCurrentIsraelTime(),
      createdBy
    };
    
    const roleId = await dataLayer.create('roles', newRole as any);
    
    // Smart cache invalidation - clear roles and user permissions
    clearPermissionCache('roles');
    
    
    return roleId;
  } catch (error) {
    console.error('❌ [PERMISSION_CACHE] שגיאה ביצירת תפקיד:', error);
    throw error;
  }
};

export const updateRole = async (
  roleId: string,
  updates: Partial<Omit<Role, 'id' | 'createdAt' | 'createdBy'>>,
  updatedBy: string
): Promise<void> => {
  try {
    const updateData = {
      ...updates,
      updatedAt: getCurrentIsraelTime()
    };
    
    await dataLayer.update('roles', roleId, updateData as any);
    
    // Smart cache invalidation - clear roles and user permissions
    clearPermissionCache('roles');
    
  } catch (error) {
    console.error('❌ [PERMISSION_CACHE] שגיאה בעדכון תפקיד:', error);
    throw error;
  }
};

export const deleteRole = async (roleId: string): Promise<void> => {
  try {
    await dataLayer.delete('roles', roleId);
    
    // Smart cache invalidation - clear roles and user permissions
    clearPermissionCache('roles');
    
  } catch (error) {
    console.error('❌ [PERMISSION_CACHE] שגיאה במחיקת תפקיד:', error);
    throw error;
  }
};

// ===== בדיקת הרשאות =====

export const getUserPermissions = async (userId: string): Promise<{
  policies: PermissionPolicy[];
  role: Role | null;
}> => {
  // Check user permissions cache with shorter TTL
  const cacheKey = `user_permissions_${userId}`;
  const cachedPermissions = permissionCache.userPermissions.get(cacheKey);
  
  if (cachedPermissions && isCacheValid(cachedPermissions.timestamp, USER_PERMISSION_CACHE_TTL)) {
    return cachedPermissions.data;
  }
  
  try {
    
    // קבלת תפקיד המשתמש
    const userData = await dataLayer.getById('users', userId) as unknown as any;
    
    if (!userData) {
      return { policies: [], role: null };
    }
    
    let role: Role | null = null;
    
    // בדיקה אם יש roleId (המערכת החדשה)
    if (userData.roleId) {
      role = await getRoleById(userData.roleId);
    } 
    // בדיקה אם יש role (המערכת הישנה) - נחפש תפקיד לפי השם
    else if (userData.role) {
      const roles = await getAllRoles();
      role = roles.find(r => r.name === userData.role) || null;
    }
    
    if (!role) {
      return { policies: [], role: null };
    }
    
    // קבלת כל המדיניות של התפקיד
    const policies: PermissionPolicy[] = [];
    for (const policyId of role.policies) {
      const policy = await getPolicyById(policyId);
      if (policy) {
        policies.push(policy);
      }
    }
    
    const result = { policies, role };
    
    // Cache the result
    permissionCache.userPermissions.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    
    return result;
  } catch (error) {
    console.error('❌ [PERMISSION_CACHE] שגיאה בקבלת הרשאות משתמש:', error);
    throw error;
  }
};

export const canUserAccessPath = async (
  userId: string, 
  path: SystemPath, 
  requiredPermission: PermissionLevel
): Promise<boolean> => {
  try {
    const { policies } = await getUserPermissions(userId);
    
    // חיפוש מדיניות שמתאימה לנתיב
    const relevantPolicy = policies.find(policy => (policy.paths || []).includes(path));
    
    if (!relevantPolicy) {
      return false;
    }
    
    // בדיקה שהמדיניות כוללת את ההרשאה הנדרשת
    // אם יש pathPermissions במדיניות (הפורמט החדש), נבדוק לפי הנתיב הספציפי
    if (relevantPolicy.pathPermissions && relevantPolicy.pathPermissions[path]) {
      return relevantPolicy.pathPermissions[path].includes(requiredPermission);
    }
    
    // אחרת, נשתמש בפורמט הישן (permissions גלובליים)
    return relevantPolicy.permissions.includes(requiredPermission);
  } catch (error) {
    console.error('שגיאה בבדיקת הרשאה:', error);
    return false;
  }
};

// פונקציה חדשה שמחזירה את כל ההרשאות בבת אחת
export const getUserAllPermissions = async (userId: string): Promise<{
  policies: PermissionPolicy[];
  role: Role | null;
  permissions: {
    [path in SystemPath]: {
      [level in PermissionLevel]: boolean;
    };
  };
}> => {
  try {
    const { policies, role } = await getUserPermissions(userId);
    
    // יצירת מפת הרשאות לכל הנתיבים והרמות
    const permissions: any = {};
    
    // רשימת כל הנתיבים והרמות
    const allPaths = Object.values(SystemPath);
    const allLevels = Object.values(PermissionLevel);
    
    for (const path of allPaths) {
      permissions[path] = {};
      for (const level of allLevels) {
        // חיפוש מדיניות שמתאימה לנתיב
        const relevantPolicy = policies.find(policy => (policy.paths || []).includes(path));
        
        if (!relevantPolicy) {
          permissions[path][level] = false;
          continue;
        }
        
        // בדיקה שהמדיניות כוללת את ההרשאה הנדרשת
        if (relevantPolicy.pathPermissions && relevantPolicy.pathPermissions[path]) {
          permissions[path][level] = relevantPolicy.pathPermissions[path].includes(level);
        } else {
          permissions[path][level] = relevantPolicy.permissions.includes(level);
        }
      }
    }
    
    return { policies, role, permissions };
  } catch (error) {
    console.error('❌ [DB] שגיאה בטעינת הרשאות משתמש:', error);
    return { policies: [], role: null, permissions: {} as any };
  }
};

// פונקציה לבדיקת הרשאת עריכת נוכחות חיילים
export const canUserEditSoldierPresence = async (userId: string): Promise<boolean> => {
  try {
    return await canUserAccessPath(userId, SystemPath.SOLDIER_PRESENCE, PermissionLevel.EDIT);
  } catch (error) {
    console.error('שגיאה בבדיקת הרשאת עריכת נוכחות חיילים:', error);
    return false;
  }
};

// פונקציה לבדיקת הרשאת עריכת פרטי חיילים
export const canUserEditSoldierDetails = async (userId: string): Promise<boolean> => {
  try {
    return await canUserAccessPath(userId, SystemPath.SOLDIER_DETAILS, PermissionLevel.EDIT);
  } catch (error) {
    console.error('שגיאה בבדיקת הרשאת עריכת פרטי חיילים:', error);
    return false;
  }
};

// פונקציה לבדיקת הרשאת גישה למסך ניטור מטמון
export const canUserAccessCacheMonitor = async (userId: string): Promise<boolean> => {
  try {
    return await canUserAccessPath(userId, SystemPath.CACHE_MONITOR, PermissionLevel.VIEW);
  } catch (error) {
    console.error('שגיאה בבדיקת הרשאת גישה למסך ניטור מטמון:', error);
    return false;
  }
};

// פונקציה לבדיקת הרשאת ניהול מטמון (ניקוי, רענון)
export const canUserManageCache = async (userId: string): Promise<boolean> => {
  try {
    return await canUserAccessPath(userId, SystemPath.CACHE_MONITOR, PermissionLevel.EDIT);
  } catch (error) {
    console.error('שגיאה בבדיקת הרשאת ניהול מטמון:', error);
    return false;
  }
};

// פונקציה לבדיקת הרשאת מחיקת משתמשים
export const canUserDeleteUsers = async (userId: string): Promise<boolean> => {
  try {
    return await canUserAccessPath(userId, SystemPath.USERS, PermissionLevel.DELETE);
  } catch (error) {
    console.error('שגיאה בבדיקת הרשאת מחיקת משתמשים:', error);
    return false;
  }
};

// ===== ניהול מטמון הרשאות משופר =====

// ניקוי מטמון הרשאות משתמש (מתואם עם המנגנון החדש)
export const clearUserPermissionsCache = (userId?: string): void => {
  if (userId) {
    permissionCache.userPermissions.delete(`user_permissions_${userId}`);
    // גם ניקוי localStorage לאחור תאימות
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes(userId)) {
        localStorage.removeItem(key);
      }
    });
  } else {
    // ניקוי כל המטמון
    clearPermissionCache('userPermissions');
    // גם ניקוי localStorage לאחור תאימות
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('user_all_permissions_') || key.startsWith('user_permissions_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// פונקציה לרענון הרשאות משתמש (לשימוש ידני)
export const refreshUserPermissions = async (userId: string): Promise<void> => {
  
  // ניקוי מטמון קיים
  clearUserPermissionsCache(userId);
  
  // טעינה מחדש מהשרת
  await getUserPermissions(userId);
  
};

// פונקציה לרענון כל המטמון (לשימוש ידני)
export const refreshAllPermissionsCache = async (): Promise<void> => {
  
  // ניקוי כל המטמון
  clearPermissionCache('all');
  
  // טעינה מחדש מהשרת
  await Promise.all([
    getAllPolicies(),
    getAllRoles()
  ]);
  
};

// פונקציה להצגת מידע על מצב המטמון
export const getPermissionCacheInfo = () => {
  const now = Date.now();
  return {
    policies: {
      cached: !!permissionCache.policies,
      age: permissionCache.lastFetch.policies ? now - permissionCache.lastFetch.policies : 0,
      valid: isCacheValid(permissionCache.lastFetch.policies),
      count: permissionCache.policies?.length || 0
    },
    roles: {
      cached: !!permissionCache.roles,
      age: permissionCache.lastFetch.roles ? now - permissionCache.lastFetch.roles : 0,
      valid: isCacheValid(permissionCache.lastFetch.roles),
      count: permissionCache.roles?.length || 0
    },
    userPermissions: {
      count: permissionCache.userPermissions.size,
      users: Array.from(permissionCache.userPermissions.keys()).map(key => key.replace('user_permissions_', ''))
    },
    settings: {
      permissionCacheTTL: PERMISSION_CACHE_TTL,
      userPermissionCacheTTL: USER_PERMISSION_CACHE_TTL
    }
  };
};

// ===== יצירת תפקידים ומדיניות ברירת מחדל =====

// פונקציה ריקה - לא יוצרת שום דבר
export const initializeDefaultRolesAndPolicies = async (createdBy: string): Promise<void> => {
  console.log('פונקציית אתחול ברירת מחדל לא פעילה');
};
