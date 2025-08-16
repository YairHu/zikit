# מערכת ההרשאות - zikit

## סקירה כללית

מערכת ההרשאות החדשה מאפשרת שליטה מדויקת בגישה לנתונים ובפעולות במערכת, בהתבסס על תפקיד המשתמש והשיוך הארגוני שלו.

## תפקידים והרשאות

### 1. חייל רגיל (CHAYAL)
- **ניווט מוגבל**: דף ראשי, התיק האישי, צוות (רק הצוות שלו), נסיעות, משימות, פעילויות, תורנויות, הפניות
- **תוכן**: רואה רק נתונים אישיים (פעילויות, משימות ונסיעות שהוא משתתף בהן)
- **פעולות**: צפייה בלבד, ללא עריכה או יצירה
- **הגבלות**: אין גישה לכוח אדם, סטטיסטיקות פעילויות, טפסים, חמ"ל, ניהול

### 2. מפקד צוות (MEFAKED_TZEVET)
- **ניווט**: כל הניווט של חייל + כוח אדם, צוותים
- **תוכן**: רואה נתוני הצוות שלו
- **פעולות**: יכול ליצור ולערוך, לא יכול למחוק
- **הגבלות**: אין גישה לסטטיסטיקות פעילויות, טפסים, חמ"ל, ניהול

### 3. סמל (SAMAL)
- **ניווט**: כמו מפקד צוות
- **תוכן**: רואה נתוני הצוות שלו
- **פעולות**: יכול ליצור ולערוך, לא יכול למחוק
- **הגבלות**: כמו מפקד צוות

### 4. מפקד חיילים (MEFAKED_CHAYAL)
- **ניווט**: כמו מפקד צוות
- **תוכן**: רואה נתוני הצוות שלו
- **פעולות**: יכול ליצור ולערוך, לא יכול למחוק
- **הגבלות**: כמו מפקד צוות

### 5. מפקד פלגה (MEFAKED_PELAGA)
- **ניווט**: כל הניווט של מפקד צוות + סטטיסטיקות פעילויות, טפסים
- **תוכן**: רואה נתוני הפלגה שלו
- **פעולות**: יכול ליצור ולערוך, לא יכול למחוק
- **הגבלות**: אין גישה לחמ"ל, ניהול

### 6. רס"פ (RASP)
- **ניווט**: כמו מפקד פלגה
- **תוכן**: רואה נתוני הפלגה שלו
- **פעולות**: יכול ליצור ולערוך, לא יכול למחוק
- **הגבלות**: כמו מפקד פלגה

### 7. סמ"פ (SAMAL_PLUGA)
- **ניווט**: כל הניווט + חמ"ל, חיילים ממתינים, קישור חיילים
- **תוכן**: רואה את כל הנתונים במערכת
- **פעולות**: יכול ליצור ולערוך, לא יכול למחוק
- **הגבלות**: אין גישה לניהול מבנה פלוגה, ניהול משתמשים, הכנסת נתונים

### 8. מ"פ (MEFAKED_PLUGA)
- **ניווט**: כל הניווט + ניהול מבנה פלוגה, חיילים ממתינים, קישור חיילים, ניהול משתמשים
- **תוכן**: רואה את כל הנתונים במערכת
- **פעולות**: יכול ליצור, לערוך ולמחוק, יכול לשבץ תפקידים
- **הגבלות**: אין גישה להכנסת נתונים

### 9. אדמין (ADMIN)
- **ניווט**: גישה מלאה לכל העמודים
- **תוכן**: רואה את כל הנתונים במערכת
- **פעולות**: יכול לבצע כל פעולה במערכת
- **הגבלות**: אין

### 10. חמ"ל (HAMAL)
- **ניווט**: כל הניווט + חמ"ל
- **תוכן**: רואה את כל הנתונים במערכת
- **פעולות**: צפייה בלבד, ללא עריכה או יצירה
- **הגבלות**: אין גישה לניהול

## מבנה ההרשאות

