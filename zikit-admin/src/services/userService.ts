import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { User, PlagaStructure, TeamStructure } from '../models/User';
import { UserRole } from '../models/UserRole';

const USERS_COLLECTION = 'users';
const STRUCTURE_COLLECTION = 'plagaStructure';

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

// שירותי תפקידים והרשאות
export const assignRole = async (uid: string, role: UserRole, assignerUid: string): Promise<void> => {
  // בדיקת הרשאות - רק מ"פ, סמ"פ ואדמין יכולים לשבץ תפקידים
  const assigner = await getUserById(assignerUid);
  if (!assigner || !assigner.canAssignRoles) {
    throw new Error('אין הרשאה לשיבוץ תפקידים');
  }

  // עדכון התפקיד ב-Firestore
  await updateUser(uid, { role });

  // עדכון Custom Claims ב-Firebase Auth (דרך Cloud Function)
  const functions = getFunctions();
  const setCustomClaims = httpsCallable(functions, 'setCustomClaims');
  await setCustomClaims({ uid, claims: { role } });
};

export const assignToTeam = async (uid: string, teamId: string, plagaId: string): Promise<void> => {
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
export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('role', '==', role),
    where('isActive', '==', true)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
};

export const getUsersByTeam = async (teamId: string): Promise<User[]> => {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('team', '==', teamId),
    where('isActive', '==', true),
    orderBy('role', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
};

export const getSubordinates = async (commanderUid: string): Promise<User[]> => {
  const commander = await getUserById(commanderUid);
  if (!commander || !commander.subordinatesUids) return [];
  
  const subordinates: User[] = [];
  for (const uid of commander.subordinatesUids) {
    const user = await getUserById(uid);
    if (user) subordinates.push(user);
  }
  return subordinates;
};

// שירותי מבנה הפלוגה
export const getPlagaStructure = async (): Promise<PlagaStructure[]> => {
  const querySnapshot = await getDocs(collection(db, STRUCTURE_COLLECTION));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlagaStructure));
};

export const createTeam = async (team: Omit<TeamStructure, 'id'>): Promise<void> => {
  const teamRef = doc(collection(db, 'teams'));
  await setDoc(teamRef, team);
};

export const getTeamStructure = async (teamId: string): Promise<TeamStructure | null> => {
  const docRef = doc(db, 'teams', teamId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: teamId, ...docSnap.data() } as TeamStructure : null;
};

// פונקציות עזר להרשאות
export const canUserAssignRoles = (user: User): boolean => {
  return user.canAssignRoles || 
         user.role === UserRole.ADMIN || 
         user.role === UserRole.MEFAKED_PLUGA || 
         user.role === UserRole.SAMAL_PLUGA;
};

export const canUserViewSensitiveData = (user: User): boolean => {
  return user.canViewSensitiveData || 
         user.role === UserRole.ADMIN || 
         user.role === UserRole.MEFAKED_PLUGA || 
         user.role === UserRole.SAMAL_PLUGA;
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