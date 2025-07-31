import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { Activity, ActivityParticipant } from '../models/Activity';
import { Soldier } from '../models/Soldier';
import { Vehicle } from '../models/Vehicle';
import { Trip } from '../models/Trip';
import { getAllActivities, addActivity, updateActivity, deleteActivity } from '../services/activityService';
import { getAllSoldiers, updateSoldier } from '../services/soldierService';
import { getAllVehicles } from '../services/vehicleService';
import { getAllTrips, updateTrip } from '../services/tripService';
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
  activityType: 'מארב ירי',
  activityTypeOther: '',
  plannedDate: '',
  plannedTime: '',
  duration: 1,
  commanderId: '',
  commanderName: '',
  taskLeaderId: '',
  taskLeaderName: '',
  mobility: '',
  participants: [],
  status: 'מתוכננת'
};

const regions = ['מנשה', 'אפרים', 'שומרון', 'יהודה', 'בנימין', 'עציון', 'הבקעה והעמקים'];
const teams = ['צוות 10', 'צוות 20', 'צוות 30', 'צוות 40', 'צוות 50'];
const statuses = ['מתוכננת', 'בביצוע', 'הסתיימה', 'בוטלה'];
const activityTypes = ['מארב ירי', 'אמלמ', 'זווית אחרת', 'אחר'];

