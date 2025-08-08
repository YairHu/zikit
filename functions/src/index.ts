import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Set Custom Claims for users (fix CORS issue)
export const setCustomClaims = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The function must be called while authenticated."
    );
  }

  const { uid, claims } = data;

  try {
    // בדיקה שהמשתמש המבקש יכול לשנות claims
    const requesterRecord = await admin.auth().getUser(context.auth.uid);
    const requesterClaims = requesterRecord.customClaims || {};
    
    // בדיקה לפי התפקיד - רק אדמין, מ"פ וסמ"פ יכולים לשנות תפקידים
    if (requesterClaims.role !== "admin" && 
        requesterClaims.role !== "mefaked_pluga" && 
        requesterClaims.role !== "samal_pluga") {
      throw new functions.https.HttpsError(
        "permission-denied", 
        "אין הרשאה לשנות תפקידים"
      );
    }

    // עדכון Custom Claims
    await admin.auth().setCustomUserClaims(uid, claims);
    
    functions.logger.info(`Custom claims set for user ${uid}:`, claims);
    return { success: true, message: "Claims updated successfully" };
    
  } catch (error) {
    functions.logger.error("Error setting custom claims:", error);
    throw new functions.https.HttpsError(
      "internal", 
      "שגיאה בעדכון התפקיד"
    );
  }
});

