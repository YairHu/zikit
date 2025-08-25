import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Card, CardContent, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Alert, CircularProgress, Fab,
  List, ListItem, ListItemText, ListItemSecondaryAction, Chip, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Autocomplete
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon, Person as PersonIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { Mission } from '../models/Mission';
import { 
  getMissionsByUserPermissions, 
  addMission, 
  updateMission, 
  deleteMission, 
  getAvailableSoldiersByPermissions,
  createDefaultMissionPolicies
} from '../services/missionService';
import { UserRole, SystemPath, PermissionLevel } from '../models/UserRole';
import { canUserAccessPath } from '../services/permissionService';

const Missions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false
  });
  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [availableSoldiers, setAvailableSoldiers] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dueDate: '',
    assignedToSoldiers: [] as string[]
  });

  const loadMissions = useCallback(async () => {
    try {
      setLoading(true);
      
      // בדיקת הרשאות המשתמש
      if (user) {
        const canView = await canUserAccessPath(user.uid, SystemPath.MISSIONS, PermissionLevel.VIEW);
        const canCreate = await canUserAccessPath(user.uid, SystemPath.MISSIONS, PermissionLevel.CREATE);
        const canEdit = await canUserAccessPath(user.uid, SystemPath.MISSIONS, PermissionLevel.EDIT);
        const canDelete = await canUserAccessPath(user.uid, SystemPath.MISSIONS, PermissionLevel.DELETE);
        
        setPermissions({ canView, canCreate, canEdit, canDelete });
        
        // אם אין הרשאת צפייה - לא טוען נתונים
        if (!canView) {
          setMissions([]);
          return;
        }
      }
      
      // טעינת משימות לפי הרשאות המשתמש
      if (user) {
        const data = await getMissionsByUserPermissions(user.uid);
        setMissions(data);
      }
    } catch (error) {
      console.error('שגיאה בטעינת משימות:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadAvailableSoldiers = useCallback(async () => {
    if (user) {
      try {
        const soldiers = await getAvailableSoldiersByPermissions(user.uid);
        setAvailableSoldiers(soldiers);
      } catch (error) {
        console.error('שגיאה בטעינת חיילים זמינים:', error);
      }
    }
  }, [user]);

  useEffect(() => {
    loadMissions();
    loadAvailableSoldiers();
  }, [loadMissions, loadAvailableSoldiers]);

  const handleOpenForm = (mission?: Mission) => {
    if (mission) {
      setEditId(mission.id);
      setFormData({
        name: mission.name,
        description: mission.description,
        dueDate: mission.dueDate,
        assignedToSoldiers: mission.assignedToSoldiers || []
      });
    } else {
      setEditId(null);
      setFormData({
        name: '',
        description: '',
        dueDate: '',
        assignedToSoldiers: []
      });
    }
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditId(null);
    setFormData({
      name: '',
      description: '',
      dueDate: '',
      assignedToSoldiers: []
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // בדיקת הרשאות
    if (editId && !permissions.canEdit) {
      alert('אין לך הרשאה לערוך משימות');
      return;
    }
    
    if (!editId && !permissions.canCreate) {
      alert('אין לך הרשאה ליצור משימות חדשות');
      return;
    }
    
    // בדיקת שדות חובה
    if (!formData.name.trim()) {
      alert('שם המשימה הוא שדה חובה');
      return;
    }
    
    if (!formData.description.trim()) {
      alert('תיאור המשימה הוא שדה חובה');
      return;
    }
    
    if (!formData.dueDate) {
      alert('תאריך יעד הוא שדה חובה');
      return;
    }
    
    if (!formData.assignedToSoldiers || formData.assignedToSoldiers.length === 0) {
      alert('יש לבחור לפחות חייל אחד למשימה');
      return;
    }
    
    try {
      const missionData = {
        ...formData,
        assignedBy: user.displayName || user.email || 'משתמש לא ידוע',
        assignedByUid: user.uid
      };

      if (editId) {
        await updateMission(editId, missionData);
      } else {
        await addMission(missionData);
      }
      handleCloseForm();
      loadMissions();
    } catch (error) {
      console.error('שגיאה בשמירת משימה:', error);
      alert('שגיאה בשמירת משימה');
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      if (!permissions.canDelete) {
        alert('אין לך הרשאה למחוק משימות');
        return;
      }
      
      try {
        await deleteMission(deleteId);
        setDeleteId(null);
        loadMissions();
      } catch (error) {
        console.error('שגיאה במחיקת משימה:', error);
        alert('שגיאה במחיקת משימה');
      }
    }
  };

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
        <Alert severity="warning" sx={{ mt: 3 }}>
          אין לך הרשאה לצפות במשימות
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          משימות
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {permissions.canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenForm()}
              sx={{ borderRadius: 2 }}
            >
              הוסף משימה
            </Button>
          )}
          {user && (user.role === 'admin' || user.role === 'chayal') && (
            <Button
              variant="outlined"
              onClick={createDefaultMissionPolicies}
              sx={{ borderRadius: 2 }}
            >
              צור מדיניות הרשאות
            </Button>
          )}
        </Box>
      </Box>

      {/* View Mode Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={viewMode === 'cards' ? 0 : 1} onChange={(_, newValue) => setViewMode(newValue === 0 ? 'cards' : 'table')}>
          <Tab label="תצוגת כרטיסים" />
          <Tab label="תצוגה טבלאית" />
        </Tabs>
      </Box>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
          {missions.map((mission) => (
            <Card key={mission.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ flex: 1 }}>
                    {mission.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {permissions.canEdit && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenForm(mission)}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    {permissions.canDelete && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteId(mission.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {mission.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AssignmentIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">תאריך יעד: {mission.dueDate}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PersonIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">יוצר המשימה: {mission.assignedBy}</Typography>
                  </Box>
                  {mission.assignedToSoldiers && mission.assignedToSoldiers.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        מקבלי המשימה:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {mission.assignedToSoldiers.map((soldierId, index) => {
                          const soldier = availableSoldiers.find(s => s.id === soldierId);
                          return (
                            <Chip
                              key={soldierId}
                              label={soldier?.name || soldierId}
                              size="small"
                              variant="outlined"
                            />
                          );
                        })}
                      </Box>
                    </Box>
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
                <TableCell>שם משימה</TableCell>
                <TableCell>תיאור</TableCell>
                <TableCell>תאריך יעד</TableCell>
                <TableCell>יוצר המשימה</TableCell>
                <TableCell>מקבלי המשימה</TableCell>
                <TableCell>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {missions.map((mission) => (
                <TableRow key={mission.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {mission.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {mission.description}
                    </Typography>
                  </TableCell>
                  <TableCell>{mission.dueDate}</TableCell>
                  <TableCell>{mission.assignedBy}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {mission.assignedToSoldiers?.map((soldierId) => {
                        const soldier = availableSoldiers.find(s => s.id === soldierId);
                        return (
                          <Chip
                            key={soldierId}
                            label={soldier?.name || soldierId}
                            size="small"
                            variant="outlined"
                          />
                        );
                      })}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {permissions.canEdit && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenForm(mission)}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {permissions.canDelete && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteId(mission.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {missions.length === 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          לא נמצאו משימות
        </Alert>
      )}

      {/* Add/Edit Form Dialog */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>
          {editId ? 'ערוך משימה' : 'הוסף משימה חדשה'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="שם משימה"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <TextField
                fullWidth
                label="תיאור"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={3}
                required
              />
              <TextField
                fullWidth
                label="תאריך יעד"
                name="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={handleChange}
                required
                InputLabelProps={{ shrink: true }}
              />
              <Autocomplete
                multiple
                options={availableSoldiers}
                getOptionLabel={(option) => option.name}
                value={availableSoldiers.filter(soldier => formData.assignedToSoldiers.includes(soldier.id))}
                onChange={(_, newValue) => {
                  setFormData(prev => ({
                    ...prev,
                    assignedToSoldiers: newValue.map(soldier => soldier.id)
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="מקבלי המשימה"
                    placeholder="בחר חיילים..."
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                    </Box>
                  </li>
                )}
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

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>מחיקת משימה</DialogTitle>
        <DialogContent>
          <Typography>האם אתה בטוח שברצונך למחוק משימה זו?</Typography>
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

export default Missions; 