### 1. הרשאות ניווט (Navigation)
```typescript
navigation: {
  soldiers: boolean; // כוח אדם
  teams: boolean; // צוותים
  trips: boolean; // נסיעות ורכבים
  missions: boolean; // משימות
  activities: boolean; // פעילויות
  activityStatistics: boolean; // סטטיסטיקות פעילויות
  duties: boolean; // תורנויות
  referrals: boolean; // הפניות
  forms: boolean; // טפסים
  hamal: boolean; // מסך חמ"ל
  frameworkManagement: boolean; // ניהול מבנה פלוגה
  soldierLinking: boolean; // קישור חיילים
  userManagement: boolean; // ניהול משתמשים
  dataSeeder: boolean; // הכנסת נתונים
}
```

### 2. הרשאות תוכן (Content)
```typescript
content: {
  viewOwnDataOnly: boolean; // רואה רק נתונים אישיים
  viewTeamData: boolean; // רואה נתוני צוות
  viewPlagaData: boolean; // רואה נתוני פלגה
  viewAllData: boolean; // רואה כל הנתונים
}
```

### 3. הרשאות פעולות (Actions)
```typescript
actions: {
  canEdit: boolean; // יכול לערוך
  canDelete: boolean; // יכול למחוק
  canCreate: boolean; // יכול ליצור
  canAssignRoles: boolean; // יכול לשבץ תפקידים
  canViewSensitiveData: boolean; // יכול לראות מידע רגיש
}
```

## יישום המערכת

### 1. הגנה על נתיבים
```typescript
<ProtectedRoute requiredPermission="soldiers" userRole={user.role}>
  <Soldiers />
</ProtectedRoute>
```

### 2. סינון נתונים
```typescript
import { filterByPermissions, canViewActivity } from '../utils/permissions';

const visibleActivities = filterByPermissions(user, allActivities, canViewActivity);
```

### 3. כפתורי פעולה
```typescript
import ActionButtons from '../components/ActionButtons';

<ActionButtons
  item={activity}
  itemType="activity"
  onEdit={handleEdit}
  onDelete={handleDelete}
  compact={true}
/>
```

### 4. הצגת מידע על הרשאות
```typescript
import PermissionInfo from '../components/PermissionInfo';

<PermissionInfo showDetails={true} variant="info" />
```

## אבטחה

### 1. הגנה כפולה
- **ניווט**: הסתרת קישורים מהתפריט
- **נתיבים**: הגנה על רמת הנתיב
- **תוכן**: סינון נתונים לפי הרשאות
- **פעולות**: הסתרת כפתורי עריכה/מחיקה

### 2. בדיקות הרשאה
- כל גישה לעמוד נבדקת מול הרשאות המשתמש
- כל פעולת עריכה/מחיקה נבדקת מול הרשאות המשתמש
- כל הצגת נתונים מסוננת לפי הרשאות המשתמש

### 3. הודעות שגיאה
- משתמשים מקבלים הודעות ברורות כאשר אין להם הרשאה
- רכיב `AccessDenied` מציג הודעת שגיאה ידידותית

## הרחבה עתידית

### 1. הרשאות מותאמות אישית
- אפשרות להגדיר הרשאות ספציפיות למשתמשים
- הרשאות זמניות לתפקידים מסוימים

### 2. לוג פעילות
- תיעוד כל פעולת עריכה/מחיקה
- מעקב אחר גישות לעמודים מוגנים

### 3. הרשאות מתקדמות
- הרשאות ברמת שדה (למשל, רק חלק מהשדות נראים)
- הרשאות זמניות עם תאריך תפוגה

## שימוש בפיתוח



### 1. הוספת הרשאה חדשה
```typescript
// ב-UserRole.ts
navigation: {
  newFeature: boolean; // הרשאה חדשה
}

// הגדרת ההרשאה לכל תפקיד
[UserRole.ADMIN]: {
  navigation: {
    newFeature: true,
    // ...
  }
}
```

### 2. בדיקת הרשאה
```typescript
import { hasPermission } from '../models/UserRole';

if (hasPermission(user.role, 'newFeature')) {
  // הצג את התכונה
}
```

### 3. סינון נתונים חדש
```typescript
// ב-permissions.ts
export const canViewNewItem = (user: User, item: any): boolean => {
  const permissions = getUserPermissions(user.role);
  
  if (permissions.content.viewAllData) return true;
  if (permissions.content.viewOwnDataOnly) {
    return item.userId === user.uid;
  }
  // ...
};
``` 