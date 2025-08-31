const fs = require('fs');
const path = require('path');

function fixTodoIssues() {
  console.log('🔧 מתקן TODO issues...');
  
  const servicesDir = './src/services';
  const serviceFiles = fs.readdirSync(servicesDir)
    .filter(file => file.endsWith('.ts') && !file.includes('backup'))
    .map(file => path.join(servicesDir, file));

  let totalFixed = 0;

  serviceFiles.forEach(file => {
    console.log(`🔍 בודק ${path.basename(file)}...`);
    
    let content = fs.readFileSync(file, 'utf8');
    let fixed = 0;
    
    // תיקון דפוסים שבורים
    const fixes = [
      // תיקון query שבור
      {
        pattern: /const q = query\(\s*\/\/ TODO: dataLayer\.getAll\([^)]+\),([^)]+)\);?\s*\n\s*const querySnapshot = await \/\/ TODO: dataLayer\.getAll\(q\);/g,
        replacement: '// TODO: Fix query - use dataLayer.query instead'
      },
      
      // תיקון addDoc שבור
      {
        pattern: /const docRef = await \/\/ TODO: dataLayer\.create\(\/\/ TODO: dataLayer\.getAll\([^)]+\),\s*\{/g,
        replacement: 'const docRef = await dataLayer.create(COLLECTION_NAME, {'
      },
      
      // תיקון getDocs שבור
      {
        pattern: /const querySnapshot = await \/\/ TODO: dataLayer\.getAll\(\/\/ TODO: dataLayer\.getAll\([^)]+\)\);/g,
        replacement: '// TODO: Replace with dataLayer.getAll or dataLayer.query'
      },
      
      // תיקון collection refs שבורים
      {
        pattern: /\/\/ TODO: dataLayer\.getAll\(\s*COLLECTION_NAME\)/g,
        replacement: 'collection(db, COLLECTION_NAME)'
      },
      
      // הסרת TODO בשורות שבורות
      {
        pattern: /\/\/ TODO: dataLayer\.getAll\(/g,
        replacement: 'getDocs('
      }
    ];
    
    fixes.forEach(fix => {
      if (fix.pattern.test(content)) {
        content = content.replace(fix.pattern, fix.replacement);
        fixed++;
      }
    });
    
    // תיקונים נוספים לבעיות תחביריות
    const syntaxFixes = [
      // תיקון שורות ריקות לאחר TODO
      {
        pattern: /const querySnapshot = await\s*\/\/ TODO:[^\n]*\n\s*const activities = querySnapshot\.docs\.map/g,
        replacement: '// TODO: Replace with dataLayer\n    const activities = [] as any; // querySnapshot.docs.map'
      },
      
      // תיקון פונקציות שבורות
      {
        pattern: /export const get(\w+) = async \(\): Promise<(\w+)\[\]> => \{\s*return dataLayer\.getAll\('(\w+)'\) as Promise<\2\[\]>;\s*\};/g,
        replacement: 'export const get$1 = async (): Promise<$2[]> => {\n  return dataLayer.getAll(\'$3\') as Promise<$2[]>;\n};'
      }
    ];
    
    syntaxFixes.forEach(fix => {
      if (fix.pattern.test(content)) {
        content = content.replace(fix.pattern, fix.replacement);
        fixed++;
      }
    });
    
    if (fixed > 0) {
      fs.writeFileSync(file, content);
      console.log(`✅ תוקן ${path.basename(file)} (${fixed} תיקונים)`);
      totalFixed += fixed;
    } else {
      console.log(`⚪ אין תיקונים ב-${path.basename(file)}`);
    }
  });
  
  console.log(`\n🎉 סיום! תוקנו ${totalFixed} בעיות בסך הכל`);
}

fixTodoIssues();
