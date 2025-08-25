import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Avatar,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
  Snackbar,
  TextField,
  IconButton
} from '@mui/material';
import {
  Group as GroupIcon,
  Person as PersonIcon,
  Star as StarIcon,
  ExpandMore as ExpandMoreIcon,
  ArrowForward as ArrowForwardIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  AccountTree as AccountTreeIcon,
  Print as PrintIcon,
  LooksOne as LooksOneIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { DataScope, PermissionLevel, SystemPath } from '../models/UserRole';
import { Soldier } from '../models/Soldier';
import { Activity } from '../models/Activity';
import { Duty } from '../models/Duty';
import { Framework, FrameworkWithDetails } from '../models/Framework';
import { getAllSoldiers } from '../services/soldierService';
import { getAllFrameworks, getFrameworkWithDetails, getFrameworkNamesByIds } from '../services/frameworkService';
import { getUserPermissions, canUserEditSoldierPresence } from '../services/permissionService';
import { getPresenceColor, getProfileColor, getRoleColor } from '../utils/colors';
import { 
  getAllStatuses, 
  requiresAbsenceDate, 
  requiresCustomText,
  getStatusLabel,
  mapStatusForReport
} from '../utils/presenceStatus';
import { formatToIsraelString } from '../utils/dateUtils';
import ReportDialog from '../components/ReportDialog';

const Frameworks: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [frameworks, setFrameworks] = useState<FrameworkWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [error, setError] = useState<string>('');
  const [canManageFrameworks, setCanManageFrameworks] = useState<boolean>(false);
  const [canEditPersonnel, setCanEditPersonnel] = useState<boolean>(false);
  const [isFrameworkScoped, setIsFrameworkScoped] = useState<boolean>(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<FrameworkWithDetails | null>(null);
  const [frameworkNames, setFrameworkNames] = useState<{ [key: string]: string }>({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');
      
      // טעינת כל המסגרות
      const allFrameworks = await getAllFrameworks();
      
      // לכל מסגרת, נטען את הפרטים המלאים
      const frameworksWithDetails = await Promise.all(
        allFrameworks.map(framework => getFrameworkWithDetails(framework.id))
      );
      
      // סינון רק המסגרות שנטענו בהצלחה
      let validFrameworks = frameworksWithDetails.filter(f => f !== null) as FrameworkWithDetails[];

      // בדיקת הרשאות למסגרות וכח אדם
      const { policies } = await getUserPermissions(user.uid);
      const frameworkPolicy = policies.find(p => (p.paths || []).includes(SystemPath.FRAMEWORKS));

      // בדיקה אם יש הרשאות לניהול (יצירה/עריכה)
      const canManage = !!frameworkPolicy && (
        frameworkPolicy.permissions.includes(PermissionLevel.CREATE) ||
        frameworkPolicy.permissions.includes(PermissionLevel.EDIT)
      );
      setCanManageFrameworks(canManage);

      // בדיקת הרשאות עריכה נוכחות חיילים
      const canEditPresence = await canUserEditSoldierPresence(user.uid);
      setCanEditPersonnel(canEditPresence);

      // קבלת שמות המסגרות עבור הדוחות
      const allFrameworkIds = Array.from(new Set(
        validFrameworks.flatMap(f => 
          f.allSoldiersInHierarchy?.map(s => s.frameworkId) || []
        )
      ));
      const names = await getFrameworkNamesByIds(allFrameworkIds);
      setFrameworkNames(names);

      // סינון לפי היקף נתונים: מי שמוגבל למסגרת שלו בלבד רואה את ההיררכיה שלו
      if (frameworkPolicy?.dataScope === DataScope.FRAMEWORK_ONLY) {
        setIsFrameworkScoped(true);
        const allSoldiers = await getAllSoldiers();
        // מציאת רשומת החייל של המשתמש
        const userSoldier = user.soldierDocId
          ? allSoldiers.find(s => s.id === user.soldierDocId)
          : allSoldiers.find(s => s.email === user.email);

        const rootFrameworkId = userSoldier?.frameworkId;
        if (rootFrameworkId) {
          const getAllFrameworksInHierarchy = (rootId: string): string[] => {
            const direct = [rootId];
            const children = allFrameworks.filter(f => f.parentFrameworkId === rootId);
            const childIds = children.flatMap(child => getAllFrameworksInHierarchy(child.id));
            return [...direct, ...childIds];
          };
          const allowedFrameworkIds = new Set(getAllFrameworksInHierarchy(rootFrameworkId));
          validFrameworks = validFrameworks.filter(f => allowedFrameworkIds.has(f.id));
        } else {
          // ללא שיוך למסגרת – לא להציג דבר
          validFrameworks = [];
        }
      } else {
        setIsFrameworkScoped(false);
      }
      
      setFrameworks(validFrameworks);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
      setError('שגיאה בטעינת נתוני המסגרות');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSoldierClick = (soldierId: string) => {
    navigate(`/soldiers/${soldierId}`);
  };

  const handleFrameworkClick = (frameworkId: string) => {
    navigate(`/frameworks/${frameworkId}`);
  };



  const handleGenerateReport = (framework: FrameworkWithDetails) => {
    if (!framework || !framework.allSoldiersInHierarchy) {
      setSnackbarMessage('אין נתונים ליצירת דוח');
      setSnackbarOpen(true);
      return;
    }
    
    const report = framework.allSoldiersInHierarchy.map(soldier => ({
      id: soldier.id,
      name: soldier.name,
      role: soldier.role,
      personalNumber: soldier.personalNumber,
      frameworkName: frameworkNames[soldier.frameworkId] || soldier.frameworkId,
      presence: soldier.presence || 'לא מוגדר',
      presenceOther: soldier.presenceOther || '',
      absenceUntil: soldier.absenceUntil || '',
      editedPresence: soldier.presence ? mapStatusForReport(soldier.presence as any) : 'בבסיס', // מיפוי ראשוני
      otherText: soldier.presenceOther || '' // שדה לטקסט חופשי
    }));
    
    setReportData(report);
    setSelectedFramework(framework);
    setReportDialogOpen(true);
  };

  const handleUpdateReportPresence = (soldierId: string, newPresence: string) => {
    setReportData(prev => prev.map(item => 
      item.id === soldierId 
        ? { ...item, editedPresence: newPresence, otherText: requiresCustomText(newPresence as any) ? item.otherText : '' }
        : item
    ));
  };

  const handleUpdateReportOtherText = (soldierId: string, otherText: string) => {
    setReportData(prev => prev.map(item => 
      item.id === soldierId 
        ? { ...item, otherText }
        : item
    ));
  };



  // פונקציה לחישוב זמינים במסגרת
  const calculateAvailability = (framework: FrameworkWithDetails) => {
    if (!framework.allSoldiersInHierarchy || framework.allSoldiersInHierarchy.length === 0) {
      return '0/0';
    }
    
    const totalSoldiers = framework.allSoldiersInHierarchy.length;
    const availableSoldiers = framework.allSoldiersInHierarchy.filter(soldier => 
      soldier.presence === 'בבסיס'
    ).length;
    
    return `${availableSoldiers}/${totalSoldiers}`;
  };

  // פונקציה לחישוב נוכחות במסגרת (לפי מיפוי דוח 1)
  const calculatePresence = (framework: FrameworkWithDetails) => {
    if (!framework.allSoldiersInHierarchy || framework.allSoldiersInHierarchy.length === 0) {
      return '0/0';
    }
    
    const totalSoldiers = framework.allSoldiersInHierarchy.length;
    const presentSoldiers = framework.allSoldiersInHierarchy.filter(soldier => {
      const mappedStatus = mapStatusForReport(soldier.presence as any);
      return mappedStatus === 'בבסיס';
    }).length;
    
    return `${presentSoldiers}/${totalSoldiers}`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>טוען מסגרות...</Typography>
      </Container>
    );
  }

  // האם התצוגה ממוקדת למסגרת של המשתמש
  const isPersonalTeam = isFrameworkScoped;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {isPersonalTeam ? 'המסגרת שלי' : 'מסגרות'}
        </Typography>
        {user && canManageFrameworks && (
          <Button
            variant="outlined"
            startIcon={<AccountTreeIcon />}
            onClick={() => navigate('/framework-management')}
          >
            ניהול מסגרות
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {frameworks.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {isPersonalTeam ? 'לא נמצאו נתונים למסגרת שלך' : 'לא נמצאו מסגרות זמינות'}
        </Alert>
      ) : (
        <>
          {/* View Mode Tabs */}
          <Box sx={{ mb: 3 }}>
            <Tabs value={viewMode === 'cards' ? 0 : 1} onChange={(_, newValue) => setViewMode(newValue === 0 ? 'cards' : 'table')}>
              <Tab icon={<ViewModuleIcon />} label="כרטיסים" />
              <Tab icon={<ViewListIcon />} label="טבלה" />
            </Tabs>
          </Box>
          
          {viewMode === 'cards' ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
            {frameworks.map((framework) => (
              <Card key={framework.id}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <AccountTreeIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography 
                        variant="h6" 
                        fontWeight="bold"
                        onClick={() => handleFrameworkClick(framework.id)}
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { 
                            color: 'primary.main',
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        {framework.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {framework.totalSoldiers} חיילים • מפקד: {framework.commander?.name || 'לא מוגדר'}
                      </Typography>
                    </Box>
                    <Badge badgeContent={framework.totalSoldiers} color="primary">
                      <GroupIcon />
                    </Badge>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    {canEditPersonnel ? (
                      <IconButton
                        color="primary"
                        onClick={() => handleGenerateReport(framework)}
                        sx={{ 
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' }
                        }}
                        title="צור דוח 1"
                      >
                        <LooksOneIcon />
                      </IconButton>
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleFrameworkClick(framework.id)}
                        sx={{ 
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600
                        }}
                      >
                        צפה בפרטי המסגרת
                      </Button>
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* חיילי המסגרת */}
                  {framework.soldiers.length > 0 && (
                    <Accordion defaultExpanded>
                      <AccordionSummary 
                        expandIcon={<ExpandMoreIcon />}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <GroupIcon sx={{ mr: 1 }} />
                          <Typography variant="subtitle1" fontWeight={600}>
                            חיילי המסגרת ({framework.soldiers.length})
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List dense>
                          {framework.soldiers.map((soldier) => (
                            <ListItem key={soldier.id} disablePadding>
                              <ListItemButton onClick={() => handleSoldierClick(soldier.id)}>
                                <ListItemAvatar>
                                  <Avatar 
                                    sx={{ 
                                      bgcolor: getRoleColor(soldier.role),
                                      width: 32,
                                      height: 32,
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    {soldier.name.charAt(0)}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={soldier.name}
                                  secondary={`${soldier.role} • ${soldier.personalNumber}`}
                                />
                                {soldier.role.includes('מפקד') && (
                                  <StarIcon sx={{ color: 'gold', fontSize: 20 }} />
                                )}
                              </ListItemButton>
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            ))}
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>שם המסגרת</TableCell>
                                          <TableCell>זמינים</TableCell>
                    <TableCell>מפקד</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {frameworks.map((framework) => (
                    <TableRow key={framework.id}>
                      <TableCell>
                        <Typography 
                          variant="subtitle1" 
                          fontWeight={600}
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { 
                              color: 'primary.main',
                              textDecoration: 'underline'
                            }
                          }}
                          onClick={() => handleFrameworkClick(framework.id)}
                        >
                          {framework.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Chip 
                            label={`זמינים: ${calculateAvailability(framework)}`}
                            color="primary" 
                            variant="outlined"
                            size="small"
                          />
                          <Chip 
                            label={`נוכחות: ${calculatePresence(framework)}`}
                            color="secondary" 
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{framework.commander?.name || 'לא מוגדר'}</TableCell>
                      <TableCell>
                        {canEditPersonnel ? (
                          <IconButton
                            color="primary"
                            onClick={() => handleGenerateReport(framework)}
                            sx={{ 
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'primary.dark' }
                            }}
                            title="צור דוח 1"
                          >
                            <LooksOneIcon />
                          </IconButton>
                        ) : (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleFrameworkClick(framework.id)}
                          >
                            צפה בפרטים
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Report Dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        frameworkName={selectedFramework?.name || ''}
        reportData={reportData}
        onUpdateReportPresence={handleUpdateReportPresence}
        onUpdateReportOtherText={handleUpdateReportOtherText}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default Frameworks; 