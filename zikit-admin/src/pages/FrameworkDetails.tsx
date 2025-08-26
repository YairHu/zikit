import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Badge,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  TextField
} from '@mui/material';
import {
  Group as GroupIcon,
  Person as PersonIcon,
  Star as StarIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  AccountTree as AccountTreeIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as CalendarMonthIcon,
  DirectionsCar as CarIcon,
  Print as PrintIcon,
  Save as SaveIcon,
  LooksOne as LooksOneIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { FrameworkWithDetails, Framework } from '../models/Framework';
import { getAllFrameworks, getFrameworkWithDetails, getFrameworkNamesByIds } from '../services/frameworkService';
import { getAllSoldiers, updateSoldier } from '../services/soldierService';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { getPresenceColor, getProfileColor, getRoleColor } from '../utils/colors';
import { formatToIsraelString } from '../utils/dateUtils';
import { getUserPermissions, canUserEditSoldierPresence } from '../services/permissionService';
import { PermissionLevel, SystemPath } from '../models/UserRole';
import { 
  getAllStatuses, 
  requiresAbsenceDate, 
  requiresCustomText,
  mapStatusForReport as mapStatusForReportUtil,
  getStatusLabel,
  isAbsenceActive
} from '../utils/presenceStatus';
import { createIsraelDate, isTodayInIsrael, getCurrentIsraelTime } from '../utils/dateUtils';
import ReportDialog from '../components/ReportDialog';
import { collection } from 'firebase/firestore';

const soldiersCollection = collection(db, 'soldiers');

const FrameworkDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [framework, setFramework] = useState<FrameworkWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [frameworkNames, setFrameworkNames] = useState<{ [key: string]: string }>({});
  const [canManageFrameworks, setCanManageFrameworks] = useState<boolean>(false);
  const [canEditPersonnel, setCanEditPersonnel] = useState<boolean>(false);
  const [editingSoldier, setEditingSoldier] = useState<string | null>(null);
  const [editingPresence, setEditingPresence] = useState<string>('');
  const [editingAbsenceUntil, setEditingAbsenceUntil] = useState<string>('');
  const [editingPresenceOther, setEditingPresenceOther] = useState<string>('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const loadData = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError('');
      
      // בדיקת הרשאות לניהול מסגרות וכח אדם
      if (user) {
        try {
          const { policies } = await getUserPermissions(user.uid);
          const frameworkPolicy = policies.find(p => (p.paths || []).includes(SystemPath.FRAMEWORKS));
          
          const canManage = !!frameworkPolicy && (
            frameworkPolicy.permissions.includes(PermissionLevel.CREATE) ||
            frameworkPolicy.permissions.includes(PermissionLevel.EDIT)
          );
          setCanManageFrameworks(canManage);

          // בדיקת הרשאות עריכה נוכחות חיילים
          const canEditPresence = await canUserEditSoldierPresence(user.uid);
          setCanEditPersonnel(canEditPresence);

          // אם משתמש מוגבל למסגרת שלו בלבד, בחן גישה למסגרת המבוקשת
          if (frameworkPolicy?.dataScope === 'framework_only') {
            const [frameworks, soldiers] = await Promise.all([
              getAllFrameworks(),
              getAllSoldiers()
            ]);
            const userSoldier = user.soldierDocId
              ? soldiers.find(s => s.id === user.soldierDocId)
              : soldiers.find(s => s.email === user.email);
            const rootFrameworkId = userSoldier?.frameworkId;
            if (rootFrameworkId) {
              const collectHierarchy = (rootId: string): string[] => {
                const direct = [rootId];
                const children = frameworks.filter(f => f.parentFrameworkId === rootId);
                const childIds = children.flatMap(child => collectHierarchy(child.id));
                return [...direct, ...childIds];
              };
              const allowed = new Set(collectHierarchy(rootFrameworkId));
              if (!allowed.has(id)) {
                setError('אין הרשאה לצפות במסגרת זו');
                setLoading(false);
                return;
              }
            } else {
              setError('אין הרשאה לצפות במסגרת זו');
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          // במקרה של שגיאה בהרשאות, נסתיר את הכפתורים
          setCanManageFrameworks(false);
          setCanEditPersonnel(false);
        }
      }

      // טעינת פרטי המסגרת עם כל המידע
      const frameworkData = await getFrameworkWithDetails(id);
      if (!frameworkData) {
        setError('מסגרת לא נמצאה');
        return;
      }

      // טעינת פרטים מלאים לכל תת-מסגרת
      const childFrameworksWithDetails = await Promise.all(
        frameworkData.childFrameworks.map(async (child) => {
          try {
            return await getFrameworkWithDetails(child.id);
          } catch (error) {
            console.error(`שגיאה בטעינת תת-מסגרת ${child.id}:`, error);
            return child; // החזר את המסגרת הבסיסית אם נכשל
          }
        })
      );

      // עדכון המסגרת עם תת-המסגרות המלאות
      const updatedFramework = {
        ...frameworkData,
        childFrameworks: childFrameworksWithDetails.filter((f): f is Framework => f !== null)
      };

      setFramework(updatedFramework);
      
      // קבלת שמות המסגרות עבור החיילים בהיררכיה
      if (updatedFramework.allSoldiersInHierarchy) {
        const frameworkIds = Array.from(new Set(updatedFramework.allSoldiersInHierarchy.map(s => s.frameworkId)));
        const names = await getFrameworkNamesByIds(frameworkIds);
        setFrameworkNames(names);
      }
    } catch (error) {
      console.error('שגיאה בטעינת פרטי מסגרת:', error);
      setError('שגיאה בטעינת פרטי המסגרת');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // פונקציה לקבלת הנוכחות האמיתית של החייל
  const getActualPresence = (soldier: any) => {
    if (requiresAbsenceDate(soldier.presence as any)) {
      if (isAbsenceActive(soldier.absenceUntil)) {
        return soldier.presence;
      } else {
        return 'בבסיס';
      }
    }
    return soldier.presence;
  };

  const handleSoldierClick = (soldierId: string) => {
    navigate(`/soldiers/${soldierId}`);
  };

  const handleChildFrameworkClick = (frameworkId: string) => {
    navigate(`/frameworks/${frameworkId}`);
  };

  const handleEditPresence = (soldierId: string, currentPresence: string, currentAbsenceUntil?: string, currentPresenceOther?: string) => {
    setEditingSoldier(soldierId);
    setEditingPresence(currentPresence || '');
    setEditingAbsenceUntil(currentAbsenceUntil || '');
    setEditingPresenceOther(currentPresenceOther || '');
  };

  const handleSavePresence = async () => {
    if (!editingSoldier || !framework) return;
    
    try {
      let finalPresence = editingPresence;
      
      // אם נבחר "אחר" ויש טקסט חופשי, השתמש בטקסט החופשי
      if (editingPresence === 'אחר' && editingPresenceOther.trim()) {
        finalPresence = editingPresenceOther.trim();
      }
      
      // עדכון ישיר של המסמך
      const updateData: any = { 
        presence: finalPresence,
        updatedAt: new Date().toISOString()
      };
      
      // אם נבחר קורס, גימלים או חופש, הוסף את התאריך
      if (requiresAbsenceDate(editingPresence as any) && editingAbsenceUntil) {
        updateData.absenceUntil = editingAbsenceUntil;
      } else {
        // אם לא קורס/גימלים/חופש, מחק את השדה
        updateData.absenceUntil = deleteField();
      }
      
      await updateDoc(doc(soldiersCollection, editingSoldier), updateData);
      
      // רענון הנתונים מהשרת
      await loadData();
      
      setSnackbarMessage('סטטוס הנוכחות עודכן בהצלחה');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס נוכחות:', error);
      setSnackbarMessage('שגיאה בעדכון סטטוס הנוכחות');
      setSnackbarOpen(true);
    } finally {
      setEditingSoldier(null);
      setEditingPresence('');
      setEditingAbsenceUntil('');
      setEditingPresenceOther('');
    }
  };

  const handleUpdateReportOtherText = (soldierId: string, otherText: string) => {
    setReportData(prev => prev.map(item => 
      item.id === soldierId 
        ? { ...item, otherText }
        : item
    ));
  };

  // פונקציה למיפוי הסטטוס לדוח (משותפת)
  const mapStatusForReport = (status: string) => {
    return mapStatusForReportUtil(status as any);
  };

  const handleGenerateReport = () => {
    if (!framework || !framework.allSoldiersInHierarchy) return;
    
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
    setReportDialogOpen(true);
  };

  const handleUpdateReportPresence = (soldierId: string, newPresence: string) => {
    setReportData(prev => prev.map(item => 
      item.id === soldierId 
        ? { ...item, editedPresence: newPresence, otherText: requiresCustomText(newPresence as any) ? item.otherText : '' }
        : item
    ));
  };

  // פונקציה לחישוב זמינים במסגרת
  const calculateAvailability = () => {
    if (!framework || !framework.allSoldiersInHierarchy || framework.allSoldiersInHierarchy.length === 0) {
      return '0/0';
    }
    
    const totalSoldiers = framework.allSoldiersInHierarchy.length;
    const availableSoldiers = framework.allSoldiersInHierarchy.filter(soldier => 
      soldier.presence === 'בבסיס'
    ).length;
    
    return `${availableSoldiers}/${totalSoldiers}`;
  };

  // פונקציה לחישוב נוכחות במסגרת (לפי מיפוי דוח 1)
  const calculatePresence = () => {
    if (!framework || !framework.allSoldiersInHierarchy || framework.allSoldiersInHierarchy.length === 0) {
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
        <Typography>טוען פרטי מסגרת...</Typography>
      </Container>
    );
  }

  if (error || !framework) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'מסגרת לא נמצאה'}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/frameworks')}
        >
          חזרה למסגרות
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 3,
        gap: { xs: 2, sm: 0 }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <IconButton onClick={() => navigate('/frameworks')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
            <Typography variant="h4" component="h1" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
            {framework.name}
          </Typography>

        </Box>
        </Box>
                  <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            flexDirection: { xs: 'row', sm: 'row' },
            width: { xs: '100%', sm: 'auto' }
          }}>
          {canEditPersonnel && (
              <IconButton
                color="primary"
              onClick={handleGenerateReport}
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
                title="צור דוח 1"
              >
                <LooksOneIcon />
              </IconButton>
          )}
        {canManageFrameworks && (
              <IconButton
                color="primary"
            onClick={() => navigate('/framework-management')}
                sx={{ 
                  bgcolor: 'secondary.main', 
                  color: 'white',
                  '&:hover': { bgcolor: 'secondary.dark' }
                }}
                title="ניהול מסגרות"
              >
                <AccountTreeIcon />
              </IconButton>
        )}
        </Box>
      </Box>

      {/* Framework Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <AccountTreeIcon />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                {framework.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {framework.description || 'אין תיאור'}
              </Typography>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
            gap: { xs: 2, sm: 3 }
          }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                מפקד המסגרת
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {framework.commander?.name || 'לא מוגדר'}
              </Typography>
            </Box>
            
            {framework.parentFramework && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  מסגרת אב
                </Typography>
                <Typography 
                  variant="body1" 
                  fontWeight={600}
                  sx={{ 
                    cursor: 'pointer',
                    color: 'primary.main',
                    '&:hover': { textDecoration: 'underline' },
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                  onClick={() => handleChildFrameworkClick(framework.parentFramework!.id)}
                >
                  {framework.parentFramework.name}
                </Typography>
              </Box>
            )}
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                תת-מסגרות
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {framework.childFrameworks.length}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                זמינים
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {calculateAvailability()}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                נוכחות
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {calculatePresence()}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Accordion Sections */}
      
      {/* חיילים ישירים */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <GroupIcon sx={{ mr: 2 }} />
            <Typography variant="h6" fontWeight={600}>
              חיילים ישירים ({framework.soldiers.length})
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
            {framework.soldiers.length > 0 ? (
            <Box>
                {framework.soldiers.map((soldier) => (
                <Box key={soldier.id} sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Avatar sx={{ bgcolor: getRoleColor(soldier.role), mr: 2, width: 40, height: 40 }}>
                          {soldier.name.charAt(0)}
                        </Avatar>
                  <Box sx={{ flex: 1 }}>
                            <Typography 
                      variant="subtitle1" 
                      fontWeight={600}
                              sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                              onClick={() => handleSoldierClick(soldier.id)}
                            >
                              {soldier.name}
                            </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {soldier.role} • {soldier.personalNumber}
                            </Typography>
                          </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={soldier.presence === 'אחר' && soldier.presenceOther ? `${soldier.presence} - ${soldier.presenceOther}` : getActualPresence(soldier) || 'לא מוגדר'} 
                              sx={{ 
                                bgcolor: getPresenceColor(getActualPresence(soldier) || ''),
                                color: 'white',
                                fontSize: { xs: '0.7rem', sm: '0.75rem' }
                              }}
                              size="small"
                            />
                    {requiresAbsenceDate(soldier.presence as any) && soldier.absenceUntil && editingSoldier !== soldier.id && (
                      <Typography variant="caption" sx={{ 
                        color: 'text.secondary', 
                        fontStyle: 'italic',
                        fontSize: { xs: '0.65rem', sm: '0.75rem' }
                      }}>
                        {`עד ${formatToIsraelString(soldier.absenceUntil, { year: 'numeric', month: '2-digit', day: '2-digit' })}`}
                      </Typography>
                            )}
                        {canEditPersonnel && (
                      editingSoldier === soldier.id ? (
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 1, 
                          width: '100%',
                          mt: 1,
                          pt: 1,
                          borderTop: '1px solid #e0e0e0'
                        }}>
                          <FormControl size="small" fullWidth>
                                    <Select
                                      value={editingPresence}
                                      onChange={(e) => setEditingPresence(e.target.value)}
                                      size="small"
                                    >
                              {getAllStatuses().map((status) => (
                                <MenuItem key={status} value={status}>
                                  {getStatusLabel(status)}
                                </MenuItem>
                              ))}
                                    </Select>
                                  </FormControl>
                                                      {requiresAbsenceDate(editingPresence as any) && (
                              <TextField
                                size="small"
                                label={`${editingPresence} עד מתי?`}
                                type="date"
                                value={editingAbsenceUntil ? new Date(editingAbsenceUntil).toISOString().split('T')[0] : ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const israelDate = createIsraelDate(e.target.value);
                                    israelDate.setHours(23, 59, 0, 0);
                                    setEditingAbsenceUntil(israelDate.toISOString());
                                  } else {
                                    setEditingAbsenceUntil('');
                                  }
                                }}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                              />
                            )}
                          {requiresCustomText(editingPresence as any) && (
                                  <TextField
                                    size="small"
                                    label="הזן סטטוס מותאם אישית"
                                    value={editingPresenceOther}
                                    onChange={(e) => setEditingPresenceOther(e.target.value)}
                              fullWidth
                            />
                          )}
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" onClick={handleSavePresence} variant="contained">
                              שמור
                            </Button>
                            <Button size="small" onClick={() => setEditingSoldier(null)}>
                              ביטול
                            </Button>
                          </Box>
                              </Box>
                            ) : (
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditPresence(soldier.id, soldier.presence || '', soldier.absenceUntil, soldier.presenceOther)}
                          sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                              >
                                <EditIcon />
                              </IconButton>
                      )
                            )}
                  </Box>
                </Box>
                    ))}
            </Box>
            ) : (
              <Typography color="text.secondary" align="center">
                אין חיילים במסגרת זו
              </Typography>
            )}
        </AccordionDetails>
      </Accordion>

      {/* כל החיילים במסגרת */}
      {framework.childFrameworks.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <GroupIcon sx={{ mr: 2 }} />
              <Typography variant="h6" fontWeight={600}>
                כל החיילים במסגרת ({framework.totalSoldiers})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {framework.allSoldiersInHierarchy && framework.allSoldiersInHierarchy.length > 0 ? (
              <Box>
                {framework.allSoldiersInHierarchy.map((soldier) => (
                  <Box key={soldier.id} sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Avatar sx={{ bgcolor: getRoleColor(soldier.role), mr: 2, width: 40, height: 40 }}>
                      {soldier.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography 
                        variant="subtitle1" 
                        fontWeight={600}
                        sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                        onClick={() => handleSoldierClick(soldier.id)}
                      >
                        {soldier.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {soldier.role} • {soldier.personalNumber} • {frameworkNames[soldier.frameworkId] || soldier.frameworkId}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={soldier.presence === 'אחר' && soldier.presenceOther ? `${soldier.presence} - ${soldier.presenceOther}` : getActualPresence(soldier) || 'לא מוגדר'} 
                        sx={{ 
                          bgcolor: getPresenceColor(getActualPresence(soldier) || ''),
                          color: 'white',
                          fontSize: { xs: '0.7rem', sm: '0.75rem' }
                        }}
                        size="small"
                      />
                      {requiresAbsenceDate(soldier.presence as any) && soldier.absenceUntil && editingSoldier !== soldier.id && (
                        <Typography variant="caption" sx={{ 
                          color: 'text.secondary', 
                          fontStyle: 'italic',
                          fontSize: { xs: '0.65rem', sm: '0.75rem' }
                        }}>
                          {`עד ${formatToIsraelString(soldier.absenceUntil, { year: 'numeric', month: '2-digit', day: '2-digit' })}`}
                        </Typography>
                      )}
                      {canEditPersonnel && (
                        editingSoldier === soldier.id ? (
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 1, 
                            width: '100%',
                            mt: 1,
                            pt: 1,
                            borderTop: '1px solid #e0e0e0'
                          }}>
                            <FormControl size="small" fullWidth>
                              <Select
                                value={editingPresence}
                                onChange={(e) => setEditingPresence(e.target.value)}
                                size="small"
                              >
                                {getAllStatuses().map((status) => (
                                  <MenuItem key={status} value={status}>
                                    {getStatusLabel(status)}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            {requiresAbsenceDate(editingPresence as any) && (
                              <TextField
                                size="small"
                                label={`${editingPresence} עד מתי?`}
                                type="date"
                                value={editingAbsenceUntil ? new Date(editingAbsenceUntil).toISOString().split('T')[0] : ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    // יצירת תאריך בזמן ישראל
                                    const date = new Date(e.target.value + 'T00:00:00');
                                    const israelDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
                                    israelDate.setHours(23, 59, 0, 0);
                                    setEditingAbsenceUntil(israelDate.toISOString());
                                  } else {
                                    setEditingAbsenceUntil('');
                                  }
                                }}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                              />
                            )}
                            {requiresCustomText(editingPresence as any) && (
                              <TextField
                                size="small"
                                label="הזן סטטוס מותאם אישית"
                                value={editingPresenceOther}
                                onChange={(e) => setEditingPresenceOther(e.target.value)}
                                fullWidth
                              />
                            )}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button size="small" onClick={handleSavePresence} variant="contained">
                                שמור
                              </Button>
                              <Button size="small" onClick={() => setEditingSoldier(null)}>
                                ביטול
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditPresence(soldier.id, soldier.presence || '', soldier.absenceUntil, soldier.presenceOther)}
                            sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                          >
                            <EditIcon />
                          </IconButton>
                        )
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary" align="center">
                אין חיילים בהיררכיה זו
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {/* תת-מסגרות */}
      {framework.childFrameworks.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AccountTreeIcon sx={{ mr: 2 }} />
              <Typography variant="h6" fontWeight={600}>
                תת-מסגרות ({framework.childFrameworks.length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              {framework.childFrameworks.map((child) => (
                <Accordion key={child.id} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Avatar sx={{ bgcolor: 'secondary.main', mr: 2, width: 40, height: 40 }}>
                        <AccountTreeIcon />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChildFrameworkClick(child.id);
                          }}
                        >
                          {child.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {(child as any).soldiers?.length || 0} חיילים ישירים
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {(child as any).childFrameworks && (child as any).childFrameworks.length > 0 ? (
                      <Box>
                        {(child as any).childFrameworks.map((grandChild: any) => (
                          <Card key={grandChild.id} variant="outlined" sx={{ mb: 1 }}>
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2, width: 32, height: 32 }}>
                                  <AccountTreeIcon />
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Typography 
                                    variant="body1" 
                                    fontWeight="bold"
                                    sx={{ 
                                      cursor: 'pointer',
                                      '&:hover': { 
                                        color: 'primary.main',
                                        textDecoration: 'underline'
                                      }
                                    }}
                                    onClick={() => handleChildFrameworkClick(grandChild.id)}
                                  >
                                    {grandChild.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {(grandChild as any).soldiers?.length || 0} חיילים ישירים
                                  </Typography>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    ) : (
                      <Typography color="text.secondary" align="center" variant="body2">
                        אין תת-מסגרות נוספות
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* פעילויות */}
      {framework.activities && framework.activities.filter(activity => activity.status !== 'הושלם' && activity.status !== 'הסתיימה').length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AssignmentIcon sx={{ mr: 2 }} />
              <Typography variant="h6" fontWeight={600}>
                פעילויות ({framework.activities.filter(activity => activity.status !== 'הושלם' && activity.status !== 'הסתיימה').length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              {framework.activities.filter(activity => activity.status !== 'הושלם' && activity.status !== 'הסתיימה').map((activity) => (
                <Accordion key={activity.id} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Avatar sx={{ bgcolor: getPresenceColor(activity.status), mr: 2, width: 40, height: 40 }}>
                        <AssignmentIcon />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {activity.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {activity.status} • {formatToIsraelString(activity.plannedDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2">
                        <strong>משתתפים:</strong> {
                          activity.participantsFromCurrentFramework?.length > 0 
                            ? activity.participantsFromCurrentFramework.map((p: any) => p.soldierName).join(', ')
                            : activity.commanderFromCurrentFramework 
                              ? `מפקד: ${activity.commanderFromCurrentFramework.soldierName}`
                              : activity.taskLeaderFromCurrentFramework
                                ? `מוביל משימה: ${activity.taskLeaderFromCurrentFramework.soldierName}`
                                : activity.sourceFrameworkName || activity.frameworkId || activity.team || 'אין משתתפים'
                        }
                      </Typography>
                      {activity.description && (
                        <Typography variant="body2">
                          <strong>תיאור:</strong> {activity.description}
                        </Typography>
                      )}
                      {activity.location && (
                        <Typography variant="body2">
                          <strong>מיקום:</strong> {activity.location}
                        </Typography>
                      )}
                      {activity.region && (
                        <Typography variant="body2">
                          <strong>חטמ"ר:</strong> {activity.region}
                        </Typography>
                      )}
                      {activity.activityType && (
                        <Typography variant="body2">
                          <strong>סוג פעילות:</strong> {activity.activityType}
                          {activity.activityTypeOther && ` - ${activity.activityTypeOther}`}
                        </Typography>
                      )}
                      {activity.plannedDate && (
                        <Typography variant="body2">
                          <strong>תאריך מתוכנן:</strong> {formatToIsraelString(activity.plannedDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </Typography>
                      )}
                      {activity.plannedTime && (
                        <Typography variant="body2">
                          <strong>שעה מתוכננת:</strong> {activity.plannedTime}
                        </Typography>
                      )}
                      {activity.duration && (
                        <Typography variant="body2">
                          <strong>משך:</strong> {activity.duration} שעות
                        </Typography>
                      )}
                      {activity.commanderFromCurrentFramework && (
                        <Typography variant="body2">
                          <strong>מפקד הפעילות:</strong> {activity.commanderFromCurrentFramework.soldierName}
                        </Typography>
                      )}
                      {activity.taskLeaderFromCurrentFramework && (
                        <Typography variant="body2">
                          <strong>מוביל משימה:</strong> {activity.taskLeaderFromCurrentFramework.soldierName}
                        </Typography>
                      )}
                      {activity.mobility && (
                        <Typography variant="body2">
                          <strong>ניוד:</strong> {
                            activity.mobility.includes('TRIP_ID:') 
                              ? activity.mobility.split(';')
                                  .map((mobilityItem: string) => {
                                    const tripId = mobilityItem.replace('TRIP_ID:', '').trim();
                                    const trip = framework.trips?.find(t => t.id === tripId);
                                    return trip ? trip.purpose : tripId;
                                  })
                                  .filter(Boolean)
                                  .join(' | ')
                              : activity.mobility
                          }
                        </Typography>
                      )}
                      {activity.participants && activity.participants.length > 0 && (
                        <Typography variant="body2">
                          <strong>משתתפים מפורטים:</strong>
                        </Typography>
                      )}
                      {activity.participants && activity.participants.map((participant: any, index: number) => (
                        <Box key={index} sx={{ ml: 2, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, mb: 1 }}>
                          <Typography variant="body2">
                            <strong>{participant.soldierName}</strong> - {participant.role}
                            {participant.vehicleId && ` (רכב: ${participant.vehicleId})`}
                          </Typography>
                        </Box>
                      ))}
                      {activity.activitySummary && (
                        <Typography variant="body2">
                          <strong>סיכום פעילות:</strong> {activity.activitySummary}
                        </Typography>
                      )}
                      {activity.deliverables && activity.deliverables.length > 0 && (
                        <Typography variant="body2">
                          <strong>תוצרים:</strong>
                        </Typography>
                      )}
                      {activity.deliverables && activity.deliverables.map((deliverable: any, index: number) => (
                        <Box key={index} sx={{ ml: 2, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, mb: 1 }}>
                          <Typography variant="body2">
                            <strong>{deliverable.title}</strong> - {deliverable.type}
                          </Typography>
                          {deliverable.description && (
                            <Typography variant="body2" color="text.secondary">
                              {deliverable.description}
                            </Typography>
                          )}
                        </Box>
                      ))}
                      {activity.notes && (
                        <Typography variant="body2">
                          <strong>הערות:</strong> {activity.notes}
                        </Typography>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* תורנויות */}
      {framework.duties && framework.duties.filter(duty => duty.status !== 'הסתיימה' && duty.status !== 'הושלם').length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CalendarMonthIcon sx={{ mr: 2 }} />
              <Typography variant="h6" fontWeight={600}>
                תורנויות ({framework.duties.filter(duty => duty.status !== 'הסתיימה' && duty.status !== 'הושלם').length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              {framework.duties.filter(duty => duty.status !== 'הסתיימה' && duty.status !== 'הושלם').map((duty) => (
                <Box key={duty.id} sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 2, 
                  p: 2, 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 1,
                  bgcolor: 'background.paper'
                }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', mr: 2, width: 40, height: 40 }}>
                    <CalendarMonthIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      תורנות {duty.type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatToIsraelString(duty.startDate, { year: 'numeric', month: '2-digit', day: '2-digit' })} • {duty.startTime === '06:00' ? 'בוקר' : 'ערב'}
                    </Typography>
                    {duty.participantsFromCurrentFramework?.length > 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        משתתפים: {duty.participantsFromCurrentFramework.map((p: any) => p.soldierName).join(', ')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* נסיעות */}
      {framework.trips && framework.trips.filter(trip => trip.status !== 'הסתיימה' && trip.status !== 'הושלם').length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CarIcon sx={{ mr: 2 }} />
              <Typography variant="h6" fontWeight={600}>
                נסיעות ({framework.trips.filter(trip => trip.status !== 'הסתיימה' && trip.status !== 'הושלם').length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              {framework.trips.filter(trip => trip.status !== 'הסתיימה' && trip.status !== 'הושלם').map((trip) => (
                <Accordion key={trip.id} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 40, height: 40 }}>
                        <CarIcon />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          נסיעה {trip.purpose}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {trip.status} • {trip.departureTime?.replace('T', ' ') || ''} • {trip.location}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2">
                        <strong>נהג:</strong> {
                          trip.driverFromCurrentFramework 
                            ? trip.driverFromCurrentFramework.soldierName
                            : trip.sourceFrameworkName || trip.frameworkId || trip.team || 'לא מוגדר'
                        }
                      </Typography>
                      {trip.vehicle && (
                        <Typography variant="body2">
                          <strong>רכב:</strong> {trip.vehicle}
                        </Typography>
                      )}
                      {trip.vehicleNumber && (
                        <Typography variant="body2">
                          <strong>מספר רכב:</strong> {trip.vehicleNumber}
                        </Typography>
                      )}
                      {trip.vehicleType && (
                        <Typography variant="body2">
                          <strong>סוג רכב:</strong> {trip.vehicleType}
                        </Typography>
                      )}
                      {trip.purpose && (
                        <Typography variant="body2">
                          <strong>מטרה:</strong> {trip.purpose}
                        </Typography>
                      )}
                      {trip.purposeType && (
                        <Typography variant="body2">
                          <strong>סוג מטרה:</strong> {trip.purposeType}
                          {trip.purposeOther && ` - ${trip.purposeOther}`}
                        </Typography>
                      )}
                      {trip.location && (
                        <Typography variant="body2">
                          <strong>יעד:</strong> {trip.location}
                        </Typography>
                      )}
                      {trip.departureTime && (
                        <Typography variant="body2">
                          <strong>שעת יציאה:</strong> {trip.departureTime.replace('T', ' ')}
                        </Typography>
                      )}
                      {trip.returnTime && (
                        <Typography variant="body2">
                          <strong>שעת חזרה:</strong> {trip.returnTime.replace('T', ' ')}
                        </Typography>
                      )}
                      {trip.departureDate && (
                        <Typography variant="body2">
                          <strong>תאריך יציאה:</strong> {formatToIsraelString(trip.departureDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </Typography>
                      )}
                      {trip.returnDate && (
                        <Typography variant="body2">
                          <strong>תאריך חזרה:</strong> {formatToIsraelString(trip.returnDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </Typography>
                      )}
                      {trip.actualDepartureTime && (
                        <Typography variant="body2">
                          <strong>זמן יציאה בפועל:</strong> {trip.actualDepartureTime.replace('T', ' ')}
                        </Typography>
                      )}
                      {trip.actualReturnTime && (
                        <Typography variant="body2">
                          <strong>זמן חזרה בפועל:</strong> {trip.actualReturnTime.replace('T', ' ')}
                        </Typography>
                      )}
                      {trip.commanderFromCurrentFramework && (
                        <Typography variant="body2">
                          <strong>מפקד נסיעה:</strong> {trip.commanderFromCurrentFramework.soldierName}
                        </Typography>
                      )}
                      {trip.passengers && trip.passengers.length > 0 && (
                        <Typography variant="body2">
                          <strong>נוסעים:</strong> {trip.passengers.map((p: any) => p.soldierName).join(', ')}
                        </Typography>
                      )}
                      {trip.linkedActivityId && (
                        <Typography variant="body2">
                          <strong>פעילות מקושרת:</strong> {
                            (() => {
                              const linkedActivity = framework.activities?.find(a => a.id === trip.linkedActivityId);
                              return linkedActivity ? linkedActivity.name : trip.linkedActivityId;
                            })()
                          }
                        </Typography>
                      )}
                      {trip.team && (
                        <Typography variant="body2">
                          <strong>צוות:</strong> {trip.team}
                        </Typography>
                      )}
                      {trip.frameworkId && (
                        <Typography variant="body2">
                          <strong>מסגרת:</strong> {trip.frameworkId}
                        </Typography>
                      )}
                      {trip.autoStatusChanged && (
                        <Typography variant="body2" color="warning.main">
                          <strong>⚠️ סטטוס השתנה אוטומטית</strong>
                        </Typography>
                      )}
                      {trip.autoStatusUpdateTime && (
                        <Typography variant="body2">
                          <strong>זמן עדכון אוטומטי:</strong> {formatToIsraelString(trip.autoStatusUpdateTime, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      )}
                      {trip.notes && (
                        <Typography variant="body2">
                          <strong>הערות:</strong> {trip.notes}
                        </Typography>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* הפניות */}
      {framework.referrals && framework.referrals.filter(referral => {
        // הצג רק הפניות שעוד לא הגיע שעת החזרה שלהן (בזמן ישראל)
        if (referral.returnTime && referral.date) {
          try {
            const now = getCurrentIsraelTime();
            const returnDateTime = new Date(`${referral.date}T${referral.returnTime}`);
            
            // בדיקה שהתאריך תקין
            if (!isNaN(returnDateTime.getTime())) {
              return now < returnDateTime;
            }
          } catch (error) {
            console.warn('תאריך לא תקין להפניה:', referral.date, referral.returnTime);
          }
        }
        
        // אם אין שעת חזרה או תאריך - הצג את ההפניה
        return true;
      }).length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AssignmentIcon sx={{ mr: 2 }} />
              <Typography variant="h6" fontWeight={600}>
                הפניות ({framework.referrals.filter(referral => {
                  // הצג רק הפניות שעוד לא הגיע שעת החזרה שלהן (בזמן ישראל)
                  if (referral.returnTime && referral.date) {
                    try {
                      const now = getCurrentIsraelTime();
                      const returnDateTime = new Date(`${referral.date}T${referral.returnTime}`);
                      
                      // בדיקה שהתאריך תקין
                      if (!isNaN(returnDateTime.getTime())) {
                        return now < returnDateTime;
                      }
                    } catch (error) {
                      console.warn('תאריך לא תקין להפניה:', referral.date, referral.returnTime);
                    }
                  }
                  
                  // אם אין שעת חזרה או תאריך - הצג את ההפניה
                  return true;
                }).length})
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              {framework.referrals.filter(referral => {
                // הצג רק הפניות שעוד לא הגיע שעת החזרה שלהן (בזמן ישראל)
                if (referral.returnTime && referral.date) {
                  try {
                    const now = getCurrentIsraelTime();
                    const returnDateTime = new Date(`${referral.date}T${referral.returnTime}`);
                    
                    // בדיקה שהתאריך תקין
                    if (!isNaN(returnDateTime.getTime())) {
                      return now < returnDateTime;
                    }
                  } catch (error) {
                    console.warn('תאריך לא תקין להפניה:', referral.date, referral.returnTime);
                  }
                }
                
                // אם אין שעת חזרה או תאריך - הצג את ההפניה
                return true;
              }).map((referral) => (
                <Accordion key={referral.id} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Avatar sx={{ bgcolor: 'warning.main', mr: 2, width: 40, height: 40 }}>
                        <AssignmentIcon />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          הפניה {referral.soldierName && `- ${referral.soldierName}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {referral.departureTime?.replace('T', ' ') || ''} • {referral.location}
                          {referral.personalNumber && ` • ${referral.personalNumber}`}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {referral.soldierName && (
                        <Typography variant="body2">
                          <strong>חייל:</strong> {referral.soldierName}
                        </Typography>
                      )}
                      {referral.location && (
                        <Typography variant="body2">
                          <strong>מיקום:</strong> {referral.location}
                        </Typography>
                      )}
                      {referral.departureTime && (
                        <Typography variant="body2">
                          <strong>שעת יציאה:</strong> {referral.departureTime.replace('T', ' ')}
                        </Typography>
                      )}
                      {referral.returnTime && (
                        <Typography variant="body2">
                          <strong>שעת חזרה:</strong> {referral.returnTime.replace('T', ' ')}
                        </Typography>
                      )}
                      {referral.date && (
                        <Typography variant="body2">
                          <strong>תאריך:</strong> {formatToIsraelString(referral.date, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </Typography>
                      )}
                      {referral.reason && (
                        <Typography variant="body2">
                          <strong>סיבה:</strong> {referral.reason}
                        </Typography>
                      )}
                      {referral.notes && (
                        <Typography variant="body2">
                          <strong>הערות:</strong> {referral.notes}
                        </Typography>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Report Dialog */}
      <ReportDialog
        open={reportDialogOpen} 
        onClose={() => setReportDialogOpen(false)}
        frameworkName={framework?.name || ''}
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

export default FrameworkDetails; 