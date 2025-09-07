import * as fs from 'fs';
import * as path from 'path';

interface MigrationResult {
  file: string;
  success: boolean;
  changes: string[];
  errors: string[];
}

interface ServiceMapping {
  serviceName: string;
  collectionName: string;
  entityType: string;
}

class ServiceMigrator {
  private serviceMappings: ServiceMapping[] = [
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

  private results: MigrationResult[] = [];

  // מיגרציה של קובץ שירות בודד
  async migrateServiceFile(filePath: string): Promise<MigrationResult> {
    const fileName = path.basename(filePath);

    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      
      // יצירת backup
      const backupPath = `${filePath}.backup`;
      fs.writeFileSync(backupPath, originalContent);

      let newContent = originalContent;
      const changes: string[] = [];

      // שלב 1: החלפת ייבואים
      newContent = this.replaceImports(newContent, changes);

      // שלב 2: החלפת פונקציות CRUD בסיסיות
      newContent = this.replaceCRUDFunctions(newContent, fileName, changes);

      // שלב 3: החלפת גישות ישירות ל-Firebase
      newContent = this.replaceDirectFirebaseAccess(newContent, changes);

      // שמירת הקובץ החדש
      fs.writeFileSync(filePath, newContent);

      
      return {
        file: fileName,
        success: true,
        changes,
        errors: []
      };

    } catch (error) {
      console.error(`❌ שגיאה ב-${fileName}:`, error);
      return {
        file: fileName,
        success: false,
        changes: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  // החלפת ייבואים
  private replaceImports(content: string, changes: string[]): string {
    let newContent = content;

    // הסרת ייבואים ישנים מ-Firebase
    const firebaseImportPatterns = [
      /import\s*\{\s*[^}]*\}\s*from\s*['"]firebase\/firestore['"];?\s*\n/g,
      /import\s*\{\s*db\s*\}\s*from\s*['"]\.\.\/firebase['"];?\s*\n/g,
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
  private replaceCRUDFunctions(content: string, fileName: string, changes: string[]): string {
    let newContent = content;
    
    // קבלת מיפוי השירות
    const mapping = this.serviceMappings.find(m => fileName.includes(m.serviceName));
    if (!mapping) {
      console.warn(`⚠️ לא נמצא מיפוי עבור ${fileName}`);
      return newContent;
    }

    const { collectionName, entityType } = mapping;

    // דפוסי החלפה עבור פונקציות getAll
    const getAllPatterns = [
      {
        old: new RegExp(`export\\s+const\\s+getAll${entityType}s?\\s*=\\s*async\\s*\\(\\)\\s*:\\s*Promise<${entityType}\\[\\]>\\s*=>\\s*\\{[^}]*return\\s+localStorageService\\.getFromLocalStorage\\([^}]+\\}\\);\\s*\\};`, 's'),
        new: `export const getAll${entityType}s = async (): Promise<${entityType}[]> => {\n  return dataLayer.getAll('${collectionName}') as Promise<${entityType}[]>;\n};`
      },
      {
        old: new RegExp(`export\\s+const\\s+getAll${entityType}s?\\s*=\\s*async\\s*\\(\\)\\s*:\\s*Promise<${entityType}\\[\\]>\\s*=>\\s*\\{[\\s\\S]*?\\}\\s*catch[\\s\\S]*?\\}[\\s\\S]*?\\};`, 'g'),
        new: `export const getAll${entityType}s = async (): Promise<${entityType}[]> => {\n  return dataLayer.getAll('${collectionName}') as Promise<${entityType}[]>;\n};`
      }
    ];

    // החלפת getAll
    getAllPatterns.forEach(pattern => {
      if (pattern.old.test(newContent)) {
        newContent = newContent.replace(pattern.old, pattern.new);
        changes.push(`הוחלף getAll${entityType}s לשימוש ב-dataLayer`);
      }
    });

    // החלפת getById
    const getByIdPattern = new RegExp(
      `export\\s+const\\s+get${entityType}ById\\s*=\\s*async\\s*\\([^)]+\\)\\s*:\\s*Promise<${entityType}\\s*\\|\\s*null>\\s*=>\\s*\\{[\\s\\S]*?\\};`, 'g'
    );
    
    if (getByIdPattern.test(newContent)) {
      const getByIdReplacement = `export const get${entityType}ById = async (id: string): Promise<${entityType} | null> => {\n  return dataLayer.getById('${collectionName}', id) as Promise<${entityType} | null>;\n};`;
      newContent = newContent.replace(getByIdPattern, getByIdReplacement);
      changes.push(`הוחלף get${entityType}ById לשימוש ב-dataLayer`);
    }

    // החלפת create
    const createPattern = new RegExp(
      `export\\s+const\\s+create${entityType}\\s*=\\s*async\\s*\\([^)]+\\)\\s*:\\s*Promise<[^>]+>\\s*=>\\s*\\{[\\s\\S]*?\\};`, 'g'
    );
    
    if (createPattern.test(newContent)) {
      const createReplacement = `export const create${entityType} = async (data: Omit<${entityType}, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {\n  return dataLayer.create('${collectionName}', data as any);\n};`;
      newContent = newContent.replace(createPattern, createReplacement);
      changes.push(`הוחלף create${entityType} לשימוש ב-dataLayer`);
    }

    // החלפת update
    const updatePattern = new RegExp(
      `export\\s+const\\s+update${entityType}\\s*=\\s*async\\s*\\([^)]+\\)\\s*:\\s*Promise<[^>]*>\\s*=>\\s*\\{[\\s\\S]*?\\};`, 'g'
    );
    
    if (updatePattern.test(newContent)) {
      const updateReplacement = `export const update${entityType} = async (id: string, updates: Partial<${entityType}>): Promise<void> => {\n  return dataLayer.update('${collectionName}', id, updates);\n};`;
      newContent = newContent.replace(updatePattern, updateReplacement);
      changes.push(`הוחלף update${entityType} לשימוש ב-dataLayer`);
    }

    // החלפת delete
    const deletePattern = new RegExp(
      `export\\s+const\\s+delete${entityType}\\s*=\\s*async\\s*\\([^)]+\\)\\s*:\\s*Promise<[^>]*>\\s*=>\\s*\\{[\\s\\S]*?\\};`, 'g'
    );
    
    if (deletePattern.test(newContent)) {
      const deleteReplacement = `export const delete${entityType} = async (id: string): Promise<void> => {\n  return dataLayer.delete('${collectionName}', id);\n};`;
      newContent = newContent.replace(deletePattern, deleteReplacement);
      changes.push(`הוחלף delete${entityType} לשימוש ב-dataLayer`);
    }

    return newContent;
  }

  // החלפת גישות ישירות ל-Firebase
  private replaceDirectFirebaseAccess(content: string, changes: string[]): string {
    let newContent = content;

    // דפוסים לגישות ישירות
    const directAccessPatterns = [
      {
        pattern: /const\s+\w+Ref\s*=\s*collection\(db,\s*['"][^'"]+['"]\);?\s*\n/g,
        description: 'הוסרו הגדרות collection refs'
      },
      {
        pattern: /const\s+\w+Ref\s*=\s*doc\(db,\s*['"][^'"]+['"],\s*[^)]+\);?\s*\n/g,
        description: 'הוסרו הגדרות doc refs'
      },
      {
        pattern: /await\s+getDocs\([^)]+\)/g,
        description: 'הוחלפו קריאות getDocs'
      },
      {
        pattern: /await\s+getDoc\([^)]+\)/g,
        description: 'הוחלפו קריאות getDoc'
      },
      {
        pattern: /await\s+addDoc\([^)]+\)/g,
        description: 'הוחלפו קריאות addDoc'
      },
      {
        pattern: /await\s+updateDoc\([^)]+\)/g,
        description: 'הוחלפו קריאות updateDoc'
      },
      {
        pattern: /await\s+deleteDoc\([^)]+\)/g,
        description: 'הוחלפו קריאות deleteDoc'
      }
    ];

    directAccessPatterns.forEach(({ pattern, description }) => {
      if (pattern.test(newContent)) {
        // במקום להחליף מיד, נמחק את הקווים הישנים ונסמן לתיקון ידני
        newContent = newContent.replace(pattern, '// TODO: החלף ל-dataLayer');
        changes.push(description);
      }
    });

    return newContent;
  }

