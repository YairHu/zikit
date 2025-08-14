import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface PendingData {
  id: string;
  email: string;
  fullName: string;
  personalNumber: string;
  phone: string;
  birthDate: string;
  address: string;
  medicalProfile: string;
  militaryBackground: string;
  additionalInfo: string;
  formSubmittedAt: any;
  status: string;
  userUid?: string;
  type: 'form_data' | 'user_data';
}

// פונקציה לטעינת כל הנתונים הממתינים לקישור
export const getPendingData = async (): Promise<PendingData[]> => {
  try {
    // טעינת נתונים מטופס גוגל (חיילים ממתינים)
    const soldiersQuery = query(
      collection(db, 'soldiers'),
      where('status', 'in', ['pending_assignment', 'pending_user_link'])
    );
    const soldiersSnapshot = await getDocs(soldiersQuery);
    
    const formData: PendingData[] = soldiersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'form_data'
    } as PendingData));

    // טעינת משתמשים ללא נתונים מקושרים
    const usersQuery = query(
      collection(db, 'users'),
      where('soldierDocId', '==', null)
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    const userData: PendingData[] = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      email: doc.data().email,
      fullName: doc.data().displayName,
      personalNumber: doc.data().personalNumber || '',
      type: 'user_data',
      status: 'pending_data_link',
      formSubmittedAt: doc.data().createdAt
    } as PendingData));

    // מיזוג הנתונים ומיון לפי תאריך
    const allData = [...formData, ...userData].sort((a, b) => {
      const aTime = a.formSubmittedAt?.seconds || 0;
      const bTime = b.formSubmittedAt?.seconds || 0;
      return bTime - aTime;
    });

    return allData;
  } catch (error) {
    console.error('שגיאה בטעינת נתונים ממתינים:', error);
    throw error;
  }
};

// פונקציה לקישור ידני של נתונים
export const linkDataManually = async (
  dataType: 'form_data' | 'user_data',
  dataId: string,
  targetEmail: string
): Promise<boolean> => {
  try {
    if (dataType === 'form_data') {
      // קישור נתוני טופס למשתמש קיים
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', targetEmail)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        
        // עדכון רשומת החייל עם UID של המשתמש
        await updateDoc(doc(db, 'soldiers', dataId), {
          userUid: userDoc.id,
          status: 'pending_assignment',
          updatedAt: Timestamp.now()
        });

        // עדכון רשומת המשתמש עם קישור לחייל
        await updateDoc(doc(db, 'users', userDoc.id), {
          soldierDocId: dataId,
          personalNumber: (await getDocs(query(collection(db, 'soldiers'), where('__name__', '==', dataId)))).docs[0]?.data()?.personalNumber || '',
          updatedAt: Timestamp.now()
        });

        return true;
      } else {
        throw new Error('לא נמצא משתמש עם האימייל הזה');
      }
    } else {
      // קישור משתמש לנתוני טופס קיימים
      const soldiersQuery = query(
        collection(db, 'soldiers'),
        where('email', '==', targetEmail)
      );
      const soldiersSnapshot = await getDocs(soldiersQuery);
      
      if (!soldiersSnapshot.empty) {
        const soldierDoc = soldiersSnapshot.docs[0];
        const soldierData = soldierDoc.data();
        
        // עדכון רשומת החייל עם UID של המשתמש
        await updateDoc(doc(db, 'soldiers', soldierDoc.id), {
          userUid: dataId,
          status: 'pending_assignment',
          updatedAt: Timestamp.now()
        });

        // עדכון רשומת המשתמש עם קישור לחייל
        await updateDoc(doc(db, 'users', dataId), {
          soldierDocId: soldierDoc.id,
          personalNumber: soldierData.personalNumber,
          updatedAt: Timestamp.now()
        });

        return true;
      } else {
        throw new Error('לא נמצאו נתוני טופס עם האימייל הזה');
      }
    }
  } catch (error) {
    console.error('שגיאה בקישור נתונים:', error);
    throw error;
  }
};

// פונקציה לבדיקת קישור אוטומטי
export const checkAutomaticLinking = async (email: string): Promise<boolean> => {
  try {
    // בדיקה אם יש נתוני חייל ממתינים לאימייל הזה
    const soldiersQuery = query(
      collection(db, 'soldiers'),
      where('email', '==', email),
      where('status', '==', 'pending_user_link')
    );
    
    const soldiersSnapshot = await getDocs(soldiersQuery);
    
    if (!soldiersSnapshot.empty) {
      const soldierDoc = soldiersSnapshot.docs[0];
      const soldierData = soldierDoc.data();
      
      // עדכון רשומת החייל עם סטטוס ממתין לשיבוץ
      await updateDoc(doc(db, 'soldiers', soldierDoc.id), {
        status: 'pending_assignment',
        updatedAt: Timestamp.now()
      });

      console.log(`Linked pending soldier data for email: ${email}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('שגיאה בבדיקת קישור אוטומטי:', error);
    return false;
  }
};

// פונקציה לקבלת סטטיסטיקות קישור
export const getLinkingStats = async () => {
  try {
    const [pendingFormData, pendingUserData, linkedData] = await Promise.all([
      getDocs(query(collection(db, 'soldiers'), where('status', '==', 'pending_user_link'))),
      getDocs(query(collection(db, 'users'), where('soldierDocId', '==', null))),
      getDocs(query(collection(db, 'soldiers'), where('status', '==', 'pending_assignment')))
    ]);

    return {
      pendingFormData: pendingFormData.size,
      pendingUserData: pendingUserData.size,
      linkedData: linkedData.size
    };
  } catch (error) {
    console.error('שגיאה בקבלת סטטיסטיקות קישור:', error);
    throw error;
  }
}; 