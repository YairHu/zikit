# תבנית טופס גיוס לפלוגה - Google Forms

## שדות הטופס הנדרשים:

### פרטים אישיים (חובה)
1. **כתובת אימייל** (Text - Short answer) - `email`
   - הפוך לשדה חובה
   - הוסף אימות אימייל

2. **שם מלא** (Text - Short answer) - `fullName` 
   - הפוך לשדה חובה

3. **מספר אישי** (Text - Short answer) - `personalNumber`
   - הפוך לשדה חובה
   - הוסף תיאור: "9 ספרות ללא רווחים"

4. **מספר טלפון** (Text - Short answer) - `phone`
   - הוסף תיאור: "לדוגמה: 050-1234567"

### פרטים נוספים
5. **תאריך לידה** (Date) - `birthDate`

6. **כתובת מגורים** (Text - Short answer) - `address`

7. **איש קשר לחירום** (Text - Short answer) - `emergencyContact`

8. **טלפון חירום** (Text - Short answer) - `emergencyPhone`

### רקע ומיומנויות
9. **השכלה** (Multiple choice) - `education`
   - תיכון
   - תעודת הנדסאי
   - תואר ראשון
   - תואר שני
   - אחר

10. **שפות** (Checkboxes) - `languages`
    - עברית
    - אנגלית
    - ערבית
    - רוסית
    - צרפתית
    - אחר

11. **רקע צבאי** (Text - Paragraph) - `militaryBackground`
    - הוסף תיאור: "ציין יחידות קודמות, קורסים, הסמכות"

12. **פרופיל רפואי** (Multiple choice) - `medicalProfile`
    - 97
    - 82
    - 72
    - 64
    - 45
    - 21
    - אחר

### מוטיבציה והתאמה
13. **מוטיבציה לשירות** (Text - Paragraph) - `motivation`
    - הוסף תיאור: "מדוע אתה רוצה לשרת ביחידה?"

14. **ציפיות מהשירות** (Text - Paragraph) - `expectations`
    - הוסף תיאור: "מה אתה מצפה ללמוד ולחוות?"

15. **תחומי עניין/תחביבים** (Text - Short answer) - `hobbies`

16. **מידע נוסף** (Text - Paragraph) - `additionalInfo`
    - הוסף תיאור: "כל מידע נוסף שחשוב לך לשתף"

## הגדרת הטופס ב-Google Forms:

### 1. יצירת הטופס
- היכנס ל-Google Forms
- צור טופס חדש
- שנה את הכותרת ל: "טופס גיוס - פלוגה לוחמת"
- הוסף תיאור: "מלא את הטופס הבא להצטרפות לפלוגה"

### 2. הגדרות כלליות
- בהגדרות הטופס:
  - ✅ אסוף כתובות אימייל
  - ✅ הגבל לתשובה אחת
  - ✅ דרוש כניסה עם Google

### 3. חיבור ל-Cloud Function
לאחר שהטופס מוכן, יש לחבר אותו ל-Cloud Function:

1. עבור לכרטיסייה "תשובות"
2. לחץ על שלוש הנקודות ← "בחר יעד תשובה"
3. בחר "יצירת גיליון אלקטרוני חדש"
4. במשתנה הגיליון, הוסף קובץ Google Apps Script
5. במקום הקוד הקיים, הוסף:

```javascript
function onFormSubmit(e) {
  const formData = {
    email: e.values[1], // כתובת אימייל
    fullName: e.values[2], // שם מלא
    personalNumber: e.values[3], // מספר אישי
    phone: e.values[4], // טלפון
    birthDate: e.values[5], // תאריך לידה
    address: e.values[6], // כתובת
    emergencyContact: e.values[7], // איש קשר חירום
    emergencyPhone: e.values[8], // טלפון חירום
    education: e.values[9], // השכלה
    languages: e.values[10], // שפות
    militaryBackground: e.values[11], // רקע צבאי
    medicalProfile: e.values[12], // פרופיל רפואי
    motivation: e.values[13], // מוטיבציה
    expectations: e.values[14], // ציפיות
    hobbies: e.values[15], // תחביבים
    additionalInfo: e.values[16] // מידע נוסף
  };

  // שליחה ל-Cloud Function
  const functionUrl = 'https://us-central1-zikit-4c55c.cloudfunctions.net/processGoogleFormSubmission';
  
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(formData)
  };

  try {
    const response = UrlFetchApp.fetch(functionUrl, options);
    Logger.log('Cloud Function response: ' + response.getContentText());
  } catch (error) {
    Logger.log('Error calling Cloud Function: ' + error.toString());
  }
}
```

6. שמור את הסקריפט
7. הגדר טריגר: עריכה ← טריגרים נוכחיים ← הוסף טריגר
   - בחר: onFormSubmit
   - סוג אירוע: הגשת טופס

## URL הטופס לשיתוף:
לאחר פרסום הטופס, תקבל קישור לשיתוף עם המועמדים לגיוס. 