// Function to handle Google Forms submissions
export const processGoogleFormSubmission = functions.https.onRequest(async (req, res) => {
  // הגדרת CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const formData = req.body;
    
    // בדיקת נתונים חובה
    if (!formData.email || !formData.fullName) {
      res.status(400).json({ 
        error: "נתונים חסרים - דרושים לפחות אימייל ושם מלא" 
      });
      return;
    }

    // בדיקה אם כבר קיים משתמש עם האימייל הזה
    try {
      const existingUser = await admin.auth().getUserByEmail(formData.email);
      if (existingUser) {
        res.status(400).json({ 
          error: "כתובת האימייל כבר קיימת במערכת. אם אתה כבר נרשמת, אנא התחבר למערכת במקום למלא טופס חדש." 
        });
        return;
      }
    } catch (error) {
      // משתמש לא קיים - זה בסדר, נמשיך
    }

    // יצירת רשומת חייל חדש
    const soldierData = {
      email: formData.email,
      fullName: formData.fullName,
      personalNumber: formData.personalNumber || "",
      phone: formData.phone || "",
      birthDate: formData.birthDate || "",
      address: formData.address || "",
      emergencyContact: formData.emergencyContact || "",
      emergencyPhone: formData.emergencyPhone || "",
      medicalProfile: formData.medicalProfile || "",
      militaryBackground: formData.militaryBackground || "",
      education: formData.education || "",
      languages: formData.languages || "",
      hobbies: formData.hobbies || "",
      motivation: formData.motivation || "",
      expectations: formData.expectations || "",
      additionalInfo: formData.additionalInfo || "",
      
      // שדות מערך - וודא שהם תמיד מערכים ריקים
      qualifications: [],
      licenses: [],
      certifications: [],
      
      // שדות נוספים
      profile: "72", // ברירת מחדל
      presence: "בבסיס", // ברירת מחדל
      presenceOther: "",
      family: "",
      notes: "",
      
      // מטאדטה
      formSubmittedAt: admin.firestore.Timestamp.now(),
      status: "pending_assignment", // ממתין לשיבוץ
      assignedBy: null,
      assignedAt: null,
      
      // תפקיד ברירת מחדל
      role: "chayal",
      team: null,
      pelaga: null,
      
      // האם פעיל
      isActive: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    // שמירה ב-Firestore
    const docRef = await admin.firestore().collection("soldiers").add(soldierData);
    
    functions.logger.info("New soldier created from form:", {
      docId: docRef.id,
      email: formData.email,
      fullName: formData.fullName
    });

    // החזרת תשובה מוצלחת
    res.status(200).json({
      success: true,
      message: "הטופס נשמר בהצלחה",
      soldierDoc: docRef.id
    });

  } catch (error) {
    functions.logger.error("Error processing form submission:", error);
    res.status(500).json({
      error: "שגיאה בעיבוד הטופס",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Function to sync soldier data with user account
export const createUserFromSoldier = functions.firestore
  .document("soldiers/{soldierId}")
  .onCreate(async (snap, context) => {
    const soldierData = snap.data();
    const soldierId = context.params.soldierId;

    try {
      // בדיקה אם כבר קיים משתמש עם האימייל הזה
      let userRecord;
      
      try {
        userRecord = await admin.auth().getUserByEmail(soldierData.email);
        functions.logger.info(`User already exists for email: ${soldierData.email}`);
      } catch (error) {
        // משתמש לא קיים - נשנה סטטוס לממתין לקישור משתמש
        await snap.ref.update({
          status: "pending_user_link",
          updatedAt: admin.firestore.Timestamp.now()
        });
        functions.logger.info(`No user found for email: ${soldierData.email}, status set to pending_user_link`);
        return;
      }

      // עדכון רשומת החייל עם UID של המשתמש ושם
      await snap.ref.update({
        userUid: userRecord.uid,
        name: soldierData.fullName, // עדכון השדה name
        status: "pending_assignment",
        updatedAt: admin.firestore.Timestamp.now()
      });

      // בדיקה אם רשומת המשתמש כבר קיימת
      const existingUserDoc = await admin.firestore().collection("users").doc(userRecord.uid).get();
      
      if (existingUserDoc.exists) {
        // משתמש קיים - עדכן רק את הנתונים החסרים
        const existingData = existingUserDoc.data();
        if (existingData) {
          const updateData: any = {
            personalNumber: soldierData.personalNumber,
            soldierDocId: soldierId,
            updatedAt: admin.firestore.Timestamp.now()
          };
          
          // עדכן את השם אם הוא ריק או אם יש שם חדש מהטופס
          if (!existingData.displayName || existingData.displayName === '') {
            updateData.displayName = soldierData.fullName;
            functions.logger.info(`Updating displayName for user ${userRecord.uid}: ${soldierData.fullName}`);
          } else {
            functions.logger.info(`User ${userRecord.uid} already has displayName: ${existingData.displayName}`);
          }
          
          // אל תעדכן תפקיד והרשאות אם המשתמש כבר קיים
          if (!existingData.role) {
            updateData.role = "chayal";
          }
          if (!existingData.canAssignRoles) {
            updateData.canAssignRoles = false;
          }
          if (!existingData.canViewSensitiveData) {
            updateData.canViewSensitiveData = false;
          }
          
          await admin.firestore().collection("users").doc(userRecord.uid).update(updateData);
          functions.logger.info(`Updated existing user document for soldier: ${soldierId}`);
        }
      } else {
        // משתמש חדש - צור רשומה חדשה
        await admin.firestore().collection("users").doc(userRecord.uid).set({
          uid: userRecord.uid,
          displayName: soldierData.fullName,
          email: soldierData.email,
          role: "chayal", // ברירת מחדל
          personalNumber: soldierData.personalNumber,
          
          // קישור לרשומת החייל
          soldierDocId: soldierId,
          
          // הרשאות
          canAssignRoles: false,
          canViewSensitiveData: false,
          
          // מטאדטה
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
          isActive: true
        });
        functions.logger.info(`Created new user document for soldier: ${soldierId}`);
      }

      functions.logger.info(`User document created for soldier: ${soldierId}`);
      
    } catch (error) {
      functions.logger.error("Error creating user from soldier:", error);
      // עדכון סטטוס השגיאה ברשומת החייל
      await snap.ref.update({
        status: "error_creating_user",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        updatedAt: admin.firestore.Timestamp.now()
      });
    }
  });

// Function to sync user data with soldier data
export const createSoldierFromUser = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    const userData = snap.data();
    const userId = context.params.userId;

    try {
      // בדיקה אם כבר קיימים נתוני חייל עם האימייל הזה
      const soldiersQuery = await admin.firestore()
        .collection("soldiers")
        .where("email", "==", userData.email)
        .get();
      
      if (!soldiersQuery.empty) {
        // יש נתוני חייל - קשר אותם
        const soldierDoc = soldiersQuery.docs[0];
        const soldierData = soldierDoc.data();
        
        // עדכון רשומת החייל עם UID של המשתמש ושם
        await soldierDoc.ref.update({
          userUid: userId,
          name: soldierData.fullName, // עדכון השדה name
          status: "pending_assignment",
          updatedAt: admin.firestore.Timestamp.now()
        });

        // עדכון רשומת המשתמש עם קישור לחייל
        const updateData: any = {
          soldierDocId: soldierDoc.id,
          personalNumber: soldierData.personalNumber,
          updatedAt: admin.firestore.Timestamp.now()
        };
        
        // עדכן את השם אם הוא ריק או אם יש שם חדש מהטופס
        if (!userData.displayName || userData.displayName === '') {
          updateData.displayName = soldierData.fullName;
          functions.logger.info(`Updating displayName for user ${userId}: ${soldierData.fullName}`);
        } else {
          functions.logger.info(`User ${userId} already has displayName: ${userData.displayName}`);
        }
        
        await snap.ref.update(updateData);

        functions.logger.info(`Linked existing soldier data for user: ${userId}`);
      } else {
        // אין נתוני חייל - המשתמש ממתין לנתונים
        functions.logger.info(`No soldier data found for user: ${userId}, waiting for form submission`);
      }
      
    } catch (error) {
      functions.logger.error("Error linking user with soldier data:", error);
    }
  });

// Function to handle soldier assignment updates
export const updateSoldierAssignment = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const userId = context.params.userId;

    // בדיקה אם השתנה תפקיד או שיבוץ
    if (beforeData.role !== afterData.role || 
        beforeData.team !== afterData.team ||
        beforeData.pelaga !== afterData.pelaga) {
      
      try {
        // עדכון רשומת החייל המתאימה
        if (afterData.soldierDocId) {
          await admin.firestore()
            .collection("soldiers")
            .doc(afterData.soldierDocId)
            .update({
              role: afterData.role,
              team: afterData.team,
              pelaga: afterData.pelaga,
              status: "assigned",
              assignedAt: admin.firestore.Timestamp.now(),
              updatedAt: admin.firestore.Timestamp.now()
            });
        }

        // עדכון Custom Claims
        await admin.auth().setCustomUserClaims(userId, {
          role: afterData.role,
          team: afterData.team,
          pelaga: afterData.pelaga
        });

        functions.logger.info(`Updated assignment for user ${userId}:`, {
          role: afterData.role,
          team: afterData.team,
          pelaga: afterData.pelaga
        });

      } catch (error) {
        functions.logger.error("Error updating soldier assignment:", error);
      }
    }
  });

// Function to delete user account (for admin use)
export const deleteUserAccount = functions.https.onCall(async (data, context) => {
  // בדיקת אימות
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The function must be called while authenticated."
    );
  }

  const { uid } = data;

  try {
    // בדיקה שהמשתמש המבקש יכול להסיר משתמשים
    const requesterRecord = await admin.auth().getUser(context.auth.uid);
    const requesterClaims = requesterRecord.customClaims || {};
    
    // רק אדמין ומ"פ יכולים להסיר משתמשים
    if (requesterClaims.role !== "admin" && 
        requesterClaims.role !== "mefaked_pluga") {
      throw new functions.https.HttpsError(
        "permission-denied", 
        "אין הרשאה להסרת משתמשים מהמערכת"
      );
    }

    // בדיקה שהמשתמש לא מנסה להסיר את עצמו
    if (uid === context.auth.uid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "לא ניתן להסיר את עצמך מהמערכת"
      );
    }

    // בדיקה שהמשתמש לא מנסה להסיר אדמין אחר (אם הוא לא אדמין בעצמו)
    const userToDelete = await admin.auth().getUser(uid);
    const userToDeleteClaims = userToDelete.customClaims || {};
    
    if (userToDeleteClaims.role === "admin" && requesterClaims.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "רק אדמין יכול להסיר אדמין אחר"
      );
    }

    // מחיקת רשומת החייל אם קיימת (לפני מחיקת המשתמש)
    let soldierDocId: string | null = null;
    try {
      const userDoc = await admin.firestore().collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        soldierDocId = userData?.soldierDocId || null;
      }
    } catch (error) {
      functions.logger.warn("Error reading user document:", error);
    }
    
    // מחיקת רשומת החייל אם קיימת
    if (soldierDocId) {
      try {
        await admin.firestore().collection("soldiers").doc(soldierDocId).delete();
        functions.logger.info(`Deleted soldier document: ${soldierDocId}`);
      } catch (error) {
        functions.logger.warn("Error deleting soldier document:", error);
        // נמשיך גם אם יש שגיאה במחיקת רשומת החייל
      }
    }
    
    // מחיקת רשומת המשתמש מ-Firestore
    try {
      await admin.firestore().collection("users").doc(uid).delete();
      functions.logger.info(`Deleted user document: ${uid}`);
    } catch (error) {
      functions.logger.warn("Error deleting user document:", error);
      // נמשיך גם אם יש שגיאה במחיקת רשומת המשתמש
    }

    // מחיקת המשתמש מ-Firebase Auth
    try {
      await admin.auth().deleteUser(uid);
      functions.logger.info(`Deleted user from Auth: ${uid}`);
    } catch (error) {
      functions.logger.error("Error deleting user from Auth:", error);
      throw new functions.https.HttpsError(
        "internal", 
        "שגיאה במחיקת המשתמש מ-Firebase Auth"
      );
    }
    
    functions.logger.info(`User account deleted: ${uid}`);
    return { 
      success: true, 
      message: "המשתמש הוסר מהמערכת בהצלחה" 
    };
    
  } catch (error) {
    functions.logger.error("Error deleting user account:", error);
    throw new functions.https.HttpsError(
      "internal", 
      "שגיאה בהסרת המשתמש מהמערכת"
    );
  }
}); 