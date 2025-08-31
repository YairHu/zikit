const fs = require('fs');
const path = require('path');

class AdvancedMigrator {
  constructor() {
    this.serviceMappings = [
      { serviceName: 'soldierService', collectionName: 'soldiers', entityType: 'Soldier' },
      { serviceName: 'activityService', collectionName: 'activities', entityType: 'Activity' },
      { serviceName: 'dutyService', collectionName: 'duties', entityType: 'Duty' },
      { serviceName: 'tripService', collectionName: 'trips', entityType: 'Trip' },
      { serviceName: 'userService', collectionName: 'users', entityType: 'User' },
    ];
    this.results = [];
  }

  // מיגרציה מתקדמת של קובץ שירות
  async migrateServiceAdvanced(filePath) {
    const fileName = path.basename(filePath);
    console.log(`🔧 מיגרציה מתקדמת: ${fileName}`);

    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      
      // יצירת backup
      const backupPath = `${filePath}.backup-advanced`;
      fs.writeFileSync(backupPath, originalContent);

      let newContent = originalContent;
      const changes = [];

      // שלב 1: ניקוי ייבואים ישנים והוספת dataLayer
      newContent = this.cleanAndAddImports(newContent, changes);

      // שלב 2: החלפת פונקציות בסיסיות
      newContent = this.replaceBasicPatterns(newContent, fileName, changes);

      // שלב 3: החלפת פונקציות מורכבות
      newContent = this.replaceComplexPatterns(newContent, fileName, changes);

      // שלב 4: ניקוי קריאות מיותרות
      newContent = this.cleanupUnnecessaryCalls(newContent, changes);

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

  // ניקוי ייבואים והוספת dataLayer
  cleanAndAddImports(content, changes) {
    let newContent = content;

    // הסרת ייבואים מיותרים של Firebase
    const firebaseImportsToRemove = [
      'collection', 'getDocs', 'addDoc', 'doc', 'getDoc', 
      'updateDoc', 'deleteDoc', 'query', 'where', 'orderBy',
      'limit', 'startAfter', 'Timestamp'
    ];

    firebaseImportsToRemove.forEach(importName => {
      // הסרה מתוך import מרוכב
      const importRegex = new RegExp(`\\s*,?\\s*${importName}\\s*,?`, 'g');
      newContent = newContent.replace(importRegex, (match) => {
        if (match.includes(',')) {
          return match.replace(importName, '').replace(/,\s*,/, ',').replace(/,\s*$/, '');
        }
        return '';
      });
      
      // ניקוי import ריק
      newContent = newContent.replace(/import\s*{\s*}\s*from\s*['"][^'"]*['"];?\s*\n?/g, '');
    });

    // הסרת ייבואים מיותרים של cacheService
    const cacheImportsToRemove = ['localStorageService', 'updateTableTimestamp'];
    cacheImportsToRemove.forEach(importName => {
      const importRegex = new RegExp(`\\s*,?\\s*${importName}\\s*,?`, 'g');
      newContent = newContent.replace(importRegex, (match) => {
        if (match.includes(',')) {
          return match.replace(importName, '').replace(/,\s*,/, ',').replace(/,\s*$/, '');
        }
        return '';
      });
    });

    // הוספת ייבוא dataLayer אם לא קיים
    if (!newContent.includes('dataAccessLayer')) {
      const firebaseImportMatch = newContent.match(/import.*from\s*['"].*firebase.*['"];?\s*\n/);
      if (firebaseImportMatch) {
        const insertPoint = newContent.indexOf(firebaseImportMatch[0]) + firebaseImportMatch[0].length;
        newContent = newContent.slice(0, insertPoint) + 
                   `import { dataLayer } from './dataAccessLayer';\n` + 
                   newContent.slice(insertPoint);
        changes.push('נוסף ייבוא dataLayer');
      }
    }

    return newContent;
  }

  // החלפת דפוסים בסיסיים
  replaceBasicPatterns(content, fileName, changes) {
    let newContent = content;
    
    const mapping = this.serviceMappings.find(m => fileName.includes(m.serviceName));
    if (!mapping) return newContent;

    const { collectionName } = mapping;

    // החלפות בסיסיות של Firebase calls
    const basicReplacements = [
      // collection(db, 'collection_name') -> 'collection_name'
      {
        pattern: new RegExp(`collection\\(db,\\s*['"]${collectionName}['"]\\)`, 'g'),
        replacement: `'${collectionName}'`,
        description: 'החלפת collection reference'
      },
      
      // getDocs(collection(...)) -> dataLayer.getAll()
      {
        pattern: new RegExp(`getDocs\\(collection\\(db,\\s*['"]${collectionName}['"]\\)\\)`, 'g'),
        replacement: `dataLayer.getAll('${collectionName}')`,
        description: 'החלפת getDocs basic'
      },

      // getDoc(doc(db, collection, id)) -> dataLayer.getById()
      {
        pattern: new RegExp(`getDoc\\(doc\\(db,\\s*['"]${collectionName}['"],\\s*([^)]+)\\)\\)`, 'g'),
        replacement: `dataLayer.getById('${collectionName}', $1)`,
        description: 'החלפת getDoc'
      },

      // addDoc(collection(...), data) -> dataLayer.create()
      {
        pattern: new RegExp(`addDoc\\(collection\\(db,\\s*['"]${collectionName}['"]\\),\\s*([^)]+)\\)`, 'g'),
        replacement: `dataLayer.create('${collectionName}', $1)`,
        description: 'החלפת addDoc'
      },

      // updateDoc(doc(...), data) -> dataLayer.update()
      {
        pattern: new RegExp(`updateDoc\\(doc\\(db,\\s*['"]${collectionName}['"],\\s*([^,]+)\\),\\s*([^)]+)\\)`, 'g'),
        replacement: `dataLayer.update('${collectionName}', $1, $2)`,
        description: 'החלפת updateDoc'
      },

      // deleteDoc(doc(...)) -> dataLayer.delete()
      {
        pattern: new RegExp(`deleteDoc\\(doc\\(db,\\s*['"]${collectionName}['"],\\s*([^)]+)\\)\\)`, 'g'),
        replacement: `dataLayer.delete('${collectionName}', $1)`,
        description: 'החלפת deleteDoc'
      }
    ];

    basicReplacements.forEach(({ pattern, replacement, description }) => {
      const matches = newContent.match(pattern);
      if (matches) {
        newContent = newContent.replace(pattern, replacement);
        changes.push(`${description} (${matches.length} מקרים)`);
      }
    });

    return newContent;
  }

  // החלפת דפוסים מורכבים
  replaceComplexPatterns(content, fileName, changes) {
    let newContent = content;
    
    const mapping = this.serviceMappings.find(m => fileName.includes(m.serviceName));
    if (!mapping) return newContent;

    const { collectionName } = mapping;

    // החלפת queries מורכבים
    const complexReplacements = [
      // query with where -> dataLayer.query
      {
        pattern: new RegExp(
          `const\\s+(\\w+)\\s*=\\s*query\\(\\s*collection\\(db,\\s*['"]${collectionName}['"]\\)\\s*,\\s*where\\(([^)]+)\\)\\s*(?:,\\s*orderBy\\(([^)]+)\\))?\\s*\\);?\\s*\\n?\\s*const\\s+(\\w+)\\s*=\\s*await\\s+getDocs\\(\\1\\);`,
          'gs'
        ),
        replacement: (match, queryVar, whereClause, orderByClause, snapshotVar) => {
          let queryOptions = `{ where: [{ field: ${whereClause.split(',')[0].trim()}, operator: ${whereClause.split(',')[1].trim()}, value: ${whereClause.split(',')[2].trim()} }]`;
          if (orderByClause) {
            const orderParts = orderByClause.split(',');
            queryOptions += `, orderBy: [{ field: ${orderParts[0].trim()}, direction: ${orderParts[1] ? orderParts[1].trim() : "'asc'"} }]`;
          }
          queryOptions += ' }';
          return `const ${snapshotVar} = await dataLayer.query('${collectionName}', ${queryOptions});`;
        },
        description: 'החלפת query מורכב עם where'
      },

      // localStorageService.getFromLocalStorage calls
      {
        pattern: new RegExp(
          `return\\s+localStorageService\\.getFromLocalStorage\\(\\s*['"]${collectionName}['"]\\s*,\\s*async\\s*\\(\\)\\s*=>\\s*\\{[\\s\\S]*?\\}\\s*(?:,\\s*[^)]+)?\\s*\\);`,
          'g'
        ),
        replacement: `return dataLayer.getAll('${collectionName}');`,
        description: 'החלפת localStorageService wrapper'
      }
    ];

    complexReplacements.forEach(({ pattern, replacement, description }) => {
      if (typeof replacement === 'function') {
        const matches = newContent.match(pattern);
        if (matches) {
          newContent = newContent.replace(pattern, replacement);
          changes.push(`${description} (${matches.length} מקרים)`);
        }
      } else {
        const matches = newContent.match(pattern);
        if (matches) {
          newContent = newContent.replace(pattern, replacement);
          changes.push(`${description} (${matches.length} מקרים)`);
        }
      }
    });

    return newContent;
  }

  // ניקוי קריאות מיותרות
  cleanupUnnecessaryCalls(content, changes) {
    let newContent = content;

    // הסרת updateTableTimestamp calls
    const timestampPattern = /await\s+updateTableTimestamp\([^)]+\);\s*\n?/g;
    const timestampMatches = newContent.match(timestampPattern);
    if (timestampMatches) {
      newContent = newContent.replace(timestampPattern, '');
      changes.push(`הוסרו ${timestampMatches.length} קריאות updateTableTimestamp`);
    }

    // הסרת localStorageService.invalidateLocalStorage calls  
    const invalidatePattern = /localStorageService\.invalidateLocalStorage\([^)]+\);\s*\n?/g;
    const invalidateMatches = newContent.match(invalidatePattern);
    if (invalidateMatches) {
      newContent = newContent.replace(invalidatePattern, '');
      changes.push(`הוסרו ${invalidateMatches.length} קריאות invalidateLocalStorage`);
    }

    // ניקוי console.log של local storage
    const consolePattern = /console\.log\(['"][^'"]*LOCAL_STORAGE[^'"]*['"][^)]*\);\s*\n?/g;
    const consoleMatches = newContent.match(consolePattern);
    if (consoleMatches) {
      newContent = newContent.replace(consolePattern, '');
      changes.push(`הוסרו ${consoleMatches.length} console.log מיותרים`);
    }

    return newContent;
  }

  // מיגרציה של רשימת שירותים
  async migrateAdvancedServices(serviceNames) {
    console.log(`🎯 מתחיל מיגרציה מתקדמת של: ${serviceNames.join(', ')}`);

    const servicesDir = './src/services';
    
    for (const serviceName of serviceNames) {
      const fileName = `${serviceName}.ts`;
      const filePath = path.join(servicesDir, fileName);
      
      if (fs.existsSync(filePath)) {
        const result = await this.migrateServiceAdvanced(filePath);
        this.results.push(result);
      } else {
        console.warn(`⚠️ קובץ לא נמצא: ${fileName}`);
      }
    }

    this.printSummary();
    return this.results;
  }

  // הדפסת סיכום
  printSummary() {
    console.log('\n📊 סיכום מיגרציה מתקדמת:');
    console.log('='.repeat(50));

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

    console.log(`✅ הצליחו: ${successful.length}`);
    console.log(`❌ נכשלו: ${failed.length}`);
    console.log(`📝 סך שינויים: ${successful.reduce((sum, r) => sum + r.changes.length, 0)}`);

    successful.forEach(s => {
      console.log(`\n📄 ${s.file}:`);
      s.changes.forEach(change => console.log(`  ✓ ${change}`));
    });

    if (failed.length > 0) {
      console.log('\n❌ קבצים שנכשלו:');
      failed.forEach(f => {
        console.log(`  - ${f.file}: ${f.errors.join(', ')}`);
      });
    }

    console.log('\n✨ המיגרציה המתקדמת הושלמה!');
  }

  // שחזור מ-backups מתקדמים
  async restoreFromAdvancedBackups() {
    console.log('🔄 משחזר מ-advanced backups...');
    
    const dirs = ['./src/services'];
    
    dirs.forEach(dir => {
      const files = fs.readdirSync(dir);
      files.filter(file => file.endsWith('.backup-advanced')).forEach(backupFile => {
        const originalFile = backupFile.replace('.backup-advanced', '');
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
const advancedMigrator = new AdvancedMigrator();

// בדיקה אם זה run ישיר
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--restore')) {
    advancedMigrator.restoreFromAdvancedBackups();
  } else {
    // מיגרציה מתקדמת של שירותים מורכבים
    const servicesToMigrate = [
      'soldierService',
      'dutyService'  // נתחיל עם השניים הפחות מורכבים
    ];
    
    advancedMigrator.migrateAdvancedServices(servicesToMigrate);
  }
}

module.exports = advancedMigrator;
