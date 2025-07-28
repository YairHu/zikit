#!/bin/bash

echo "🚀 מתחיל פריסת האפליקציה..."

# בדיקה שאנחנו בתיקייה הנכונה
if [ ! -f "firebase.json" ]; then
    echo "❌ שגיאה: קובץ firebase.json לא נמצא. וודא שאתה בתיקיית הפרויקט."
    exit 1
fi

# יצירת build של האפליקציה
echo "📦 בונה את האפליקציה..."
cd zikit-admin
npm run build

if [ $? -ne 0 ]; then
    echo "❌ שגיאה בבניית האפליקציה"
    exit 1
fi

cd ..

# פריסת Functions (אם קיימת התיקייה)
if [ -d "functions" ]; then
    echo "☁️  פרוס Cloud Functions..."
    firebase deploy --only functions
    
    if [ $? -ne 0 ]; then
        echo "❌ שגיאה בפריסת Functions"
        exit 1
    fi
fi

# פריסת Firestore Rules
echo "🔒 מעדכן Firestore Rules..."
firebase deploy --only firestore:rules

if [ $? -ne 0 ]; then
    echo "❌ שגיאה בעדכון Rules"
    exit 1
fi

# פריסת האפליקציה
echo "🌐 פרוס את האפליקציה..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo "✅ הפריסה הושלמה בהצלחה!"
    echo "🔗 האפליקציה זמינה ב: https://zikit-4c55c.web.app"
    echo ""
    echo "📋 הוראות נוספות:"
    echo "1. הגדר את URL של Cloud Function בקובץ userService.ts"
    echo "2. צור טופס Google Forms והפנה אותו ל-Cloud Function"
    echo "3. הגדר משתני סביבה בפורטל Firebase"
else
    echo "❌ שגיאה בפריסת האפליקציה"
    exit 1
fi 