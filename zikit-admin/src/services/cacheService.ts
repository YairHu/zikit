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
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';

// טיפוסים למטמון מקומי
export interface LocalStorageEntry<T> {
  data: T[];
  lastUpdated: Date;
  isStale: boolean;
}

export interface TableUpdate {
  id: string;
  tableName: string;
  lastUpdated: Timestamp;
}

export interface LocalStorageConfig {
  maxAge: number; // זמן חיים במספר שניות
  refreshThreshold: number; // זמן לפני שפג תוקף שמתחילים לרענן
}

// הגדרות ברירת מחדל למטמון מקומי
const DEFAULT_LOCAL_STORAGE_CONFIG: LocalStorageConfig = {
  maxAge: 604800, // שבוע (7 ימים * 24 שעות * 60 דקות * 60 שניות)
  refreshThreshold: 86400 // יום לפני שפג תוקף
};

class LocalStorageService {
  private storage: Map<string, LocalStorageEntry<any>> = new Map();
  private config: LocalStorageConfig = DEFAULT_LOCAL_STORAGE_CONFIG;
  private updateListeners: Map<string, () => void> = new Map();
  private lastKnownUpdates: Map<string, Date> = new Map(); // לעקוב אחרי עדכונים ידועים
  private readonly STORAGE_KEY = 'zikit_local_storage';
  private tableUpdatesListener: (() => void) | null = null; // Added for listener management
  private isInitializingListeners: boolean = false; // דגל למניעת יצירת listeners מרובים
  private static listenersInitialized: boolean = false; // דגל גלובלי למניעת יצירת listeners מרובים
  private performanceMetrics: Map<string, { hits: number; misses: number; lastAccess: Date }> = new Map();

  constructor() {
    this.loadFromStorage();
    this.loadLastKnownUpdates();
    // לא נאתחל listeners מיד - רק כשצריך
  }

  // טעינת מטמון מקומי מ-localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.storage.clear();
        
