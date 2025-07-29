import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { Activity, ActivityParticipant } from '../models/Activity';
import { Soldier } from '../models/Soldier';
import { Vehicle } from '../models/Vehicle';
import { getAllActivities, addActivity, updateActivity, deleteActivity } from '../services/activityService';
import { getAllSoldiers } from '../services/soldierService';
import { getAllVehicles } from '../services/vehicleService';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Chip,
  IconButton,
  Fab,
  Alert,
  CircularProgress,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  DirectionsCar as DirectionsCarIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon
} from '@mui/icons-material';

const emptyActivity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  team: '',
  location: '',
  region: 'מנשה',
  plannedDate: '',
  plannedTime: '',
  duration: 1,
  commanderId: '',
  commanderName: '',
  taskLeaderId: '',
  taskLeaderName: '',
  vehicleId: '',
  vehicleNumber: '',
  driverId: '',
  driverName: '',
  participants: [],
  status: 'מתוכננת'
};

const regions = ['מנשה', 'אפרים', 'שומרון', 'יהודה', 'בנימין', 'עציון', 'הבקעה והעמקים'];
const teams = ['צוות 10', 'צוות 20', 'צוות 30', 'צוות 40', 'צוות 50'];
const statuses = ['מתוכננת', 'בביצוע', 'הסתיימה', 'בוטלה'];

