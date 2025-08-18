import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Card, CardContent, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Alert, CircularProgress, Fab,
  List, ListItem, ListItemText, ListItemSecondaryAction, Chip, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon, Search as SearchIcon, Schedule as ScheduleIcon, Person as PersonIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { Mission } from '../models/Mission';
import { getAllMissions, addMission, updateMission, deleteMission, getMissionsBySoldier } from '../services/missionService';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dueDate: '',
    assignedBy: '',
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'cancelled'
  });

  const statuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  const statusLabels = {
    pending: 'ממתין',
    in_progress: 'בביצוע',
    completed: 'הושלם',
    cancelled: 'בוטל'
  };

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
      let data: Mission[] = [];
      if (user) {
        // בדיקה אם למשתמש יש הרשאת צפייה במשימות שלו בלבד
        const canViewAll = await canUserAccessPath(user.uid, SystemPath.MISSIONS, PermissionLevel.VIEW);
        if (canViewAll) {
          // אם יש הרשאת צפייה - רואה את כל המשימות
          data = await getAllMissions();
        } else {
          // אם אין הרשאת צפייה - רואה רק את המשימות שלו
          data = await getMissionsBySoldier(user.uid);
        }
      }
      
      setMissions(data);
    } catch (error) {
      console.error('שגיאה בטעינת משימות:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  const handleOpenForm = (mission?: Mission) => {
    if (mission) {
      setEditId(mission.id);
      setFormData({
        name: mission.name,
        description: mission.description,
        dueDate: mission.dueDate,
        assignedBy: mission.assignedBy,
        status: mission.status
      });
    } else {
      setEditId(null);
      setFormData({
        name: '',
        description: '',
        dueDate: '',
        assignedBy: '',
        status: 'pending'
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
      assignedBy: '',
      status: 'pending'
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
    
    try {
      if (editId) {
        await updateMission(editId, formData);
      } else {
        await addMission(formData);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const filteredMissions = missions.filter(mission => {
    const matchesSearch = mission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mission.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mission.assignedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || mission.status === filterStatus;
    return matchesSearch && matchesStatus;
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
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="חיפוש משימות..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{ minWidth: 250 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>סטטוס</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="סטטוס"
          >
            <MenuItem value="">כל הסטטוסים</MenuItem>
            {statuses.map(status => (
              <MenuItem key={status} value={status}>{statusLabels[status as keyof typeof statusLabels]}</MenuItem>
            ))}
          </Select>
        </FormControl>
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
          {filteredMissions.map((mission) => (
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
                  <Chip 
                    label={statusLabels[mission.status as keyof typeof statusLabels]} 
                    color={getStatusColor(mission.status) as any}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {mission.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ScheduleIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">תאריך יעד: {mission.dueDate}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">נותן המשימה: {mission.assignedBy}</Typography>
                  </Box>
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
                <TableCell>נותן המשימה</TableCell>
                <TableCell>סטטוס</TableCell>
                <TableCell>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMissions.map((mission) => (
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
                    <Chip 
                      label={statusLabels[mission.status as keyof typeof statusLabels]} 
                      color={getStatusColor(mission.status) as any}
                      size="small"
                    />
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

      {filteredMissions.length === 0 && (
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
              <TextField
                fullWidth
                label="נותן המשימה"
                name="assignedBy"
                value={formData.assignedBy}
                onChange={handleChange}
                required
              />
              <FormControl fullWidth>
                <InputLabel>סטטוס</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={(e) => handleSelectChange('status', e.target.value)}
                  label="סטטוס"
                  required
                >
                  {statuses.map(status => (
                    <MenuItem key={status} value={status}>
                      {statusLabels[status as keyof typeof statusLabels]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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