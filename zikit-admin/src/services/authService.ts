import { 
  User as FirebaseUser, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User } from '../models/User';
import { UserRole } from '../models/UserRole';

// משתמשים עם הרשאות מיוחדות (ידוע מראש)
const ADMIN_EMAILS = [
  'yair.hutterer@gmail.com',
  // ניתן להוסיף עוד מיילים של מנהלים
];

// פונקציה לכניסה עם Google
export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const userData = await initializeUser(result.user);
    return userData;
  } catch (error) {
    console.error('שגיאה בהתחברות:', error);
    throw error;
  }
};

// פונקציה להתנתקות
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('שגיאה בהתנתקות:', error);
    throw error;
  }
};

// פונקציה לאתחול משתמש (יצירה או עדכון)
export const initializeUser = async (firebaseUser: FirebaseUser): Promise<User> => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userDoc = await getDoc(userRef);
  
  let userData: User;
  
  if (!userDoc.exists()) {
    // משתמש חדש - צור רשומה
    userData = await createNewUser(firebaseUser);
  } else {
    // משתמש קיים - עדכן lastLogin
    userData = userDoc.data() as User;
    const updatedData = {
      ...userData,
      lastLogin: new Date(),
      updatedAt: new Date()
    };
    await setDoc(userRef, updatedData, { merge: true });
    userData = updatedData;
  }
  
  return userData;
};

// פונקציה ליצירת משתמש חדש
const createNewUser = async (firebaseUser: FirebaseUser): Promise<User> => {
  const isAdmin = ADMIN_EMAILS.includes(firebaseUser.email || '');
  
  const userData: User = {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || 'משתמש',
    email: firebaseUser.email || '',
    role: isAdmin ? UserRole.ADMIN : UserRole.CHAYAL,
    
    // הרשאות מיוחדות למנהלים
    canAssignRoles: isAdmin,
    canViewSensitiveData: isAdmin,
    
    // מטאדטה
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
    isActive: true
  };
  
  // שמור במסד הנתונים
  const userRef = doc(db, 'users', firebaseUser.uid);
  await setDoc(userRef, userData);
  
  console.log(`משתמש חדש נוצר: ${userData.displayName} (${userData.role})`);
  
  return userData;
};

// פונקציה לקבלת המשתמש הנוכחי מה-DB
export const getCurrentUser = async (uid: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { uid, ...userDoc.data() } as User;
    }
    return null;
  } catch (error) {
    console.error('שגיאה בקבלת פרטי משתמש:', error);
    return null;
  }
};

// פונקציה לעדכון הרשאות משתמש
export const updateUserPermissions = async (
  uid: string, 
  permissions: { canAssignRoles?: boolean; canViewSensitiveData?: boolean }
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    ...permissions,
    updatedAt: new Date()
  }, { merge: true });
};

// פונקציה להאזנה לשינויי אימות
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userData = await initializeUser(firebaseUser);
        callback(userData);
      } catch (error) {
        console.error('שגיאה באתחול משתמש:', error);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}; 