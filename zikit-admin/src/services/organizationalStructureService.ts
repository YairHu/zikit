import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  query, 
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { User, PlagaStructure, TeamStructure } from '../models/User';
import { UserRole } from '../models/UserRole';

const USERS_COLLECTION = 'users';
const STRUCTURE_COLLECTION = 'plagaStructure';

// שירותי מבנה ארגוני
export const getUsersByTeam = async (teamId: string): Promise<User[]> => {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('team', '==', teamId),
    where('isActive', '==', true)
  );
  const querySnapshot = await getDocs(q);
  const users = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  
  // מיון בצד הלקוח
  return users.sort((a, b) => {
    const getRoleOrder = (role: UserRole | string): number => {
      if (typeof role === 'string') {
        // אם זה שם תפקיד - נחפש את התפקיד ברשימה
        if (role === 'admin') return 0;
        if (role === 'chayal') return 1;
        return 2; // תפקידים אחרים
      }
      
      // אם זה UserRole enum - נחזיר ברירת מחדל
      return 2;
    };
    
    return getRoleOrder(b.role) - getRoleOrder(a.role);
  });
};

export const getSubordinates = async (commanderUid: string): Promise<User[]> => {
  const commanderDoc = await getDoc(doc(db, USERS_COLLECTION, commanderUid));
  if (!commanderDoc.exists()) return [];
  
  const commander = commanderDoc.data() as User;
  if (!commander.subordinatesUids) return [];
  
  const subordinates: User[] = [];
  for (const uid of commander.subordinatesUids) {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (userDoc.exists()) {
      subordinates.push({ uid, ...userDoc.data() } as User);
    }
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