        // המרת התאריכים חזרה לאובייקטי Date
        Object.entries(data).forEach(([key, entry]: [string, any]) => {
          this.storage.set(key, {
            data: entry.data,
            lastUpdated: new Date(entry.lastUpdated),
            isStale: entry.isStale
          });
        });
      }
    } catch (error) {
      console.warn('⚠️ [LOCAL_STORAGE] שגיאה בטעינת מטמון מקומי:', error);
      // אם יש שגיאה, נמחק את הנתונים השמורים ונתחיל מחדש
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  // שמירת מטמון מקומי ל-localStorage
  private saveToStorage(): void {
    try {
      const data: Record<string, any> = {};
      this.storage.forEach((entry, key) => {
        data[key] = {
          data: entry.data,
          lastUpdated: entry.lastUpdated.toISOString(),
          isStale: entry.isStale
        };
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ [LOCAL_STORAGE] שגיאה בשמירת מטמון מקומי:', error);
    }
  }

  // טעינת זמני העדכונים האחרונים הידועים
  private async loadLastKnownUpdates(): Promise<void> {
    try {
      // בדיקה פנימית אם טבלת העדכונים קיימת
      const updatesRef = collection(db, 'tableUpdates');
      const snapshot = await getDocs(updatesRef);
      
      if (!snapshot.empty) {
        // טוען את כל העדכונים הקיימים
        snapshot.docs.forEach(doc => {
          const data = doc.data() as TableUpdate;
          this.lastKnownUpdates.set(data.tableName, data.lastUpdated.toDate());
        });
      }
    } catch (error) {
      console.warn('⚠️ [LOCAL_STORAGE] שגיאה בטעינת זמני עדכונים אחרונים:', error);
    }
  }

  // אתחול מאזינים לשינויים בטבלת העדכונים
  public initializeUpdateListeners() {
    try {
      // אם כבר יש listener פעיל, אל תיצור חדש
      if (this.tableUpdatesListener) {
        return;
      }

      const updatesRef = collection(db, 'tableUpdates');
      
      this.tableUpdatesListener = onSnapshot(updatesRef, (snapshot) => {
        const changes = snapshot.docChanges();
        
        let hasNewUpdates = false;
        changes.forEach((change) => {
          if (change.type === 'modified' || change.type === 'added') {
            const updateData = change.doc.data() as TableUpdate;
            const tableName = updateData.tableName;
            const newUpdateTime = updateData.lastUpdated.toDate();
            
            // בדוק אם זה באמת עדכון חדש
            const lastKnownUpdate = this.lastKnownUpdates.get(tableName);
            
            if (!lastKnownUpdate || newUpdateTime > lastKnownUpdate) {
              this.lastKnownUpdates.set(tableName, newUpdateTime);
              this.markTableAsStale(tableName);
              hasNewUpdates = true;
            }
          }
        });
      }, (error) => {
        console.warn('⚠️ [LOCAL_STORAGE] שגיאה בהאזנה לטבלת עדכונים:', error.message);
        // סגור את ה-listener הנוכחי ונסה שוב אחרי כמה שניות
        if (this.tableUpdatesListener) {
          this.tableUpdatesListener();
          this.tableUpdatesListener = null;
        }
        setTimeout(() => {
          this.initializeUpdateListeners();
        }, 5000);
      });
    } catch (error) {
      console.warn('⚠️ [LOCAL_STORAGE] שגיאה באתחול מאזינים:', error);
    }
  }

  // סימון טבלה כלא מעודכנת
  private markTableAsStale(tableName: string) {
    const storageKey = this.getStorageKey(tableName);
    const entry = this.storage.get(storageKey);
    
    if (entry) {
      entry.isStale = true;
      
      // שמור ל-localStorage
      this.saveToStorage();
    }
  }

  // יצירת מפתח מטמון מקומי
  private getStorageKey(tableName: string, userId?: string): string {
    return userId ? `${tableName}_${userId}` : tableName;
  }

  // בדיקה האם המטמון המקומי תקף
  private isStorageValid(entry: LocalStorageEntry<any>): boolean {
    if (entry.isStale) {
      return false;
    }

    const now = new Date();
    const age = (now.getTime() - entry.lastUpdated.getTime()) / 1000;
    return age < this.config.maxAge;
  }

  // קבלת נתונים מהמטמון המקומי
  async getFromLocalStorage<T>(
    tableName: string, 
    fetchFunction: () => Promise<T[]>,
    userId?: string,
    forceRefresh: boolean = false
  ): Promise<T[]> {
    // לא יוצרים listeners כאן - הם נוצרים בזמן אתחול האפליקציה
    
    const storageKey = this.getStorageKey(tableName, userId);
    const entry = this.storage.get(storageKey);

    // עדכון מטריקות ביצועים
    this.updatePerformanceMetrics(storageKey, entry ? 'hit' : 'miss');

    // אם יש כפיית רענון או המטמון לא תקף
    if (forceRefresh || !entry || !this.isStorageValid(entry)) {
      
      // טען מהשרת
      const data = await fetchFunction();
      
      // שמור במטמון מקומי
      this.storage.set(storageKey, {
        data,
        lastUpdated: new Date(),
        isStale: false
      });

      // שמור ל-localStorage
      this.saveToStorage();

      return data;
    }

    return entry.data;
  }

  // עדכון מטמון מקומי ידני
  setLocalStorage<T>(tableName: string, data: T[], userId?: string): void {
    const storageKey = this.getStorageKey(tableName, userId);
    this.storage.set(storageKey, {
      data,
      lastUpdated: new Date(),
      isStale: false
    });
    
    // שמור ל-localStorage
    this.saveToStorage();
  }

      // ניקוי מטמון מקומי לטבלה ספציפית
    invalidateLocalStorage(tableName: string, userId?: string): void {
      const storageKey = this.getStorageKey(tableName, userId);
      this.storage.delete(storageKey);
      
      // שמור ל-localStorage
      this.saveToStorage();
    }

  // ניקוי כל המטמון המקומי
  clearAllLocalStorage(): void {
    this.storage.clear();
    
    // מחק מ-localStorage
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // כפיית רענון עבור טבלה ספציפית
  forceRefreshTable(tableName: string, userId?: string): void {
    const storageKey = this.getStorageKey(tableName, userId);
    const entry = this.storage.get(storageKey);
    
    if (entry) {
      entry.isStale = true;
      this.saveToStorage();
    }
  }



    // קבלת מידע על המטמון המקומי
  getLocalStorageInfo(): { tableCount: number; entries: Array<{ key: string; lastUpdated: Date; isStale: boolean }> } {
    const entries = Array.from(this.storage.entries()).map(([key, entry]) => ({
      key,
      lastUpdated: entry.lastUpdated,
      isStale: entry.isStale
    }));
    
    
    return {
      tableCount: this.storage.size,
      entries
    };
  }

  // עדכון הגדרות המטמון המקומי
  updateConfig(config: Partial<LocalStorageConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ניקוי מטמון מקומי ישן (אופציונלי)
  cleanupOldLocalStorage(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    this.storage.forEach((entry, key) => {
      const age = (now.getTime() - entry.lastUpdated.getTime()) / 1000;
      if (age > this.config.maxAge) {
        this.storage.delete(key);
        this.performanceMetrics.delete(key);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      this.saveToStorage();
    }
  }

  // עדכון מטריקות ביצועים
  private updatePerformanceMetrics(key: string, type: 'hit' | 'miss'): void {
    const metrics = this.performanceMetrics.get(key) || { hits: 0, misses: 0, lastAccess: new Date() };
    
    if (type === 'hit') {
      metrics.hits++;
    } else {
      metrics.misses++;
    }
    
    metrics.lastAccess = new Date();
    this.performanceMetrics.set(key, metrics);
  }

  // קבלת מטריקות ביצועים
  getPerformanceMetrics(): { 
    totalRequests: number; 
    hitRate: number; 
    missRate: number; 
    byTable: Array<{ table: string; hits: number; misses: number; hitRate: number; lastAccess: Date }> 
  } {
    let totalHits = 0;
    let totalMisses = 0;
    const byTable: Array<{ table: string; hits: number; misses: number; hitRate: number; lastAccess: Date }> = [];
    
    this.performanceMetrics.forEach((metrics, key) => {
      totalHits += metrics.hits;
      totalMisses += metrics.misses;
      
      const total = metrics.hits + metrics.misses;
      const hitRate = total > 0 ? (metrics.hits / total) * 100 : 0;
      
      byTable.push({
        table: key,
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: Number(hitRate.toFixed(2)),
        lastAccess: metrics.lastAccess
      });
    });
    
    const totalRequests = totalHits + totalMisses;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (totalMisses / totalRequests) * 100 : 0;
    
    return {
      totalRequests,
      hitRate: Number(hitRate.toFixed(2)),
      missRate: Number(missRate.toFixed(2)),
      byTable: byTable.sort((a, b) => b.lastAccess.getTime() - a.lastAccess.getTime())
    };
  }

  // אפס מטריקות ביצועים
  resetPerformanceMetrics(): void {
    this.performanceMetrics.clear();
  }

  // סגירת כל ה-listeners
  cleanup(): void {
    // סגירת tableUpdates listener
    if (this.tableUpdatesListener) {
      this.tableUpdatesListener();
      this.tableUpdatesListener = null;
    }

    // סגירת update listeners
    this.updateListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.updateListeners.clear();
    
    // ניקוי דגלים
    LocalStorageService.listenersInitialized = false;
    this.isInitializingListeners = false;
  }
}

// יצירת מופע יחיד של שירות המטמון המקומי
export const localStorageService = new LocalStorageService();

// פונקציות עזר לעדכון טבלת העדכונים
export const updateTableTimestamp = async (tableName: string): Promise<void> => {
  try {
    const updatesRef = collection(db, 'tableUpdates');
    const now = Timestamp.now();
    
    // בדוק אם יש כבר רשומה לטבלה זו
    const q = query(updatesRef, where('tableName', '==', tableName));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // יצירת רשומה חדשה
      await addDoc(updatesRef, {
        tableName,
        lastUpdated: now
      });
    } else {
      // עדכון רשומה קיימת
      const docRef = doc(db, 'tableUpdates', snapshot.docs[0].id);
      await updateDoc(docRef, {
        lastUpdated: now
      });
    }
    
    // עדכון גם במטמון המקומי כדי למנוע סימון שגוי כ"לא מעודכן"
    localStorageService['lastKnownUpdates'].set(tableName, now.toDate());
    
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.warn(`⚠️ [LOCAL_STORAGE] אין הרשאות לעדכון זמן עבור טבלה ${tableName} - ייתכן שהמשתמש לא מחובר`);
    } else {
      console.error(`❌ [LOCAL_STORAGE] שגיאה בעדכון זמן טבלה ${tableName}:`, error.message);
    }
  }
};

// פונקציה לבדיקת מצב טבלת העדכונים
export const checkTableUpdatesStatus = async (): Promise<{
  exists: boolean;
  tableCount: number;
  tables: string[];
}> => {
  try {
    const updatesRef = collection(db, 'tableUpdates');
    const snapshot = await getDocs(updatesRef);
    
    const tables = snapshot.docs.map(doc => doc.data().tableName);
    
    return {
      exists: true,
      tableCount: tables.length,
      tables
    };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.log('⚠️ [CACHE] אין הרשאות לטבלת העדכונים - ייתכן שהמשתמש לא מחובר');
    } else {
      console.log('⚠️ [CACHE] טבלת העדכונים לא קיימת או שגיאה אחרת:', error.message);
    }
    return {
      exists: false,
      tableCount: 0,
      tables: []
    };
  }
};

// פונקציה ליצירת כל הרשומות בטבלת העדכונים
export const initializeTableUpdates = async (): Promise<void> => {
  try {
    
    const tables = [
      'soldiers',
      'frameworks', 
      'missions',
      'activities',
      'duties',
      'trips',
      'users',
      'roles',
      'permissionPolicies',
      'vehicles',
      'drivers',
      'forms',
      'referrals'
    ];

    const updatesRef = collection(db, 'tableUpdates');
    
    // בדוק אם הקולקציה קיימת על ידי ניסיון לקרוא ממנה
    try {
      const testQuery = query(updatesRef, where('tableName', '==', 'test'));
      await getDocs(testQuery);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.log('⚠️ [CACHE] אין הרשאות לטבלת העדכונים - ייתכן שהמשתמש לא מחובר');
        return; // נצא מהפונקציה אם אין הרשאות
      } else {
      }
    }
    
    for (const tableName of tables) {
      try {
        // בדוק אם יש כבר רשומה
        const q = query(updatesRef, where('tableName', '==', tableName));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          await addDoc(updatesRef, {
            tableName,
            lastUpdated: Timestamp.now()
          });
        }
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          console.log(`⚠️ [CACHE] אין הרשאות ליצירת רשומת עדכון עבור ${tableName}`);
          break; // נצא מהלולאה אם אין הרשאות
        } else {
          console.error(`❌ [CACHE] שגיאה ביצירת רשומת עדכון עבור ${tableName}:`, error.message);
        }
      }
    }
    
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.error('❌ [CACHE] אין הרשאות לאתחול טבלת העדכונים - ייתכן שהמשתמש לא מחובר');
    } else {
      console.error('❌ [CACHE] שגיאה באתחול טבלת העדכונים:', error.message);
    }
    throw error;
  }
};
