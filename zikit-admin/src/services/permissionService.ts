import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  PermissionPolicy, 
  Role, 
  SystemPath, 
  DataScope, 
  PermissionLevel,
  UserRole 
} from '../models/UserRole';
import { localStorageService, updateTableTimestamp } from './cacheService';

// ===== ניהול מדיניות הרשאות =====

export const getAllPolicies = async (): Promise<PermissionPolicy[]> => {
  return localStorageService.getFromLocalStorage('permissionPolicies', async () => {
    try {
      const policiesRef = collection(db, 'permissionPolicies');
      const q = query(policiesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const policies = snapshot.docs.map(d => {
        const data: any = d.data();
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
      
      return policies;
    } catch (error) {
      console.error('❌ [DB] שגיאה בטעינת מדיניות הרשאות:', error);
      throw error;
    }
  });
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
    const policiesRef = collection(db, 'permissionPolicies');
    const newPolicy = {
      ...policy,
      // המרה של pathPermissions לשמירה
      pathPermissions: policy.pathPermissions ? Object.fromEntries(
        Object.entries(policy.pathPermissions).filter(([_, permissions]) => permissions.length > 0)
      ) : undefined,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy
    };
    
    const docRef = await addDoc(policiesRef, newPolicy);
    
    // עדכון טבלת העדכונים וניקוי מטמון מקומי
    await updateTableTimestamp('permissionPolicies');
    localStorageService.invalidateLocalStorage('permissionPolicies');
    
    // ניקוי מטמון הרשאות משתמש - כי מדיניות חדשה יכולה להשפיע על הרשאות
    clearUserPermissionsCache();
    
    return docRef.id;
  } catch (error) {
    console.error('❌ [DB] שגיאה ביצירת מדיניות:', error);
    throw error;
  }
};

export const updatePolicy = async (
  policyId: string,
  updates: Partial<Omit<PermissionPolicy, 'id' | 'createdAt' | 'createdBy'>>,
  updatedBy: string
): Promise<void> => {
  try {
    const policyRef = doc(db, 'permissionPolicies', policyId);
    
    // המרה של pathPermissions לשמירה
    const updateData = {
      ...updates,
      pathPermissions: updates.pathPermissions ? Object.fromEntries(
        Object.entries(updates.pathPermissions).filter(([_, permissions]) => permissions.length > 0)
      ) : undefined,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(policyRef, updateData);
    
    // עדכון טבלת העדכונים וניקוי מטמון מקומי
    await updateTableTimestamp('permissionPolicies');
    localStorageService.invalidateLocalStorage('permissionPolicies');
    
    // ניקוי מטמון הרשאות משתמש - כי מדיניות עודכנה
    clearUserPermissionsCache();
  } catch (error) {
    console.error('שגיאה בעדכון מדיניות:', error);
    throw error;
  }
};

export const deletePolicy = async (policyId: string): Promise<void> => {
  try {
    const policyRef = doc(db, 'permissionPolicies', policyId);
    await deleteDoc(policyRef);
    
    // עדכון טבלת העדכונים וניקוי מטמון מקומי
    await updateTableTimestamp('permissionPolicies');
    localStorageService.invalidateLocalStorage('permissionPolicies');
    
    // ניקוי מטמון הרשאות משתמש - כי מדיניות נמחקה
    clearUserPermissionsCache();
  } catch (error) {
    console.error('שגיאה במחיקת מדיניות:', error);
    throw error;
  }
};

// ===== ניהול תפקידים =====

export const getAllRoles = async (): Promise<Role[]> => {
  return localStorageService.getFromLocalStorage('roles', async () => {
    try {
      const rolesRef = collection(db, 'roles');
      const q = query(rolesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const roles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Role[];
      
      return roles;
    } catch (error) {
      console.error('❌ [DB] שגיאה בטעינת תפקידים:', error);
      throw error;
    }
  });
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
    const rolesRef = collection(db, 'roles');
    const newRole = {
      ...role,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy
    };
    
    const docRef = await addDoc(rolesRef, newRole);
    
    // עדכון טבלת העדכונים וניקוי מטמון מקומי
    await updateTableTimestamp('roles');
    localStorageService.invalidateLocalStorage('roles');
    
    // ניקוי מטמון הרשאות משתמש - כי תפקיד חדש יכול להשפיע על הרשאות
    clearUserPermissionsCache();
    
    return docRef.id;
  } catch (error) {
    console.error('שגיאה ביצירת תפקיד:', error);
    throw error;
  }
};

export const updateRole = async (
  roleId: string,
  updates: Partial<Omit<Role, 'id' | 'createdAt' | 'createdBy'>>,
  updatedBy: string
): Promise<void> => {
  try {
    const roleRef = doc(db, 'roles', roleId);
    await updateDoc(roleRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
    
    // עדכון טבלת העדכונים וניקוי מטמון מקומי
    await updateTableTimestamp('roles');
    localStorageService.invalidateLocalStorage('roles');
    
    // ניקוי מטמון הרשאות משתמש - כי תפקיד עודכן
    clearUserPermissionsCache();
  } catch (error) {
    console.error('שגיאה בעדכון תפקיד:', error);
    throw error;
  }
};

export const deleteRole = async (roleId: string): Promise<void> => {
  try {
    const roleRef = doc(db, 'roles', roleId);
    await deleteDoc(roleRef);
    
    // עדכון טבלת העדכונים וניקוי מטמון מקומי
    await updateTableTimestamp('roles');
    localStorageService.invalidateLocalStorage('roles');
    
    // ניקוי מטמון הרשאות משתמש - כי תפקיד נמחק
    clearUserPermissionsCache();
  } catch (error) {
    console.error('שגיאה במחיקת תפקיד:', error);
    throw error;
  }
};

// ===== בדיקת הרשאות =====

export const getUserPermissions = async (userId: string): Promise<{
  policies: PermissionPolicy[];
  role: Role | null;
}> => {
  try {
    // קבלת תפקיד המשתמש
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { policies: [], role: null };
    }
    
    const userData = userDoc.data();
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
    
    return { policies, role };
  } catch (error) {
    console.error('שגיאה בקבלת הרשאות משתמש:', error);
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

// ===== ניהול מטמון הרשאות משתמש =====

// ניקוי מטמון הרשאות משתמש
export const clearUserPermissionsCache = (userId?: string): void => {
  if (userId) {
    localStorageService.invalidateLocalStorage(`user_all_permissions_${userId}`);
  } else {
    // ניקוי כל המפתחות של הרשאות משתמש
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('user_all_permissions_')) {
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
  await getUserAllPermissions(userId);
};

// ===== יצירת תפקידים ומדיניות ברירת מחדל =====

// פונקציה ריקה - לא יוצרת שום דבר
export const initializeDefaultRolesAndPolicies = async (createdBy: string): Promise<void> => {
  console.log('פונקציית אתחול ברירת מחדל לא פעילה');
};
