import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../models/User';
import { UserRole } from '../models/UserRole';
import { PermissionPolicy, PermissionEvaluator } from '../models/PermissionPolicy';
import { 
  getUserPolicies, 
  addPolicyToUser, 
  removePolicyFromUser as removePolicyFromUserService,
  getPermissionPolicyById,
  getPoliciesByRole
} from './permissionPolicyService';

const USERS_COLLECTION = 'users';

// שירותי משתמשים בסיסיים
export const getAllUsers = async (): Promise<User[]> => {
  const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
};

export const getUserById = async (uid: string): Promise<User | null> => {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { uid, ...docSnap.data() } as User : null;
};

export const createUser = async (user: Omit<User, 'uid'>): Promise<void> => {
  const userRef = doc(collection(db, USERS_COLLECTION));
  await setDoc(userRef, {
    ...user,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  });
};

export const updateUser = async (uid: string, userData: Partial<User>): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  
  // אם התפקיד השתנה, עדכן את המדיניות אוטומטית
  if (userData.role) {
    const currentUser = await getUserById(uid);
    if (currentUser && currentUser.role !== userData.role) {
      await updateUserPoliciesByRole(uid, userData.role);
    }
  }
  
  await updateDoc(userRef, {
    ...userData,
    updatedAt: new Date()
  });
};

// פונקציה לעדכון מדיניות משתמש לפי תפקיד
export const updateUserPoliciesByRole = async (uid: string, newRole: UserRole): Promise<void> => {
  try {
    const currentUser = await getUserById(uid);
    if (!currentUser) {
      throw new Error('משתמש לא נמצא');
    }

    // הסר את כל המדיניות הקיימות
    if (currentUser.permissionPolicies) {
      for (const policyId of currentUser.permissionPolicies) {
        await removePolicyFromUserService(uid, policyId);
      }
    }

    // טיפול מיוחד למפקדי מסגרת
    if (newRole === UserRole.MEFAKED_PELAGA || newRole === UserRole.MEFAKED_TZEVET) {
      if (currentUser.frameworkId) {
        // צור מדיניות מותאמת למסגרת הספציפית
        const { createFrameworkCommanderPolicy } = await import('../models/PermissionPolicy');
        const frameworkPolicy = createFrameworkCommanderPolicy(currentUser.frameworkId);
        
        // שמור את המדיניות ב-Firebase
        const { createPermissionPolicy } = await import('./permissionPolicyService');
        const policyId = await createPermissionPolicy(frameworkPolicy);
        
        // הקצה למשתמש
        await addPolicyToUser(uid, policyId);
        console.log(`נוצרה מדיניות מותאמת למפקד מסגרת ${currentUser.frameworkId}`);
      } else {
        console.warn(`משתמש ${uid} מוגדר כמפקד מסגרת אך אין לו מזהה מסגרת`);
      }
    } else {
      // קבל את המדיניות המתאימות לתפקיד החדש
      const rolePolicies = await getPoliciesByRole(newRole);
      
      // הוסף את המדיניות החדשות
      for (const policy of rolePolicies) {
        await addPolicyToUser(uid, policy.id);
      }
    }
    
    console.log(`עודכנו מדיניות למשתמש ${uid} לתפקיד ${newRole}`);
  } catch (error) {
    console.error('שגיאה בעדכון מדיניות לפי תפקיד:', error);
    throw error;
  }
};

export const deleteUser = async (uid: string): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await deleteDoc(userRef);
};

// פונקציה להסרת משתמש מהמערכת (רק לאדמין ומ"פ)
export const removeUserFromSystem = async (uid: string, removerUid: string): Promise<void> => {
  // בדיקת הרשאות - רק אדמין ומ"פ יכולים להסיר משתמשים
  const remover = await getUserById(removerUid);
  if (!remover) {
    throw new Error('משתמש לא נמצא');
  }

  if (!canUserRemoveUsers(remover)) {
    throw new Error('אין הרשאה להסרת משתמשים מהמערכת');
  }

  // בדיקה שהמשתמש לא מנסה להסיר את עצמו
  if (uid === removerUid) {
    throw new Error('לא ניתן להסיר את עצמך מהמערכת');
  }

  // בדיקה שהמשתמש לא מנסה להסיר אדמין אחר (אם הוא לא אדמין בעצמו)
  const userToRemove = await getUserById(uid);
  if (userToRemove && userToRemove.role === 'admin' && remover.role !== 'admin') {
    throw new Error('רק אדמין יכול להסיר אדמין אחר');
  }

  // הסרת המשתמש מכל המקומות במערכת
  try {
    // 1. הסרת המשתמש מ-collection users
    await deleteUser(uid);

    // 2. הסרת רשומת חייל מקושרת (אם יש)
    if (userToRemove?.soldierDocId) {
      const soldierRef = doc(db, 'soldiers', userToRemove.soldierDocId);
      await deleteDoc(soldierRef);
    }

    // 3. הסרת חייל מ-collection soldiers לפי email (אם לא נמצא דרך soldierDocId)
    if (userToRemove?.email) {
      const soldiersQuery = query(
        collection(db, 'soldiers'),
        where('email', '==', userToRemove.email)
      );
      const soldiersSnapshot = await getDocs(soldiersQuery);
      
      for (const soldierDoc of soldiersSnapshot.docs) {
        await deleteDoc(soldierDoc.ref);
      }
    }

    // 4. הסרת המשתמש מרשימת הכפופים של מפקדים אחרים
    const commandersQuery = query(
      collection(db, 'users'),
      where('subordinatesUids', 'array-contains', uid)
    );
    const commandersSnapshot = await getDocs(commandersQuery);
    
    for (const commanderDoc of commandersSnapshot.docs) {
      const commanderData = commanderDoc.data();
      const updatedSubordinates = commanderData.subordinatesUids?.filter((id: string) => id !== uid) || [];
      await updateDoc(commanderDoc.ref, { subordinatesUids: updatedSubordinates });
    }

    console.log(`משתמש ${uid} הוסר בהצלחה מכל המקומות במערכת`);
  } catch (error) {
    console.error('שגיאה בהסרת משתמש:', error);
    throw new Error('שגיאה בהסרת משתמש מהמערכת');
  }
};



