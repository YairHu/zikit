import * as fs from 'fs';
import * as path from 'path';

// דפוסי רגקס לזיהוי שימושים ישנים
const OLD_PATTERNS = {
  // ייבואים ישנים
  imports: {
    firebase: /import.*from ['"]firebase\/firestore['"];?\s*\n/g,
    firebaseDb: /import.*\{[^}]*db[^}]*\}.*from ['"]\.\.\/firebase['"];?\s*\n/g,
    oldServices: /import.*\{[^}]*\}.*from ['"]\.\.\/services\/\w+Service['"];?\s*\n/g,
  },
  
  // קריאות ישנות לשירותים
  serviceCalls: {
    getAll: /(await\s+)?get(All)?(\w+)\(\)/g,
    getById: /(await\s+)?get(\w+)ById\(([^)]+)\)/g,
    create: /(await\s+)?create(\w+)\(([^)]+)\)/g,
    update: /(await\s+)?update(\w+)\(([^)]+)\)/g,
    delete: /(await\s+)?delete(\w+)\(([^)]+)\)/g,
  },
  
  // גישות ישירות ל-Firebase
  directFirebase: {
    collection: /collection\(db,\s*['"]([^'"]+)['"]\)/g,
    doc: /doc\(db,\s*['"]([^'"]+)['"],\s*([^)]+)\)/g,
    getDocs: /getDocs\([^)]+\)/g,
    getDoc: /getDoc\([^)]+\)/g,
    addDoc: /addDoc\([^)]+\)/g,
    updateDoc: /updateDoc\([^)]+\)/g,
    deleteDoc: /deleteDoc\([^)]+\)/g,
  }
};

// דפוסי החלפה חדשים
const NEW_PATTERNS = {
  imports: {
    dataLayer: `import { dataLayer } from '../services/dataAccessLayer';\n`,
    types: `import { BaseEntity } from '../services/dataAccessLayer';\n`,
  },
  
  serviceCalls: {
    getAll: (entityName: string) => `dataLayer.getAll<${entityName}>('${entityName.toLowerCase()}s')`,
    getById: (entityName: string, id: string) => `dataLayer.getById<${entityName}>('${entityName.toLowerCase()}s', ${id})`,
    create: (entityName: string, data: string) => `dataLayer.create('${entityName.toLowerCase()}s', ${data})`,
    update: (entityName: string, id: string, data: string) => `dataLayer.update('${entityName.toLowerCase()}s', ${id}, ${data})`,
    delete: (entityName: string, id: string) => `dataLayer.delete('${entityName.toLowerCase()}s', ${id})`,
  }
};

interface MigrationResult {
  success: boolean;
  changes: string[];
  errors: string[];
  originalBackup?: string;
}

export class ServiceMigrationTool {
  private basePath: string;
  
  constructor(basePath: string = './src') {
    this.basePath = basePath;
  }

