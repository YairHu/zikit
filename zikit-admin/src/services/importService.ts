import { collection, addDoc, updateDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Soldier } from '../models/Soldier';
import { Vehicle } from '../models/Vehicle';
import { Framework } from '../models/Framework';
import { PermissionPolicy, Role } from '../models/UserRole';
import { updateTableTimestamp, localStorageService } from './cacheService';

// פונקציה לייבא חיילים
export const importSoldiers = async (data: any[], userId: string): Promise<{ 
  success: number; 
  updated: number;
  errors: string[]; 
  successRows: any[];
  updatedRows: any[];
  errorRows: any[];
}> => {
  const results = { 
    success: 0, 
    updated: 0,
    errors: [] as string[], 
    successRows: [] as any[],
    updatedRows: [] as any[],
    errorRows: [] as any[]
  };
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // בדיקת נתונים חובה
      if (!row.name || !row.personalNumber) {
        console.log(`❌ שורה ${i + 1}: חסרים שם או מספר אישי`, { name: row.name, personalNumber: row.personalNumber });
        results.errors.push(`שורה ${i + 1}: חסרים שם או מספר אישי`);
        results.errorRows.push({ ...row, error: 'חסרים שם או מספר אישי' });
        continue;
      }

      // בדיקה אם החייל כבר קיים
      const existingQuery = query(
        collection(db, 'soldiers'),
        where('personalNumber', '==', row.personalNumber)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        // עדכון חייל קיים
        const soldierDoc = existingDocs.docs[0];
        const updateData: any = {
          name: row.name,
          personalNumber: row.personalNumber,
          updatedAt: new Date()
        };

        // הוספת שדות אופציונליים
        if (row.rank) updateData.rank = row.rank;
        if (row.role) updateData.role = row.role;
        if (row.profile) updateData.profile = row.profile;
        if (row.phone) updateData.phone = row.phone;
        if (row.email) updateData.email = row.email;
        if (row.birthDate) updateData.birthDate = row.birthDate;
        if (row.address) updateData.address = row.address;
        if (row.family) updateData.family = row.family;
        if (row.medicalProfile) updateData.medicalProfile = row.medicalProfile;
        if (row.notes) updateData.notes = row.notes;
        if (row.additionalInfo) updateData.additionalInfo = row.additionalInfo;
        if (row.presence) updateData.presence = row.presence;
        if (row.presenceOther) updateData.presenceOther = row.presenceOther;

        // עיבוד מערכים
        if (row.qualifications) {
          if (Array.isArray(row.qualifications)) {
            updateData.qualifications = row.qualifications;
          } else {
            updateData.qualifications = row.qualifications.split(',').map((q: string) => q.trim()).filter((q: string) => q);
          }
        }
        if (row.licenses) {
          if (Array.isArray(row.licenses)) {
            updateData.licenses = row.licenses;
          } else {
            updateData.licenses = row.licenses.split(',').map((l: string) => l.trim()).filter((l: string) => l);
          }
        }
        if (row.certifications) {
          if (Array.isArray(row.certifications)) {
            updateData.certifications = row.certifications;
          } else {
            updateData.certifications = row.certifications.split(',').map((c: string) => c.trim()).filter((c: string) => c);
          }
        }
        if (row.drivingLicenses) {
          if (Array.isArray(row.drivingLicenses)) {
            updateData.drivingLicenses = row.drivingLicenses;
          } else {
            updateData.drivingLicenses = row.drivingLicenses.split(',').map((d: string) => d.trim()).filter((d: string) => d);
          }
        }

        await updateDoc(soldierDoc.ref, updateData);
        results.updated++;
        results.updatedRows.push({ ...row, docId: soldierDoc.id });
      } else {
        // יצירת חייל חדש
        const soldierData: any = {
          name: row.name,
          personalNumber: row.personalNumber,
          role: row.role || 'חייל',
          profile: row.profile || '72',
          presence: row.presence || 'בבסיס',
          qualifications: row.qualifications ? (Array.isArray(row.qualifications) ? row.qualifications : row.qualifications.split(',').map((q: string) => q.trim()).filter((q: string) => q)) : [],
          licenses: row.licenses ? (Array.isArray(row.licenses) ? row.licenses : row.licenses.split(',').map((l: string) => l.trim()).filter((l: string) => l)) : [],
          certifications: row.certifications ? (Array.isArray(row.certifications) ? row.certifications : row.certifications.split(',').map((c: string) => c.trim()).filter((c: string) => c)) : [],
          drivingLicenses: row.drivingLicenses ? (Array.isArray(row.drivingLicenses) ? row.drivingLicenses : row.drivingLicenses.split(',').map((d: string) => d.trim()).filter((d: string) => d)) : [],
          braurTest: {
            strength: 'passed',
            running: ''
          },
          vacationDays: {
            total: 18,
            used: 0,
            status: 'good'
          },
          status: 'pending_assignment',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          importedBy: userId
        };

        // הוספת שדות אופציונליים
        if (row.rank) soldierData.rank = row.rank;
        if (row.phone) soldierData.phone = row.phone;
        if (row.email) soldierData.email = row.email;
        if (row.birthDate) soldierData.birthData = row.birthDate;
        if (row.address) soldierData.address = row.address;
        if (row.family) soldierData.family = row.family;
        if (row.medicalProfile) soldierData.medicalProfile = row.medicalProfile;
        if (row.notes) soldierData.notes = row.notes;
        if (row.additionalInfo) soldierData.additionalInfo = row.additionalInfo;
        if (row.presenceOther) soldierData.presenceOther = row.presenceOther;

        const docRef = await addDoc(collection(db, 'soldiers'), soldierData);
        results.success++;
        results.successRows.push({ ...row, docId: docRef.id });
      }
    } catch (error) {
      const errorMessage = `שורה ${i + 1}: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`;
      results.errors.push(errorMessage);
      results.errorRows.push({ ...row, error: errorMessage });
    }
  }

  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  await updateTableTimestamp('soldiers');
  localStorageService.invalidateLocalStorage('soldiers');

  return results;
};