// שירותי תפקידים והרשאות
export const assignRole = async (uid: string, role: UserRole, assignerUid: string): Promise<void> => {
  // בדיקת הרשאות - רק מ"פ, סמ"פ ואדמין יכולים לשבץ תפקידים
  const assigner = await getUserById(assignerUid);
  if (!assigner || !canUserAssignRoles(assigner)) {
    throw new Error('אין הרשאה לשיבוץ תפקידים');
  }

  // עדכון התפקיד ב-Firestore בלבד
  await updateUser(uid, { role });
};

export const assignToTeam = async (uid: string, teamId: string, plagaId: string, assignerUid?: string): Promise<void> => {
  // אם יש assignerUid, בדוק הרשאות
  if (assignerUid) {
    const assigner = await getUserById(assignerUid);
    if (!assigner || !canUserAssignRoles(assigner)) {
      throw new Error('אין הרשאה לשיבוץ לצוות');
    }
  }

  await updateUser(uid, { 
    team: teamId, 
    pelaga: plagaId 
  });
};

export const setCommander = async (subordinateUid: string, commanderUid: string): Promise<void> => {
  // עדכון הכפוף
  await updateUser(subordinateUid, { commanderUid });
  
  // עדכון המפקד
  const commander = await getUserById(commanderUid);
  if (commander) {
    const subordinates = commander.subordinatesUids || [];
    if (!subordinates.includes(subordinateUid)) {
      subordinates.push(subordinateUid);
      await updateUser(commanderUid, { subordinatesUids: subordinates });
    }
  }
};

// שירותי מבנה ארגוני - הועברו לשירות נפרד
export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('role', '==', role),
    where('isActive', '==', true)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
};

// פונקציות עזר להרשאות
export const canUserAssignRoles = (user: User): boolean => {
  // בדיקה לפי התפקיד
  return user.role === UserRole.ADMIN || 
         user.role === UserRole.MEFAKED_PLUGA || 
         user.role === UserRole.SAMAL_PLUGA;
};

export const canUserViewSensitiveData = (user: User): boolean => {
  return user.role === UserRole.ADMIN || 
         user.role === UserRole.MEFAKED_PLUGA || 
         user.role === UserRole.SAMAL_PLUGA;
};

export const canUserRemoveUsers = (user: User): boolean => {
  return user.role === UserRole.ADMIN || 
         user.role === UserRole.MEFAKED_PLUGA;
};

export const getVisibleUsers = async (viewerUid: string): Promise<User[]> => {
  const viewer = await getUserById(viewerUid);
  if (!viewer) return [];
  
  const allUsers = await getAllUsers();
  
  return allUsers.filter(user => {
    const { canUserSeeOtherUser } = require('../models/User');
    return canUserSeeOtherUser(viewer, user);
  });
}; 

// פונקציות חדשות לניהול הרשאות
export const getUserPermissionPolicies = async (user: User): Promise<PermissionPolicy[]> => {
  try {
    if (!user.permissionPolicies || user.permissionPolicies.length === 0) {
      return [];
    }
    
    return await getUserPolicies(user.permissionPolicies);
  } catch (error) {
    console.error('שגיאה בטעינת מדיניויות הרשאות של משתמש:', error);
    return [];
  }
};

export const assignPolicyToUser = async (userId: string, policyId: string, assignerUid: string): Promise<void> => {
  try {
    // בדיקת הרשאות - רק אדמין יכול לנהל הרשאות
    const assigner = await getUserById(assignerUid);
    if (!assigner || assigner.role !== UserRole.ADMIN) {
      throw new Error('אין הרשאה לניהול הרשאות - רק אדמין יכול לבצע פעולה זו');
    }

    // בדיקה שהמדיניות קיימת
    const policy = await getPermissionPolicyById(policyId);
    if (!policy) {
      throw new Error('מדיניות הרשאות לא נמצאה');
    }

    // הוספת המדיניות למשתמש
    await addPolicyToUser(userId, policyId);
    
    console.log(`מדיניות הרשאות ${policyId} נוספה למשתמש ${userId}`);
  } catch (error) {
    console.error('שגיאה בשיבוץ מדיניות הרשאות:', error);
    throw error;
  }
};