const Activities: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>(emptyActivity);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterActivityType, setFilterActivityType] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [activitiesData, soldiersData, vehiclesData, tripsData] = await Promise.all([
        getAllActivities(),
        getAllSoldiers(),
        getAllVehicles(),
        getAllTrips()
      ]);
      setActivities(activitiesData);
      setSoldiers(soldiersData);
      setVehicles(vehiclesData);
      setTrips(tripsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // בדיקה אם יש פרמטר עריכה ב-URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    if (editId) {
      // מציאת הפעילות לעריכה
      const activityToEdit = activities.find(a => a.id === editId);
      if (activityToEdit) {
        handleOpenForm(activityToEdit);
      }
    }
  }, [activities]);

  const handleOpenForm = (activity?: Activity) => {
    if (activity) {
      setFormData({
        name: activity.name,
        team: activity.team,
        location: activity.location,
        region: activity.region,
        activityType: activity.activityType,
        activityTypeOther: activity.activityTypeOther || '',
        plannedDate: activity.plannedDate,
        plannedTime: activity.plannedTime,
        duration: activity.duration,
        commanderId: activity.commanderId,
        commanderName: activity.commanderName,
        taskLeaderId: activity.taskLeaderId || '',
        taskLeaderName: activity.taskLeaderName || '',
        mobility: activity.mobility || '',
        participants: activity.participants,
        status: activity.status
      });
      setEditId(activity.id);
      
      // מציאת הנסיעות המקושרות לפעילות זו
      const linkedTripIds = trips
        .filter(trip => trip.linkedActivityId === activity.id)
        .map(trip => trip.id);
      setSelectedTripIds(linkedTripIds);
    } else {
      setFormData(emptyActivity);
      setEditId(null);
      setSelectedTripIds([]);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData(emptyActivity);
    setEditId(null);
    setSelectedTripIds([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCommanderSelect = async (soldier: Soldier | null) => {
    const oldCommanderId = formData.commanderId;
    
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
      
      // עדכון עמוד האישי של המפקד החדש (אם זה עריכה)
      if (editId) {
        const currentActivities = soldier.activities || [];
        if (!currentActivities.includes(editId)) {
          await updateSoldier(soldier.id, {
            activities: [...currentActivities, editId]
          });
        }
      }
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
    
    // הסרת הפעילות מעמוד האישי של המפקד הישן (אם זה עריכה)
    if (editId && oldCommanderId && oldCommanderId !== soldier?.id) {
      const oldCommander = soldiers.find(s => s.id === oldCommanderId);
      if (oldCommander) {
        const currentActivities = oldCommander.activities || [];
        const updatedActivities = currentActivities.filter(activityId => activityId !== editId);
        await updateSoldier(oldCommanderId, {
          activities: updatedActivities
        });
      }
    }
  };

  const handleTaskLeaderSelect = async (soldier: Soldier | null) => {
    const oldTaskLeaderId = formData.taskLeaderId;
    
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
      
      // עדכון עמוד האישי של מוביל המשימה החדש (אם זה עריכה)
      if (editId) {
        const currentActivities = soldier.activities || [];
        if (!currentActivities.includes(editId)) {
          await updateSoldier(soldier.id, {
            activities: [...currentActivities, editId]
          });
        }
      }
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
    
    // הסרת הפעילות מעמוד האישי של מוביל המשימה הישן (אם זה עריכה)
    if (editId && oldTaskLeaderId && oldTaskLeaderId !== soldier?.id) {
      const oldTaskLeader = soldiers.find(s => s.id === oldTaskLeaderId);
      if (oldTaskLeader) {
        const currentActivities = oldTaskLeader.activities || [];
        const updatedActivities = currentActivities.filter(activityId => activityId !== editId);
        await updateSoldier(oldTaskLeaderId, {
          activities: updatedActivities
        });
      }
    }
  };

  const handleMobilityChange = async (tripId: string) => {
    if (!tripId) {
      setFormData(prev => ({
        ...prev,
        mobility: ''
      }));
      return;
    }

    const selectedTrip = trips.find(t => t.id === tripId);
    if (selectedTrip) {
      // עדכון הנסיעה עם קישור לפעילות
      await updateTrip(tripId, { linkedActivityId: editId || 'temp' });
      
      // עדכון שדה הניוד בפעילות עם מזהה הנסיעה
      const mobilityText = `TRIP_ID:${selectedTrip.id}`;
      
      setFormData(prev => ({
        ...prev,
        mobility: mobilityText
      }));
    }
  };

  const handleAddParticipant = async (soldier: Soldier | null) => {
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
      
      // הוספת הפעילות לעמוד האישי של המשתתף (אם זה עריכה)
      if (editId) {
        const currentActivities = soldier.activities || [];
        if (!currentActivities.includes(editId)) {
          await updateSoldier(soldier.id, {
            activities: [...currentActivities, editId]
          });
        }
      }
    }
  };

  const handleUpdateParticipantRole = (soldierId: string, role: string) => {
    // בדיקה אם זה המפקד - לא ניתן לערוך את התפקיד שלו
    if (soldierId === formData.commanderId) {
      alert('לא ניתן לערוך את תפקיד מפקד הפעילות. התפקיד נקבע אוטומטית.');
      return;
    }
    
    // בדיקה אם זה נהג - לא ניתן לערוך את התפקיד שלו
    const participant = formData.participants.find(p => p.soldierId === soldierId);
    if (participant && participant.role === 'נהג') {
      alert('לא ניתן לערוך את תפקיד הנהג. התפקיד נקבע אוטומטית.');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map(p => 
        p.soldierId === soldierId ? { ...p, role } : p
      )
    }));
  };

  const handleRemoveParticipant = async (soldierId: string) => {
    // בדיקה אם זה המפקד - לא ניתן למחוק אותו
    if (soldierId === formData.commanderId) {
      alert('לא ניתן למחוק את מפקד הפעילות. יש לשנות את המפקד דרך שדה "מפקד הפעילות".');
      return;
    }
    
    // בדיקה אם זה נהג - לא ניתן למחוק אותו דרך הממשק
    const participant = formData.participants.find(p => p.soldierId === soldierId);
    if (participant && participant.role === 'נהג') {
      alert('לא ניתן למחוק נהג דרך הממשק. יש להסיר את הנסיעה מהניוד כדי להסיר את הנהג.');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.soldierId !== soldierId)
    }));
    
    // הסרת הפעילות מעמוד האישי של המשתתף (אם זה עריכה)
    if (editId) {
      const soldier = soldiers.find(s => s.id === soldierId);
      if (soldier) {
        const currentActivities = soldier.activities || [];
        const updatedActivities = currentActivities.filter(activityId => activityId !== editId);
        await updateSoldier(soldierId, {
          activities: updatedActivities
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ולידציה - בדיקה אם כל השדות מלאים
    const isComplete = formData.name && 
                      formData.team && 
                      formData.location && 
                      formData.plannedDate && 
                      formData.plannedTime && 
                      formData.commanderId && 
                      formData.taskLeaderId && 
                      formData.participants.length > 0;
    
    if (!isComplete) {
      alert('יש למלא את כל השדות החובה בפעילות');
      return;
    }
    
    try {
      let activityId: string;
      
      if (editId) {
        await updateActivity(editId, formData);
        activityId = editId;
      } else {
        activityId = await addActivity(formData);
      }
      
      // עדכון הנסיעות הנבחרות עם קישור לפעילות והוספת נהגים למשתתפים
      const updatedParticipants = [...formData.participants];
      const driversToUpdate: string[] = [];
      
      for (const tripId of selectedTripIds) {
        await updateTrip(tripId, { linkedActivityId: activityId });
        
        // מציאת הנסיעה והוספת הנהג למשתתפים אם הוא לא קיים
        const trip = trips.find(t => t.id === tripId);
        if (trip && trip.driverId && trip.driverName) {
          const driverExists = updatedParticipants.some(p => p.soldierId === trip.driverId);
          if (!driverExists) {
            const driver = soldiers.find(s => s.id === trip.driverId);
            if (driver) {
              updatedParticipants.push({
                soldierId: trip.driverId,
                soldierName: trip.driverName,
                personalNumber: driver.personalNumber,
                role: 'נהג'
              });
              driversToUpdate.push(trip.driverId);
            }
          }
        }
      }
      
      // עדכון הפעילות עם המשתתפים החדשים
      if (updatedParticipants.length > formData.participants.length) {
        await updateActivity(activityId, { participants: updatedParticipants });
      }
      
      // עדכון עמוד האישי של כל הנהגים
      for (const driverId of driversToUpdate) {
        const driver = soldiers.find(s => s.id === driverId);
        if (driver) {
          const currentActivities = driver.activities || [];
          if (!currentActivities.includes(activityId)) {
            await updateSoldier(driverId, {
              activities: [...currentActivities, activityId]
            });
          }
        }
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
        // מציאת הפעילות לפני המחיקה
        const activityToDelete = activities.find(a => a.id === deleteId);
        
        if (activityToDelete) {
          // הסרת הפעילות מעמוד האישי של כל המשתתפים
          for (const participant of activityToDelete.participants) {
            const soldier = soldiers.find(s => s.id === participant.soldierId);
            if (soldier) {
              const currentActivities = soldier.activities || [];
              const updatedActivities = currentActivities.filter(activityId => activityId !== deleteId);
              await updateSoldier(participant.soldierId, {
                activities: updatedActivities
              });
            }
          }
          
          // הסרת קישור מהנסיעות המקושרות
          if (activityToDelete.mobility) {
            const tripIds = activityToDelete.mobility.split(';').map(tripId => 
              tripId.replace('TRIP_ID:', '').trim()
            );
            
            for (const tripId of tripIds) {
              if (tripId) {
                // הסרת קישור הפעילות מהנסיעה (Firebase לא תומך ב-undefined)
                await updateTrip(tripId, { linkedActivityId: '' });
              }
            }
          }
        }
        
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

  const isActivityComplete = (activity: Activity) => {
    return activity.name && 
           activity.team && 
           activity.location && 
           activity.plannedDate && 
           activity.plannedTime && 
           activity.commanderId && 
           activity.taskLeaderId && 
           activity.participants.length > 0;
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.commanderName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || activity.status === filterStatus;
    const matchesActivityType = !filterActivityType || 
      (filterActivityType === 'אחר' ? 
        activity.activityType === 'אחר' : 
        activity.activityType === filterActivityType);
    return matchesSearch && matchesStatus && matchesActivityType;
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
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>סוג פעילות</InputLabel>
          <Select
            value={filterActivityType}
            onChange={(e) => setFilterActivityType(e.target.value)}
            label="סוג פעילות"
          >
            <MenuItem value="">כל הסוגים</MenuItem>
            {activityTypes.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
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
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                cursor: 'pointer',
                border: isActivityComplete(activity) ? '1px solid #e0e0e0' : '2px solid #f44336',
                backgroundColor: isActivityComplete(activity) ? 'white' : '#ffebee'
              }} 
              onClick={() => handleActivityClick(activity.id)}
            >
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
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AssignmentIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      סוג: {activity.activityType === 'אחר' && activity.activityTypeOther 
                        ? activity.activityTypeOther 
                        : activity.activityType}
                    </Typography>
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
                  {activity.mobility && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <DirectionsCarIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">ניוד: {activity.mobility}</Typography>
                    </Box>
                  )}
                </Box>

                {!isActivityComplete(activity) && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    פעילות לא מלאה - יש למלא את כל השדות
                  </Alert>
                )}

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
                <TableCell>סוג פעילות</TableCell>
                <TableCell>תאריך</TableCell>
                <TableCell>שעה</TableCell>
                <TableCell>מפקד</TableCell>
                <TableCell>מוביל משימה</TableCell>
                <TableCell>ניוד</TableCell>
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
                  sx={{ 
                    cursor: 'pointer',
                    backgroundColor: isActivityComplete(activity) ? 'white' : '#ffebee'
                  }}
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
                      {activity.activityType === 'אחר' && activity.activityTypeOther 
                        ? activity.activityTypeOther 
                        : activity.activityType}
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
                      {activity.mobility || '-'}
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
                <FormControl fullWidth>
                  <InputLabel>סוג פעילות</InputLabel>
                  <Select
                    name="activityType"
                    value={formData.activityType}
                    onChange={(e) => handleSelectChange('activityType', e.target.value)}
                    label="סוג פעילות"
                    required
                  >
                    {activityTypes.map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              {formData.activityType === 'אחר' && (
                <Box>
                  <TextField
                    fullWidth
                    label="פירוט סוג פעילות"
                    name="activityTypeOther"
                    value={formData.activityTypeOther}
                    onChange={handleChange}
                    required
                  />
                </Box>
              )}
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
              <Typography variant="h6" gutterBottom>ניוד</Typography>
              <FormControl fullWidth>
                <InputLabel>בחר נסיעות</InputLabel>
                <Select
                  multiple
                  value={selectedTripIds}
                  onChange={async (e) => {
                    const value = e.target.value as string[];
                    const previousTripIds = selectedTripIds;
                    setSelectedTripIds(value);
                    
                    // עדכון שדה הניוד עם מזהי הנסיעות
                    const selectedTrips = trips.filter(t => value.includes(t.id));
                    const mobilityText = selectedTrips.map(trip => `TRIP_ID:${trip.id}`).join('; ');
                    
                    setFormData(prev => ({
                      ...prev,
                      mobility: mobilityText
                    }));
                    
                    // עדכון כל הנסיעות הנבחרות עם קישור לפעילות
                    for (const tripId of value) {
                      await updateTrip(tripId, { linkedActivityId: editId || 'temp' });
                    }
                    
                    // הוספת נהגים חדשים למשתתפים
                    const newTripIds = value.filter(id => !previousTripIds.includes(id));
                    const updatedParticipants = [...formData.participants];
                    
                    for (const tripId of newTripIds) {
                      const trip = trips.find(t => t.id === tripId);
                      if (trip && trip.driverId && trip.driverName) {
                        const driverExists = updatedParticipants.some(p => p.soldierId === trip.driverId);
                        if (!driverExists) {
                          const driver = soldiers.find(s => s.id === trip.driverId);
                          if (driver) {
                            updatedParticipants.push({
                              soldierId: trip.driverId,
                              soldierName: trip.driverName,
                              personalNumber: driver.personalNumber,
                              role: 'נהג'
                            });
                          }
                        }
                      }
                    }
                    
                    // עדכון המשתתפים
                    if (updatedParticipants.length > formData.participants.length) {
                      setFormData(prev => ({
                        ...prev,
                        participants: updatedParticipants
                      }));
                    }
                  }}
                  label="בחר נסיעות"
                >
                  {trips.filter(trip => !trip.linkedActivityId && !selectedTripIds.includes(trip.id)).map(trip => (
                    <MenuItem key={trip.id} value={trip.id}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {trip.purpose}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {trip.vehicleNumber && trip.driverName 
                            ? `רכב ${trip.vehicleNumber}, נהג: ${trip.driverName}`
                            : 'ללא רכב ונהג'
                          }
                        </Typography>
                        {trip.departureTime && trip.returnTime && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            {new Date(trip.departureTime).toLocaleString('he-IL')} - {new Date(trip.returnTime).toLocaleString('he-IL')}
                          </Typography>
                        )}
                        <Typography variant="caption" color="textSecondary" display="block">
                          מיקום: {trip.location}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {formData.mobility && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    נסיעות נבחרות:
                  </Typography>
                  {formData.mobility.split(';').map(tripId => {
                    const trip = trips.find(t => t.id === tripId.replace('TRIP_ID:', ''));
                    if (!trip) return null;
                    
                    return (
                      <Box key={trip.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2">
                          {trip.purpose} ({trip.vehicleNumber || 'ללא רכב'})
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={async () => {
                            // הסרת הנסיעה מהרשימה
                            const updatedTripIds = selectedTripIds.filter(id => id !== trip.id);
                            setSelectedTripIds(updatedTripIds);
                            
                            // עדכון שדה הניוד
                            const updatedMobility = updatedTripIds.map(id => `TRIP_ID:${id}`).join('; ');
                            setFormData(prev => ({
                              ...prev,
                              mobility: updatedMobility
                            }));
                            
                            // הסרת הקישור מהנסיעה (Firebase לא תומך ב-undefined)
                            await updateTrip(trip.id, { linkedActivityId: '' });
                            
                            // הסרת הנהג מהמשתתפים אם הוא קיים
                            const driverParticipant = formData.participants.find(p => 
                              p.soldierId === trip.driverId && p.role === 'נהג'
                            );
                            
                            if (driverParticipant) {
                              const updatedParticipants = formData.participants.filter(p => 
                                !(p.soldierId === trip.driverId && p.role === 'נהג')
                              );
                              
                              setFormData(prev => ({
                                ...prev,
                                participants: updatedParticipants
                              }));
                              
                              // הסרת הפעילות מעמוד האישי של הנהג
                              const driver = soldiers.find(s => s.id === trip.driverId);
                              if (driver && editId && trip.driverId) {
                                const currentActivities = driver.activities || [];
                                const updatedActivities = currentActivities.filter(activityId => activityId !== editId);
                                await updateSoldier(trip.driverId, {
                                  activities: updatedActivities
                                });
                              }
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                משתתפים
              </Typography>

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
                  // בדיקה אם זה המפקד
                  const isCommander = participant.soldierId === formData.commanderId;
                  const isReadOnly = isCommander;
                  
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
                            {participant.role === 'נהג' && (
                              <Chip 
                                label="נהג" 
                                size="small" 
                                color="secondary" 
                                variant="outlined"
                              />
                            )}
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