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
import { getAllFrameworks } from '../services/frameworkService';
import { getAllPolicies } from '../services/permissionService';
import { getAllRoles } from '../services/permissionService';
import { getAllMissions } from '../services/missionService';
import { getAllActivities } from '../services/activityService';
import { getAllDuties } from '../services/dutyService';
import { getAllTrips } from '../services/tripService';
import { 
  importSoldiers, 
  importVehicles, 
  importFrameworks, 
  importPolicies, 
  importRoles 
} from '../services/importService';

interface DataTable {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  getData: () => Promise<any[]>;
  exportData: (data: any[]) => void;
  importData: (data: any[]) => Promise<{ success: number; errors: string[] }>;
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
        const result = await importSoldiers(data, user.uid);
        if (result.errors.length > 0) {
          throw new Error(`שגיאות בייבוא: ${result.errors.join(', ')}`);
        }
        return result;
      },
      getTemplate: () => [
        {
          name: 'שם מלא',
          personalNumber: 'מספר אישי',
          rank: 'דרגה',
          role: 'תפקיד',
          profile: 'פרופיל רפואי',
          phone: 'טלפון',
          email: 'אימייל',
          birthDate: 'תאריך לידה',
          address: 'כתובת',
          family: 'משפחה',
          medicalProfile: 'פרופיל רפואי מפורט',
          qualifications: 'כשירויות (מופרד בפסיקים)',
          licenses: 'רישיונות (מופרד בפסיקים)',
          certifications: 'הסמכות (מופרד בפסיקים)',
          drivingLicenses: 'היתרים לנהיגה (מופרד בפסיקים)',
          presence: 'נוכחות',
          presenceOther: 'פירוט נוכחות אחר',
          notes: 'הערות',
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
        if (result.errors.length > 0) {
          throw new Error(`שגיאות בייבוא: ${result.errors.join(', ')}`);
        }
        return result;
      },
      getTemplate: () => [
        {
          vehicleNumber: 'מספר רכב',
          type: 'סוג רכב',
          model: 'דגם',
          year: 'שנת ייצור',
          licensePlate: 'מספר רישוי',
          status: 'סטטוס',
          lastMaintenance: 'תחזוקה אחרונה',
          notes: 'הערות'
        }
      ]
    },
    {
      id: 'frameworks',
      name: 'מסגרות',
      description: 'נתוני מסגרות במערכת',
      icon: <TableIcon />,
      getData: getAllFrameworks,
      exportData: (data) => exportToCSV(data, 'frameworks'),
      importData: async (data) => {
        if (!user?.uid) throw new Error('משתמש לא מחובר');
        const result = await importFrameworks(data, user.uid);
        if (result.errors.length > 0) {
          throw new Error(`שגיאות בייבוא: ${result.errors.join(', ')}`);
        }
        return result;
      },
      getTemplate: () => [
        {
          name: 'שם המסגרת',
          type: 'סוג מסגרת',
          commander: 'מפקד',
          description: 'תיאור',
          status: 'סטטוס'
        }
      ]
    },
    {
      id: 'policies',
      name: 'מדיניות הרשאות',
      description: 'מדיניות הרשאות במערכת',
      icon: <TableIcon />,
      getData: getAllPolicies,
      exportData: (data) => exportToCSV(data, 'policies'),
      importData: async (data) => {
        if (!user?.uid) throw new Error('משתמש לא מחובר');
        const result = await importPolicies(data, user.uid);
        if (result.errors.length > 0) {
          throw new Error(`שגיאות בייבוא: ${result.errors.join(', ')}`);
        }
        return result;
      },
      getTemplate: () => [
        {
          name: 'שם המדיניות',
          description: 'תיאור',
          paths: 'נתיבי מערכת (מופרד בפסיקים)',
          dataScope: 'היקף נתונים',
          permissions: 'הרשאות (מופרד בפסיקים)'
        }
      ]
    },
    {
      id: 'roles',
      name: 'תפקידים',
      description: 'תפקידים במערכת',
      icon: <TableIcon />,
      getData: getAllRoles,
      exportData: (data) => exportToCSV(data, 'roles'),
      importData: async (data) => {
        if (!user?.uid) throw new Error('משתמש לא מחובר');
        const result = await importRoles(data, user.uid);
        if (result.errors.length > 0) {
          throw new Error(`שגיאות בייבוא: ${result.errors.join(', ')}`);
        }
        return result;
      },
      getTemplate: () => [
        {
          name: 'שם התפקיד',
          description: 'תיאור',
          policies: 'מדיניות (מופרד בפסיקים)',
          isSystem: 'תפקיד מערכת (true/false)'
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
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          
          // טיפול במערכים
          if (Array.isArray(value)) {
            const arrayString = value.join('; ');
            return `"${arrayString.replace(/"/g, '""')}"`;
          }
          
          // טיפול באובייקטים (כמו timestamp)
          if (typeof value === 'object' && value !== null) {
            const objectString = JSON.stringify(value);
            return `"${objectString.replace(/"/g, '""')}"`;
          }
          
          // טיפול במחרוזות
          if (typeof value === 'string') {
            // אם הערך מכיל פסיקים, גרשיים או תווים מיוחדים, נעטוף אותו בגרשיים
            if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }
          
          // טיפול בערכים אחרים
          return value !== null && value !== undefined ? String(value) : '';
        }).join(',')
      )
    ].join('\n');

    // הוספת BOM לתמיכה בעברית
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          
          const lines = cleanCsv.split('\n');
          const headers = parseCSVLine(lines[0]);
          
          const data = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const values = parseCSVLine(line);
              const row: any = {};
                             headers.forEach((header, index) => {
                 let value: any = values[index] || '';
                 
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
            });
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file, 'utf-8');
    });
  };

  // פונקציה עזר לפרסור שורת CSV עם תמיכה בגרשיים
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // גרשיים כפולים - נדפס גרשיים אחד
          current += '"';
          i++; // דלג על הגרשיים הבא
        } else {
          // התחלה או סיום של גרשיים
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // פסיק מחוץ לגרשיים - סוף שדה
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // הוסף את השדה האחרון
    result.push(current.trim());
    
    return result;
  };

  // פונקציה לטיפול בהעלאת קובץ
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('אנא העלה קובץ CSV בלבד');
      return;
    }

    setLoading(true);
    try {
      const data = await readCSVFile(file);
      setUploadedData(data);
      setPreviewData(data.slice(0, 5)); // הצג 5 שורות ראשונות לתצוגה מקדימה
      setActiveStep(1);
      setValidationErrors([]);
    } catch (error) {
      alert('שגיאה בקריאת הקובץ: ' + error);
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
    
    try {
      const table = dataTables.find(t => t.id === selectedTable);
      if (!table) return;

      // ייבוא הנתונים עם מעקב התקדמות
      const totalRows = uploadedData.length;
      let processedRows = 0;
      
      const result = await table.importData(uploadedData);
      
      // הצגת תוצאות
      if (result.success > 0) {
        alert(`הייבוא הושלם בהצלחה!\n${result.success} שורות יובאו בהצלחה${result.errors.length > 0 ? `\n${result.errors.length} שגיאות` : ''}`);
      }
      
      if (result.errors && result.errors.length > 0) {
        console.error('שגיאות בייבוא:', result.errors);
      }
      
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
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          נמצאו {uploadedData.length} שורות. תצוגה מקדימה של 5 שורות ראשונות:
                        </Typography>
                        
                        <TableContainer component={Paper} sx={{ mb: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                {Object.keys(uploadedData[0] || {}).map((header) => (
                                  <TableCell key={header}>{header}</TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {previewData.map((row, index) => (
                                <TableRow key={index}>
                                  {Object.values(row).map((value, cellIndex) => (
                                    <TableCell key={cellIndex}>{String(value)}</TableCell>
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

                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button
                            variant="contained"
                            onClick={handleImport}
                            disabled={loading || validationErrors.length > 0}
                            startIcon={<UploadIcon />}
                          >
                            ייבא נתונים
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setActiveStep(0);
                              setUploadedData([]);
                              setValidationErrors([]);
                            }}
                          >
                            התחל מחדש
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>הייבוא הושלם</StepLabel>
                  <StepContent>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        הנתונים יובאו בהצלחה למערכת!
                      </Typography>
                    </Alert>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setActiveStep(0);
                        setUploadedData([]);
                        setValidationErrors([]);
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