export const removePolicyFromUser = async (userId: string, policyId: string, removerUid: string): Promise<void> => {
  try {
    // בדיקת הרשאות - רק אדמין יכול לנהל הרשאות
    const remover = await getUserById(removerUid);
    if (!remover || remover.role !== UserRole.ADMIN) {
      throw new Error('אין הרשאה לניהול הרשאות - רק אדמין יכול לבצע פעולה זו');
    }

    // הסרת המדיניות מהמשתמש
    await removePolicyFromUserService(userId, policyId);
    
    console.log(`מדיניות הרשאות ${policyId} הוסרה ממשתמש ${userId}`);
  } catch (error) {
    console.error('שגיאה בהסרת מדיניות הרשאות:', error);
    throw error;
  }
};

export const canUserManagePermissions = (user: User): boolean => {
  return user.role === UserRole.ADMIN;
};

export const canUserPerformAction = async (
  user: User, 
  action: string, 
  resource: string, 
  context?: Record<string, any>
): Promise<boolean> => {
  try {
    // אם המשתמש הוא אדמין, יש לו הרשאות מלאות
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // טעינת מדיניויות ההרשאות של המשתמש
    const policies = await getUserPermissionPolicies(user);
    
    if (policies.length === 0) {
      // אם אין מדיניויות מותאמות, משתמש במערכת הישנה
      return checkLegacyPermissions(user, action, resource);
    }

    // יצירת מעריך הרשאות
    const evaluator = new PermissionEvaluator(policies);
    
    // בדיקת ההרשאה
    return evaluator.canPerformAction(user, action, resource, context);
  } catch (error) {
    console.error('שגיאה בבדיקת הרשאות:', error);
    // במקרה של שגיאה, משתמש במערכת הישנה
    return checkLegacyPermissions(user, action, resource);
  }
};

// פונקציה לבדיקת הרשאות לפי המערכת הישנה (לשמירה על תאימות)
const checkLegacyPermissions = (user: User, action: string, resource: string): boolean => {
  // מיפוי פעולות למשאבים במערכת הישנה
  const actionResourceMap: Record<string, string> = {
    'read:soldiers': 'soldiers',
    'read:teams': 'teams',
    'read:trips': 'trips',
    'read:missions': 'missions',
    'read:activities': 'activities',
    'read:activity_statistics': 'activityStatistics',
    'read:duties': 'duties',
    'read:referrals': 'referrals',
    'read:forms': 'forms',
    'read:hamal': 'hamal',
    'read:framework_management': 'frameworkManagement',
    'read:soldier_linking': 'soldierLinking',
    'read:user_management': 'userManagement',
    'read:data_seeder': 'dataSeeder',
    'create': 'canCreate',
    'update': 'canEdit',
    'delete': 'canDelete',
    'assign_roles': 'canAssignRoles',
    'view_sensitive_data': 'canViewSensitiveData',

    'remove_users': 'canRemoveUsers',
  };

  const legacyResource = actionResourceMap[action] || action;
  
  // בדיקה לפי התפקיד במערכת הישנה
  switch (user.role) {
    case UserRole.ADMIN:
      return true;
    case UserRole.MEFAKED_PLUGA:
      return legacyResource !== 'dataSeeder';
    case UserRole.SAMAL_PLUGA:
      return !['frameworkManagement', 'userManagement', 'dataSeeder', 'canDelete', 'canAssignRoles', 'canRemoveUsers'].includes(legacyResource);
    case UserRole.MEFAKED_PELAGA:
    case UserRole.RASP:
    case UserRole.SARASP:
    case UserRole.KATZIN_NIHUL:
    case UserRole.MANIP:
    case UserRole.HOFPAL:
    case UserRole.PAP:
      return !['hamal', 'frameworkManagement', 'soldierLinking', 'userManagement', 'dataSeeder', 'canDelete', 'canAssignRoles', 'canViewSensitiveData', 'canRemoveUsers'].includes(legacyResource);
    case UserRole.MEFAKED_TZEVET:
    case UserRole.SAMAL:
    case UserRole.MEFAKED_CHAYAL:
      return !['activityStatistics', 'forms', 'hamal', 'frameworkManagement', 'soldierLinking', 'userManagement', 'dataSeeder', 'canDelete', 'canAssignRoles', 'canViewSensitiveData', 'canRemoveUsers'].includes(legacyResource);
    case UserRole.CHAYAL:
      return ['read:soldiers', 'read:trips', 'read:missions', 'read:activities', 'read:duties', 'read:referrals'].includes(action);
    case UserRole.HAMAL:
      return !['frameworkManagement', 'soldierLinking', 'userManagement', 'dataSeeder', 'create', 'update', 'delete', 'assign_roles', 'remove_users'].includes(legacyResource);
    default:
      return false;
  }
}; 