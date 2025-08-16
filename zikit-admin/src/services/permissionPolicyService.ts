import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { PermissionPolicy, createDefaultPolicyForRole as createDefaultPolicy, createFrameworkCommanderPolicy as createFrameworkPolicy } from '../models/PermissionPolicy';
import { UserRole } from '../models/UserRole';

const PERMISSION_POLICIES_COLLECTION = 'permissionPolicies';

/**
 * מקבל את כל מדיניויות ההרשאות
 */
export const getAllPermissionPolicies = async (): Promise<PermissionPolicy[]> => {
  try {
    const q = query(
      collection(db, PERMISSION_POLICIES_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const policies: PermissionPolicy[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      policies.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as PermissionPolicy);
    });
    
    return policies;
  } catch (error) {
    console.error('שגיאה בטעינת מדיניויות הרשאות:', error);
    throw error;
  }
};

/**
 * מקבל מדיניות הרשאות לפי מזהה
 */
export const getPermissionPolicyById = async (policyId: string): Promise<PermissionPolicy | null> => {
  try {
    const docRef = doc(db, PERMISSION_POLICIES_COLLECTION, policyId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as PermissionPolicy;
    }
    
    return null;
  } catch (error) {
    console.error('שגיאה בטעינת מדיניות הרשאות:', error);
    throw error;
  }
};

/**
 * יוצר מדיניות הרשאות חדשה
 */
export const createPermissionPolicy = async (policy: Omit<PermissionPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const policyData = {
      ...policy,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(db, PERMISSION_POLICIES_COLLECTION), policyData);
    return docRef.id;
  } catch (error) {
    console.error('שגיאה ביצירת מדיניות הרשאות:', error);
    throw error;
  }
};

/**
 * מעדכן מדיניות הרשאות קיימת
 */
export const updatePermissionPolicy = async (policyId: string, updates: Partial<PermissionPolicy>): Promise<void> => {
  try {
    const docRef = doc(db, PERMISSION_POLICIES_COLLECTION, policyId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('שגיאה בעדכון מדיניות הרשאות:', error);
    throw error;
  }
};

/**
 * מוחק מדיניות הרשאות
 */
export const deletePermissionPolicy = async (policyId: string): Promise<void> => {
  try {
    const docRef = doc(db, PERMISSION_POLICIES_COLLECTION, policyId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('שגיאה במחיקת מדיניות הרשאות:', error);
    throw error;
  }
};

/**
 * מקבל מדיניויות לפי תפקיד
 */
export const getPoliciesByRole = async (role: UserRole): Promise<PermissionPolicy[]> => {
  try {
    const q = query(
      collection(db, PERMISSION_POLICIES_COLLECTION),
      where('tags.role', '==', role),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const policies: PermissionPolicy[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      policies.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as PermissionPolicy);
    });
    
    return policies;
  } catch (error) {
    console.error('שגיאה בטעינת מדיניויות לפי תפקיד:', error);
    throw error;
  }
};

/**
 * מקבל מדיניויות לפי סוג
 */
export const getPoliciesByType = async (type: string): Promise<PermissionPolicy[]> => {
  try {
    const q = query(
      collection(db, PERMISSION_POLICIES_COLLECTION),
      where('tags.type', '==', type),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const policies: PermissionPolicy[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      policies.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as PermissionPolicy);
    });
    
    return policies;
  } catch (error) {
    console.error('שגיאה בטעינת מדיניויות לפי סוג:', error);
    throw error;
  }
};

/**
 * יוצר מדיניות ברירת מחדל לתפקיד
 */
export const createDefaultPolicyForRole = async (role: UserRole, createdBy: string): Promise<string> => {
  try {
    const defaultPolicy = createDefaultPolicy(role);
    defaultPolicy.createdBy = createdBy;
    
    return await createPermissionPolicy(defaultPolicy);
  } catch (error) {
    console.error('שגיאה ביצירת מדיניות ברירת מחדל:', error);
    throw error;
  }
};

/**
 * יוצר מדיניות למפקד מסגרת
 */
export const createFrameworkCommanderPolicy = async (frameworkId: string, createdBy: string): Promise<string> => {
  try {
    const policy = createFrameworkPolicy(frameworkId);
    policy.createdBy = createdBy;
    
    return await createPermissionPolicy(policy);
  } catch (error) {
    console.error('שגיאה ביצירת מדיניות מפקד מסגרת:', error);
    throw error;
  }
};

/**
 * מקבל מדיניויות של משתמש
 */
export const getUserPolicies = async (userPolicyIds: string[]): Promise<PermissionPolicy[]> => {
  try {
    if (!userPolicyIds || userPolicyIds.length === 0) {
      return [];
    }
    
    const policies: PermissionPolicy[] = [];
    
    for (const policyId of userPolicyIds) {
      const policy = await getPermissionPolicyById(policyId);
      if (policy) {
        policies.push(policy);
      }
    }
    
    return policies;
  } catch (error) {
    console.error('שגיאה בטעינת מדיניויות משתמש:', error);
    throw error;
  }
};

/**
 * מוסיף מדיניות למשתמש
 */
export const addPolicyToUser = async (userId: string, policyId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentPolicies = userData.permissionPolicies || [];
      
      if (!currentPolicies.includes(policyId)) {
        await updateDoc(userRef, {
          permissionPolicies: [...currentPolicies, policyId],
          updatedAt: Timestamp.now(),
        });
      }
    }
  } catch (error) {
    console.error('שגיאה בהוספת מדיניות למשתמש:', error);
    throw error;
  }
};

/**
 * מסיר מדיניות ממשתמש
 */
export const removePolicyFromUser = async (userId: string, policyId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentPolicies = userData.permissionPolicies || [];
      
      const updatedPolicies = currentPolicies.filter((id: string) => id !== policyId);
      
      await updateDoc(userRef, {
        permissionPolicies: updatedPolicies,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('שגיאה בהסרת מדיניות ממשתמש:', error);
    throw error;
  }
};

/**
 * בודק אם מדיניות קיימת
 */
export const policyExists = async (policyId: string): Promise<boolean> => {
  try {
    const policy = await getPermissionPolicyById(policyId);
    return policy !== null;
  } catch (error) {
    console.error('שגיאה בבדיקת קיום מדיניות:', error);
    return false;
  }
};
