import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Card, CardContent, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Alert, CircularProgress, Fab,
  List, ListItem, ListItemText, ListItemSecondaryAction, Chip, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Autocomplete, FormControlLabel, Checkbox
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon, Search as SearchIcon, Schedule as ScheduleIcon, Person as PersonIcon,
  LocationOn as LocationIcon, Description as DescriptionIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { Referral } from '../models/Referral';
import { Soldier } from '../models/Soldier';
import { getAllReferrals, addReferral, updateReferral, deleteReferral, getReferralsBySoldier } from '../services/referralService';
import { getAllSoldiers } from '../services/soldierService';
import { getAllFrameworks } from '../services/frameworkService';
import { UserRole, SystemPath, PermissionLevel, DataScope } from '../models/UserRole';
import { canUserAccessPath, getUserPermissions } from '../services/permissionService';
import { getCurrentIsraelTime } from '../utils/dateUtils';

const Referrals: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [permissions, setPermissions] = useState({
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false
  });
  const [formData, setFormData] = useState({
    soldierId: '',
    soldierName: '',
    personalNumber: '',
    frameworkId: '',
    date: '',
    location: '',
    reason: '',
    departureTime: '06:00',
    returnTime: '18:00'
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // בדיקת הרשאות המשתמש
      const canView = await canUserAccessPath(user.uid, SystemPath.REFERRALS, PermissionLevel.VIEW);
      const canCreate = await canUserAccessPath(user.uid, SystemPath.REFERRALS, PermissionLevel.CREATE);
      const canEdit = await canUserAccessPath(user.uid, SystemPath.REFERRALS, PermissionLevel.EDIT);
      const canDelete = await canUserAccessPath(user.uid, SystemPath.REFERRALS, PermissionLevel.DELETE);
      
      setPermissions({ canView, canCreate, canEdit, canDelete });
      
      // אם אין הרשאת צפייה - לא טוען נתונים
      if (!canView) {
        setLoading(false);
        return;
      }
      
      // קבלת הרשאות המשתמש
      const userPermissions = await getUserPermissions(user.uid);
      const referralsPolicy = userPermissions.policies.find(policy => 
        policy.paths.includes(SystemPath.REFERRALS)
      );
      
      // עדכון אוטומטי של סטטוס הפניות
      // await updateReferralStatusesAutomatically(); // This line is removed
      
      // טעינת כל הנתונים קודם
      const [allSoldiers, allFrameworks] = await Promise.all([
        getAllSoldiers(),
        getAllFrameworks()
      ]);
      
      let referralsData: Referral[] = [];
      
      if (referralsPolicy) {
        // סינון נתונים לפי מדיניות ההרשאות
        switch (referralsPolicy.dataScope) {
          case DataScope.USER_ONLY:
            // משתמש רואה רק את ההפניות שלו
            referralsData = await getReferralsBySoldier(user.uid);
            break;
            
          case DataScope.FRAMEWORK_ONLY:
            // משתמש רואה את ההפניות של המסגרת שלו (כולל מסגרות-בנות)
            const userSoldier = allSoldiers.find(s => s.email === user.email);
            if (userSoldier?.frameworkId) {
              // פונקציה למציאת כל החיילים בהיררכיה כולל מסגרות-בנות
              const getAllSoldiersInHierarchy = (frameworkId: string): string[] => {
                const directSoldiers = allSoldiers.filter(s => s.frameworkId === frameworkId).map(s => s.id);
                const childFrameworks = allFrameworks.filter(f => f.parentFrameworkId === frameworkId);
                const childSoldiers = childFrameworks.flatMap(child => getAllSoldiersInHierarchy(child.id));
                return [...directSoldiers, ...childSoldiers];
              };
              
              // קבלת כל החיילים בהיררכיה
              const allSoldiersInHierarchy = getAllSoldiersInHierarchy(userSoldier.frameworkId);
              
              const allReferrals = await getAllReferrals();
              referralsData = allReferrals.filter(referral => {
                return allSoldiersInHierarchy.includes(referral.soldierId);
              });
            }
            break;
            
          case DataScope.ALL_DATA:
          default:
            // משתמש רואה את כל ההפניות
            referralsData = await getAllReferrals();
            break;
        }
      } else {
        // אם אין מדיניות - טוען את כל ההפניות
        referralsData = await getAllReferrals();
      }

      setReferrals(referralsData);
      setSoldiers(allSoldiers);
      setFrameworks(allFrameworks);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenForm = (referral?: Referral) => {
    if (referral && !permissions.canEdit) {
      alert('אין לך הרשאה לערוך הפניות');
      return;
    }
    if (!referral && !permissions.canCreate) {
      alert('אין לך הרשאה להוסיף הפניות');
      return;
    }
    
    if (referral) {
      setEditId(referral.id);
      setFormData({
        soldierId: referral.soldierId,
        soldierName: referral.soldierName,
        personalNumber: referral.personalNumber,
        frameworkId: referral.frameworkId || referral.team || '',
        date: referral.date,
        location: referral.location,
        reason: referral.reason,
        departureTime: referral.departureTime || '06:00',
        returnTime: referral.returnTime || '18:00'
      });
    } else {
      setEditId(null);
      setFormData({
        soldierId: '',
        soldierName: '',
        personalNumber: '',
        frameworkId: '',
        date: '',
        location: '',
        reason: '',
        departureTime: '06:00',
        returnTime: '18:00'
      });
    }
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditId(null);
    setFormData({
      soldierId: '',
      soldierName: '',
      personalNumber: '',
      frameworkId: '',
      date: '',
      location: '',
      reason: '',
      departureTime: '06:00',
      returnTime: '18:00'
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSoldierSelect = (soldier: Soldier | null) => {
    if (soldier) {
      setFormData(prev => ({
        ...prev,
        soldierId: soldier.id,
        soldierName: soldier.name,
        personalNumber: soldier.personalNumber,
        frameworkId: soldier.frameworkId || ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        if (!permissions.canEdit) {
          alert('אין לך הרשאה לערוך הפניות');
          return;
        }
        await updateReferral(editId, formData);
      } else {
        if (!permissions.canCreate) {
          alert('אין לך הרשאה להוסיף הפניות');
          return;
        }
        await addReferral(formData);
      }
      handleCloseForm();
      loadData();
    } catch (error) {
      console.error('שגיאה בשמירת הפניה:', error);
    }
  };

  const handleDelete = async () => {
    if (!permissions.canDelete) {
      alert('אין לך הרשאה למחוק הפניות');
      return;
    }
    if (!deleteId) return;
    try {
      await deleteReferral(deleteId);
      setDeleteId(null);
      loadData();
    } catch (error) {
      console.error('שגיאה במחיקת הפניה:', error);
    }
  };

  const filteredReferrals = referrals.filter(referral => {
    // אם הצ'קבוקס מסומן - הצג הכל
    if (showCompleted) {
      return true;
    }
    
    // אחרת - הצג רק הפניות שעוד לא הגיע שעת החזרה שלהן (בזמן ישראל)
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
  });

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // בדיקה אם למשתמש יש הרשאת צפייה
  if (!permissions.canView) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          אין לך הרשאה לצפות בהפניות
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            הפניות
          </Typography>
          <Typography variant="body1" color="text.secondary">
            ניהול הפניות של חיילים
          </Typography>
        </Box>
        {permissions.canCreate && (
          <Fab
            color="primary"
            onClick={() => handleOpenForm()}
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
          >
            <AddIcon />
          </Fab>
        )}
      </Box>

      {/* Show Completed Checkbox */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FormControlLabel
            control={
              <Checkbox
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
              />
            }
            label="הצג הפניות שהסתיימו"
          />
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={viewMode === 'cards' ? 0 : 1} onChange={(_, newValue) => setViewMode(newValue === 0 ? 'cards' : 'table')}>
          <Tab label="תצוגת כרטיסים" />
          <Tab label="תצוגה טבלאית" />
        </Tabs>
      </Box>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredReferrals.map((referral) => (
            <Card key={referral.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {referral.soldierName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {referral.personalNumber} • {referral.team}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>תאריך:</strong> {referral.date}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>שעת יציאה:</strong> {referral.departureTime || '06:00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>שעת חזרה:</strong> {referral.returnTime || '18:00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>מיקום:</strong> {referral.location}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>סיבה:</strong> {referral.reason}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                  {permissions.canEdit && (
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenForm(referral);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                  {permissions.canDelete && (
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(referral.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>חייל</TableCell>
                <TableCell>צוות</TableCell>
                <TableCell>תאריך</TableCell>
                <TableCell>שעת יציאה</TableCell>
                <TableCell>שעת חזרה</TableCell>
                <TableCell>מיקום</TableCell>
                <TableCell>סיבה</TableCell>
                {(permissions.canEdit || permissions.canDelete) && (
                  <TableCell>פעולות</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReferrals.map((referral) => (
                <TableRow key={referral.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {referral.soldierName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {referral.personalNumber}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{referral.team}</TableCell>
                  <TableCell>{referral.date}</TableCell>
                  <TableCell>{referral.departureTime || '06:00'}</TableCell>
                  <TableCell>{referral.returnTime || '18:00'}</TableCell>
                  <TableCell>{referral.location}</TableCell>
                  <TableCell>{referral.reason}</TableCell>
                  {(permissions.canEdit || permissions.canDelete) && (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {permissions.canEdit && (
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenForm(referral);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        {permissions.canDelete && (
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(referral.id);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {filteredReferrals.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            לא נמצאו הפניות
          </Typography>
        </Box>
      )}

      {/* Add/Edit Form Dialog */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>
          {editId ? 'עריכת הפניה' : 'הוספת הפניה חדשה'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Autocomplete
                options={soldiers}
                getOptionLabel={(option) => `${option.name} (${option.personalNumber})`}
                value={soldiers.find(s => s.id === formData.soldierId) || null}
                onChange={(_, newValue) => handleSoldierSelect(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="חייל"
                    required
                    fullWidth
                  />
                )}
              />
              <TextField
                name="date"
                label="תאריך ההפניה"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  name="departureTime"
                  label="שעת יציאה"
                  type="time"
                  value={formData.departureTime}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  name="returnTime"
                  label="שעת חזרה"
                  type="time"
                  value={formData.returnTime}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <TextField
                name="location"
                label="מיקום ההפניה"
                value={formData.location}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                name="reason"
                label="סיבת ההפניה"
                value={formData.reason}
                onChange={handleChange}
                required
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForm}>ביטול</Button>
            <Button type="submit" variant="contained">
              {editId ? 'עדכן' : 'הוסף'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>מחיקת הפניה</DialogTitle>
        <DialogContent>
          <Typography>
            האם אתה בטוח שברצונך למחוק הפניה זו?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>ביטול</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            מחק
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Referrals; 