import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  DEFAULT_SOLDIER_POLICY, 
  DEFAULT_FRAMEWORK_COMMANDER_POLICY, 
  ADMIN_POLICY 
} from '../models/PermissionPolicy';

const PERMISSION_POLICIES_COLLECTION = 'permissionPolicies';

/**
 * יוצר את מדיניויות ברירת המחדל ב-Firebase
 */
export const createDefaultPolicies = async (): Promise<void> => {
  try {
    console.log('מתחיל יצירת מדיניויות ברירת מחדל...');

    // בודק אם המדיניויות כבר קיימות
    const existingPolicies = await getDocs(
      query(
        collection(db, PERMISSION_POLICIES_COLLECTION),
        where('tags.type', '==', 'default')
      )
    );

    if (!existingPolicies.empty) {
      console.log('מדיניויות ברירת מחדל כבר קיימות במערכת');
      return;
    }

    // יוצר את המדיניויות (ללא ID כדי ש-Firebase ייצור אוטומטית)
    const policiesToCreate = [
      {
        name: DEFAULT_SOLDIER_POLICY.name,
        description: DEFAULT_SOLDIER_POLICY.description,
        version: DEFAULT_SOLDIER_POLICY.version,
        Statement: DEFAULT_SOLDIER_POLICY.Statement,
        createdBy: 'system',
        isActive: DEFAULT_SOLDIER_POLICY.isActive,
        tags: DEFAULT_SOLDIER_POLICY.tags,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: DEFAULT_FRAMEWORK_COMMANDER_POLICY.name,
        description: DEFAULT_FRAMEWORK_COMMANDER_POLICY.description,
        version: DEFAULT_FRAMEWORK_COMMANDER_POLICY.version,
        Statement: DEFAULT_FRAMEWORK_COMMANDER_POLICY.Statement,
        createdBy: 'system',
        isActive: DEFAULT_FRAMEWORK_COMMANDER_POLICY.isActive,
        tags: DEFAULT_FRAMEWORK_COMMANDER_POLICY.tags,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: ADMIN_POLICY.name,
        description: ADMIN_POLICY.description,
        version: ADMIN_POLICY.version,
        Statement: ADMIN_POLICY.Statement,
        createdBy: 'system',
        isActive: ADMIN_POLICY.isActive,
        tags: ADMIN_POLICY.tags,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }
    ];

    // מוסיף כל מדיניות ל-Firebase
    for (const policy of policiesToCreate) {
      await addDoc(collection(db, PERMISSION_POLICIES_COLLECTION), policy);
      console.log(`נוצרה מדיניות: ${policy.name}`);
    }

    console.log('כל מדיניויות ברירת המחדל נוצרו בהצלחה!');
  } catch (error) {
    console.error('שגיאה ביצירת מדיניויות ברירת מחדל:', error);
    throw error;
  }
};

/**
 * פונקציה שניתן לקרוא לה מהדפדפן
 */
(window as any).createDefaultPolicies = createDefaultPolicies;
