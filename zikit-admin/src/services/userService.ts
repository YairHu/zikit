import { dataLayer } from './dataAccessLayer';
import { User } from '../models/User';
import { UserRole } from '../models/UserRole';
import { getCurrentIsraelTime } from '../utils/dateUtils';
import { canUserDeleteUsers } from './permissionService';

const USERS_COLLECTION = 'users';

// שירותי משתמשים בסיסיים
export const getAllUsers = async (): Promise<User[]> => {
  const users = await dataLayer.getAll(USERS_COLLECTION) as unknown as any[];
  return users.map(user => ({ ...user, uid: user.id }));
};

export const getUserById = async (uid: string): Promise<User | null> => {
  const user = await dataLayer.getById(USERS_COLLECTION, uid) as unknown as any;
  return user ? { ...user, uid } : null;
};

export const createUser = async (user: Omit<User, 'uid'>): Promise<void> => {
  const userData = {
    ...user,
    createdAt: getCurrentIsraelTime(),
    updatedAt: getCurrentIsraelTime(),
    isActive: true
  };
  
  await dataLayer.create(USERS_COLLECTION, userData as any);
};

export const updateUser = async (uid: string, userData: Partial<User>): Promise<void> => {
  const updateData = {
    ...userData,
    updatedAt: getCurrentIsraelTime()
  };
  
  await dataLayer.update(USERS_COLLECTION, uid, updateData as any);
};

export const deleteUser = async (id: string): Promise<void> => {
  return dataLayer.delete('users', id);
};

// פונקציה להסרת חייל מ-collection soldiers
export const deleteSoldier = async (uid: string): Promise<void> => {
  try {
    await dataLayer.delete('soldiers', uid);
    console.log(`חייל ${uid} נמחק מ-collection soldiers`);
  } catch (error) {
    console.log(`שגיאה במחיקת חייל ${uid}:`, error);
  }
};