  // מיגרציה של קובץ קומפוננט
  async migrateComponentFile(filePath: string): Promise<MigrationResult> {
    const fileName = path.basename(filePath);

    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      
      // יצירת backup
      const backupPath = `${filePath}.backup`;
      fs.writeFileSync(backupPath, originalContent);

      let newContent = originalContent;
      const changes: string[] = [];

      // החלפת ייבואים של שירותים
      newContent = this.replaceServiceImports(newContent, changes);

      // החלפת קריאות לשירותים
      newContent = this.replaceServiceCalls(newContent, changes);

      // שמירת הקובץ החדש
      fs.writeFileSync(filePath, newContent);

      
      return {
        file: fileName,
        success: true,
        changes,
        errors: []
      };

    } catch (error) {
      console.error(`❌ שגיאה בקומפוננט ${fileName}:`, error);
      return {
        file: fileName,
        success: false,
        changes: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  // החלפת ייבואים של שירותים בקומפוננטים
  private replaceServiceImports(content: string, changes: string[]): string {
    let newContent = content;

    // הוספת dataLayer אם משתמשים בשירותים רבים
    const serviceImportsCount = (newContent.match(/from\s+['"]\.\.\/services\/\w+Service['"]/g) || []).length;
    
    if (serviceImportsCount >= 2 && !newContent.includes('dataAccessLayer')) {
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

  // החלפת קריאות לשירותים בקומפוננטים
  private replaceServiceCalls(content: string, changes: string[]): string {
    let newContent = content;

    // רשימת החלפות עבור קריאות נפוצות
    const serviceCallReplacements = [
      { old: /getAllFrameworks\(\)/g, new: "dataLayer.getAll('frameworks')", type: 'Framework[]' },
      { old: /getAllSoldiers\(\)/g, new: "dataLayer.getAll('soldiers')", type: 'Soldier[]' },
      { old: /getAllActivities\(\)/g, new: "dataLayer.getAll('activities')", type: 'Activity[]' },
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

    return newContent;
  }

  // מיגרציה של כל השירותים
  async migrateAllServices(): Promise<void> {

    const servicesDir = './src/services';
    const pagesDir = './src/pages';
    const componentsDir = './src/components';

    try {
      // מיגרציה של קבצי שירותים
      console.log('\n📁 מעביר קבצי שירותים...');
      const serviceFiles = fs.readdirSync(servicesDir)
        .filter(file => file.endsWith('Service.ts') && !file.includes('backup'))
        .map(file => path.join(servicesDir, file));

      for (const file of serviceFiles) {
        const result = await this.migrateServiceFile(file);
        this.results.push(result);
      }

      // מיגרציה של קבצי דפים
      console.log('\n📄 מעביר קבצי דפים...');
      const pageFiles = fs.readdirSync(pagesDir)
        .filter(file => file.endsWith('.tsx') && !file.includes('backup'))
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
      console.error('❌ שגיאה כללית במיגרציה:', error);
    }
  }

  // הדפסת סיכום
  private printSummary(): void {
    console.log('='.repeat(50));

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

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

  // שחזור מ-backups
  async restoreFromBackups(): Promise<void> {
    
    const dirs = ['./src/services', './src/pages', './src/components'];
    
    dirs.forEach(dir => {
      const files = fs.readdirSync(dir);
      files.filter(file => file.endsWith('.backup')).forEach(backupFile => {
        const originalFile = backupFile.replace('.backup', '');
        const backupPath = path.join(dir, backupFile);
        const originalPath = path.join(dir, originalFile);
        
        const backupContent = fs.readFileSync(backupPath, 'utf8');
        fs.writeFileSync(originalPath, backupContent);
        console.log(`📁 שוחזר: ${originalFile}`);
      });
    });
    
  }
}

// יצוא למודול
export const serviceMigrator = new ServiceMigrator();

// הרצה ישירה אם זה הקובץ הראשי
if (require.main === module) {
  serviceMigrator.migrateAllServices();
}