const Activities: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>(emptyActivity);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [activitiesData, soldiersData, vehiclesData] = await Promise.all([
        getAllActivities(),
        getAllSoldiers(),
        getAllVehicles()
      ]);
      setActivities(activitiesData);
      setSoldiers(soldiersData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleOpenForm = (activity?: Activity) => {
    if (activity) {
      setFormData({
        name: activity.name,
        team: activity.team,
        location: activity.location,
        region: activity.region,
        plannedDate: activity.plannedDate,
        plannedTime: activity.plannedTime,
        duration: activity.duration,
        commanderId: activity.commanderId,
        commanderName: activity.commanderName,
        taskLeaderId: activity.taskLeaderId || '',
        taskLeaderName: activity.taskLeaderName || '',
        vehicleId: activity.vehicleId || '',
        vehicleNumber: activity.vehicleNumber || '',
        driverId: activity.driverId || '',
        driverName: activity.driverName || '',
        participants: activity.participants,
        status: activity.status
      });
      setEditId(activity.id);
    } else {
      setFormData(emptyActivity);
      setEditId(null);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData(emptyActivity);
    setEditId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCommanderSelect = (soldier: Soldier | null) => {
    if (soldier) {
      setFormData(prev => {
        const newParticipants = [...prev.participants];
        // הסר את המפקד הקודם מהמשתתפים אם היה
        const filteredParticipants = newParticipants.filter(p => p.soldierId !== prev.commanderId);
        // הוסף את המפקד החדש למשתתפים
        const commanderParticipant: ActivityParticipant = {
          soldierId: soldier.id,
          soldierName: soldier.name,
          personalNumber: soldier.personalNumber,
          role: 'מפקד'
        };
        return {
          ...prev,
          commanderId: soldier.id,
          commanderName: soldier.name,
          participants: [...filteredParticipants, commanderParticipant]
        };
      });
    } else {
      setFormData(prev => {
        // הסר את המפקד הקודם מהמשתתפים
        const filteredParticipants = prev.participants.filter(p => p.soldierId !== prev.commanderId);
        return {
          ...prev,
          commanderId: '',
          commanderName: '',
          participants: filteredParticipants
        };
      });
    }
  };

  const handleTaskLeaderSelect = (soldier: Soldier | null) => {
    if (soldier) {
      setFormData(prev => {
        const newParticipants = [...prev.participants];
        // הסר את מוביל המשימה הקודם מהמשתתפים אם היה
        const filteredParticipants = newParticipants.filter(p => p.soldierId !== prev.taskLeaderId);
        // הוסף את מוביל המשימה החדש למשתתפים
        const taskLeaderParticipant: ActivityParticipant = {
          soldierId: soldier.id,
          soldierName: soldier.name,
          personalNumber: soldier.personalNumber,
          role: 'מוביל משימה'
        };
        return {
          ...prev,
          taskLeaderId: soldier.id,
          taskLeaderName: soldier.name,
          participants: [...filteredParticipants, taskLeaderParticipant]
        };
      });
    } else {
      setFormData(prev => {
        // הסר את מוביל המשימה הקודם מהמשתתפים
        const filteredParticipants = prev.participants.filter(p => p.soldierId !== prev.taskLeaderId);
        return {
          ...prev,
          taskLeaderId: '',
          taskLeaderName: '',
          participants: filteredParticipants
        };
      });
    }
  };

  const handleVehicleSelect = (vehicle: Vehicle | null) => {
    if (vehicle) {
      setFormData(prev => ({
        ...prev,
        vehicleId: vehicle.id,
        vehicleNumber: vehicle.number
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vehicleId: '',
        vehicleNumber: ''
      }));
    }
  };

  const handleDriverSelect = (soldier: Soldier | null) => {
    if (soldier) {
      setFormData(prev => {
        const newParticipants = [...prev.participants];
        // הסר את הנהג הקודם מהמשתתפים אם היה
        const filteredParticipants = newParticipants.filter(p => p.soldierId !== prev.driverId);
        // הוסף את הנהג החדש למשתתפים
        const driverParticipant: ActivityParticipant = {
          soldierId: soldier.id,
          soldierName: soldier.name,
          personalNumber: soldier.personalNumber,
          role: 'נהג'
        };
        return {
          ...prev,
          driverId: soldier.id,
          driverName: soldier.name,
          participants: [...filteredParticipants, driverParticipant]
        };
      });
    } else {
      setFormData(prev => {
        // הסר את הנהג הקודם מהמשתתפים
        const filteredParticipants = prev.participants.filter(p => p.soldierId !== prev.driverId);
        return {
          ...prev,
          driverId: '',
          driverName: '',
          participants: filteredParticipants
        };
      });
    }
  };

  const handleAddParticipant = (soldier: Soldier | null) => {
    if (soldier) {
      const newParticipant: ActivityParticipant = {
        soldierId: soldier.id,
        soldierName: soldier.name,
        personalNumber: soldier.personalNumber,
        role: ''
      };
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, newParticipant]
      }));
    }
  };

  const handleUpdateParticipantRole = (soldierId: string, role: string) => {
    // בדיקה אם זה המפקד או הנהג - לא ניתן לערוך את התפקיד שלהם
    if (soldierId === formData.commanderId) {
      alert('לא ניתן לערוך את תפקיד מפקד הפעילות. התפקיד נקבע אוטומטית.');
      return;
    }
    
    if (soldierId === formData.driverId) {
      alert('לא ניתן לערוך את תפקיד נהג הפעילות. התפקיד נקבע אוטומטית.');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map(p => 
        p.soldierId === soldierId ? { ...p, role } : p
      )
    }));
  };

  const handleRemoveParticipant = (soldierId: string) => {
    // בדיקה אם זה המפקד או הנהג - לא ניתן למחוק אותם
    if (soldierId === formData.commanderId) {
      alert('לא ניתן למחוק את מפקד הפעילות. יש לשנות את המפקד דרך שדה "מפקד הפעילות".');
      return;
    }
    
    if (soldierId === formData.driverId) {
      alert('לא ניתן למחוק את נהג הפעילות. יש לשנות את הנהג דרך שדה "נהג".');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.soldierId !== soldierId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateActivity(editId, formData);
      } else {
        await addActivity(formData);
      }
      handleCloseForm();
      refresh();
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteActivity(deleteId);
        setDeleteId(null);
        refresh();
      } catch (error) {
        console.error('Error deleting activity:', error);
      }
    }
  };

  const handleActivityClick = (activityId: string) => {
    navigate(`/activities/${activityId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'מתוכננת': return 'primary';
      case 'בביצוע': return 'warning';
      case 'הסתיימה': return 'success';
      case 'בוטלה': return 'error';
      default: return 'default';
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.commanderName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || activity.status === filterStatus;
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          פעילויות מבצעיות
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
          sx={{ borderRadius: 2 }}
        >
          הוסף פעילות
        </Button>
      </Box>

      {/* Filters and View Mode */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="חיפוש פעילויות..."
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
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Tabs value={viewMode === 'cards' ? 0 : 1} onChange={(_, newValue) => setViewMode(newValue === 0 ? 'cards' : 'table')}>
          <Tab icon={<ViewModuleIcon />} label="כרטיסים" />
          <Tab icon={<ViewListIcon />} label="טבלה" />
        </Tabs>
      </Box>

      {/* Activities List */}
      {viewMode === 'cards' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
          {filteredActivities.map((activity) => (
          <Box key={activity.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }} onClick={() => handleActivityClick(activity.id)}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ flex: 1 }}>
                    {activity.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenForm(activity);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(activity.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={activity.status} 
                    color={getStatusColor(activity.status) as any}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Chip 
                    label={activity.team} 
                    variant="outlined"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">{activity.location}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ScheduleIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {activity.plannedDate} - {activity.plannedTime} ({activity.duration} שעות)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PersonIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">מפקד: {activity.commanderName}</Typography>
                  </Box>
                  {activity.taskLeaderName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PersonIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">מוביל משימה: {activity.taskLeaderName}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <GroupIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">{activity.participants.length} משתתפים</Typography>
                  </Box>
                  {activity.vehicleNumber && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <DirectionsCarIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">רכב: {activity.vehicleNumber}</Typography>
                    </Box>
                  )}
                  {activity.driverName && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">נהג: {activity.driverName}</Typography>
                    </Box>
                  )}
                </Box>

                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      משתתפים ({activity.participants.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails onClick={(e) => e.stopPropagation()}>
                    <List dense>
                      {activity.participants.map((participant, index) => (
                        <ListItem key={participant.soldierId}>
                          <ListItemText
                            primary={participant.soldierName}
                            secondary={`${participant.personalNumber} - ${participant.role}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
                              </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      ) : (
        // Table View
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>שם פעילות</TableCell>
                <TableCell>צוות</TableCell>
                <TableCell>מיקום</TableCell>
                <TableCell>תאריך</TableCell>
                <TableCell>שעה</TableCell>
                <TableCell>מפקד</TableCell>
                <TableCell>מוביל משימה</TableCell>
                <TableCell>רכב</TableCell>
                <TableCell>נהג</TableCell>
                <TableCell>משתתפים</TableCell>
                <TableCell>סטטוס</TableCell>
                <TableCell>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredActivities.map((activity) => (
                <TableRow 
                  key={activity.id} 
                  hover 
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleActivityClick(activity.id)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {activity.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={activity.team} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {activity.location}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {activity.plannedDate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {activity.plannedTime}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {activity.commanderName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {activity.taskLeaderName || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {activity.vehicleNumber || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {activity.driverName || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {activity.participants.length}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={activity.status} 
                      color={getStatusColor(activity.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenForm(activity);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(activity.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {filteredActivities.length === 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          לא נמצאו פעילויות
        </Alert>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>
          {editId ? 'ערוך פעילות' : 'הוסף פעילות חדשה'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
              <Box>
                <TextField
                  fullWidth
                  label="שם הפעילות"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Box>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>צוות</InputLabel>
                  <Select
                    name="team"
                    value={formData.team}
                    onChange={(e) => handleSelectChange('team', e.target.value)}
                    label="צוות"
                    required
                  >
                    {teams.map(team => (
                      <MenuItem key={team} value={team}>{team}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="מיקום הפעילות"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </Box>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>חטמר</InputLabel>
                  <Select
                    name="region"
                    value={formData.region}
                    onChange={(e) => handleSelectChange('region', e.target.value)}
                    label="חטמר"
                    required
                  >
                    {regions.map(region => (
                      <MenuItem key={region} value={region}>{region}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="תאריך מתוכנן"
                  name="plannedDate"
                  type="date"
                  value={formData.plannedDate}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="שעת יציאה"
                  name="plannedTime"
                  type="time"
                  value={formData.plannedTime}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box>
                <TextField
                  fullWidth
                  label="משך הפעילות (שעות)"
                  name="duration"
                  type="number"
                  value={formData.duration}
                  onChange={handleChange}
                  required
                  inputProps={{ min: 1, max: 24 }}
                />
              </Box>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Autocomplete
                options={soldiers}
                getOptionLabel={(option) => `${option.name} (${option.personalNumber})`}
                value={soldiers.find(s => s.id === formData.commanderId) || null}
                onChange={(_, newValue) => handleCommanderSelect(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="מפקד הפעילות" required />
                )}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Autocomplete
                options={soldiers}
                getOptionLabel={(option) => `${option.name} (${option.personalNumber})`}
                value={soldiers.find(s => s.id === formData.taskLeaderId) || null}
                onChange={(_, newValue) => handleTaskLeaderSelect(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="מוביל משימה" />
                )}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Autocomplete
                options={vehicles}
                getOptionLabel={(option) => `${option.type} - ${option.number} (${option.status === 'available' ? 'פנוי' : option.status === 'maintenance' ? 'בטיפול' : 'במשימה'})`}
                value={vehicles.find(v => v.id === formData.vehicleId) || null}
                onChange={(_, newValue) => handleVehicleSelect(newValue)}
                getOptionDisabled={(option) => option.status !== 'available'}
                renderInput={(params) => (
                  <TextField {...params} label="רכב" />
                )}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Autocomplete
                options={soldiers.filter(s => s.qualifications?.includes('נהג'))}
                getOptionLabel={(option) => `${option.name} (${option.personalNumber})`}
                value={soldiers.find(s => s.id === formData.driverId) || null}
                onChange={(_, newValue) => handleDriverSelect(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="נהג" />
                )}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                משתתפים
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>הערה:</strong> המפקד והנהג מופיעים ברשימת המשתתפים בצורה קריאה בלבד. 
                  השינויים שלהם נעשים דרך השדות המיוחדים למעלה.
                </Typography>
              </Alert>
              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  options={soldiers.filter(s => 
                    !formData.participants.some(p => p.soldierId === s.id) &&
                    s.id !== formData.commanderId &&
                    s.id !== formData.taskLeaderId
                  )}
                  getOptionLabel={(option) => `${option.name} (${option.personalNumber})`}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      handleAddParticipant(newValue);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="הוסף משתתף" />
                  )}
                />
              </Box>
              <List dense>
                {formData.participants.map((participant) => {
                  // בדיקה אם זה המפקד או הנהג
                  const isCommander = participant.soldierId === formData.commanderId;
                  const isDriver = participant.soldierId === formData.driverId;
                  const isReadOnly = isCommander || isDriver;
                  
                  return (
                    <ListItem key={participant.soldierId}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {participant.soldierName}
                            </Typography>
                            {isCommander && (
                              <Chip 
                                label="מפקד" 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            )}
                            {isDriver && (
                              <Chip 
                                label="נהג" 
                                size="small" 
                                color="secondary" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={`${participant.personalNumber} - ${participant.role}`}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isReadOnly ? (
                          // קריאה בלבד למפקד ונהג
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                              size="small"
                              placeholder="תפקיד בפעילות"
                              value={participant.role}
                              disabled
                              sx={{ 
                                minWidth: 150,
                                '& .MuiInputBase-input.Mui-disabled': {
                                  color: 'text.primary',
                                  WebkitTextFillColor: 'text.primary'
                                }
                              }}
                            />
                          </Box>
                        ) : (
                          // עריכה רגילה למשתתפים אחרים
                          <>
                            <TextField
                              size="small"
                              placeholder="תפקיד בפעילות"
                              value={participant.role}
                              onChange={(e) => handleUpdateParticipantRole(participant.soldierId, e.target.value)}
                              sx={{ minWidth: 150 }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveParticipant(participant.soldierId)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
            <Box sx={{ mt: 2 }}>
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
                    <MenuItem key={status} value={status}>{status}</MenuItem>
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
        <DialogTitle>מחיקת פעילות</DialogTitle>
        <DialogContent>
          <Typography>האם אתה בטוח שברצונך למחוק פעילות זו?</Typography>
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

export default Activities; 