const fs = require('fs');
const path = require('path');

function quickFixImports() {
  console.log('🔧 תיקון מהיר של ייבואים חסרים...');
  
  const servicesDir = './src/services';
  const serviceFiles = fs.readdirSync(servicesDir)
    .filter(file => file.endsWith('.ts') && !file.includes('backup'))
    .map(file => path.join(servicesDir, file));

  let totalFixed = 0;

  serviceFiles.forEach(file => {
    const fileName = path.basename(file);
    let content = fs.readFileSync(file, 'utf8');
    let fixed = false;
    
    // בדוק אם יש שימוש ב-dataLayer אבל אין ייבוא
    if (content.includes('dataLayer.') && !content.includes('dataAccessLayer')) {
      console.log(`🔍 מתקן ייבוא ב-${fileName}...`);
      
      // מצא את הייבוא הראשון
      const importMatch = content.match(/import.*from.*;/);
      if (importMatch) {
        const insertPoint = content.indexOf(importMatch[0]) + importMatch[0].length + 1;
        content = content.slice(0, insertPoint) + 
                 `import { dataLayer } from './dataAccessLayer';\n` + 
                 content.slice(insertPoint);
        
        fs.writeFileSync(file, content);
        console.log(`✅ תוקן ייבוא ב-${fileName}`);
        totalFixed++;
        fixed = true;
      }
    }
    
    if (!fixed) {
      console.log(`⚪ אין תיקונים ב-${fileName}`);
    }
  });
  
  console.log(`\n🎉 תוקנו ${totalFixed} קבצים`);
}

quickFixImports();
