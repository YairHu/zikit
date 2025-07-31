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
  Button,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Group as GroupIcon,
  Person as PersonIcon,
  Star as StarIcon,
  ExpandMore as ExpandMoreIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DirectionsCar as DirectionsCarIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Add as AddIcon,
  LocalGasStation as FuelIcon,
  Build as MaintenanceIcon,
  CheckCircle as AvailableIcon,
  Warning as WarningIcon,
  TripOrigin as TripIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { Trip } from '../models/Trip';
import { Vehicle } from '../models/Vehicle';
import { Driver } from '../models/Driver';
import { Soldier } from '../models/Soldier';
import { Activity } from '../models/Activity';
import { getAllTrips, addTrip, updateTrip, deleteTrip, checkAvailability } from '../services/tripService';
import { getAllVehicles, addVehicle, updateVehicle } from '../services/vehicleService';
import { getAllSoldiers } from '../services/soldierService';
import { getAllActivities } from '../services/activityService';

const Trips: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [activeTab, setActiveTab] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    vehicleId: '',
    driverId: '',
    location: '',
    departureTime: '',
    returnTime: '',
    purpose: '',
    status: 'מתוכננת' as 'מתוכננת' | 'בביצוע' | 'הסתיימה' | 'בוטלה'
  });
  const [error, setError] = useState<string | null>(null);
  const [openVehicleForm, setOpenVehicleForm] = useState(false);
  const [editVehicleId, setEditVehicleId] = useState<string | null>(null);
  const [vehicleFormData, setVehicleFormData] = useState({
    type: '',
    number: '',
    mileage: 0,
    lastMaintenance: '',
    nextMaintenance: '',
    seats: 0,
    status: 'available' as 'available' | 'on_mission' | 'maintenance'
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tripsData, vehiclesData, soldiersData, activitiesData] = await Promise.all([
        getAllTrips(),
        getAllVehicles(),
        getAllSoldiers(),
        getAllActivities()
      ]);
      
      setTrips(tripsData);
      setVehicles(vehiclesData);
      setActivities(activitiesData);
      
      // סינון נהגים מתוך החיילים
      const driversData = soldiersData.filter(soldier => 
        soldier.qualifications?.includes('נהג')
      ) as Driver[];
      setDrivers(driversData);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddTrip = () => {
    setEditId(null);
    setFormData({
      vehicleId: '',
      driverId: '',
      location: '',
      departureTime: '',
      returnTime: '',
      purpose: '',
      status: 'מתוכננת'
    });
    setError(null);
    setOpenForm(true);
  };

  const handleEditTrip = (trip: Trip) => {
    setEditId(trip.id);
    
    // המרת התאריכים לפורמט הנדרש ל-datetime-local
    const formatDateTimeForInput = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      // המרה לפורמט מקומי ללא המרת UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    setFormData({
      vehicleId: trip.vehicleId || '',
      driverId: trip.driverId || '',
      location: trip.location,
      departureTime: formatDateTimeForInput(trip.departureTime || ''),
      returnTime: formatDateTimeForInput(trip.returnTime || ''),
      purpose: trip.purpose,
      status: trip.status
    });
    setError(null);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditId(null);
    setFormData({
      vehicleId: '',
      driverId: '',
      location: '',
      departureTime: '',
      returnTime: '',
      purpose: '',
      status: 'מתוכננת'
    });
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
    
    try {
      // בדיקת זמינות אם יש רכב ונהג
      if (formData.vehicleId && formData.driverId && formData.departureTime && formData.returnTime) {
        const availability = await checkAvailability(
          formData.vehicleId,
          formData.driverId,
          formData.departureTime,
          formData.returnTime,
          editId || undefined
        );
        
        if (!availability.isAvailable) {
          const conflictDetails = availability.conflicts.map(trip => 
            `${trip.purpose} (${trip.vehicleNumber}, ${trip.driverName})`
          ).join(', ');
          setError(`הרכב או הנהג כבר משובץ לנסיעה אחרת בזמן זה: ${conflictDetails}`);
          return;
        }
      }

      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
      const selectedDriver = drivers.find(d => d.id === formData.driverId);

      // יצירת אובייקט נסיעה ללא ערכים ריקים/undefined (Firebase לא תומך)
      const tripData: any = {
        location: formData.location || '',
        purpose: formData.purpose || '',
        status: formData.status
      };

      // הוספת שדות אופציונליים רק אם יש להם ערכים תקינים
      if (formData.vehicleId && formData.vehicleId.trim()) {
        tripData.vehicleId = formData.vehicleId;
        if (selectedVehicle?.number) {
          tripData.vehicleNumber = selectedVehicle.number;
        }
      }

      if (formData.driverId && formData.driverId.trim()) {
        tripData.driverId = formData.driverId;
        if (selectedDriver?.name) {
          tripData.driverName = selectedDriver.name;
        }
      }

      if (formData.departureTime && formData.departureTime.trim()) {
        tripData.departureTime = formData.departureTime;
      }

      if (formData.returnTime && formData.returnTime.trim()) {
        tripData.returnTime = formData.returnTime;
      }



      if (editId) {
        await updateTrip(editId, tripData);
        

      } else {
        await addTrip(tripData);
      }

      handleCloseForm();
      loadData();
    } catch (error) {
      console.error('שגיאה בשמירת נסיעה:', error);
      setError('שגיאה בשמירת הנסיעה');
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק נסיעה זו?')) {
      try {
        await deleteTrip(tripId);
        loadData();
      } catch (error) {
        console.error('שגיאה במחיקת נסיעה:', error);
      }
    }
  };

  // פונקציות לניהול רכבים
  const handleAddVehicle = () => {
    setEditVehicleId(null);
    setVehicleFormData({
      type: '',
      number: '',
      mileage: 0,
      lastMaintenance: '',
      nextMaintenance: '',
      seats: 0,
      status: 'available'
    });
    setOpenVehicleForm(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditVehicleId(vehicle.id);
    setVehicleFormData({
      type: vehicle.type,
      number: vehicle.number,
      mileage: vehicle.mileage,
      lastMaintenance: vehicle.lastMaintenance,
      nextMaintenance: vehicle.nextMaintenance,
      seats: vehicle.seats,
      status: vehicle.status
    });
    setOpenVehicleForm(true);
  };

  const handleCloseVehicleForm = () => {
    setOpenVehicleForm(false);
    setEditVehicleId(null);
    setVehicleFormData({
      type: '',
      number: '',
      mileage: 0,
      lastMaintenance: '',
      nextMaintenance: '',
      seats: 0,
      status: 'available'
    });
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVehicleFormData(prev => ({
      ...prev,
      [name]: name === 'mileage' || name === 'seats' ? parseInt(value) || 0 : value
    }));
  };

  const handleVehicleSelectChange = (name: string, value: any) => {
    setVehicleFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editVehicleId) {
        // עדכון רכב קיים
        await updateVehicle(editVehicleId, vehicleFormData);
      } else {
        // הוספת רכב חדש
        await addVehicle(vehicleFormData);
      }
      
      handleCloseVehicleForm();
      loadData();
    } catch (error) {
      console.error('שגיאה בשמירת רכב:', error);
      setError('שגיאה בשמירת הרכב');
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'מתוכננת': return 'מתוכננת';
      case 'בביצוע': return 'בביצוע';
      case 'הסתיימה': return 'הסתיימה';
      case 'בוטלה': return 'בוטלה';
      default: return status;
    }
  };

  const isTripComplete = (trip: Trip) => {
    // בדיקה אם כל השדות מלאים
    return trip.vehicleId && trip.driverId && trip.departureTime && trip.returnTime && trip.location && trip.purpose;
  };

  const renderTripCard = (trip: Trip) => (
    <Card 
      key={trip.id} 
      sx={{ 
        mb: 2, 
        border: isTripComplete(trip) ? '1px solid #e0e0e0' : '2px solid #f44336',
        backgroundColor: isTripComplete(trip) ? 'white' : '#ffebee'
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" gutterBottom>
              {trip.purpose}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              מיקום: {trip.location}
            </Typography>
            {trip.vehicleNumber && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                רכב: {trip.vehicleNumber}
              </Typography>
            )}
            {trip.driverName && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                נהג: {trip.driverName}
              </Typography>
            )}
            {trip.departureTime && trip.returnTime && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {new Date(trip.departureTime).toLocaleString('he-IL')} - {new Date(trip.returnTime).toLocaleString('he-IL')}
              </Typography>
            )}
          </Box>
          <Box display="flex" flexDirection="column" alignItems="flex-end">
            <Chip 
              label={getStatusText(trip.status)} 
              color={getStatusColor(trip.status) as any}
              size="small"
              sx={{ mb: 1 }}
            />
            <Box>
              <IconButton size="small" onClick={() => handleEditTrip(trip)}>
                <EditIcon />
              </IconButton>
              <IconButton size="small" onClick={() => handleDeleteTrip(trip.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
        {!isTripComplete(trip) && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            נסיעה לא מלאה - יש למלא את כל השדות
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderTripTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>מטרה</TableCell>
            <TableCell>מיקום</TableCell>
            <TableCell>רכב</TableCell>
            <TableCell>נהג</TableCell>
            <TableCell>זמן יציאה</TableCell>
            <TableCell>זמן חזרה</TableCell>
            <TableCell>סטטוס</TableCell>
            <TableCell>פעולות</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {trips.map((trip) => (
                         <TableRow 
               key={trip.id}
               sx={{ 
                 backgroundColor: isTripComplete(trip) ? 'white' : '#ffebee',
                 border: isTripComplete(trip) ? '1px solid #e0e0e0' : '2px solid #f44336'
               }}
             >
              <TableCell>{trip.purpose}</TableCell>
              <TableCell>{trip.location}</TableCell>
              <TableCell>{trip.vehicleNumber || '-'}</TableCell>
              <TableCell>{trip.driverName || '-'}</TableCell>
              <TableCell>
                {trip.departureTime ? new Date(trip.departureTime).toLocaleString('he-IL') : '-'}
              </TableCell>
              <TableCell>
                {trip.returnTime ? new Date(trip.returnTime).toLocaleString('he-IL') : '-'}
              </TableCell>
              <TableCell>
                <Chip 
                  label={getStatusText(trip.status)} 
                  color={getStatusColor(trip.status) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <IconButton size="small" onClick={() => handleEditTrip(trip)}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={() => handleDeleteTrip(trip.id)}>
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) {
    return (
      <Container>
        <Typography>טוען...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          ניהול נסיעות
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="נסיעות" />
          <Tab label="רכבים" />
          <Tab label="נהגים" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Button
                variant={viewMode === 'cards' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('cards')}
                sx={{ mr: 1 }}
              >
                כרטיסים
              </Button>
              <Button
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('table')}
              >
                טבלה
              </Button>
            </Box>
            <Fab color="primary" onClick={handleAddTrip}>
              <AddIcon />
            </Fab>
          </Box>

          {viewMode === 'cards' ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {trips.map(trip => (
                <Box key={trip.id} sx={{ flex: '1 1 300px', maxWidth: '400px' }}>
                  {renderTripCard(trip)}
                </Box>
              ))}
            </Box>
          ) : (
            renderTripTable()
          )}
        </>
      )}

      {activeTab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">רכבים</Typography>
            <Fab color="primary" onClick={handleAddVehicle}>
              <AddIcon />
            </Fab>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {vehicles.map(vehicle => (
              <Box key={vehicle.id} sx={{ flex: '1 1 300px', maxWidth: '400px' }}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="h6">{vehicle.number}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          סוג: {vehicle.type}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          קילומטרז: {vehicle.mileage ? vehicle.mileage.toLocaleString() : 'לא מוגדר'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          מקומות: {vehicle.seats || 'לא מוגדר'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          טיפול אחרון: {new Date(vehicle.lastMaintenance).toLocaleDateString('he-IL')}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          טיפול הבא: {new Date(vehicle.nextMaintenance).toLocaleDateString('he-IL')}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton size="small" onClick={() => handleEditVehicle(vehicle)}>
                          <EditIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Chip 
                      label={vehicle.status === 'available' ? 'זמין' : vehicle.status === 'on_mission' ? 'במשימה' : 'בטיפול'} 
                      color={vehicle.status === 'available' ? 'success' : vehicle.status === 'on_mission' ? 'warning' : 'error'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>נהגים</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {drivers.map(driver => (
              <Box key={driver.id} sx={{ flex: '1 1 300px', maxWidth: '400px' }}>
                <Card 
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/soldiers/${driver.id}`)}
                >
                  <CardContent>
                    <Typography variant="h6">
                      {driver.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      מספר אישי: {driver.personalNumber}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      תפקיד: {driver.role}
                    </Typography>
                    {driver.drivingExperience && (
                      <Typography variant="body2" color="textSecondary">
                        ניסיון נהיגה: {driver.drivingExperience} שנים
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* דיאלוג הוספת/עריכת נסיעה */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>
          {editId ? 'עריכת נסיעה' : 'הוספת נסיעה חדשה'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>רכב</InputLabel>
                  <Select
                    name="vehicleId"
                    value={formData.vehicleId}
                    onChange={(e) => handleSelectChange('vehicleId', e.target.value)}
                    label="רכב"
                  >
                    <MenuItem value="">ללא רכב</MenuItem>
                    {vehicles.map(vehicle => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.number} - {vehicle.type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>נהג</InputLabel>
                  <Select
                    name="driverId"
                    value={formData.driverId}
                    onChange={(e) => handleSelectChange('driverId', e.target.value)}
                    label="נהג"
                  >
                    <MenuItem value="">ללא נהג</MenuItem>
                    {drivers.map(driver => (
                      <MenuItem key={driver.id} value={driver.id}>
                                                 {driver.name} - {driver.role}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <TextField
                fullWidth
                label="מיקום"
                name="location"
                value={formData.location}
                onChange={handleChange}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="זמן יציאה"
                  name="departureTime"
                  type="datetime-local"
                  value={formData.departureTime}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="זמן חזרה"
                  name="returnTime"
                  type="datetime-local"
                  value={formData.returnTime}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <TextField
                fullWidth
                label="מטרת הנסיעה"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                multiline
                rows={3}
              />
              <FormControl fullWidth>
                <InputLabel>סטטוס</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={(e) => handleSelectChange('status', e.target.value)}
                  label="סטטוס"
                >
                  <MenuItem value="מתוכננת">מתוכננת</MenuItem>
                  <MenuItem value="בביצוע">בביצוע</MenuItem>
                  <MenuItem value="הסתיימה">הסתיימה</MenuItem>
                  <MenuItem value="בוטלה">בוטלה</MenuItem>
                </Select>
              </FormControl>

            </Box>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForm}>ביטול</Button>
            <Button type="submit" variant="contained">
              {editId ? 'עדכן' : 'הוסף'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* דיאלוג הוספת/עריכת רכב */}
      <Dialog open={openVehicleForm} onClose={handleCloseVehicleForm} maxWidth="md" fullWidth>
        <DialogTitle>
          {editVehicleId ? 'עריכת רכב' : 'הוספת רכב חדש'}
        </DialogTitle>
        <form onSubmit={handleVehicleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="מספר רכב"
                  name="number"
                  value={vehicleFormData.number}
                  onChange={handleVehicleChange}
                  required
                />
                <TextField
                  fullWidth
                  label="סוג רכב"
                  name="type"
                  value={vehicleFormData.type}
                  onChange={handleVehicleChange}
                  required
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="קילומטרז"
                  name="mileage"
                  type="number"
                  value={vehicleFormData.mileage}
                  onChange={handleVehicleChange}
                  required
                />
                <TextField
                  fullWidth
                  label="מספר מקומות"
                  name="seats"
                  type="number"
                  value={vehicleFormData.seats}
                  onChange={handleVehicleChange}
                  required
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="טיפול אחרון"
                  name="lastMaintenance"
                  type="date"
                  value={vehicleFormData.lastMaintenance}
                  onChange={handleVehicleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <TextField
                  fullWidth
                  label="טיפול הבא"
                  name="nextMaintenance"
                  type="date"
                  value={vehicleFormData.nextMaintenance}
                  onChange={handleVehicleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Box>
              <FormControl fullWidth>
                <InputLabel>סטטוס</InputLabel>
                <Select
                  name="status"
                  value={vehicleFormData.status}
                  onChange={(e) => handleVehicleSelectChange('status', e.target.value)}
                  label="סטטוס"
                >
                  <MenuItem value="available">זמין</MenuItem>
                  <MenuItem value="on_mission">במשימה</MenuItem>
                  <MenuItem value="maintenance">בטיפול</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseVehicleForm}>ביטול</Button>
            <Button type="submit" variant="contained">
              {editVehicleId ? 'עדכן' : 'הוסף'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default Trips; 