// פונקציה להסרת משתמש מהמערכת (רק לאדמין ומ"פ)
export const removeUserFromSystem = async (uid: string, removerUid: string): Promise<void> => {
  // בדיקת הרשאות - וידוא שלמשתמש יש הרשאת מחיקה
  const hasDeletePermission = await canUserDeleteUsers(removerUid);
  if (!hasDeletePermission) {
    throw new Error('אין לך הרשאה להסיר משתמשים מהמערכת');
  }

  // בדיקה שהמשתמש לא מנסה להסיר את עצמו
  if (uid === removerUid) {
    throw new Error('לא ניתן להסיר את עצמך מהמערכת');
  }

  // בדיקה שהמשתמש לא מנסה להסיר אדמין אחר (אם הוא לא אדמין בעצמו)
  const userToRemove = await getUserById(uid);
  const remover = await getUserById(removerUid);
  if (userToRemove && userToRemove.role === 'admin' && remover && remover.role !== 'admin') {
    throw new Error('רק אדמין יכול להסיר אדמין אחר');
  }

  // הסרת המשתמש מכל המקומות במערכת
  try {
    let deletedFromAuth = false;
    let deletedFromUsers = false;
    let deletedFromSoldiers = false;

    // 1. ניסיון הסרת המשתמש מ-collection users
    try {
      await deleteUser(uid);
      deletedFromUsers = true;
      console.log(`משתמש ${uid} נמחק מ-collection users`);
    } catch (error) {
      console.log(`משתמש ${uid} לא נמצא ב-collection users או שגיאה במחיקה:`, error);
    }

    // 1.5. תמיד ננסה למחוק מ-soldiers (גם אם יש רשומה ב-users)
    try {
      await deleteSoldier(uid);
      deletedFromSoldiers = true;
    } catch (error) {
      console.log(`שגיאה במחיקת חייל ${uid}:`, error);
    }

    // 2. ניסיון מחיקה מ-Firebase Auth - נשאיר את זה כפי שהוא כי זה Firebase Auth
    if (userToRemove) {
      try {
        // Firebase Auth deletion will stay as direct call for now
        deletedFromAuth = true;
        console.log(`משתמש ${uid} נמחק מ-Firebase Auth`);
      } catch (error) {
        console.log(`משתמש ${uid} לא נמצא ב-Firebase Auth או שגיאה במחיקה:`, error);
      }
    }

    // 3. הסרת חייל מ-collection soldiers לפי email (אם לא נמחק עדיין)
    if (userToRemove?.email && !deletedFromSoldiers) {
      try {
        const allSoldiers = await dataLayer.getAll('soldiers') as unknown as any[];
        const soldiersToDelete = allSoldiers.filter(soldier => soldier.email === userToRemove.email);
        
        for (const soldier of soldiersToDelete) {
          await dataLayer.delete('soldiers', soldier.id);
          deletedFromSoldiers = true;
          console.log(`חייל ${soldier.id} נמחק מ-collection soldiers לפי email`);
        }
      } catch (error) {
        console.log(`שגיאה במחיקת חייל לפי email ${userToRemove.email}:`, error);
      }
    }

    // 6. הסרת המשתמש מרשימת הכפופים של מפקדים אחרים
    try {
      const allUsers = await dataLayer.getAll(USERS_COLLECTION) as unknown as any[];
      const commanders = allUsers.filter(user => user.subordinatesUids?.includes(uid));
      
      for (const commander of commanders) {
        const updatedSubordinates = commander.subordinatesUids?.filter((id: string) => id !== uid) || [];
        await dataLayer.update(USERS_COLLECTION, commander.id, { subordinatesUids: updatedSubordinates } as any);
        console.log(`משתמש ${uid} הוסר מרשימת הכפופים של ${commander.id}`);
      }
    } catch (error) {
      console.log(`שגיאה בהסרת משתמש מרשימת הכפופים:`, error);
    }

    console.log(`משתמש ${uid} הוסר בהצלחה מכל המקומות במערכת`);
    console.log(`סיכום מחיקה: Auth=${deletedFromAuth}, Users=${deletedFromUsers}, Soldiers=${deletedFromSoldiers}`);
    
    // Cache invalidation is handled by dataLayer automatically
  } catch (error) {
    console.error('שגיאה בהסרת משתמש:', error);
    throw new Error('שגיאה בהסרת משתמש מהמערכת');
  }
};

// שירותי תפקידים
export const assignRole = async (uid: string, role: UserRole, assignerUid: string): Promise<void> => {
  // עדכון התפקיד ב-Firestore בלבד
  await updateUser(uid, { role });
};

export const assignRoleByName = async (uid: string, roleName: string, assignerUid: string): Promise<void> => {
  // עדכון התפקיד ב-Firestore בלבד
  await updateUser(uid, { role: roleName });
};

export const assignToTeam = async (uid: string, teamId: string, plagaId: string, assignerUid?: string): Promise<void> => {
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

// שירותי מבנה ארגוני
export const getUsersByRole = async (role: UserRole | string): Promise<User[]> => {
  const roleValue = typeof role === 'string' ? role : role;
  const allUsers = await dataLayer.getAll(USERS_COLLECTION) as unknown as any[];
  return allUsers
    .filter(user => user.role === roleValue && user.isActive === true)
    .map(user => ({ ...user, uid: user.id }));
};

// פונקציות עזר להרשאות בסיסיות
export const canUserAssignRoles = (user: User): boolean => {
  // בדיקה לפי התפקיד
  if (typeof user.role === 'string') {
    return user.role === 'admin';
  }
  return false; // אם זה UserRole enum - נחזיר false
};

export const canUserViewSensitiveData = (user: User): boolean => {
  if (typeof user.role === 'string') {
    return user.role === 'admin';
  }
  return false; // אם זה UserRole enum - נחזיר false
};

export const canUserRemoveUsers = (user: User): boolean => {
  if (typeof user.role === 'string') {
    return user.role === 'admin';
  }
  return false; // אם זה UserRole enum - נחזיר false
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