import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  TableChart as TableIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { getAllSoldiers } from '../services/soldierService';
import { getAllVehicles } from '../services/vehicleService';
import { 
  importSoldiers, 
  importVehicles,
  importBraurTestResults
} from '../services/importService';

interface DataTable {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  getData: () => Promise<any[]>;
  exportData: (data: any[]) => void;
  importData: (data: any[]) => Promise<{ 
    success: number; 
    updated: number;
    errors: string[]; 
    successRows: any[];
    updatedRows: any[];
    errorRows: any[];
  }>;
  getTemplate: () => any[];
}

const DataImportExport: React.FC = () => {
  const { user } = useUser();
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<{
    success: number;
    updated: number;
    errors: string[];
    successRows: any[];
    updatedRows: any[];
    errorRows: any[];
  } | null>(null);

  // הגדרת הטבלאות הזמינות
  const dataTables: DataTable[] = [
    {
      id: 'soldiers',
      name: 'חיילים',
      description: 'נתוני חיילים במערכת',
      icon: <TableIcon />,
      getData: getAllSoldiers,
      exportData: (data) => exportToCSV(data, 'soldiers'),
      importData: async (data) => {
        if (!user?.uid) throw new Error('משתמש לא מחובר');
        
        // מיפוי כותרות עבריות לאנגליות
        console.log('📊 נתונים מקוריים:', data[0]); // לוג של השורה הראשונה
        const mappedData = data.map(row => ({
          name: row['שם מלא'] || row.name,
          personalNumber: row['מספר אישי'] || row.personalNumber,
          rank: row['דרגה'] || row.rank,
          role: row['תפקיד'] || row.role,
          profile: row['פרופיל רפואי'] || row.profile,
          qualifications: row['כשירויות'] || row.qualifications,
          drivingLicenses: row['היתרים לנהיגה'] || row.drivingLicenses,
          family: row['משפחה'] || row.family,
          email: row['email'] || row.email,
          phone: row['טלפון'] || row.phone,
          birthDate: row['תאריך לידה'] || row.birthDate,
          address: row['כתובת'] || row.address,
          additionalInfo: row['מידע נוסף'] || row.additionalInfo
        }));
        console.log('📊 נתונים ממופים:', mappedData[0]); // לוג של השורה הראשונה אחרי מיפוי
        
        const result = await importSoldiers(mappedData, user.uid);
        return result;
      },
      getTemplate: () => [
        {
          name: 'שם מלא',
          personalNumber: 'מספר אישי',
          rank: 'דרגה',
          role: 'תפקיד',
          profile: 'פרופיל רפואי',
          qualifications: 'כשירויות (מופרד בפסיקים)',
          drivingLicenses: 'היתרים לנהיגה (מופרד בפסיקים)',
          family: 'משפחה',
          email: 'אימייל',
          phone: 'טלפון',
          birthDate: 'תאריך לידה',
          address: 'כתובת',
          additionalInfo: 'מידע נוסף'
        }
      ]
    },
    {
      id: 'vehicles',
      name: 'רכבים',
      description: 'נתוני רכבים במערכת',
      icon: <TableIcon />,
      getData: getAllVehicles,
      exportData: (data) => exportToCSV(data, 'vehicles'),
      importData: async (data) => {
        if (!user?.uid) throw new Error('משתמש לא מחובר');
        const result = await importVehicles(data, user.uid);
        return result;
      },
      getTemplate: () => [
        {
          vehicleNumber: 'מספר רכב',
          type: 'סוג רכב',
          mileage: 'קילומטרז',
          nextMaintenance: 'תחזוקה הבאה (תאריך)',
          seats: 'מספר מקומות',
          requiredLicense: 'היתר נדרש לנהיגה'
        }
      ]
    },
    {
      id: 'braur-test',
      name: 'מבחני בראור',
      description: 'תוצאות מבחני בראור לחיילים',
      icon: <TableIcon />,
      getData: async () => {
        // נחזיר רשימה ריקה כי אין טבלה נפרדת למבחני בראור
        return [];
      },
      exportData: (data) => exportToCSV(data, 'braur-test'),
      importData: async (data) => {
        if (!user?.uid) throw new Error('משתמש לא מחובר');
        const result = await importBraurTestResults(data, user.uid);
        return result;
      },
      getTemplate: () => [
        {
          personalNumber: 'מספר אישי',
          name: 'שם',
          strengthResult: 'תוצאה כח',
          runningResult: 'תוצאה ריצה'
        }
      ]
    }
  ];

  // פונקציה לייצוא ל-CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert('אין נתונים לייצוא');
      return;
    }

    const headers = Object.keys(data[0]);
    
    // פונקציה עזר לעיבוד ערכים
    const processValue = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }
      
      // טיפול במערכים
      if (Array.isArray(value)) {
        const arrayString = value.map(v => String(v)).join('; ');
        return `"${arrayString.replace(/"/g, '""')}"`;
      }
      
      // טיפול באובייקטים (כמו timestamp, dates וכו')
      if (typeof value === 'object') {
        // טיפול מיוחד בתאריכים
        if (value instanceof Date) {
          return value.toISOString();
        }
        
        // טיפול באובייקטים עם toDate (Firestore Timestamp)
        if (value.toDate && typeof value.toDate === 'function') {
          return value.toDate().toISOString();
        }
        
        // טיפול באובייקטים אחרים
        const objectString = JSON.stringify(value);
        return `"${objectString.replace(/"/g, '""')}"`;
      }
      
      // המרת הערך למחרוזת
      const stringValue = String(value);
      
      // בדיקה אם צריך לעטוף בגרשיים
      if (stringValue.includes(',') || 
          stringValue.includes('"') || 
          stringValue.includes('\n') || 
          stringValue.includes('\r') ||
          stringValue.includes(';')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    };

    const csvContent = [
      headers.map(header => `"${header}"`).join(','), // עטיפת כותרות בגרשיים
      ...data.map(row => 
        headers.map(header => processValue(row[header])).join(',')
      )
    ].join('\n');

    // הוספת BOM לתמיכה מושלמת בעברית ב-Excel
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    // יצירת קובץ עם קידוד UTF-8 מפורש
    const blob = new Blob([csvWithBOM], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // ניקוי זיכרון
    URL.revokeObjectURL(url);
  };

  // פונקציה לייצוא תבנית ריקה
  const exportTemplate = () => {
    const table = dataTables.find(t => t.id === selectedTable);
    if (!table) return;

    const template = table.getTemplate();
    exportToCSV(template, `${selectedTable}_template`);
  };

  // פונקציה לקריאת קובץ CSV
  const readCSVFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          
          // הסרת BOM אם קיים
          const cleanCsv = csv.replace(/^\uFEFF/, '');
          
          // בדיקה אם הקובץ מכיל תווים בעברית תקינים
          const hebrewRegex = /[\u0590-\u05FF]/;
          if (!hebrewRegex.test(cleanCsv)) {
            console.warn('לא נמצאו תווים בעברית בקובץ - ייתכן שיש בעיה בקידוד');
          }
          
          const lines = cleanCsv.split(/\r?\n/); // תמיכה ב-CRLF ו-LF
          if (lines.length === 0) {
            throw new Error('הקובץ ריק או לא תקין');
          }
          
          const headers = parseCSVLine(lines[0]);
          if (headers.length === 0) {
            throw new Error('לא נמצאו כותרות בקובץ');
          }
          
          console.log('כותרות שנמצאו:', headers);
          
          const data = lines.slice(2)
            .filter(line => line.trim())
            .map((line, lineIndex) => {
              try {
                const values = parseCSVLine(line);
                const row: any = {};
                
                headers.forEach((header, index) => {
                  let value: any = values[index] || '';
                  
                  // ניקוי ערכים
                  if (typeof value === 'string') {
                    value = value.trim();
                    
                    // הסרת תווים לא תקינים (סימני שאלה)
                    value = value.replace(/[\uFFFD]/g, '');
                  }
                  
                  // ניסיון לפרסר מערכים (מופרדים ב-;)
                  if (typeof value === 'string' && value.includes(';') && !value.includes('{') && !value.includes('[')) {
                    const arrayValues = value.split(';').map((v: string) => v.trim()).filter((v: string) => v);
                    if (arrayValues.length > 1) {
                      value = arrayValues;
                    }
                  }
                  
                  // ניסיון לפרסר JSON (אובייקטים)
                  if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                    try {
                      value = JSON.parse(value);
                    } catch (e) {
                      // אם לא מצליח לפרסר, נשאיר כמחרוזת
                    }
                  }
                  
                  row[header] = value;
                });
                return row;
              } catch (error) {
                throw new Error(`שגיאה בעיבוד שורה ${lineIndex + 2}: ${error}`);
              }
            });
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'));
      
      // פונקציה לנסות קידודים שונים
      const tryReadWithEncoding = (encoding: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const testReader = new FileReader();
          testReader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) {
              // בדיקה אם יש תווים בעברית תקינים
              const hebrewRegex = /[\u0590-\u05FF]/;
              if (hebrewRegex.test(result)) {
                console.log(`קידוד ${encoding} עובד עם תווים בעברית`);
                resolve(result);
              } else {
                reject(new Error(`קידוד ${encoding} לא מכיל תווים בעברית תקינים`));
              }
            } else {
              reject(new Error(`קידוד ${encoding} לא עובד`));
            }
          };
          testReader.onerror = () => reject(new Error(`שגיאה בקידוד ${encoding}`));
          testReader.readAsText(file, encoding);
        });
      };
      
      // ניסיון עם קידודים שונים
      tryReadWithEncoding('utf-8')
        .then((csvContent) => {
          // עיבוד הקובץ עם התוכן שקראנו
          try {
            const cleanCsv = csvContent.replace(/^\uFEFF/, '');
            const lines = cleanCsv.split(/\r?\n/);
            if (lines.length === 0) {
              throw new Error('הקובץ ריק או לא תקין');
            }
            
            const headers = parseCSVLine(lines[0]);
            if (headers.length === 0) {
              throw new Error('לא נמצאו כותרות בקובץ');
            }
            
            console.log('כותרות שנמצאו:', headers);
            
            const data = lines.slice(1)
              .filter(line => line.trim())
              .map((line, lineIndex) => {
                try {
                  const values = parseCSVLine(line);
                  const row: any = {};
                  
                  headers.forEach((header, index) => {
                    let value: any = values[index] || '';
                    
                    if (typeof value === 'string') {
                      value = value.trim();
                      value = value.replace(/[\uFFFD]/g, '');
                    }
                    
                    if (typeof value === 'string' && value.includes(';') && !value.includes('{') && !value.includes('[')) {
                      const arrayValues = value.split(';').map((v: string) => v.trim()).filter((v: string) => v);
                      if (arrayValues.length > 1) {
                        value = arrayValues;
                      }
                    }
                    
                    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                      try {
                        value = JSON.parse(value);
                      } catch (e) {
                        // אם לא מצליח לפרסר, נשאיר כמחרוזת
                      }
                    }
                    
                    row[header] = value;
                  });
                  return row;
                } catch (error) {
                  throw new Error(`שגיאה בעיבוד שורה ${lineIndex + 2}: ${error}`);
                }
              });
            resolve(data);
          } catch (error) {
            reject(error);
          }
        })
        .catch(() => {
          // אם UTF-8 נכשל, ננסה עם windows-1255
          console.log('ניסיון עם קידוד windows-1255...');
          tryReadWithEncoding('windows-1255')
            .then((csvContent) => {
              try {
                const cleanCsv = csvContent.replace(/^\uFEFF/, '');
                const lines = cleanCsv.split(/\r?\n/);
                if (lines.length === 0) {
                  throw new Error('הקובץ ריק או לא תקין');
                }
                
                const headers = parseCSVLine(lines[0]);
                if (headers.length === 0) {
                  throw new Error('לא נמצאו כותרות בקובץ');
                }
                
                console.log('כותרות שנמצאו:', headers);
                
                const data = lines.slice(1)
                  .filter(line => line.trim())
                  .map((line, lineIndex) => {
                    try {
                      const values = parseCSVLine(line);
                      const row: any = {};
                      
                      headers.forEach((header, index) => {
                        let value: any = values[index] || '';
                        
                        if (typeof value === 'string') {
                          value = value.trim();
                          value = value.replace(/[\uFFFD]/g, '');
                        }
                        
                        if (typeof value === 'string' && value.includes(';') && !value.includes('{') && !value.includes('[')) {
                          const arrayValues = value.split(';').map((v: string) => v.trim()).filter((v: string) => v);
                          if (arrayValues.length > 1) {
                            value = arrayValues;
                          }
                        }
                        
                        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                          try {
                            value = JSON.parse(value);
                          } catch (e) {
                            // אם לא מצליח לפרסר, נשאיר כמחרוזת
                          }
                        }
                        
                        row[header] = value;
                      });
                      return row;
                    } catch (error) {
                      throw new Error(`שגיאה בעיבוד שורה ${lineIndex + 2}: ${error}`);
                    }
                  });
                resolve(data);
              } catch (error) {
                reject(error);
              }
            })
            .catch(() => {
              // אם כל הקידודים נכשלו, ננסה עם UTF-8 רגיל
              console.log('ניסיון עם UTF-8 רגיל...');
              reader.readAsText(file, 'utf-8');
            });
        });
    });
  };

  // פונקציה עזר לפרסור שורת CSV עם תמיכה בגרשיים וטאבים
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes) {
          // אנחנו בתוך גרשיים - בדוק אם זה גרשיים כפול
          if (i + 1 < line.length && line[i + 1] === '"') {
            // גרשיים כפולים - נדפס גרשיים אחד
            current += '"';
            i += 2; // דלג על שני הגרשיים
            continue;
          } else {
            // סיום גרשיים
            inQuotes = false;
          }
        } else {
          // התחלת גרשיים
          inQuotes = true;
        }
      } else if ((char === ',' || char === '\t') && !inQuotes) {
        // פסיק או טאב מחוץ לגרשיים - סוף שדה
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      
      i++;
    }
    
    // הוסף את השדה האחרון
    result.push(current.trim());
    
    return result;
  };

  // פונקציה לטיפול בהעלאת קובץ
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // איפוס שדה הקובץ כדי לאפשר העלאת אותו קובץ שוב
    event.target.value = '';

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('אנא העלה קובץ CSV בלבד (.csv)');
      return;
    }

    // בדיקת גודל קובץ (מקסימום 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('גודל הקובץ גדול מדי. המקסימום הוא 10MB');
      return;
    }

    setLoading(true);
    setValidationErrors([]);
    
    try {
      const data = await readCSVFile(file);
      
      if (data.length === 0) {
        throw new Error('הקובץ ריק או לא מכיל נתונים תקינים');
      }
      
      if (data.length > 1000) {
        const proceed = window.confirm(`הקובץ מכיל ${data.length} שורות. האם להמשיך? (מומלץ לחלק לקבצים קטנים יותר)`);
        if (!proceed) {
          setLoading(false);
          return;
        }
      }
      
      setUploadedData(data);
      setPreviewData(data.slice(0, 5)); // הצג 5 שורות ראשונות לתצוגה מקדימה
      setActiveStep(1);
      
      // הוספת הודעת הצלחה
      console.log(`נטען בהצלחה קובץ עם ${data.length} שורות`);
         } catch (error) {
       console.error('שגיאה בקריאת הקובץ:', error);
       const errorMessage = error instanceof Error ? error.message : String(error);
       
       let alertMessage = `שגיאה בקריאת הקובץ:\n${errorMessage}\n\n`;
       alertMessage += '🔧 פתרונות אפשריים:\n';
       alertMessage += '• וודא שהקובץ נשמר עם קידוד UTF-8\n';
       alertMessage += '• ב-Excel: שמור כ-CSV עם קידוד UTF-8\n';
       alertMessage += '• ב-Google Sheets: הורד כ-CSV (UTF-8)\n';
       alertMessage += '• נסה לפתוח ולשמור מחדש את הקובץ';
       
       alert(alertMessage);
       setUploadedData([]);
       setPreviewData([]);
       setActiveStep(0);
     } finally {
       setLoading(false);
     }
  };

  // פונקציה לייצוא נתונים קיימים
  const handleExport = async () => {
    if (!selectedTable) {
      alert('אנא בחר טבלה לייצוא');
      return;
    }

    setLoading(true);
    try {
      const table = dataTables.find(t => t.id === selectedTable);
      if (!table) return;

      const data = await table.getData();
      table.exportData(data);
    } catch (error) {
      alert('שגיאה בייצוא הנתונים: ' + error);
    } finally {
      setLoading(false);
    }
  };

  // פונקציה לייבא נתונים
  const handleImport = async () => {
    if (uploadedData.length === 0) {
      alert('אין נתונים לייבא');
      return;
    }

    setLoading(true);
    setImportProgress(0);
    setImportResults(null);
    
    try {
      const table = dataTables.find(t => t.id === selectedTable);
      if (!table) return;

      // ייבוא הנתונים עם מעקב התקדמות
      const totalRows = uploadedData.length;
      let processedRows = 0;
      
      const result = await table.importData(uploadedData);
      
      // עיבוד התוצאות לפורמט מפורט
      const detailedResults = {
        success: result.success || 0,
        updated: result.updated || 0,
        errors: result.errors || [],
        successRows: result.successRows || [],
        updatedRows: result.updatedRows || [],
        errorRows: result.errorRows || []
      };
      
      setImportResults(detailedResults);
      setActiveStep(2);
      setImportProgress(100);
    } catch (error) {
      alert('שגיאה בייבא הנתונים: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <FileUploadIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            ייבוא וייצוא נתונים
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            ניהול נתונים מרובה באמצעות קבצי CSV
          </Typography>
        </Box>
      </Box>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>הוראות:</strong> בחר טבלה, הורד תבנית ריקה, מלא אותה בנתונים והעלה חזרה למערכת.
          או ייצא נתונים קיימים לעריכה חיצונית.
          <br />
          <strong>מבחני בראור:</strong> עבור טבלת מבחני בראור, הזן מספר אישי ותוצאות. הנתונים יתווספו לחיילים הקיימים.
        </Typography>
      </Alert>

      {/* Table Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            בחירת טבלה
          </Typography>
          <FormControl fullWidth>
            <InputLabel>בחר טבלה</InputLabel>
            <Select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              label="בחר טבלה"
            >
              {dataTables.map((table) => (
                <MenuItem key={table.id} value={table.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {table.icon}
                    <Box sx={{ ml: 1 }}>
                      <Typography variant="body1">{table.name}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {table.description}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {selectedTable && (
        <>
          {/* Export Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <DownloadIcon sx={{ mr: 1 }} />
                ייצוא נתונים
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={exportTemplate}
                  disabled={loading}
                >
                  הורד תבנית ריקה
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleExport}
                  disabled={loading}
                >
                  ייצא נתונים קיימים
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Import Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <UploadIcon sx={{ mr: 1 }} />
                ייבוא נתונים
              </Typography>
              
              <Stepper activeStep={activeStep} orientation="vertical">
                <Step>
                  <StepLabel>העלאת קובץ</StepLabel>
                  <StepContent>
                    <Box sx={{ mb: 2 }}>
                      <input
                        accept=".csv"
                        style={{ display: 'none' }}
                        id="csv-file-upload"
                        type="file"
                        onChange={handleFileUpload}
                      />
                      <label htmlFor="csv-file-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<UploadIcon />}
                          disabled={loading}
                        >
                          בחר קובץ CSV
                        </Button>
                      </label>
                    </Box>
                    {loading && <CircularProgress size={20} sx={{ ml: 2 }} />}
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>בדיקה ותצוגה מקדימה</StepLabel>
                  <StepContent>
                    {uploadedData.length > 0 && (
                      <Box>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            📊 <strong>סטטיסטיקות:</strong> {uploadedData.length} שורות, {Object.keys(uploadedData[0] || {}).length} עמודות
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                            {showPreview 
                              ? `מציג ${Math.min(uploadedData.length, 10)} שורות ראשונות:` 
                              : 'תצוגה מקדימה של 5 שורות ראשונות:'
                            }
                          </Typography>
                        </Box>
                        
                        <TableContainer component={Paper} sx={{ mb: 2, maxHeight: showPreview ? 400 : 300 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell>#</TableCell>
                                {Object.keys(uploadedData[0] || {}).map((header) => (
                                  <TableCell key={header} sx={{ minWidth: 100 }}>
                                    <strong>{header}</strong>
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(showPreview ? uploadedData.slice(0, 10) : previewData).map((row, index) => (
                                <TableRow key={index} hover>
                                  <TableCell sx={{ backgroundColor: 'grey.100' }}>
                                    {index + 1}
                                  </TableCell>
                                  {Object.values(row).map((value, cellIndex) => (
                                    <TableCell key={cellIndex} sx={{ maxWidth: 200 }}>
                                      <Typography 
                                        variant="body2" 
                                        sx={{ 
                                          wordBreak: 'break-word',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: showPreview ? 'normal' : 'nowrap'
                                        }}
                                      >
                                        {Array.isArray(value) 
                                          ? `[${value.length} פריטים]`
                                          : typeof value === 'object' && value !== null
                                          ? '[אובייקט]'
                                          : String(value || '').substring(0, 100) + (String(value || '').length > 100 ? '...' : '')
                                        }
                                      </Typography>
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>

                        {validationErrors.length > 0 && (
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                              נמצאו שגיאות אימות:
                            </Typography>
                            <List dense>
                              {validationErrors.map((error, index) => (
                                <ListItem key={index}>
                                  <ListItemIcon>
                                    <ErrorIcon color="warning" />
                                  </ListItemIcon>
                                  <ListItemText primary={error} />
                                </ListItem>
                              ))}
                            </List>
                          </Alert>
                        )}

                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Button
                            variant="contained"
                            onClick={handleImport}
                            disabled={loading || validationErrors.length > 0}
                            startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
                          >
                            {loading ? 'מייבא...' : 'ייבא נתונים'}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setActiveStep(0);
                              setUploadedData([]);
                              setPreviewData([]);
                              setValidationErrors([]);
                              setImportProgress(0);
                            }}
                            disabled={loading}
                          >
                            התחל מחדש
                          </Button>
                          <Button
                            variant="outlined"
                            color="secondary"
                            onClick={() => setShowPreview(!showPreview)}
                            disabled={loading}
                          >
                            {showPreview ? 'הסתר תצוגה מקדימה' : 'הראה עוד נתונים'}
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>הייבוא הושלם</StepLabel>
                  <StepContent>
                    {importResults && (
                      <Box sx={{ mb: 3 }}>
                        {/* סיכום כללי */}
                        <Alert severity="success" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            הייבוא הושלם! 
                            {importResults.success > 0 && ` ✅ ${importResults.success} שורות נוספו בהצלחה`}
                            {importResults.updated > 0 && ` 🔄 ${importResults.updated} שורות התעדכנו`}
                            {importResults.errors.length > 0 && ` ⚠️ ${importResults.errors.length} שגיאות זוהו`}
                          </Typography>
                        </Alert>

                        {/* פירוט השורות שנוספו */}
                        {importResults.successRows.length > 0 && (
                          <Card sx={{ mb: 2 }}>
                            <CardContent>
                              <Typography variant="h6" sx={{ mb: 1, color: 'success.main' }}>
                                ✅ שורות שנוספו בהצלחה ({importResults.successRows.length})
                              </Typography>
                              <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>#</TableCell>
                                      <TableCell>שם</TableCell>
                                      <TableCell>מספר אישי</TableCell>
                                      <TableCell>אימייל</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {importResults.successRows.map((row, index) => (
                                      <TableRow key={index}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{row.name || row.displayName || 'לא מוגדר'}</TableCell>
                                        <TableCell>{row.personalNumber || 'לא מוגדר'}</TableCell>
                                        <TableCell>{row.email || 'לא מוגדר'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </CardContent>
                          </Card>
                        )}

                        {/* פירוט השורות שהתעדכנו */}
                        {importResults.updatedRows.length > 0 && (
                          <Card sx={{ mb: 2 }}>
                            <CardContent>
                              <Typography variant="h6" sx={{ mb: 1, color: 'info.main' }}>
                                🔄 שורות שהתעדכנו ({importResults.updatedRows.length})
                              </Typography>
                              <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>#</TableCell>
                                      <TableCell>שם</TableCell>
                                      <TableCell>מספר אישי</TableCell>
                                      <TableCell>אימייל</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {importResults.updatedRows.map((row, index) => (
                                      <TableRow key={index}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{row.name || row.displayName || 'לא מוגדר'}</TableCell>
                                        <TableCell>{row.personalNumber || 'לא מוגדר'}</TableCell>
                                        <TableCell>{row.email || 'לא מוגדר'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </CardContent>
                          </Card>
                        )}

                        {/* פירוט השגיאות */}
                        {importResults.errors.length > 0 && (
                          <Card sx={{ mb: 2 }}>
                            <CardContent>
                              <Typography variant="h6" sx={{ mb: 1, color: 'error.main' }}>
                                ⚠️ שגיאות בייבוא ({importResults.errors.length})
                              </Typography>
                              <List dense>
                                {importResults.errors.map((error, index) => (
                                  <ListItem key={index}>
                                    <ListItemIcon>
                                      <ErrorIcon color="error" />
                                    </ListItemIcon>
                                    <ListItemText primary={error} />
                                  </ListItem>
                                ))}
                              </List>
                            </CardContent>
                          </Card>
                        )}
                      </Box>
                    )}

                    <Button
                      variant="outlined"
                      onClick={() => {
                        setActiveStep(0);
                        setUploadedData([]);
                        setValidationErrors([]);
                        setImportResults(null);
                      }}
                    >
                      ייבא קובץ נוסף
                    </Button>
                  </StepContent>
                </Step>
              </Stepper>
            </CardContent>
          </Card>
        </>
      )}

      {/* Progress Dialog */}
      <Dialog open={loading && importProgress > 0} maxWidth="sm" fullWidth>
        <DialogTitle>מייבא נתונים...</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress variant="determinate" value={importProgress} />
            <Typography variant="body2">
              {importProgress}% הושלם
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default DataImportExport;
