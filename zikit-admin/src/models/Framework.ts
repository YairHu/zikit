// מודל למסגרת ארגונית
export interface Framework {
  id: string;
  name: string; // שם המסגרת (צוות, מפלג, פלגה וכו')
  parentFrameworkId?: string; // מסגרת אב (אופציונלי)
  commanderId: string; // מפקד המסגרת
  description?: string; // תיאור המסגרת
  level: 'company' | 'platoon' | 'squad' | 'team' | 'other'; // רמת המסגרת
  isActive: boolean; // האם המסגרת פעילה
  createdAt: Date;
  updatedAt: Date;
}

// ממשק להצגת מסגרת עם מידע מורחב
export interface FrameworkWithDetails extends Framework {
  parentFramework?: Framework;
  commander?: {
    id: string;
    name: string;
    rank?: string;
  };
  childFrameworks: Framework[];
  soldiers: Array<{
    id: string;
    name: string;
    role: string;
    personalNumber: string;
    presence?: string;
    presenceUntil?: string;
  }>;
  allSoldiersInHierarchy?: Array<{
    id: string;
    name: string;
    role: string;
    personalNumber: string;
    frameworkId: string; // מחרוזת לא ריקה לאחר המיפוי בשירות
    presence?: string;
    presenceUntil?: string;
  }>;
  totalSoldiers: number; // כולל חיילים במסגרות בנות
  // פעילויות, תורנויות ונסיעות של המסגרת ומסגרות בנות
  activities?: any[]; // נשתמש ב-any כדי לתמוך במודלים המקוריים
  duties?: any[]; // נשתמש ב-any כדי לתמוך במודלים המקוריים
  trips?: any[]; // נשתמש ב-any כדי לתמוך במודלים המקוריים
  totalActivities?: number; // סה"כ פעילויות כולל מסגרות בנות
  totalDuties?: number; // סה"כ תורנויות כולל מסגרות בנות
  totalTrips?: number; // סה"כ נסיעות כולל מסגרות בנות
}

// ממשק לעץ המסגרות
export interface FrameworkTree {
  framework: Framework;
  children: FrameworkTree[];
  soldiers: Array<{
    id: string;
    name: string;
    role: string;
    personalNumber: string;
  }>;
}