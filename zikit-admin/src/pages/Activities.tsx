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
import { getAllFrameworks } from '../services/frameworkService';

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
  frameworkId: '',
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
const statuses = ['מתוכננת', 'בביצוע', 'הסתיימה', 'בוטלה'];
const activityTypes = ['מארב ירי', 'אמלמ', 'זווית אחרת', 'אחר'];

const Activities: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [frameworks, setFrameworks] = useState<any[]>([]);
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
      const [activitiesData, soldiersData, vehiclesData, tripsData, frameworksData] = await Promise.all([
        getAllActivities(),
        getAllSoldiers(),
        getAllVehicles(),
        getAllTrips(),
        getAllFrameworks()
      ]);
      setActivities(activitiesData);
      setSoldiers(soldiersData);
      setVehicles(vehiclesData);
      setTrips(tripsData);
      setFrameworks(frameworksData);
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
        frameworkId: activity.frameworkId || '',
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
          role: 'מפקד',
          vehicleId: ''
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
          role: 'מוביל משימה',
          vehicleId: 'no_mobility' // מוביל משימה לא דורש ניוד כברירת מחדל
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
        role: '',
        vehicleId: ''
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
      return;
    }
    
    // בדיקה אם זה מוביל משימה - לא ניתן לערוך את התפקיד שלו
    if (soldierId === formData.taskLeaderId) {
      return;
    }
    
    // בדיקה אם זה נהג - לא ניתן לערוך את התפקיד שלו
    const participant = formData.participants.find(p => p.soldierId === soldierId);
    if (participant && participant.role.includes('נהג')) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map(p => 
        p.soldierId === soldierId ? { ...p, role } : p
      )
    }));
  };

  const handleUpdateParticipantVehicle = (soldierId: string, vehicleId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map(p => 
        p.soldierId === soldierId ? { ...p, vehicleId } : p
      )
    }));
  };

  // פונקציה לקבלת רשימת הרכבים הזמינים לפעילות
  const getAvailableVehicles = () => {
    if (!formData.mobility) return [];
    
    const tripIds = formData.mobility
      .split(';')
      .map(mobilityItem => mobilityItem.trim())
      .filter(mobilityItem => mobilityItem.includes('TRIP_ID:'))
      .map(mobilityItem => mobilityItem.replace('TRIP_ID:', '').trim());
    
    return tripIds
      .map(tripId => {
        const trip = trips.find(t => t.id === tripId);
        if (trip && trip.vehicleId) {
          const vehicle = vehicles.find(v => v.id === trip.vehicleId);
          return vehicle ? { id: trip.vehicleId, type: vehicle.type, number: vehicle.number } : null;
        }
        return null;
      })
      .filter(Boolean);
  };

  // פונקציה לבדיקת זמינות רכב
  const getVehicleAvailability = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return { available: 0, total: 0 };
    
    // סופר רק משתתפים שדורשים ניוד (לא "no_mobility")
    const participantsInVehicle = formData.participants.filter(p => 
      p.vehicleId === vehicleId && p.vehicleId !== 'no_mobility'
    ).length;
    
    return {
      available: vehicle.seats - participantsInVehicle,
      total: vehicle.seats
    };
  };

  // פונקציה לבדיקת משתתפים שדורשים ניוד
  const getParticipantsRequiringMobility = () => {
    return formData.participants.filter(p => p.vehicleId !== 'no_mobility');
  };

  const handleRemoveParticipant = async (soldierId: string) => {
    // בדיקה אם זה המפקד - לא ניתן למחוק אותו
    if (soldierId === formData.commanderId) {
      return;
    }
    
    // בדיקה אם זה מוביל משימה - לא ניתן למחוק אותו
    if (soldierId === formData.taskLeaderId) {
      return;
    }
    
    // בדיקה אם זה נהג או מפקד נסיעה - לא ניתן למחוק אותם דרך הממשק
    const participant = formData.participants.find(p => p.soldierId === soldierId);
    if (participant && (participant.role.includes('נהג') || participant.role.includes('מפקד נסיעה'))) {
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
              // מציאת סוג הרכב
              const vehicle = vehicles.find(v => v.id === trip.vehicleId);
              const vehicleType = vehicle ? vehicle.type : '';
              const roleText = vehicleType ? `נהג ${vehicleType}` : 'נהג';
              
              updatedParticipants.push({
                soldierId: trip.driverId,
                soldierName: trip.driverName,
                personalNumber: driver.personalNumber,
                role: roleText,
                vehicleId: trip.vehicleId || ''
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
      const driverUpdatePromises = driversToUpdate.map(async (driverId) => {
        const driver = soldiers.find(s => s.id === driverId);
        if (driver) {
          const currentActivities = driver.activities || [];
          if (!currentActivities.includes(activityId)) {
            await updateSoldier(driverId, {
              activities: [...currentActivities, activityId]
            });
          }
        }
      });
      
      // המתנה לסיום כל העדכונים
      await Promise.all(driverUpdatePromises);
      
      // רענון הנתונים ואז סגירת החלונית
      await refresh();
      handleCloseForm();
    } catch (error) {
      console.error('Error saving activity:', error);
      // גם במקרה של שגיאה, נסגור את החלונית
      handleCloseForm();
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

  const formatMobilityDisplay = (mobility: string) => {
    if (!mobility) return '';
    
    // אם זה מכיל TRIP_ID, נמיר לתצוגת נסיעות
    if (mobility.includes('TRIP_ID:')) {
      const tripIds = mobility.split(';').map(id => id.replace('TRIP_ID:', '').trim());
      const tripDetails = tripIds
        .map(tripId => {
          const trip = trips.find(t => t.id === tripId);
          if (!trip) return null;
          
          if (trip.vehicleNumber && trip.driverName) {
            return `רכב ${trip.vehicleNumber}, נהג: ${trip.driverName}`;
          } else if (trip.vehicleNumber) {
            return `רכב ${trip.vehicleNumber}`;
          } else if (trip.driverName) {
            return `נהג: ${trip.driverName}`;
          } else {
            return trip.purpose || 'נסיעה ללא פרטים';
          }
        })
        .filter(Boolean)
        .join(' | ');
      
      return tripDetails || 'נסיעות';
    }
    
    // אחרת, החזר כמו שזה
    return mobility;
  };

  const isActivityComplete = (activity: Activity) => {
    const missingFields: string[] = [];
    
    if (!activity.name) missingFields.push('שם הפעילות');
    if (!activity.frameworkId) missingFields.push('מסגרת');
    if (!activity.location) missingFields.push('מיקום');
    if (!activity.plannedDate) missingFields.push('תאריך מתוכנן');
    if (!activity.plannedTime) missingFields.push('שעת יציאה');
    if (!activity.commanderId) missingFields.push('מפקד');
    if (!activity.taskLeaderId) missingFields.push('מוביל משימה');
    if (activity.participants.length === 0) missingFields.push('משתתפים');
    if (!activity.mobility) missingFields.push('ניוד');
    
    // בדיקה אם יש מספיק מקומות נסיעה
    if (activity.mobility && activity.participants.length > 0) {
      const tripIds = activity.mobility
        .split(';')
        .map(mobilityItem => mobilityItem.trim())
        .filter(mobilityItem => mobilityItem.includes('TRIP_ID:'))
        .map(mobilityItem => mobilityItem.replace('TRIP_ID:', '').trim());
      
      let totalSeats = 0;
      for (const tripId of tripIds) {
        const trip = trips.find(t => t.id === tripId);
        if (trip && trip.vehicleId) {
          const vehicle = vehicles.find(v => v.id === trip.vehicleId);
          if (vehicle && vehicle.seats) {
            totalSeats += vehicle.seats;
          }
        }
      }
      
      // אם יש פחות מקומות נסיעה ממשתתפים
      if (totalSeats > 0 && activity.participants.length > totalSeats) {
        missingFields.push(`מקומות נסיעה (${totalSeats} מקומות ל-${activity.participants.length} משתתפים)`);
      }
    }
    
    return {
      isComplete: missingFields.length === 0,
      missingFields
    };
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
                border: isActivityComplete(activity).isComplete ? '1px solid #e0e0e0' : '2px solid #f44336',
                backgroundColor: isActivityComplete(activity).isComplete ? 'white' : '#ffebee'
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
                  {activity.frameworkId && (
                    <Chip 
                      label={frameworks.find(f => f.id === activity.frameworkId)?.name || 'מסגרת לא ידועה'} 
                      variant="outlined"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
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
                      <Typography variant="body2">ניוד: {formatMobilityDisplay(activity.mobility)}</Typography>
                    </Box>
                  )}
                </Box>

                {!isActivityComplete(activity).isComplete && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      פעילות לא מלאה - שדות חסרים:
                    </Typography>
                    <Typography variant="body2">
                      {isActivityComplete(activity).missingFields.join(', ')}
                    </Typography>
                  </Alert>
                )}
                
                {/* התראה מיוחדת על בעיות בניוד */}
                {activity.mobility && (() => {
                  const tripIds = activity.mobility
                    .split(';')
                    .map(mobilityItem => mobilityItem.trim())
                    .filter(mobilityItem => mobilityItem.includes('TRIP_ID:'))
                    .map(mobilityItem => mobilityItem.replace('TRIP_ID:', '').trim());
                  
                  const missingTrips = tripIds.filter(tripId => !trips.find(t => t.id === tripId));
                  
                  if (missingTrips.length > 0) {
                    return (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          אזהרה: נסיעות חסרות
                        </Typography>
                        <Typography variant="body2">
                          {missingTrips.length} נסיעות שהיו מקושרות לפעילות זו נמחקו או השתנו. יש לבדוק את שדה הניוד.
                        </Typography>
                      </Alert>
                    );
                  }
                  
                  return null;
                })()}

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
                <TableCell>מסגרת</TableCell>
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
                    backgroundColor: isActivityComplete(activity).isComplete ? 'white' : '#ffebee'
                  }}
                  onClick={() => handleActivityClick(activity.id)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {activity.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={frameworks.find(f => f.id === activity.frameworkId)?.name || 'לא נבחרה'} 
                      size="small" 
                      variant="outlined" 
                    />
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
                      {activity.mobility ? formatMobilityDisplay(activity.mobility) : '-'}
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
                />
              </Box>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>מסגרת</InputLabel>
                  <Select
                    name="frameworkId"
                    value={formData.frameworkId}
                    onChange={(e) => handleSelectChange('frameworkId', e.target.value)}
                    label="מסגרת"
                  >
                    <MenuItem value="">בחר מסגרת</MenuItem>
                    {frameworks.map(framework => (
                      <MenuItem key={framework.id} value={framework.id}>{framework.name}</MenuItem>
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
                  <TextField {...params} label="מפקד הפעילות" />
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
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>ניוד</Typography>
              </Box>
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
                            // מציאת סוג הרכב
                            const vehicle = vehicles.find(v => v.id === trip.vehicleId);
                            const vehicleType = vehicle ? vehicle.type : '';
                            const roleText = vehicleType ? `נהג ${vehicleType}` : 'נהג';
                            
                            updatedParticipants.push({
                              soldierId: trip.driverId,
                              soldierName: trip.driverName,
                              personalNumber: driver.personalNumber,
                              role: roleText,
                              vehicleId: trip.vehicleId || ''
                            });
                          }
                        } else {
                          // עדכון הנהג הקיים עם הרכב
                          const existingDriver = updatedParticipants.find(p => p.soldierId === trip.driverId);
                          if (existingDriver) {
                            existingDriver.vehicleId = trip.vehicleId || '';
                          }
                        }
                        
                        // הוספת מפקד נסיעה
                        if (trip.commanderId && trip.commanderName) {
                          const commanderExists = updatedParticipants.some(p => p.soldierId === trip.commanderId);
                          if (!commanderExists) {
                            const commander = soldiers.find(s => s.id === trip.commanderId);
                            if (commander) {
                              updatedParticipants.push({
                                soldierId: trip.commanderId,
                                soldierName: trip.commanderName,
                                personalNumber: commander.personalNumber,
                                role: 'מפקד נסיעה',
                                vehicleId: trip.vehicleId || ''
                              });
                            }
                          } else {
                            // עדכון מפקד הנסיעה הקיים עם הרכב
                            const existingCommander = updatedParticipants.find(p => p.soldierId === trip.commanderId);
                            if (existingCommander) {
                              existingCommander.vehicleId = trip.vehicleId || '';
                            }
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
                  {trips.filter(trip => (!trip.linkedActivityId || trip.linkedActivityId === editId) && !selectedTripIds.includes(trip.id)).map(trip => (
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
              {selectedTripIds.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    נסיעות נבחרות:
                  </Typography>
                  {selectedTripIds.map(tripId => {
                    const trip = trips.find(t => t.id === tripId);
                    if (!trip) return null;
                    
                    return (
                      <Box key={trip.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                        <Box sx={{ flex: 1 }}>
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
                        </Box>
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
                            
                            // הסרת הנהג ומפקד הנסיעה מהמשתתפים אם הם קיימים
                            const participantsToRemove = formData.participants.filter(p => 
                              (p.soldierId === trip.driverId && p.role.includes('נהג')) ||
                              (p.soldierId === trip.commanderId && p.role.includes('מפקד נסיעה'))
                            );
                            
                            if (participantsToRemove.length > 0) {
                              const updatedParticipants = formData.participants.filter(p => 
                                !(p.soldierId === trip.driverId && p.role.includes('נהג')) &&
                                !(p.soldierId === trip.commanderId && p.role.includes('מפקד נסיעה'))
                              );
                              
                              // ביטול שיבוץ רכב לכל המשתתפים ששובצו לרכב זה
                              const vehicle = vehicles.find(v => v.id === trip.vehicleId);
                              if (vehicle) {
                                updatedParticipants.forEach(participant => {
                                  if (participant.vehicleId === trip.vehicleId) {
                                    participant.vehicleId = '';
                                  }
                                });
                              }
                              
                              setFormData(prev => ({
                                ...prev,
                                participants: updatedParticipants
                              }));
                              
                              // הסרת הפעילות מעמוד האישי של הנהג ומפקד הנסיעה
                              for (const participant of participantsToRemove) {
                                const soldier = soldiers.find(s => s.id === participant.soldierId);
                                if (soldier && editId) {
                                  const currentActivities = soldier.activities || [];
                                  const updatedActivities = currentActivities.filter(activityId => activityId !== editId);
                                  await updateSoldier(participant.soldierId, {
                                    activities: updatedActivities
                                  });
                                }
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
                  // בדיקה אם זה המפקד, מוביל משימה, נהג או מפקד נסיעה
                  const isCommander = participant.soldierId === formData.commanderId;
                  const isTaskLeader = participant.soldierId === formData.taskLeaderId;
                  const isDriver = participant.role.includes('נהג');
                  const isTripCommander = participant.role.includes('מפקד נסיעה');
                  const isReadOnly = isCommander || isTaskLeader || isDriver || isTripCommander;
                  
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
                            {isTaskLeader && (
                              <Chip 
                                label="מוביל משימה" 
                                size="small" 
                                color="secondary" 
                                variant="outlined"
                              />
                            )}
                            {isDriver && (
                              <Chip 
                                label="נהג" 
                                size="small" 
                                color="info" 
                                variant="outlined"
                              />
                            )}
                            {isTripCommander && (
                              <Chip 
                                label="מפקד נסיעה" 
                                size="small" 
                                color="warning" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={`${participant.personalNumber} - ${participant.role}`}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isReadOnly ? (
                          // קריאה בלבד למפקד, מוביל משימה ונהג
                          <Box sx={{ display: 'flex', gap: 1 }}>
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
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <InputLabel>רכב</InputLabel>
                              <Select
                                value={participant.vehicleId || ''}
                                onChange={(e) => handleUpdateParticipantVehicle(participant.soldierId, e.target.value)}
                                label="רכב"
                              >
                                <MenuItem value="">ללא רכב</MenuItem>
                                <MenuItem value="no_mobility">לא דורש ניוד</MenuItem>
                                {getAvailableVehicles().map(vehicle => {
                                  if (!vehicle) return null;
                                  const availability = getVehicleAvailability(vehicle.id);
                                  const isFull = availability.available <= 0;
                                  return (
                                    <MenuItem 
                                      key={vehicle.id} 
                                      value={vehicle.id}
                                      disabled={isFull && participant.vehicleId !== vehicle.id}
                                    >
                                      {vehicle.type} ({vehicle.number}) - {availability.available}/{availability.total} מקומות
                                    </MenuItem>
                                  );
                                })}
                              </Select>
                            </FormControl>
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
                                                          <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>רכב</InputLabel>
                                <Select
                                  value={participant.vehicleId || ''}
                                  onChange={(e) => handleUpdateParticipantVehicle(participant.soldierId, e.target.value)}
                                  label="רכב"
                                >
                                  <MenuItem value="">ללא רכב</MenuItem>
                                  <MenuItem value="no_mobility">לא דורש ניוד</MenuItem>
                                  {getAvailableVehicles().map(vehicle => {
                                    if (!vehicle) return null;
                                    const availability = getVehicleAvailability(vehicle.id);
                                    const isFull = availability.available <= 0;
                                    return (
                                      <MenuItem 
                                        key={vehicle.id} 
                                        value={vehicle.id}
                                        disabled={isFull && participant.vehicleId !== vehicle.id}
                                      >
                                        {vehicle.type} ({vehicle.number}) - {availability.available}/{availability.total} מקומות
                                      </MenuItem>
                                    );
                                  })}
                                </Select>
                              </FormControl>
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