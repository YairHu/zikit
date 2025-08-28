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
import { localStorageService, updateTableTimestamp } from './cacheService';
import { canUserDeleteUsers } from './permissionService';

const USERS_COLLECTION = 'users';

// שירותי משתמשים בסיסיים
export const getAllUsers = async (): Promise<User[]> => {
  return localStorageService.getFromLocalStorage('users', async () => {
    try {
      console.log('📡 [DB] טוען משתמשים מהשרת');
      const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
      const users = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
      
      console.log(`✅ [DB] נטענו ${users.length} משתמשים מהשרת`);
      return users;
    } catch (error) {
      console.error('❌ [DB] Error getting users:', error);
      return [];
    }
  });
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
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי משתמשים');
  await updateTableTimestamp('users');
  localStorageService.invalidateLocalStorage('users');
};

export const updateUser = async (uid: string, userData: Partial<User>): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  
  await updateDoc(userRef, {
    ...userData,
    updatedAt: new Date()
  });
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי משתמשים');
  await updateTableTimestamp('users');
  localStorageService.invalidateLocalStorage('users');
};

export const deleteUser = async (uid: string): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await deleteDoc(userRef);
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי משתמשים');
  await updateTableTimestamp('users');
  localStorageService.invalidateLocalStorage('users');
};

// פונקציה להסרת חייל מ-collection soldiers
export const deleteSoldier = async (uid: string): Promise<void> => {
  try {
    // ניסיון מחיקה ישירה לפי UID
    const soldierRef = doc(db, 'soldiers', uid);
    const soldierDoc = await getDoc(soldierRef);
    
    if (soldierDoc.exists()) {
      await deleteDoc(soldierRef);
      console.log(`חייל ${uid} נמחק מ-collection soldiers`);
    } else {
      console.log(`חייל ${uid} לא נמצא ב-collection soldiers`);
    }
  } catch (error) {
    console.log(`שגיאה במחיקת חייל ${uid}:`, error);
  }
  
  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי חיילים');
  await updateTableTimestamp('soldiers');
  localStorageService.invalidateLocalStorage('soldiers');
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

    // 2. ניסיון מחיקה מ-Firebase Auth (רק אם יש רשומה ב-users)
    if (userToRemove) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        deletedFromAuth = true;
        console.log(`משתמש ${uid} נמחק מ-Firebase Auth`);
      } catch (error) {
        console.log(`משתמש ${uid} לא נמצא ב-Firebase Auth או שגיאה במחיקה:`, error);
      }
    }

    // 3. הסרת חייל מ-collection soldiers לפי email (אם לא נמחק עדיין)
    if (userToRemove?.email && !deletedFromSoldiers) {
      try {
        const soldiersQuery = query(
          collection(db, 'soldiers'),
          where('email', '==', userToRemove.email)
        );
        const soldiersSnapshot = await getDocs(soldiersQuery);
        
        for (const soldierDoc of soldiersSnapshot.docs) {
          await deleteDoc(soldierDoc.ref);
          deletedFromSoldiers = true;
          console.log(`חייל ${soldierDoc.id} נמחק מ-collection soldiers לפי email`);
        }
      } catch (error) {
        console.log(`שגיאה במחיקת חייל לפי email ${userToRemove.email}:`, error);
      }
    }

    // 6. הסרת המשתמש מרשימת הכפופים של מפקדים אחרים
    try {
      const commandersQuery = query(
        collection(db, 'users'),
        where('subordinatesUids', 'array-contains', uid)
      );
      const commandersSnapshot = await getDocs(commandersQuery);
      
      for (const commanderDoc of commandersSnapshot.docs) {
        const commanderData = commanderDoc.data();
        const updatedSubordinates = commanderData.subordinatesUids?.filter((id: string) => id !== uid) || [];
        await updateDoc(commanderDoc.ref, { subordinatesUids: updatedSubordinates });
        console.log(`משתמש ${uid} הוסר מרשימת הכפופים של ${commanderDoc.id}`);
      }
    } catch (error) {
      console.log(`שגיאה בהסרת משתמש מרשימת הכפופים:`, error);
    }

    console.log(`משתמש ${uid} הוסר בהצלחה מכל המקומות במערכת`);
    console.log(`סיכום מחיקה: Auth=${deletedFromAuth}, Users=${deletedFromUsers}, Soldiers=${deletedFromSoldiers}`);
    
    // עדכון טבלת העדכונים וניקוי מטמון מקומי
    console.log('🔄 [LOCAL_STORAGE] מעדכן טבלת עדכונים ומנקה מטמון מקומי');
    await updateTableTimestamp('users');
    await updateTableTimestamp('soldiers');
    localStorageService.invalidateLocalStorage('users');
    localStorageService.invalidateLocalStorage('soldiers');
  } catch (error) {
    console.error('שגיאה בהסרת משתמש:', error);
    throw new Error('שגיאה בהסרת משתמש מהמערכת');
  }
};

// שירותי תפקידים
export const assignRole = async (uid: string, role: UserRole, assignerUid: string): Promise<void> => {
  // עדכון התפקיד ב-Firestore בלבד
  await updateUser(uid, { role });
  // עדכון טבלת העדכונים וניקוי מטמון
  await updateTableTimestamp('users');
  await updateTableTimestamp('soldiers');
  localStorageService.invalidateLocalStorage('users');
  localStorageService.invalidateLocalStorage('soldiers');
};

export const assignRoleByName = async (uid: string, roleName: string, assignerUid: string): Promise<void> => {
  // עדכון התפקיד ב-Firestore בלבד
  await updateUser(uid, { role: roleName });
  // עדכון טבלת העדכונים וניקוי מטמון
  await updateTableTimestamp('users');
  await updateTableTimestamp('soldiers');
  localStorageService.invalidateLocalStorage('users');
  localStorageService.invalidateLocalStorage('soldiers');
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
  const q = query(
    collection(db, USERS_COLLECTION),
    where('role', '==', roleValue),
    where('isActive', '==', true)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
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