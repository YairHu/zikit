import { 
  User as FirebaseUser, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs, updateDoc } from 'firebase/firestore';
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
    
    // בדיקה אם יש נתוני חייל ממתינים לאימייל הזה
    await checkForPendingSoldierData(firebaseUser.email || '');
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

// פונקציה לבדיקת נתוני חייל ממתינים
const checkForPendingSoldierData = async (email: string) => {
  try {
    const soldiersQuery = query(
      collection(db, 'soldiers'),
      where('email', '==', email),
      where('status', '==', 'pending_user_link')
    );
    
    const soldiersSnapshot = await getDocs(soldiersQuery);
    
    if (!soldiersSnapshot.empty) {
      const soldierDoc = soldiersSnapshot.docs[0];
      const soldierData = soldierDoc.data();
      
      // קבלת המשתמש הנוכחי
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        
        // עדכון רשומת החייל עם UID של המשתמש
        await updateDoc(doc(db, 'soldiers', soldierDoc.id), {
          userUid: userDoc.id,
          status: 'pending_assignment',
          updatedAt: new Date()
        });

        // עדכון רשומת המשתמש עם קישור לחייל
        const updateData: any = {
          soldierDocId: soldierDoc.id,
          personalNumber: soldierData.personalNumber,
          updatedAt: new Date()
        };
        
        // עדכן את השם אם הוא ריק או אם יש שם חדש מהטופס
        if (!userDoc.data().displayName || userDoc.data().displayName === '') {
          updateData.displayName = soldierData.fullName;
          console.log(`Updating displayName for user ${userDoc.id}: ${soldierData.fullName}`);
        } else {
          console.log(`User ${userDoc.id} already has displayName: ${userDoc.data().displayName}`);
        }
        
        await updateDoc(doc(db, 'users', userDoc.id), updateData);
      }

      console.log(`Linked pending soldier data for user: ${email}`);
    }
  } catch (error) {
    console.error('שגיאה בבדיקת נתוני חייל ממתינים:', error);
  }
};

// פונקציה ליצירת משתמש חדש
const createNewUser = async (firebaseUser: FirebaseUser): Promise<User> => {
  const isAdmin = ADMIN_EMAILS.includes(firebaseUser.email || '');
  
  const userData: User = {
    uid: firebaseUser.uid,
    displayName: '', // השם ייקלט בטופס Google Forms
    email: firebaseUser.email || '',
    role: isAdmin ? 'admin' : 'טרם הוזנו פרטים',
    
    // הרשאות מיוחדות למנהלים
    canAssignRoles: isAdmin,
    canViewSensitiveData: isAdmin,
    canRemoveUsers: isAdmin, // הוספת הרשאה להסרת משתמשים
    
    // מטאדטה
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
    isActive: true
  };
  
  // שמור במסד הנתונים
  const userRef = doc(db, 'users', firebaseUser.uid);
  await setDoc(userRef, userData);
  
  // הערה: Custom Claims יועדכנו בעת הצורך דרך Cloud Functions
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