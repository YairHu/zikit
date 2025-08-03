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
  }>;
  totalSoldiers: number; // כולל חיילים במסגרות בנות
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