// פונקציה לייבא רכבים
export const importVehicles = async (data: any[], userId: string): Promise<{ 
  success: number; 
  updated: number;
  errors: string[]; 
  successRows: any[];
  updatedRows: any[];
  errorRows: any[];
}> => {
  const results = { 
    success: 0, 
    updated: 0,
    errors: [] as string[], 
    successRows: [] as any[],
    updatedRows: [] as any[],
    errorRows: [] as any[]
  };
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // בדיקת נתונים חובה
      if (!row.vehicleNumber) {
        results.errors.push(`שורה ${i + 1}: חסר מספר רכב`);
        results.errorRows.push({ ...row, error: 'חסר מספר רכב' });
        continue;
      }

      // בדיקה אם הרכב כבר קיים
      const existingQuery = query(
        collection(db, 'vehicles'),
        where('vehicleNumber', '==', row.vehicleNumber)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        // עדכון רכב קיים
        const vehicleDoc = existingDocs.docs[0];
        const updateData: any = {
          vehicleNumber: row.vehicleNumber,
          updatedAt: new Date()
        };

        if (row.type) updateData.type = row.type;
        if (row.model) updateData.model = row.model;
        if (row.year) updateData.year = parseInt(row.year) || null;
        if (row.licensePlate) updateData.licensePlate = row.licensePlate;
        if (row.status) updateData.status = row.status;
        if (row.lastMaintenance) updateData.lastMaintenance = row.lastMaintenance;
        if (row.notes) updateData.notes = row.notes;

        await updateDoc(vehicleDoc.ref, updateData);
        results.updated++;
        results.updatedRows.push({ ...row, docId: vehicleDoc.id });
      } else {
        // יצירת רכב חדש
        const vehicleData: any = {
          vehicleNumber: row.vehicleNumber,
          type: row.type || 'רכב כללי',
          status: row.status || 'פעיל',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          importedBy: userId
        };

        if (row.model) vehicleData.model = row.model;
        if (row.year) vehicleData.year = parseInt(row.year) || null;
        if (row.licensePlate) vehicleData.licensePlate = row.licensePlate;
        if (row.lastMaintenance) vehicleData.lastMaintenance = row.lastMaintenance;
        if (row.notes) vehicleData.notes = row.notes;

        const docRef = await addDoc(collection(db, 'vehicles'), vehicleData);
        results.success++;
        results.successRows.push({ ...row, docId: docRef.id });
      }
    } catch (error) {
      const errorMessage = `שורה ${i + 1}: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`;
      results.errors.push(errorMessage);
      results.errorRows.push({ ...row, error: errorMessage });
    }
  }

  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  await updateTableTimestamp('vehicles');
  localStorageService.invalidateLocalStorage('vehicles');

  return results;
};

