import { 
  User as FirebaseUser, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebase';
import { dataLayer } from './dataAccessLayer';
import { User } from '../models/User';
import { UserRole } from '../models/UserRole';
import { getCurrentIsraelTime } from '../utils/dateUtils';
import { canUserEditSoldierPresence, canUserEditSoldierDetails } from './permissionService';

// משתמשים עם הרשאות מיוחדות (ידוע מראש)
const ADMIN_EMAILS = [
  'yair.hutterer@gmail.com',
  // ניתן להוסיף עוד מיילים של מנהלים
];

// פונקציה לעדכון token עם הרשאות חדשות
export const updateUserToken = async (uid: string): Promise<void> => {
  try {
    // בדיקת הרשאות
    const canEditPresence = await canUserEditSoldierPresence(uid);
    const canEditDetails = await canUserEditSoldierDetails(uid);
    
    // עדכון ה-token (זה ייעשה דרך Cloud Functions)
    // כרגע נשמור את ההרשאות ב-localStorage כפתרון זמני
    const tokenData = {
      soldierPresenceEdit: canEditPresence,
      soldierDetailsEdit: canEditDetails,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('userPermissions', JSON.stringify(tokenData));
    
    console.log('הרשאות משתמש עודכנו:', tokenData);
  } catch (error) {
    console.error('שגיאה בעדכון הרשאות משתמש:', error);
  }
};

// פונקציה לכניסה עם Google
export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const userData = await initializeUser(result.user);
    
    // עדכון הרשאות לאחר התחברות
    await updateUserToken(result.user.uid);
    
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
  const existingUser = await dataLayer.getById('users', firebaseUser.uid) as unknown as User | null;
  
  let userData: User;
  
  if (!existingUser) {
    // משתמש חדש - צור רשומה
    userData = await createNewUser(firebaseUser);
    
    // בדיקה אם יש נתוני חייל ממתינים לאימייל הזה
    await checkForPendingSoldierData(firebaseUser.email || '');
  } else {
    // משתמש קיים - עדכן lastLogin
    const updatedData = {
      ...existingUser,
      lastLogin: getCurrentIsraelTime(),
      updatedAt: getCurrentIsraelTime()
    };
    await dataLayer.update('users', firebaseUser.uid, updatedData as any);
    userData = updatedData;
  }
  
  return userData;
};

// פונקציה לבדיקת נתוני חייל ממתינים
const checkForPendingSoldierData = async (email: string) => {
  try {
    const allSoldiers = await dataLayer.getAll('soldiers') as unknown as any[];
    const pendingSoldiers = allSoldiers.filter(soldier => 
      soldier.email === email && soldier.status === 'pending_user_link'
    );
    
    if (pendingSoldiers.length > 0) {
      const soldierData = pendingSoldiers[0];
      
      // קבלת המשתמש הנוכחי
      const allUsers = await dataLayer.getAll('users') as unknown as any[];
      const matchingUsers = allUsers.filter(user => user.email === email);
      
      if (matchingUsers.length > 0) {
        const userData = matchingUsers[0];
        
        // עדכון רשומת החייל עם UID של המשתמש
        await dataLayer.update('soldiers', soldierData.id, {
          userUid: userData.id,
          status: 'pending_assignment',
          updatedAt: getCurrentIsraelTime()
        } as any);

        // עדכון רשומת המשתמש עם קישור לחייל
        const updateData: any = {
          soldierDocId: soldierData.id,
          personalNumber: soldierData.personalNumber,
          updatedAt: getCurrentIsraelTime()
        };
        
        // עדכן את השם אם הוא ריק או אם יש שם חדש מהטופס
        if (!userData.displayName || userData.displayName === '') {
          updateData.displayName = soldierData.fullName;
          console.log(`Updating displayName for user ${userData.id}: ${soldierData.fullName}`);
        } else {
          console.log(`User ${userData.id} already has displayName: ${userData.displayName}`);
        }
        
        await dataLayer.update('users', userData.id, updateData);
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
  
  const userData = {
    uid: firebaseUser.uid,
    displayName: '', // השם ייקלט בטופס Google Forms
    email: firebaseUser.email || '',
    role: isAdmin ? 'admin' : 'טרם הוזנו פרטים',
    
    // הרשאות מיוחדות למנהלים
    canAssignRoles: isAdmin,
    canViewSensitiveData: isAdmin,
    canRemoveUsers: isAdmin, // הוספת הרשאה להסרת משתמשים
    
    // מטאדטה
    createdAt: getCurrentIsraelTime(),
    updatedAt: getCurrentIsraelTime(),
    lastLogin: getCurrentIsraelTime(),
    isActive: true
  };
  
  // שמור במסד הנתונים
  await dataLayer.create('users', userData as any);
  
  // הערה: Custom Claims יועדכנו בעת הצורך דרך Cloud Functions
  console.log(`משתמש חדש נוצר: ${userData.displayName} (${userData.role})`);
  
  return userData as User;
};

// פונקציה לקבלת המשתמש הנוכחי מה-DB
export const getCurrentUser = async (uid: string): Promise<User | null> => {
  try {
    const user = await dataLayer.getById('users', uid) as unknown as any;
    return user ? { ...user, uid } : null;
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