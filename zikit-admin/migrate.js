const fs = require('fs');
const path = require('path');

class ServiceMigrator {
  constructor() {
    this.serviceMappings = [
      { serviceName: 'activityService', collectionName: 'activities', entityType: 'Activity' },
      { serviceName: 'soldierService', collectionName: 'soldiers', entityType: 'Soldier' },
      { serviceName: 'dutyService', collectionName: 'duties', entityType: 'Duty' },
      { serviceName: 'tripService', collectionName: 'trips', entityType: 'Trip' },
      { serviceName: 'userService', collectionName: 'users', entityType: 'User' },
      { serviceName: 'missionService', collectionName: 'missions', entityType: 'Mission' },
      { serviceName: 'referralService', collectionName: 'referrals', entityType: 'Referral' },
      { serviceName: 'vehicleService', collectionName: 'vehicles', entityType: 'Vehicle' },
      { serviceName: 'formService', collectionName: 'forms', entityType: 'Form' },
    ];
    this.results = [];
  }

  // מיגרציה של קובץ שירות בודד
  async migrateServiceFile(filePath) {
    const fileName = path.basename(filePath);
    console.log(`🔄 מתחיל מיגרציה: ${fileName}`);

    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      
      // יצירת backup
      const backupPath = `${filePath}.backup`;
      fs.writeFileSync(backupPath, originalContent);

      let newContent = originalContent;
      const changes = [];

      // שלב 1: החלפת ייבואים
      newContent = this.replaceImports(newContent, changes);

      // שלב 2: החלפת פונקציות CRUD בסיסיות
      newContent = this.replaceCRUDFunctions(newContent, fileName, changes);

      // שלב 3: החלפת גישות ישירות ל-Firebase
      newContent = this.replaceDirectFirebaseAccess(newContent, changes);

      // שמירת הקובץ החדש
      fs.writeFileSync(filePath, newContent);

      console.log(`✅ הושלם: ${fileName} (${changes.length} שינויים)`);
      
      return {
        file: fileName,
        success: true,
        changes,
        errors: []
      };

    } catch (error) {
      console.error(`❌ שגיאה ב-${fileName}:`, error.message);
      return {
        file: fileName,
        success: false,
        changes: [],
        errors: [error.message]
      };
    }
  }

  // החלפת ייבואים
  replaceImports(content, changes) {
    let newContent = content;

    // הסרת ייבואים ישנים מ-Firebase
    const firebaseImportPatterns = [
      /import\s*\{\s*[^}]*\}\s*from\s*['"]firebase\/firestore['"];?\s*\n/g,
      /import\s*\{\s*[^}]*db[^}]*\}\s*from\s*['"]\.\.\/firebase['"];?\s*\n/g,
    ];

    firebaseImportPatterns.forEach(pattern => {
      if (pattern.test(newContent)) {
        newContent = newContent.replace(pattern, '');
        changes.push('הוסרו ייבואים ישנים מ-Firebase');
      }
    });

    // הוספת ייבוא dataLayer אם לא קיים
    if (!newContent.includes('dataAccessLayer') && !newContent.includes('dataLayer')) {
      const importMatch = newContent.match(/import.*from.*;/);
      if (importMatch) {
        const insertPoint = newContent.indexOf(importMatch[0]) + importMatch[0].length + 1;
        newContent = newContent.slice(0, insertPoint) + 
                   `import { dataLayer } from './dataAccessLayer';\n` + 
                   newContent.slice(insertPoint);
        changes.push('נוסף ייבוא dataLayer');
      }
    }

    return newContent;
  }

  // החלפת פונקציות CRUD בסיסיות
  replaceCRUDFunctions(content, fileName, changes) {
    let newContent = content;
    
    // קבלת מיפוי השירות
    const mapping = this.serviceMappings.find(m => fileName.includes(m.serviceName));
    if (!mapping) {
      console.warn(`⚠️ לא נמצא מיפוי עבור ${fileName}`);
      return newContent;
    }

    const { collectionName, entityType } = mapping;

    // החלפת getAll - דפוס יותר פשוט
    const getAllRegex = new RegExp(
      `export\\s+const\\s+getAll${entityType}s?\\s*=\\s*async\\s*\\(\\)\\s*:[^{]+\\{[\\s\\S]*?\\};`, 
      'g'
    );
    
    if (getAllRegex.test(newContent)) {
      const getAllReplacement = `export const getAll${entityType}s = async (): Promise<${entityType}[]> => {\n  return dataLayer.getAll('${collectionName}') as Promise<${entityType}[]>;\n};`;
      newContent = newContent.replace(getAllRegex, getAllReplacement);
      changes.push(`הוחלף getAll${entityType}s לשימוש ב-dataLayer`);
    }

    // החלפת getById
    const getByIdRegex = new RegExp(
      `export\\s+const\\s+get${entityType}ById\\s*=\\s*async\\s*\\([^)]+\\)\\s*:[^{]+\\{[\\s\\S]*?\\};`, 
      'g'
    );
    
    if (getByIdRegex.test(newContent)) {
      const getByIdReplacement = `export const get${entityType}ById = async (id: string): Promise<${entityType} | null> => {\n  return dataLayer.getById('${collectionName}', id) as Promise<${entityType} | null>;\n};`;
      newContent = newContent.replace(getByIdRegex, getByIdReplacement);
      changes.push(`הוחלף get${entityType}ById לשימוש ב-dataLayer`);
    }

    // החלפת create
    const createRegex = new RegExp(
      `export\\s+const\\s+create${entityType}\\s*=\\s*async\\s*\\([^)]+\\)\\s*:[^{]+\\{[\\s\\S]*?\\};`, 
      'g'
    );
    
    if (createRegex.test(newContent)) {
      const createReplacement = `export const create${entityType} = async (data: any): Promise<string> => {\n  return dataLayer.create('${collectionName}', data);\n};`;
      newContent = newContent.replace(createRegex, createReplacement);
      changes.push(`הוחלף create${entityType} לשימוש ב-dataLayer`);
    }

    // החלפת update
    const updateRegex = new RegExp(
      `export\\s+const\\s+update${entityType}\\s*=\\s*async\\s*\\([^)]+\\)\\s*:[^{]+\\{[\\s\\S]*?\\};`, 
      'g'
    );
    
    if (updateRegex.test(newContent)) {
      const updateReplacement = `export const update${entityType} = async (id: string, updates: any): Promise<void> => {\n  return dataLayer.update('${collectionName}', id, updates);\n};`;
      newContent = newContent.replace(updateRegex, updateReplacement);
      changes.push(`הוחלף update${entityType} לשימוש ב-dataLayer`);
    }

    // החלפת delete
    const deleteRegex = new RegExp(
      `export\\s+const\\s+delete${entityType}\\s*=\\s*async\\s*\\([^)]+\\)\\s*:[^{]+\\{[\\s\\S]*?\\};`, 
      'g'
    );
    
    if (deleteRegex.test(newContent)) {
      const deleteReplacement = `export const delete${entityType} = async (id: string): Promise<void> => {\n  return dataLayer.delete('${collectionName}', id);\n};`;
      newContent = newContent.replace(deleteRegex, deleteReplacement);
      changes.push(`הוחלף delete${entityType} לשימוש ב-dataLayer`);
    }

    return newContent;
  }

  // החלפת גישות ישירות ל-Firebase
  replaceDirectFirebaseAccess(content, changes) {
    let newContent = content;

    // הסרת שימושים ישירים ב-Firebase functions
    const directPatterns = [
      { pattern: /collection\(db,/g, replacement: '// TODO: dataLayer.getAll(' },
      { pattern: /getDocs\(/g, replacement: '// TODO: dataLayer.getAll(' },
      { pattern: /getDoc\(/g, replacement: '// TODO: dataLayer.getById(' },
      { pattern: /addDoc\(/g, replacement: '// TODO: dataLayer.create(' },
      { pattern: /updateDoc\(/g, replacement: '// TODO: dataLayer.update(' },
      { pattern: /deleteDoc\(/g, replacement: '// TODO: dataLayer.delete(' },
    ];

    directPatterns.forEach(({ pattern, replacement }) => {
      if (pattern.test(newContent)) {
        newContent = newContent.replace(pattern, replacement);
        changes.push('הוחלפו גישות ישירות ל-Firebase');
      }
    });

    return newContent;
  }

  // מיגרציה של קובץ קומפוננט
  async migrateComponentFile(filePath) {
    const fileName = path.basename(filePath);
    console.log(`🔄 מתחיל מיגרציה של קומפוננט: ${fileName}`);

    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      
      // יצירת backup
      const backupPath = `${filePath}.backup`;
      fs.writeFileSync(backupPath, originalContent);

      let newContent = originalContent;
      const changes = [];

      // החלפת קריאות לשירותים
      newContent = this.replaceServiceCalls(newContent, changes);

      // שמירת הקובץ החדש
      if (changes.length > 0) {
        fs.writeFileSync(filePath, newContent);
        console.log(`✅ הושלם קומפוננט: ${fileName} (${changes.length} שינויים)`);
      } else {
        console.log(`⚪ אין שינויים ב-${fileName}`);
      }
      
      return {
        file: fileName,
        success: true,
        changes,
        errors: []
      };

    } catch (error) {
      console.error(`❌ שגיאה בקומפוננט ${fileName}:`, error.message);
      return {
        file: fileName,
        success: false,
        changes: [],
        errors: [error.message]
      };
    }
  }

  // החלפת קריאות לשירותים בקומפוננטים
  replaceServiceCalls(content, changes) {
    let newContent = content;

    // רשימת החלפות עבור קריאות נפוצות
    const serviceCallReplacements = [
      { old: /getAllActivities\(\)/g, new: "dataLayer.getAll('activities')", type: 'Activity[]' },
      { old: /getAllSoldiers\(\)/g, new: "dataLayer.getAll('soldiers')", type: 'Soldier[]' },
      { old: /getAllDuties\(\)/g, new: "dataLayer.getAll('duties')", type: 'Duty[]' },
      { old: /getAllTrips\(\)/g, new: "dataLayer.getAll('trips')", type: 'Trip[]' },
      { old: /getAllUsers\(\)/g, new: "dataLayer.getAll('users')", type: 'User[]' },
      { old: /getAllMissions\(\)/g, new: "dataLayer.getAll('missions')", type: 'Mission[]' },
      { old: /getAllReferrals\(\)/g, new: "dataLayer.getAll('referrals')", type: 'Referral[]' },
      { old: /getAllVehicles\(\)/g, new: "dataLayer.getAll('vehicles')", type: 'Vehicle[]' },
      { old: /getAllForms\(\)/g, new: "dataLayer.getAll('forms')", type: 'Form[]' },
    ];

    serviceCallReplacements.forEach(({ old, new: newCall, type }) => {
      if (old.test(newContent)) {
        newContent = newContent.replace(old, `${newCall} as Promise<${type}>`);
        changes.push(`הוחלף ${old.source} ל-dataLayer`);
      }
    });

    // הוספת ייבוא dataLayer אם יש שינויים
    if (changes.length > 0 && !newContent.includes('dataAccessLayer')) {
      const importMatch = newContent.match(/import.*from.*;/);
      if (importMatch) {
        const insertPoint = newContent.indexOf(importMatch[0]) + importMatch[0].length + 1;
        newContent = newContent.slice(0, insertPoint) + 
                   `import { dataLayer } from '../services/dataAccessLayer';\n` + 
                   newContent.slice(insertPoint);
        changes.push('נוסף ייבוא dataLayer לקומפוננט');
      }
    }

    return newContent;
  }

  // מיגרציה של כל השירותים
  async migrateAllServices() {
    console.log('🚀 מתחיל מיגרציה של כל השירותים...');

    const servicesDir = './src/services';
    const pagesDir = './src/pages';
    const componentsDir = './src/components';

    try {
      // מיגרציה של קבצי שירותים
      console.log('\n📁 מעביר קבצי שירותים...');
      const serviceFiles = fs.readdirSync(servicesDir)
        .filter(file => file.endsWith('Service.ts') && 
                        !file.includes('backup') && 
                        file !== 'frameworkService.ts') // דלג על frameworkService שכבר עובר
        .map(file => path.join(servicesDir, file));

      for (const file of serviceFiles) {
        const result = await this.migrateServiceFile(file);
        this.results.push(result);
      }

      // מיגרציה של קבצי דפים (דלג על FrameworkManagement שכבר עובר)
      console.log('\n📄 מעביר קבצי דפים...');
      const pageFiles = fs.readdirSync(pagesDir)
        .filter(file => file.endsWith('.tsx') && 
                        !file.includes('backup') && 
                        file !== 'FrameworkManagement.tsx')
        .map(file => path.join(pagesDir, file));

      for (const file of pageFiles) {
        const result = await this.migrateComponentFile(file);
        this.results.push(result);
      }

      // מיגרציה של קבצי קומפוננטים
      console.log('\n🧩 מעביר קבצי קומפוננטים...');
      const componentFiles = fs.readdirSync(componentsDir)
        .filter(file => file.endsWith('.tsx') && !file.includes('backup'))
        .map(file => path.join(componentsDir, file));

      for (const file of componentFiles) {
        const result = await this.migrateComponentFile(file);
        this.results.push(result);
      }

      this.printSummary();

    } catch (error) {
      console.error('❌ שגיאה כללית במיגרציה:', error.message);
    }
  }

  // הדפסת סיכום
  printSummary() {
    console.log('\n📊 סיכום מיגרציה:');
    console.log('='.repeat(50));

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

    console.log(`✅ הצליחו: ${successful.length}`);
    console.log(`❌ נכשלו: ${failed.length}`);
    console.log(`📝 סך שינויים: ${successful.reduce((sum, r) => sum + r.changes.length, 0)}`);

    if (failed.length > 0) {
      console.log('\n❌ קבצים שנכשלו:');
      failed.forEach(f => {
        console.log(`  - ${f.file}: ${f.errors.join(', ')}`);
      });
    }

    console.log('\n✨ המיגרציה הושלמה!');
    console.log('💡 בדוק את הקבצים ותקן TODO items במידת הצורך');
  }
}

// הרצה
const migrator = new ServiceMigrator();
migrator.migrateAllServices();