// פונקציה לייבא מסגרות
export const importFrameworks = async (data: any[], userId: string): Promise<{ 
  success: number; 
  updated: number;
  errors: string[]; 
  successRows: any[];
  updatedRows: any[];
  errorRows: any[];
}> => {
  const results = { 
    success: 0, 
    updated: 0,
    errors: [] as string[], 
    successRows: [] as any[],
    updatedRows: [] as any[],
    errorRows: [] as any[]
  };
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // בדיקת נתונים חובה
      if (!row.name) {
        results.errors.push(`שורה ${i + 1}: חסר שם מסגרת`);
        results.errorRows.push({ ...row, error: 'חסר שם מסגרת' });
        continue;
      }

      // בדיקה אם המסגרת כבר קיימת
      const existingQuery = query(
        collection(db, 'frameworks'),
        where('name', '==', row.name)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        // עדכון מסגרת קיימת
        const frameworkDoc = existingDocs.docs[0];
        const updateData: any = {
          name: row.name,
          updatedAt: new Date()
        };

        if (row.type) updateData.type = row.type;
        if (row.commander) updateData.commander = row.commander;
        if (row.description) updateData.description = row.description;
        if (row.status) updateData.status = row.status;

        await updateDoc(frameworkDoc.ref, updateData);
        results.updated++;
        results.updatedRows.push({ ...row, docId: frameworkDoc.id });
      } else {
        // יצירת מסגרת חדשה
        const frameworkData: any = {
          name: row.name,
          type: row.type || 'מסגרת כללית',
          status: row.status || 'פעילה',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId
        };

        if (row.commander) frameworkData.commander = row.commander;
        if (row.description) frameworkData.description = row.description;

        const docRef = await addDoc(collection(db, 'frameworks'), frameworkData);
        results.success++;
        results.successRows.push({ ...row, docId: docRef.id });
      }
    } catch (error) {
      const errorMessage = `שורה ${i + 1}: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`;
      results.errors.push(errorMessage);
      results.errorRows.push({ ...row, error: errorMessage });
    }
  }

  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  await updateTableTimestamp('frameworks');
  localStorageService.invalidateLocalStorage('frameworks');

  return results;
};

