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
  await updateDoc(userRef, {
    ...userData,
    updatedAt: new Date()
  });
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

// פונקציה לעדכון שם משתמש מרשומת החייל המקושרת
export const updateUserDisplayNameFromSoldier = async (uid: string): Promise<void> => {
  try {
    // קבלת נתוני המשתמש
    const user = await getUserById(uid);
    if (!user) {
      throw new Error('משתמש לא נמצא');
    }

    // בדיקה אם יש רשומת חייל מקושרת
    if (!user.soldierDocId) {
      throw new Error('אין רשומת חייל מקושרת למשתמש זה');
    }

    // קבלת נתוני החייל
    const soldierRef = doc(db, 'soldiers', user.soldierDocId);
    const soldierDoc = await getDoc(soldierRef);
    
    if (!soldierDoc.exists()) {
      throw new Error('רשומת החייל לא נמצאה');
    }

    const soldierData = soldierDoc.data();
    
    // עדכון השם אם יש שם בטופס
    if (soldierData.fullName && soldierData.fullName.trim() !== '') {
      await updateUser(uid, { 
        displayName: soldierData.fullName,
        updatedAt: new Date()
      });
      console.log(`Updated displayName for user ${uid}: ${soldierData.fullName}`);
    } else {
      console.log(`No fullName found in soldier data for user ${uid}`);
    }
  } catch (error) {
    console.error('שגיאה בעדכון שם המשתמש:', error);
    throw error;
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