  // זיהוי כל הקבצים שצריכים מעבר
  async findFilesToMigrate(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules')) {
          scanDirectory(fullPath);
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // בדוק אם הקובץ משתמש בשירותים ישנים
          if (this.needsMigration(content)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    scanDirectory(this.basePath);
    return files;
  }

  // בדיקה האם קובץ צריך מעבר
  private needsMigration(content: string): boolean {
    // בדוק אם יש שימוש בשירותים ישנים או Firebase ישיר
    const hasOldServiceImports = /import.*from ['"]\.\.\/services\/\w+Service['"]/.test(content);
    const hasDirectFirebase = /import.*from ['"]firebase\/firestore['"]/.test(content);
    const hasServiceCalls = /(getAll|getById|create|update|delete)\w*\(/.test(content);
    
    return hasOldServiceImports || hasDirectFirebase || hasServiceCalls;
  }

  // מעבר קובץ בודד
  async migrateFile(filePath: string): Promise<MigrationResult> {
    console.log(`🔄 [MIGRATION] מתחיל מעבר: ${filePath}`);
    
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      const backupPath = `${filePath}.backup`;
      
      // יצירת backup
      fs.writeFileSync(backupPath, originalContent);
      
      let newContent = originalContent;
      const changes: string[] = [];
      
      // מעבר שלב 1: החלפת ייבואים
      newContent = this.migrateImports(newContent, changes);
      
      // מעבר שלב 2: החלפת קריאות שירות
      newContent = this.migrateServiceCalls(newContent, changes);
      
      // מעבר שלב 3: החלפת גישות ישירות ל-Firebase
      newContent = this.migrateDirectFirebaseAccess(newContent, changes);
      
      // שמירת הקובץ החדש
      fs.writeFileSync(filePath, newContent);
      
      console.log(`✅ [MIGRATION] הושלם בהצלחה: ${filePath}`);
      console.log(`📝 [MIGRATION] שינויים: ${changes.length}`);
      changes.forEach(change => console.log(`   - ${change}`));
      
      return {
        success: true,
        changes,
        errors: [],
        originalBackup: backupPath
      };
      
    } catch (error) {
      console.error(`❌ [MIGRATION] שגיאה במעבר ${filePath}:`, error);
      return {
        success: false,
        changes: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  // החלפת ייבואים
  private migrateImports(content: string, changes: string[]): string {
    let newContent = content;
    
    // הסרת ייבואים ישנים מ-Firebase
    const firebaseImportRegex = /import\s*\{[^}]*\}\s*from\s*['"]firebase\/firestore['"];?\s*\n/g;
    const firebaseMatches = newContent.match(firebaseImportRegex);
    if (firebaseMatches) {
      newContent = newContent.replace(firebaseImportRegex, '');
      changes.push('הוסר ייבוא Firebase ישיר');
    }

    // הסרת ייבוא db מ-firebase.ts
    const dbImportRegex = /import\s*\{[^}]*\bdb\b[^}]*\}\s*from\s*['"]\.\.\/firebase['"];?\s*\n/g;
    const dbMatches = newContent.match(dbImportRegex);
    if (dbMatches) {
      newContent = newContent.replace(dbImportRegex, '');
      changes.push('הוסר ייבוא db ישיר');
    }

    // הוספת ייבוא dataLayer אם לא קיים
    if (!newContent.includes('dataAccessLayer')) {
      // מצא את מקום הייבואים הראשון
      const importMatch = newContent.match(/import.*from.*;/);
      if (importMatch) {
        const insertPoint = newContent.indexOf(importMatch[0]) + importMatch[0].length + 1;
        newContent = newContent.slice(0, insertPoint) + 
                   NEW_PATTERNS.imports.dataLayer + 
                   newContent.slice(insertPoint);
        changes.push('נוסף ייבוא dataLayer');
      }
    }

    return newContent;
  }

  // החלפת קריאות שירות
  private migrateServiceCalls(content: string, changes: string[]): string {
    let newContent = content;
    
    // זיהוי והחלפת קריאות getAll
    const getAllRegex = /(await\s+)?getAll(\w+)\(\)/g;
    newContent = newContent.replace(getAllRegex, (match, awaitPart, entityName) => {
      const newCall = `${awaitPart || ''}${NEW_PATTERNS.serviceCalls.getAll(entityName)}`;
      changes.push(`הוחלף ${match} ל-${newCall}`);
      return newCall;
    });

    // זיהוי והחלפת קריאות getById
    const getByIdRegex = /(await\s+)?get(\w+)ById\(([^)]+)\)/g;
    newContent = newContent.replace(getByIdRegex, (match, awaitPart, entityName, id) => {
      const newCall = `${awaitPart || ''}${NEW_PATTERNS.serviceCalls.getById(entityName, id)}`;
      changes.push(`הוחלף ${match} ל-${newCall}`);
      return newCall;
    });

    // זיהוי והחלפת קריאות create
    const createRegex = /(await\s+)?create(\w+)\(([^)]+)\)/g;
    newContent = newContent.replace(createRegex, (match, awaitPart, entityName, data) => {
      const newCall = `${awaitPart || ''}${NEW_PATTERNS.serviceCalls.create(entityName, data)}`;
      changes.push(`הוחלף ${match} ל-${newCall}`);
      return newCall;
    });

    // זיהוי והחלפת קריאות update
    const updateRegex = /(await\s+)?update(\w+)\(([^,]+),\s*([^)]+)\)/g;
    newContent = newContent.replace(updateRegex, (match, awaitPart, entityName, id, data) => {
      const newCall = `${awaitPart || ''}${NEW_PATTERNS.serviceCalls.update(entityName, id, data)}`;
      changes.push(`הוחלף ${match} ל-${newCall}`);
      return newCall;
    });

    // זיהוי והחלפת קריאות delete
    const deleteRegex = /(await\s+)?delete(\w+)\(([^)]+)\)/g;
    newContent = newContent.replace(deleteRegex, (match, awaitPart, entityName, id) => {
      const newCall = `${awaitPart || ''}${NEW_PATTERNS.serviceCalls.delete(entityName, id)}`;
      changes.push(`הוחלף ${match} ל-${newCall}`);
      return newCall;
    });

    return newContent;
  }

  // החלפת גישות ישירות ל-Firebase
  private migrateDirectFirebaseAccess(content: string, changes: string[]): string {
    let newContent = content;
    
    // הסרת שימושים ישירים ב-collection, doc, etc.
    const directFirebasePatterns = [
      { pattern: /collection\(db,\s*['"]([^'"]+)['"]\)/g, replacement: 'dataLayer.collection("$1")' },
      { pattern: /getDocs\(/g, replacement: 'dataLayer.getAll(' },
      { pattern: /addDoc\(/g, replacement: 'dataLayer.create(' },
      { pattern: /updateDoc\(/g, replacement: 'dataLayer.update(' },
      { pattern: /deleteDoc\(/g, replacement: 'dataLayer.delete(' },
    ];

    directFirebasePatterns.forEach(({ pattern, replacement }) => {
      if (pattern.test(newContent)) {
        newContent = newContent.replace(pattern, replacement);
        changes.push(`הוחלפו גישות ישירות ל-Firebase`);
      }
    });

    return newContent;
  }

  // מעבר כל הקבצים
  async migrateAllFiles(): Promise<{ successful: string[]; failed: string[] }> {
    const filesToMigrate = await this.findFilesToMigrate();
    console.log(`🎯 [MIGRATION] נמצאו ${filesToMigrate.length} קבצים למעבר`);
    
    const successful: string[] = [];
    const failed: string[] = [];
    
    for (const filePath of filesToMigrate) {
      const result = await this.migrateFile(filePath);
      if (result.success) {
        successful.push(filePath);
      } else {
        failed.push(filePath);
      }
    }
    
    console.log(`📊 [MIGRATION] סיכום: ${successful.length} הצליחו, ${failed.length} נכשלו`);
    
    return { successful, failed };
  }

  // שחזור מ-backup
  async restoreFromBackup(filePath: string): Promise<boolean> {
    const backupPath = `${filePath}.backup`;
    
    try {
      if (fs.existsSync(backupPath)) {
        const backupContent = fs.readFileSync(backupPath, 'utf8');
        fs.writeFileSync(filePath, backupContent);
        console.log(`🔄 [MIGRATION] שוחזר מ-backup: ${filePath}`);
        return true;
      } else {
        console.error(`❌ [MIGRATION] לא נמצא backup עבור: ${filePath}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ [MIGRATION] שגיאה בשחזור ${filePath}:`, error);
      return false;
    }
  }

  // ניקוי backups
  async cleanupBackups(): Promise<void> {
    const backupFiles = await this.findBackupFiles();
    
    for (const backupFile of backupFiles) {
      try {
        fs.unlinkSync(backupFile);
        console.log(`🗑️ [MIGRATION] נמחק backup: ${backupFile}`);
      } catch (error) {
        console.error(`❌ [MIGRATION] שגיאה במחיקת backup ${backupFile}:`, error);
      }
    }
  }

  // מציאת קבצי backup
  private async findBackupFiles(): Promise<string[]> {
    const backupFiles: string[] = [];
    
    const scanDirectory = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules')) {
          scanDirectory(fullPath);
        } else if (item.endsWith('.backup')) {
          backupFiles.push(fullPath);
        }
      }
    };
    
    scanDirectory(this.basePath);
    return backupFiles;
  }
}

// יצירת מופע וייצוא
export const migrationTool = new ServiceMigrationTool();

// פונקציות עזר לשימוש מהירה
export const migrateFrameworkManagement = () => 
  migrationTool.migrateFile('./src/pages/FrameworkManagement.tsx');

export const migrateAllServices = () => 
  migrationTool.migrateAllFiles();

export const restoreAll = async () => {
  const filesToRestore = await migrationTool.findFilesToMigrate();
  for (const file of filesToRestore) {
    await migrationTool.restoreFromBackup(file);
  }
};