// פונקציה לייבא מדיניות הרשאות
export const importPolicies = async (data: any[], userId: string): Promise<{ success: number; errors: string[] }> => {
  const results = { success: 0, errors: [] as string[] };
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // בדיקת נתונים חובה
      if (!row.name) {
        results.errors.push(`שורה ${i + 1}: חסר שם מדיניות`);
        continue;
      }

      // בדיקה אם המדיניות כבר קיימת
      const existingQuery = query(
        collection(db, 'policies'),
        where('name', '==', row.name)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        // עדכון מדיניות קיימת
        const policyDoc = existingDocs.docs[0];
        const updateData: any = {
          name: row.name,
          updatedAt: new Date()
        };

        if (row.description) updateData.description = row.description;
        if (row.paths) {
          if (Array.isArray(row.paths)) {
            updateData.paths = row.paths;
          } else {
            updateData.paths = row.paths.split(',').map((p: string) => p.trim()).filter((p: string) => p);
          }
        }
        if (row.dataScope) updateData.dataScope = row.dataScope;
        if (row.permissions) {
          if (Array.isArray(row.permissions)) {
            updateData.permissions = row.permissions;
          } else {
            updateData.permissions = row.permissions.split(',').map((p: string) => p.trim()).filter((p: string) => p);
          }
        }

        await updateDoc(policyDoc.ref, updateData);
      } else {
        // יצירת מדיניות חדשה
        const policyData: any = {
          name: row.name,
          description: row.description || '',
          paths: row.paths ? (Array.isArray(row.paths) ? row.paths : row.paths.split(',').map((p: string) => p.trim()).filter((p: string) => p)) : [],
          dataScope: row.dataScope || 'FRAMEWORK_ONLY',
          permissions: row.permissions ? (Array.isArray(row.permissions) ? row.permissions : row.permissions.split(',').map((p: string) => p.trim()).filter((p: string) => p)) : ['VIEW'],
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId
        };

        await addDoc(collection(db, 'policies'), policyData);
      }

      results.success++;
    } catch (error) {
      results.errors.push(`שורה ${i + 1}: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    }
  }

  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  await updateTableTimestamp('permissionPolicies');
  localStorageService.invalidateLocalStorage('permissionPolicies');

  return results;
};

// פונקציה לייבא תפקידים
export const importRoles = async (data: any[], userId: string): Promise<{ 
  success: number; 
  updated: number;
  errors: string[]; 
  successRows: any[];
  updatedRows: any[];
  errorRows: any[];
}> => {
  const results = { 
    success: 0, 
    updated: 0,
    errors: [] as string[], 
    successRows: [] as any[],
    updatedRows: [] as any[],
    errorRows: [] as any[]
  };
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // בדיקת נתונים חובה
      if (!row.name) {
        results.errors.push(`שורה ${i + 1}: חסר שם תפקיד`);
        results.errorRows.push({ ...row, error: 'חסר שם תפקיד' });
        continue;
      }

      // בדיקה אם התפקיד כבר קיים
      const existingQuery = query(
        collection(db, 'roles'),
        where('name', '==', row.name)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        // עדכון תפקיד קיים
        const roleDoc = existingDocs.docs[0];
        const updateData: any = {
          name: row.name,
          updatedAt: new Date()
        };

        if (row.description) updateData.description = row.description;
        if (row.policies) {
          if (Array.isArray(row.policies)) {
            updateData.policies = row.policies;
          } else {
            updateData.policies = row.policies.split(',').map((p: string) => p.trim()).filter((p: string) => p);
          }
        }
        if (row.isSystem !== undefined) {
          updateData.isSystem = row.isSystem === 'true' || row.isSystem === true;
        }

        await updateDoc(roleDoc.ref, updateData);
        results.updated++;
        results.updatedRows.push({ ...row, docId: roleDoc.id });
      } else {
        // יצירת תפקיד חדש
        const roleData: any = {
          name: row.name,
          description: row.description || '',
          policies: row.policies ? (Array.isArray(row.policies) ? row.policies : row.policies.split(',').map((p: string) => p.trim()).filter((p: string) => p)) : [],
          isSystem: row.isSystem === 'true' || row.isSystem === true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId
        };

        const docRef = await addDoc(collection(db, 'roles'), roleData);
        results.success++;
        results.successRows.push({ ...row, docId: docRef.id });
      }
    } catch (error) {
      const errorMessage = `שורה ${i + 1}: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`;
      results.errors.push(errorMessage);
      results.errorRows.push({ ...row, error: errorMessage });
    }
  }

  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  await updateTableTimestamp('roles');
  localStorageService.invalidateLocalStorage('roles');

  return results;
};

// פונקציה לייבא תוצאות מבחן בראור
export const importBraurTestResults = async (data: any[], userId: string): Promise<{ 
  success: number; 
  updated: number;
  errors: string[]; 
  successRows: any[];
  updatedRows: any[];
  errorRows: any[];
}> => {
  const results = { 
    success: 0, 
    updated: 0,
    errors: [] as string[], 
    successRows: [] as any[],
    updatedRows: [] as any[],
    errorRows: [] as any[]
  };
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // בדיקת נתונים חובה
      if (!row.personalNumber) {
        results.errors.push(`שורה ${i + 1}: חסר מספר אישי`);
        results.errorRows.push({ ...row, error: 'חסר מספר אישי' });
        continue;
      }

      // חיפוש החייל לפי מספר אישי
      const soldierQuery = query(
        collection(db, 'soldiers'),
        where('personalNumber', '==', row.personalNumber)
      );
      const soldierDocs = await getDocs(soldierQuery);
      
      if (soldierDocs.empty) {
        results.errors.push(`שורה ${i + 1}: לא נמצא חייל עם מספר אישי ${row.personalNumber}`);
        results.errorRows.push({ ...row, error: `לא נמצא חייל עם מספר אישי ${row.personalNumber}` });
        continue;
      }

      const soldierDoc = soldierDocs.docs[0];
      const soldierData = soldierDoc.data();
      
      // הכנת נתוני מבחן בראור
      const braurTestData: any = {
        updatedAt: new Date()
      };

      // עיבוד תוצאת כח
      if (row.strengthResult) {
        const strengthResult = row.strengthResult.toString().toLowerCase().trim();
        if (strengthResult === 'עבר' || strengthResult === 'passed' || strengthResult === 'true' || strengthResult === '1') {
          braurTestData['braurTest.strength'] = 'passed';
        } else if (strengthResult === 'לא עבר' || strengthResult === 'failed' || strengthResult === 'false' || strengthResult === '0') {
          braurTestData['braurTest.strength'] = 'failed';
        } else {
          results.errors.push(`שורה ${i + 1}: ערך לא תקין לתוצאת כח: ${row.strengthResult}`);
          results.errorRows.push({ ...row, error: `ערך לא תקין לתוצאת כח: ${row.strengthResult}` });
          continue;
        }
      }

      // עיבוד תוצאת ריצה
      if (row.runningResult) {
        const runningResult = row.runningResult.toString().trim();
        
        // בדיקה אם הפורמט תקין (דקות:שניות)
        const timeRegex = /^(\d{1,2}):(\d{2})$/;
        const match = runningResult.match(timeRegex);
        
        if (match) {
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          
          if (seconds >= 60) {
            results.errors.push(`שורה ${i + 1}: ערך לא תקין לתוצאת ריצה: ${runningResult} (שניות חייבות להיות פחות מ-60)`);
            results.errorRows.push({ ...row, error: `ערך לא תקין לתוצאת ריצה: ${runningResult} (שניות חייבות להיות פחות מ-60)` });
            continue;
          }
          
          braurTestData['braurTest.running'] = runningResult;
        } else {
          results.errors.push(`שורה ${i + 1}: פורמט לא תקין לתוצאת ריצה: ${runningResult} (נדרש פורמט דקות:שניות, לדוגמה: 14:30)`);
          results.errorRows.push({ ...row, error: `פורמט לא תקין לתוצאת ריצה: ${runningResult} (נדרש פורמט דקות:שניות, לדוגמה: 14:30)` });
          continue;
        }
      }

      // עדכון החייל עם נתוני מבחן בראור
      await updateDoc(soldierDoc.ref, braurTestData);
      
      results.updated++;
      results.updatedRows.push({ ...row, docId: soldierDoc.id, soldierName: soldierData.name });
    } catch (error) {
      const errorMessage = `שורה ${i + 1}: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`;
      results.errors.push(errorMessage);
      results.errorRows.push({ ...row, error: errorMessage });
    }
  }

  // עדכון טבלת העדכונים וניקוי מטמון מקומי
  await updateTableTimestamp('soldiers');
  localStorageService.invalidateLocalStorage('soldiers');

  return results;
};
