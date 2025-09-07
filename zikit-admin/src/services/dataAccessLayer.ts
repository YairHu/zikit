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
  Timestamp,
  onSnapshot,
  DocumentData,
  QueryConstraint,
  WriteBatch,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { localStorageService, updateTableTimestamp } from './cacheService';

// טיפוסים בסיסיים
export interface BaseEntity {
  id: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface QueryOptions {
  where?: { field: string; operator: any; value: any }[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
}

export interface CacheOptions {
  useCache?: boolean;
  cacheKey?: string;
  invalidateAfter?: boolean;
}

// מחלקת שכבת הגישה המרכזית
export class DataAccessLayer {
  private static instance: DataAccessLayer;
  
  // Singleton pattern
  public static getInstance(): DataAccessLayer {
    if (!DataAccessLayer.instance) {
      DataAccessLayer.instance = new DataAccessLayer();
    }
    return DataAccessLayer.instance;
  }

  // קריאת כל המסמכים מקולקציה
  async getAll<T extends BaseEntity>(
    collectionName: string,
    options: QueryOptions = {},
    cacheOptions: CacheOptions = { useCache: true }
  ): Promise<T[]> {
    const { useCache = true, cacheKey, invalidateAfter = false } = cacheOptions;
    const finalCacheKey = cacheKey || collectionName;


    if (useCache) {
      return localStorageService.getFromLocalStorage(finalCacheKey, async () => {
        return this.fetchFromFirestore<T>(collectionName, options);
      }, undefined, invalidateAfter);
    } else {
      return this.fetchFromFirestore<T>(collectionName, options);
    }
  }

  // קריאת מסמך בודד לפי ID
  async getById<T extends BaseEntity>(
    collectionName: string,
    id: string,
    cacheOptions: CacheOptions = { useCache: false }
  ): Promise<T | null> {

    try {
      if (cacheOptions.useCache) {
        // בדוק במטמון קודם
        const cached = await this.getAll<T>(collectionName, {}, cacheOptions);
        const found = cached.find(item => item.id === id);
        if (found) {
          return found;
        }
      }

      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as T;
        return data;
      } else {
        return null;
      }
    } catch (error) {
      console.error(`❌ [DAL] שגיאה בטעינת ${collectionName}/${id}:`, error);
      return null;
    }
  }

  // יצירת מסמך חדש
  async create<T extends Omit<BaseEntity, 'id'>>(
    collectionName: string,
    data: T,
    cacheOptions: CacheOptions = { useCache: true, invalidateAfter: true }
  ): Promise<string> {

    try {
      const now = Timestamp.now();
      const dataWithTimestamps = {
        ...data,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await addDoc(collection(db, collectionName), dataWithTimestamps);

      // עדכון מטמון וטבלת העדכונים
      if (cacheOptions.invalidateAfter) {
        await this.invalidateCache(collectionName, cacheOptions.cacheKey);
      }

      return docRef.id;
    } catch (error) {
      console.error(`❌ [DAL] שגיאה ביצירת ${collectionName}:`, error);
      throw error;
    }
  }

  // עדכון מסמך קיים
  async update<T extends Partial<BaseEntity>>(
    collectionName: string,
    id: string,
    data: T,
    cacheOptions: CacheOptions = { useCache: true, invalidateAfter: true }
  ): Promise<void> {

    try {
      const dataWithTimestamp = {
        ...data,
        updatedAt: Timestamp.now()
      };

      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, dataWithTimestamp);

      // עדכון מטמון וטבלת העדכונים
      if (cacheOptions.invalidateAfter) {
        await this.invalidateCache(collectionName, cacheOptions.cacheKey);
      }
    } catch (error) {
      console.error(`❌ [DAL] שגיאה בעדכון ${collectionName}/${id}:`, error);
      throw error;
    }
  }

  // מחיקת מסמך
  async delete(
    collectionName: string,
    id: string,
    cacheOptions: CacheOptions = { useCache: true, invalidateAfter: true }
  ): Promise<void> {

    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);

      // עדכון מטמון וטבלת העדכונים
      if (cacheOptions.invalidateAfter) {
        await this.invalidateCache(collectionName, cacheOptions.cacheKey);
      }
    } catch (error) {
      console.error(`❌ [DAL] שגיאה במחיקת ${collectionName}/${id}:`, error);
      throw error;
    }
  }

  // שאילתת מסמכים עם תנאים
  async query<T extends BaseEntity>(
    collectionName: string,
    options: QueryOptions,
    cacheOptions: CacheOptions = { useCache: false }
  ): Promise<T[]> {

    if (cacheOptions.useCache && !options.where && !options.orderBy) {
      // אם זו שאילתה פשוטה, השתמש במטמון
      return this.getAll<T>(collectionName, options, cacheOptions);
    }

    return this.fetchFromFirestore<T>(collectionName, options);
  }

  // הוספת מאזין לעדכונים בזמן אמת
  addRealtimeListener<T extends BaseEntity>(
    collectionName: string,
    callback: (data: T[]) => void,
    options: QueryOptions = {}
  ): () => void {

    const q = this.buildQuery(collectionName, options);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      
      callback(data);
    }, (error) => {
      console.error(`❌ [DAL] שגיאה במאזין ${collectionName}:`, error);
    });

    return unsubscribe;
  }

  // ביצוע פעולות batch
  async batchOperation(operations: Array<{
    type: 'create' | 'update' | 'delete';
    collectionName: string;
    id?: string;
    data?: any;
  }>): Promise<void> {

    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();

      operations.forEach(operation => {
        switch (operation.type) {
          case 'create':
            if (operation.data) {
              const docRef = doc(collection(db, operation.collectionName));
              batch.set(docRef, {
                ...operation.data,
                createdAt: now,
                updatedAt: now
              });
            }
            break;

          case 'update':
            if (operation.id && operation.data) {
              const docRef = doc(db, operation.collectionName, operation.id);
              batch.update(docRef, {
                ...operation.data,
                updatedAt: now
              });
            }
            break;

          case 'delete':
            if (operation.id) {
              const docRef = doc(db, operation.collectionName, operation.id);
              batch.delete(docRef);
            }
            break;
        }
      });

      await batch.commit();

      // עדכון מטמון לכל הקולקציות המעורבות
      const collectionNames = operations.map(op => op.collectionName);
      const affectedCollections = Array.from(new Set(collectionNames));
      await Promise.all(affectedCollections.map(collection => 
        this.invalidateCache(collection)
      ));

    } catch (error) {
      console.error(`❌ [DAL] שגיאה בפעולות batch:`, error);
      throw error;
    }
  }

  // פונקציות עזר פרטיות
  private async fetchFromFirestore<T extends BaseEntity>(
    collectionName: string,
    options: QueryOptions = {}
  ): Promise<T[]> {
    try {
      
      const q = this.buildQuery(collectionName, options);
      const querySnapshot = await getDocs(q);
      
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      
      return data;
    } catch (error: any) {
      // אם השגיאה היא חוסר אינדקס ויש orderBy ו-where יחד
      if (error?.code === 'failed-precondition' && 
          error?.message?.includes('index') && 
          options.where && options.orderBy) {
        
        
        try {
          // נסה שוב בלי orderBy
          const fallbackOptions = { ...options };
          delete fallbackOptions.orderBy;
          
          const fallbackQuery = this.buildQuery(collectionName, fallbackOptions);
          const querySnapshot = await getDocs(fallbackQuery);
          
          let data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as T[];
          
          // מיון בצד הלקוח אם יש orderBy
          if (options.orderBy) {
            data = this.sortDataOnClient(data, options.orderBy);
          }
          
          return data;
        } catch (fallbackError) {
          console.error(`❌ [DAL] גם שאילתת הגיבוי נכשלה עבור ${collectionName}:`, fallbackError);
          return [];
        }
      }
      
      console.error(`❌ [DAL] שגיאה בטעינת ${collectionName}:`, error);
      return [];
    }
  }

  private buildQuery(collectionName: string, options: QueryOptions) {
    const constraints: QueryConstraint[] = [];
    
    // הוספת תנאי where
    if (options.where) {
      options.where.forEach(condition => {
        constraints.push(where(condition.field, condition.operator, condition.value));
      });
    }
    
    // הוספת מיון
    if (options.orderBy) {
      options.orderBy.forEach(order => {
        constraints.push(orderBy(order.field, order.direction));
      });
    }
    
    return query(collection(db, collectionName), ...constraints);
  }

  private sortDataOnClient<T extends BaseEntity>(
    data: T[],
    orderBy: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): T[] {
    return data.sort((a, b) => {
      for (const order of orderBy) {
        const aValue = (a as any)[order.field];
        const bValue = (b as any)[order.field];
        
        let comparison = 0;
        if (aValue < bValue) {
          comparison = -1;
        } else if (aValue > bValue) {
          comparison = 1;
        }
        
        if (comparison !== 0) {
          return order.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  private async invalidateCache(collectionName: string, cacheKey?: string): Promise<void> {
    const finalCacheKey = cacheKey || collectionName;
    
    // עדכון טבלת העדכונים
    await updateTableTimestamp(collectionName);
    
    // אפס מטמון
    localStorageService.invalidateLocalStorage(finalCacheKey);
    
  }
}

// יצירת מופע יחיד
export const dataLayer = DataAccessLayer.getInstance();
