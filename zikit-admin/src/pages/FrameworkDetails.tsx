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
  Save as SaveIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { FrameworkWithDetails } from '../models/Framework';
import { getAllFrameworks, getFrameworkWithDetails, getFrameworkNamesByIds } from '../services/frameworkService';
import { getAllSoldiers, updateSoldier } from '../services/soldierService';
import { getPresenceColor, getProfileColor, getRoleColor } from '../utils/colors';
import { getUserPermissions, canUserEditSoldierPresence } from '../services/permissionService';
import { PermissionLevel, SystemPath } from '../models/UserRole';

const FrameworkDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [framework, setFramework] = useState<FrameworkWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);
  const [frameworkNames, setFrameworkNames] = useState<{ [key: string]: string }>({});
  const [canManageFrameworks, setCanManageFrameworks] = useState<boolean>(false);
  const [canEditPersonnel, setCanEditPersonnel] = useState<boolean>(false);
  const [editingSoldier, setEditingSoldier] = useState<string | null>(null);
  const [editingPresence, setEditingPresence] = useState<string>('');
  const [editingPresenceUntil, setEditingPresenceUntil] = useState<string>('');
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
      setFramework(frameworkData);
      
      // קבלת שמות המסגרות עבור החיילים בהיררכיה
      if (frameworkData.allSoldiersInHierarchy) {
        const frameworkIds = Array.from(new Set(frameworkData.allSoldiersInHierarchy.map(s => s.frameworkId)));
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

  const handleSoldierClick = (soldierId: string) => {
    navigate(`/soldiers/${soldierId}`);
  };

  const handleChildFrameworkClick = (frameworkId: string) => {
    navigate(`/frameworks/${frameworkId}`);
  };

  const handleEditPresence = (soldierId: string, currentPresence: string, currentPresenceUntil?: string, currentPresenceOther?: string) => {
    setEditingSoldier(soldierId);
    setEditingPresence(currentPresence || '');
    setEditingPresenceUntil(currentPresenceUntil || '');
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
      
      const updateData: any = { presence: finalPresence };
      
      // אם נבחר גימלים או חופש, הוסף את התאריך
      if ((editingPresence === 'גימלים' || editingPresence === 'חופש') && editingPresenceUntil) {
        updateData.presenceUntil = editingPresenceUntil;
      } else {
        // אם לא גימלים/חופש, נקה את התאריך
        updateData.presenceUntil = '';
      }
      
      await updateSoldier(editingSoldier, updateData);
      
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
      setEditingPresenceUntil('');
      setEditingPresenceOther('');
    }
  };

  // פונקציה למיפוי הסטטוס לדוח (משותפת)
  const mapStatusForReport = (status: string) => {
    switch (status) {
      case 'בבסיס':
      case 'בפעילות':
      case 'בתורנות':
      case 'בנסיעה':
      case 'במנוחה':
        return 'בבסיס';
      case 'גימלים':
        return 'גימלים';
      case 'חופש':
        return 'בחופש';
      default:
        return 'בבסיס';
    }
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
      editedPresence: mapStatusForReport(soldier.presence || 'לא מוגדר'), // מיפוי ראשוני
      otherText: '' // שדה לטקסט חופשי
    }));
    
    setReportData(report);
    setReportDialogOpen(true);
  };

  const handleUpdateReportPresence = (soldierId: string, newPresence: string) => {
    setReportData(prev => prev.map(item => 
      item.id === soldierId 
        ? { ...item, editedPresence: newPresence, otherText: newPresence === 'אחר' ? item.otherText : '' }
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

  const handlePrintReport = () => {
    const reportText = reportData.map(soldier => {
      const status = soldier.editedPresence === 'אחר' && soldier.otherText 
        ? soldier.otherText 
        : mapStatusForReport(soldier.editedPresence);
      return `${soldier.name} - ${soldier.role} - ${soldier.personalNumber} - ${soldier.frameworkName} - ${status}`;
    }).join('\n');
    
    alert(`דוח 1 - סטטוס נוכחות חיילים במסגרת ${framework?.name}:\n\n${reportText}`);
    setReportDialogOpen(false);
  };

  // פונקציה לחישוב נוכחות במסגרת
  const calculatePresence = () => {
    if (!framework || !framework.allSoldiersInHierarchy || framework.allSoldiersInHierarchy.length === 0) {
      return '0/0';
    }
    
    const totalSoldiers = framework.allSoldiersInHierarchy.length;
    const presentSoldiers = framework.allSoldiersInHierarchy.filter(soldier => 
      soldier.presence === 'בבסיס'
    ).length;
    
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/frameworks')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            {framework.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {framework.totalSoldiers} חיילים • נוכחות: {calculatePresence()}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canEditPersonnel && (
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handleGenerateReport}
            >
              הפק דוח 1
            </Button>
          )}
        {canManageFrameworks && (
          <Button
            variant="outlined"
            startIcon={<AccountTreeIcon />}
            onClick={() => navigate('/framework-management')}
          >
            ניהול מסגרות
          </Button>
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
          
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                מפקד המסגרת
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {framework.commander?.name || 'לא מוגדר'}
              </Typography>
            </Box>
            
            {framework.parentFramework && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  מסגרת אב
                </Typography>
                <Typography 
                  variant="body1" 
                  fontWeight={600}
                  sx={{ 
                    cursor: 'pointer',
                    color: 'primary.main',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                  onClick={() => handleChildFrameworkClick(framework.parentFramework!.id)}
                >
                  {framework.parentFramework.name}
                </Typography>
              </Box>
            )}
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                מסגרות בנות
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {framework.childFrameworks.length}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                נוכחות
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {calculatePresence()}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label={`חיילים ישירים (${framework.soldiers.length})`} />
          <Tab label={`כל החיילים בהיררכיה (${framework.totalSoldiers})`} />
          <Tab label={`מסגרות בנות (${framework.childFrameworks.length})`} />
          <Tab label={`פעילויות (${framework.activities?.length || 0})`} />
          <Tab label={`תורנויות (${framework.duties?.length || 0})`} />
          <Tab label={`נסיעות (${framework.trips?.filter(trip => trip.status !== 'הסתיימה').length || 0})`} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              חיילי המסגרת (ישירים)
            </Typography>
            {framework.soldiers.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>שם</TableCell>
                      <TableCell>תפקיד</TableCell>
                      <TableCell>מספר אישי</TableCell>
                      <TableCell>סטטוס נוכחות</TableCell>
                      {canEditPersonnel && <TableCell>פעולות</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                {framework.soldiers.map((soldier) => (
                      <TableRow key={soldier.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ bgcolor: getRoleColor(soldier.role), mr: 2, width: 32, height: 32 }}>
                          {soldier.name.charAt(0)}
                        </Avatar>
                            <Typography 
                              variant="body1" 
                              sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                              onClick={() => handleSoldierClick(soldier.id)}
                            >
                              {soldier.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{soldier.role}</TableCell>
                        <TableCell>{soldier.personalNumber}</TableCell>
                        <TableCell>
                          <Chip 
                            label={soldier.presence || 'לא מוגדר'} 
                            sx={{ 
                              bgcolor: getPresenceColor(soldier.presence || ''),
                              color: 'white'
                            }}
                            size="small"
                          />
                        </TableCell>
                        {canEditPersonnel && (
                          <TableCell>
                            {editingSoldier === soldier.id ? (
                              <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <Select
                                      value={editingPresence}
                                      onChange={(e) => setEditingPresence(e.target.value)}
                                      size="small"
                                    >
                                      <MenuItem value="בבסיס">בבסיס</MenuItem>
                                      <MenuItem value="בפעילות">בפעילות</MenuItem>
                                      <MenuItem value="חופש">חופש</MenuItem>
                                      <MenuItem value="גימלים">גימלים</MenuItem>
                                      <MenuItem value="אחר">אחר</MenuItem>
                                    </Select>
                                  </FormControl>
                                  <IconButton size="small" onClick={handleSavePresence} color="primary">
                                    <SaveIcon />
                                  </IconButton>
                                </Box>
                                {(editingPresence === 'גימלים' || editingPresence === 'חופש') && (
                                  <TextField
                                    size="small"
                                    label={`${editingPresence} עד איזה יום? כולל`}
                                    type="date"
                                    value={editingPresenceUntil}
                                    onChange={(e) => setEditingPresenceUntil(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ minWidth: 200 }}
                                  />
                                )}
                                {editingPresence === 'אחר' && (
                                  <TextField
                                    size="small"
                                    label="הזן סטטוס מותאם אישית"
                                    value={editingPresenceOther}
                                    onChange={(e) => setEditingPresenceOther(e.target.value)}
                                    sx={{ minWidth: 200 }}
                                  />
                                )}
                              </Box>
                            ) : (
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditPresence(soldier.id, soldier.presence || '', soldier.presenceUntil, (soldier as any).presenceOther)}
                              >
                                <EditIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" align="center">
                אין חיילים במסגרת זו
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              כל החיילים בהיררכיה (כולל מסגרות בנות)
            </Typography>
            {framework.allSoldiersInHierarchy && framework.allSoldiersInHierarchy.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>שם</TableCell>
                      <TableCell>תפקיד</TableCell>
                      <TableCell>מספר אישי</TableCell>
                      <TableCell>מסגרת</TableCell>
                      <TableCell>סטטוס נוכחות</TableCell>
                      {canEditPersonnel && <TableCell>פעולות</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                {framework.allSoldiersInHierarchy.map((soldier) => (
                      <TableRow key={soldier.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ bgcolor: getRoleColor(soldier.role), mr: 2, width: 32, height: 32 }}>
                          {soldier.name.charAt(0)}
                        </Avatar>
                            <Typography 
                              variant="body1" 
                              sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                              onClick={() => handleSoldierClick(soldier.id)}
                            >
                              {soldier.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{soldier.role}</TableCell>
                        <TableCell>{soldier.personalNumber}</TableCell>
                        <TableCell>{frameworkNames[soldier.frameworkId] || soldier.frameworkId}</TableCell>
                        <TableCell>
                          <Chip 
                            label={soldier.presence || 'לא מוגדר'} 
                            sx={{ 
                              bgcolor: getPresenceColor(soldier.presence || ''),
                              color: 'white'
                            }}
                            size="small"
                          />
                        </TableCell>
                        {canEditPersonnel && (
                          <TableCell>
                            {editingSoldier === soldier.id ? (
                              <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <Select
                                      value={editingPresence}
                                      onChange={(e) => setEditingPresence(e.target.value)}
                                      size="small"
                                    >
                                      <MenuItem value="בבסיס">בבסיס</MenuItem>
                                      <MenuItem value="בפעילות">בפעילות</MenuItem>
                                      <MenuItem value="חופש">חופש</MenuItem>
                                      <MenuItem value="גימלים">גימלים</MenuItem>
                                      <MenuItem value="אחר">אחר</MenuItem>
                                    </Select>
                                  </FormControl>
                                  <IconButton size="small" onClick={handleSavePresence} color="primary">
                                    <SaveIcon />
                                  </IconButton>
                                </Box>
                                {(editingPresence === 'גימלים' || editingPresence === 'חופש') && (
                                  <TextField
                                    size="small"
                                    label={`${editingPresence} עד איזה יום? כולל`}
                                    type="date"
                                    value={editingPresenceUntil}
                                    onChange={(e) => setEditingPresenceUntil(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ minWidth: 200 }}
                                  />
                                )}
                                {editingPresence === 'אחר' && (
                                  <TextField
                                    size="small"
                                    label="הזן סטטוס מותאם אישית"
                                    value={editingPresenceOther}
                                    onChange={(e) => setEditingPresenceOther(e.target.value)}
                                    sx={{ minWidth: 200 }}
                                  />
                                )}
                              </Box>
                            ) : (
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditPresence(soldier.id, soldier.presence || '', soldier.presenceUntil, (soldier as any).presenceOther)}
                              >
                                <EditIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" align="center">
                אין חיילים בהיררכיה זו
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              מסגרות בנות
            </Typography>
            {framework.childFrameworks.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                {framework.childFrameworks.map((child) => (
                  <Card key={child.id} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                          <AccountTreeIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography 
                            variant="h6" 
                            fontWeight="bold"
                            sx={{ 
                              cursor: 'pointer',
                              '&:hover': { 
                                color: 'primary.main',
                                textDecoration: 'underline'
                              }
                            }}
                            onClick={() => handleChildFrameworkClick(child.id)}
                          >
                            {child.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            רמה: {child.level}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary" align="center">
                אין מסגרות בנות
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              פעילויות
            </Typography>
            {framework.activities && framework.activities.length > 0 ? (
              <List>
                {framework.activities.map((activity) => (
                  <ListItem key={activity.id} disablePadding>
                    <ListItemButton onClick={() => navigate(`/activities/${activity.id}`)}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: getPresenceColor(activity.status) }}>
                          <AssignmentIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.name}
                        secondary={`${activity.status} • ${new Date(activity.plannedDate).toLocaleDateString('he-IL')} • ${
                          activity.participantsFromCurrentFramework?.length > 0 
                            ? `משתתפים: ${activity.participantsFromCurrentFramework.map((p: any) => p.soldierName).join(', ')}`
                            : activity.commanderFromCurrentFramework 
                              ? `מפקד: ${activity.commanderFromCurrentFramework.soldierName}`
                                                             : activity.taskLeaderFromCurrentFramework
                                 ? `מוביל משימה: ${activity.taskLeaderFromCurrentFramework.soldierName}`
                                : activity.sourceFrameworkName || activity.frameworkId || activity.team || ''
                        }`}
                      />
                      <ArrowBackIcon color="action" />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" align="center">
                אין פעילויות למסגרת זו
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              תורנויות
            </Typography>
            {framework.duties && framework.duties.length > 0 ? (
              <List>
                {framework.duties.map((duty) => (
                  <ListItem key={duty.id} disablePadding>
                    <ListItemButton onClick={() => navigate(`/duties/${duty.id}`)}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                          <CalendarMonthIcon />
                        </Avatar>
                      </ListItemAvatar>
                       <ListItemText
                         primary={`תורנות ${duty.type}`}
                         secondary={`${duty.status} • ${new Date(duty.startDate).toLocaleDateString('he-IL')} • ${duty.location} • ${
                           duty.participantsFromCurrentFramework?.length > 0 
                             ? `משתתפים: ${duty.participantsFromCurrentFramework.map((p: any) => p.soldierName).join(', ')}`
                             : duty.sourceFrameworkName || duty.frameworkId || duty.team || ''
                         }`}
                       />
                      <ArrowBackIcon color="action" />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" align="center">
                אין תורנויות למסגרת זו
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 5 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              נסיעות
            </Typography>
            {framework.trips && framework.trips.filter(trip => trip.status !== 'הסתיימה').length > 0 ? (
              <List>
                {framework.trips.filter(trip => trip.status !== 'הסתיימה').map((trip) => (
                  <ListItem key={trip.id} disablePadding>
                    <ListItemButton onClick={() => navigate(`/trips/${trip.id}`)}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <CarIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`נסיעה ${trip.purpose}`}
                        secondary={`${trip.status} • ${trip.departureTime} • ${trip.location} • ${
                          trip.driverFromCurrentFramework 
                            ? `נהג: ${trip.driverFromCurrentFramework.soldierName}`
                            : trip.sourceFrameworkName || trip.frameworkId || trip.team || ''
                        }`}
                      />
                      <ArrowBackIcon color="action" />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" align="center">
                אין נסיעות למסגרת זו
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Dialog */}
      <Dialog 
        open={reportDialogOpen} 
        onClose={() => setReportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          דוח 1 - סטטוס נוכחות חיילים במסגרת {framework.name}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>שם</TableCell>
                  <TableCell>תפקיד</TableCell>
                  <TableCell>מספר אישי</TableCell>
                  <TableCell>מסגרת</TableCell>
                  <TableCell>סטטוס נוכחות</TableCell>
                  <TableCell>עריכת דוח</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((soldier) => (
                  <TableRow key={soldier.id}>
                    <TableCell>{soldier.name}</TableCell>
                    <TableCell>{soldier.role}</TableCell>
                    <TableCell>{soldier.personalNumber}</TableCell>
                    <TableCell>{soldier.frameworkName}</TableCell>
                    <TableCell>
                      <Chip 
                        label={soldier.presence} 
                        sx={{ 
                          bgcolor: getPresenceColor(soldier.presence),
                          color: 'white'
                        }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              value={soldier.editedPresence}
                              onChange={(e) => handleUpdateReportPresence(soldier.id, e.target.value)}
                              size="small"
                            >
                              <MenuItem value="בבסיס">בבסיס</MenuItem>
                              <MenuItem value="חופש">חופש</MenuItem>
                              <MenuItem value="גימלים">גימלים</MenuItem>
                              <MenuItem value="אחר">אחר</MenuItem>
                            </Select>
                          </FormControl>
                          {soldier.editedPresence === 'אחר' && (
                            <TextField
                              size="small"
                              placeholder="הזן טקסט חופשי"
                              value={soldier.otherText || ''}
                              onChange={(e) => handleUpdateReportOtherText(soldier.id, e.target.value)}
                              sx={{ minWidth: 200 }}
                            />
                          )}
                        </Box>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>
            ביטול
          </Button>
          <Button onClick={handlePrintReport} variant="contained" startIcon={<PrintIcon />}>
            הפק דוח
          </Button>
        </DialogActions>
      </Dialog>

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