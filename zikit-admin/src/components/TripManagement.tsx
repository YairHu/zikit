import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  DirectionsCar as CarIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { Trip } from '../models/Trip';
import { Vehicle } from '../models/Vehicle';
import { Driver } from '../models/Driver';
import { Activity } from '../models/Activity';
import { getAllTrips, updateTrip, deleteTrip } from '../services/tripService';
import { getAllVehicles } from '../services/vehicleService';
import { getAllSoldiers } from '../services/soldierService';

interface TripManagementProps {
  open: boolean;
  onClose: () => void;
  activity: Activity;
  onActivityUpdate: (updatedActivity: Activity) => void;
}

const TripManagement: React.FC<TripManagementProps> = ({
  open,
  onClose,
  activity,
  onActivityUpdate
}) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExistingTrips, setShowExistingTrips] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, activity.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tripsData, vehiclesData, soldiersData] = await Promise.all([
        getAllTrips(),
        getAllVehicles(),
        getAllSoldiers()
      ]);
      
      // סינון נסיעות שקשורות לפעילות זו
      const activityTrips = tripsData.filter(trip => trip.linkedActivityId === activity.id);
      setTrips(activityTrips);
      
      setVehicles(vehiclesData);
      
      // סינון נהגים מתוך החיילים
      const driversData = soldiersData.filter(soldier => 
        soldier.qualifications?.includes('נהג')
      ) as Driver[];
      setDrivers(driversData);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
      setError('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };



  const handleLinkExistingTrip = async () => {
    if (!selectedTripId) {
      setError('יש לבחור נסיעה');
      return;
    }

    try {
      const selectedTrip = trips.find(t => t.id === selectedTripId);
      if (!selectedTrip) {
        setError('נסיעה לא נמצאה');
        return;
      }

      // עדכון הנסיעה עם קישור לפעילות
      await updateTrip(selectedTripId, { linkedActivityId: activity.id });
      
      // עדכון שדה הניוד בפעילות
      const mobilityText = selectedTrip.vehicleNumber && selectedTrip.driverName
        ? `רכב ${selectedTrip.vehicleNumber}, נהג: ${selectedTrip.driverName}`
        : 'ללא ניוד';
      
      const updatedActivity = {
        ...activity,
        mobility: mobilityText
      };
      onActivityUpdate(updatedActivity);
      
      setShowExistingTrips(false);
      setSelectedTripId('');
      loadData();
    } catch (error) {
      console.error('שגיאה בקישור נסיעה:', error);
      setError('שגיאה בקישור נסיעה');
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק נסיעה זו?')) {
      try {
        await deleteTrip(tripId);
        loadData();
      } catch (error) {
        console.error('שגיאה במחיקת נסיעה:', error);
        setError('שגיאה במחיקת נסיעה');
      }
    }
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

  const isTripComplete = (trip: Trip) => {
    return trip.vehicleId && trip.driverId && trip.departureTime && trip.returnTime && trip.location && trip.purpose;
  };

  const calculateTotalSeats = () => {
    return trips.reduce((total, trip) => {
      const vehicle = vehicles.find(v => v.id === trip.vehicleId);
      return total + (vehicle?.seats || 0);
    }, 0);
  };

  const calculateParticipants = () => {
    return activity.participants.length;
  };

  const hasSeatsOverflow = () => {
    const totalSeats = calculateTotalSeats();
    const participants = calculateParticipants();
    return participants > totalSeats;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        ניהול נסיעות - {activity.name}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            נסיעות מקושרות
          </Typography>
          {trips.length === 0 ? (
            <Typography color="textSecondary">
              אין נסיעות מקושרות לפעילות זו
            </Typography>
          ) : (
            <List>
              {trips.map((trip) => (
                <ListItem 
                  key={trip.id}
                  sx={{ 
                    border: isTripComplete(trip) ? '1px solid #e0e0e0' : '2px solid #f44336',
                    backgroundColor: isTripComplete(trip) ? 'white' : '#ffebee',
                    mb: 1,
                    borderRadius: 1
                  }}
                >
                  <ListItemText
                    primary={trip.purpose}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          <LocationIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          {trip.location}
                        </Typography>
                        {trip.vehicleNumber && (
                          <Typography variant="body2">
                            <CarIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            רכב: {trip.vehicleNumber}
                          </Typography>
                        )}
                        {trip.driverName && (
                          <Typography variant="body2">
                            <PersonIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            נהג: {trip.driverName}
                          </Typography>
                        )}
                        {trip.departureTime && trip.returnTime && (
                          <Typography variant="body2">
                            <ScheduleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            {new Date(trip.departureTime).toLocaleString('he-IL')} - {new Date(trip.returnTime).toLocaleString('he-IL')}
                          </Typography>
                        )}
                        {!isTripComplete(trip) && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            נסיעה לא מלאה - יש למלא את כל השדות
                          </Alert>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Chip 
                      label={trip.status} 
                      color={getStatusColor(trip.status) as any}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <IconButton 
                      edge="end" 
                      onClick={() => handleDeleteTrip(trip.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* בדיקת מספר מקומות */}
        {trips.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              בדיקת קיבולת
            </Typography>
            <Typography variant="body2">
              מספר משתתפים: {calculateParticipants()}
            </Typography>
            <Typography variant="body2">
              מספר מקומות ברכבים: {calculateTotalSeats()}
            </Typography>
            {hasSeatsOverflow() && (
              <Alert severity="error" sx={{ mt: 1 }}>
                מספר המשתתפים עולה על מספר המקומות ברכבים!
              </Alert>
            )}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            הוספת נסיעה
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setShowExistingTrips(true)}
            >
              קישור נסיעה קיימת
            </Button>
          </Box>
        </Box>



        {/* בחירת נסיעה קיימת */}
        {showExistingTrips && (
          <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              קישור נסיעה קיימת
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>בחר נסיעה</InputLabel>
              <Select
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                label="בחר נסיעה"
              >
                {trips.filter(trip => !trip.linkedActivityId).map(trip => (
                  <MenuItem key={trip.id} value={trip.id}>
                    {trip.purpose} - {trip.location}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={handleLinkExistingTrip}>
                קשר נסיעה
              </Button>
              <Button variant="outlined" onClick={() => setShowExistingTrips(false)}>
                ביטול
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>סגור</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TripManagement; 