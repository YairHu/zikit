const fs = require('fs');
const path = require('path');

class SmartMigrator {
  constructor() {
    this.serviceMappings = [
      { serviceName: 'soldierService', collectionName: 'soldiers', entityType: 'Soldier' },
      { serviceName: 'activityService', collectionName: 'activities', entityType: 'Activity' },
      { serviceName: 'dutyService', collectionName: 'duties', entityType: 'Duty' },
      { serviceName: 'tripService', collectionName: 'trips', entityType: 'Trip' },
      { serviceName: 'userService', collectionName: 'users', entityType: 'User' },
      { serviceName: 'missionService', collectionName: 'missions', entityType: 'Mission' },
      { serviceName: 'referralService', collectionName: 'referrals', entityType: 'Referral' },
      { serviceName: 'authService', collectionName: 'users', entityType: 'User' },
    ];
    this.results = [];
  }

  // מיגרציה חכמה של קובץ שירות
  async migrateServiceFileSmart(filePath) {
    const fileName = path.basename(filePath);
    console.log(`🧠 מיגרציה חכמה: ${fileName}`);

    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      
      // יצירת backup
      const backupPath = `${filePath}.backup-smart`;
      fs.writeFileSync(backupPath, originalContent);

      let newContent = originalContent;
      const changes = [];

      // שלב 1: החלפת ייבואים בזהירות
      newContent = this.smartReplaceImports(newContent, changes);

      // שלב 2: החלפת פונקציות בסיסיות בלבד
      newContent = this.smartReplaceFunctions(newContent, fileName, changes);

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

  // החלפת ייבואים חכמה
  smartReplaceImports(content, changes) {
    let newContent = content;

    // רק אם אין כבר ייבוא של dataLayer
    if (!newContent.includes('dataAccessLayer') && !newContent.includes('dataLayer')) {
      // הוספת ייבוא dataLayer אחרי הייבואים הקיימים
      const importMatch = newContent.match(/import.*from.*;\n/);
      if (importMatch) {
        const lastImportIndex = newContent.lastIndexOf(importMatch[0]) + importMatch[0].length;
        newContent = newContent.slice(0, lastImportIndex) + 
                   `import { dataLayer } from './dataAccessLayer';\n` + 
                   newContent.slice(lastImportIndex);
        changes.push('נוסף ייבוא dataLayer');
      }
    }

    return newContent;
  }

  // החלפת פונקציות בסיסיות בלבד
  smartReplaceFunctions(content, fileName, changes) {
    let newContent = content;
    
    const mapping = this.serviceMappings.find(m => fileName.includes(m.serviceName));
    if (!mapping) {
      console.warn(`⚠️ לא נמצא מיפוי עבור ${fileName}`);
      return newContent;
    }

    const { collectionName, entityType } = mapping;

    // החלפות בסיסיות בלבד - רק פונקציות פשוטות
    const basicReplacements = [
      // getAll פשוט
      {
        pattern: new RegExp(
          `export\\s+const\\s+getAll${entityType}s?\\s*=\\s*async\\s*\\(\\)\\s*:\\s*Promise<${entityType}\\[\\]>\\s*=>\\s*\\{\\s*return\\s+localStorageService\\.getFromLocalStorage\\([^}]+\\);\\s*\\};`,
          'gs'
        ),
        replacement: `export const getAll${entityType}s = async (): Promise<${entityType}[]> => {\n  return dataLayer.getAll('${collectionName}') as Promise<${entityType}[]>;\n};`
      },

      // getById פשוט
      {
        pattern: new RegExp(
          `export\\s+const\\s+get${entityType}ById\\s*=\\s*async\\s*\\([^)]+\\)\\s*:\\s*Promise<${entityType}\\s*\\|\\s*null>\\s*=>\\s*\\{[^}]*return\\s+[^}]+\\};`,
          'gs'
        ),
        replacement: `export const get${entityType}ById = async (id: string): Promise<${entityType} | null> => {\n  return dataLayer.getById('${collectionName}', id) as Promise<${entityType} | null>;\n};`
      },

      // create פשוט
      {
        pattern: new RegExp(
          `export\\s+const\\s+(add|create)${entityType}\\s*=\\s*async\\s*\\([^)]+\\)\\s*:\\s*Promise<[^>]+>\\s*=>\\s*\\{[\\s\\S]*?return\\s+[^}]+\\};`,
          'g'
        ),
        replacement: `export const create${entityType} = async (data: any): Promise<string> => {\n  return dataLayer.create('${collectionName}', data);\n};`
      },

      // update פשוט
      {
        pattern: new RegExp(
          `export\\s+const\\s+update${entityType}\\s*=\\s*async\\s*\\([^)]+\\)\\s*:\\s*Promise<[^>]*>\\s*=>\\s*\\{[\\s\\S]*?\\};`,
          'g'
        ),
        replacement: `export const update${entityType} = async (id: string, updates: any): Promise<void> => {\n  return dataLayer.update('${collectionName}', id, updates);\n};`
      },

      // delete פשוט
      {
        pattern: new RegExp(
          `export\\s+const\\s+(delete|remove)${entityType}\\s*=\\s*async\\s*\\([^)]+\\)\\s*:\\s*Promise<[^>]*>\\s*=>\\s*\\{[\\s\\S]*?\\};`,
          'g'
        ),
        replacement: `export const delete${entityType} = async (id: string): Promise<void> => {\n  return dataLayer.delete('${collectionName}', id);\n};`
      }
    ];

    // החלפות זהירות - רק אם הפונקציה פשוטה
    basicReplacements.forEach(({ pattern, replacement }) => {
      const matches = newContent.match(pattern);
      if (matches && matches.length > 0) {
        matches.forEach(match => {
          // בדוק שהפונקציה לא מורכבת מדי (מתחת ל-10 שורות)
          const lineCount = match.split('\n').length;
          if (lineCount <= 10) {
            newContent = newContent.replace(match, replacement);
            changes.push(`הוחלף ${entityType} function (${lineCount} שורות)`);
          } else {
            console.log(`⚠️ דולג על פונקציה מורכבת (${lineCount} שורות)`);
          }
        });
      }
    });

    return newContent;
  }

  // מיגרציה של רשימת שירותים
  async migrateSelectedServices(serviceNames) {
    console.log(`🎯 מתחיל מיגרציה חכמה של שירותים נבחרים: ${serviceNames.join(', ')}`);

    const servicesDir = './src/services';
    
    for (const serviceName of serviceNames) {
      const fileName = `${serviceName}.ts`;
      const filePath = path.join(servicesDir, fileName);
      
      if (fs.existsSync(filePath)) {
        const result = await this.migrateServiceFileSmart(filePath);
        this.results.push(result);
      } else {
        console.warn(`⚠️ קובץ לא נמצא: ${fileName}`);
      }
    }

    this.printSummary();
    return this.results;
  }

  // מיגרציה של קבצי pages (רק החלפות בסיסיות)
  async migratePageFiles(pageNames) {
    console.log(`📄 מתחיל מיגרציה של דפים: ${pageNames.join(', ')}`);

    const pagesDir = './src/pages';
    
    for (const pageName of pageNames) {
      const fileName = `${pageName}.tsx`;
      const filePath = path.join(pagesDir, fileName);
      
      if (fs.existsSync(filePath)) {
        const result = await this.migratePageFileSmart(filePath);
        this.results.push(result);
      }
    }

    return this.results;
  }

  // מיגרציה חכמה של קבצי pages
  async migratePageFileSmart(filePath) {
    const fileName = path.basename(filePath);
    console.log(`📄 מיגרציה חכמה של דף: ${fileName}`);

    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      
      // יצירת backup
      const backupPath = `${filePath}.backup-smart`;
      fs.writeFileSync(backupPath, originalContent);

      let newContent = originalContent;
      const changes = [];

      // רק החלפות בסיסיות של קריאות שירות
      const serviceCallReplacements = [
        { old: /getAllSoldiers\(\)/g, new: "dataLayer.getAll('soldiers') as Promise<Soldier[]>" },
        { old: /getAllActivities\(\)/g, new: "dataLayer.getAll('activities') as Promise<Activity[]>" },
        { old: /getAllDuties\(\)/g, new: "dataLayer.getAll('duties') as Promise<Duty[]>" },
        { old: /getAllTrips\(\)/g, new: "dataLayer.getAll('trips') as Promise<Trip[]>" },
        { old: /getAllUsers\(\)/g, new: "dataLayer.getAll('users') as Promise<User[]>" },
        { old: /getAllMissions\(\)/g, new: "dataLayer.getAll('missions') as Promise<Mission[]>" },
        { old: /getAllReferrals\(\)/g, new: "dataLayer.getAll('referrals') as Promise<Referral[]>" },
        { old: /getAllVehicles\(\)/g, new: "dataLayer.getAll('vehicles') as Promise<Vehicle[]>" },
        { old: /getAllForms\(\)/g, new: "dataLayer.getAll('forms') as Promise<Form[]>" },
      ];

      serviceCallReplacements.forEach(({ old, new: newCall }) => {
        if (old.test(newContent)) {
          newContent = newContent.replace(old, newCall);
          changes.push(`הוחלף ${old.source}`);
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
          changes.push('נוסף ייבוא dataLayer');
        }
      }

      if (changes.length > 0) {
        fs.writeFileSync(filePath, newContent);
        console.log(`✅ הושלם דף: ${fileName} (${changes.length} שינויים)`);
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
      console.error(`❌ שגיאה ב-${fileName}:`, error.message);
      return {
        file: fileName,
        success: false,
        changes: [],
        errors: [error.message]
      };
    }
  }

  // הדפסת סיכום
  printSummary() {
    console.log('\n📊 סיכום מיגרציה חכמה:');
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

    console.log('\n✨ המיגרציה החכמה הושלמה!');
  }

  // שחזור מ-backups חכמים
  async restoreFromSmartBackups() {
    console.log('🔄 משחזר מ-smart backups...');
    
    const dirs = ['./src/services', './src/pages'];
    
    dirs.forEach(dir => {
      const files = fs.readdirSync(dir);
      files.filter(file => file.endsWith('.backup-smart')).forEach(backupFile => {
        const originalFile = backupFile.replace('.backup-smart', '');
        const backupPath = path.join(dir, backupFile);
        const originalPath = path.join(dir, originalFile);
        
        const backupContent = fs.readFileSync(backupPath, 'utf8');
        fs.writeFileSync(originalPath, backupContent);
        console.log(`📁 שוחזר: ${originalFile}`);
      });
    });
    
    console.log('✅ השחזור הושלם');
  }
}

// יצוא
const smartMigrator = new SmartMigrator();

// בדיקה אם זה run ישיר
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--restore')) {
    smartMigrator.restoreFromSmartBackups();
  } else {
    // מיגרציה חכמה של שירותים בסיסיים
    const servicesToMigrate = [
      'soldierService',
      'activityService', 
      'dutyService',
      'missionService',
      'referralService',
      'tripService',
      'userService'
    ];
    
    smartMigrator.migrateSelectedServices(servicesToMigrate);
  }
}

module.exports = smartMigrator;
