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
  Fab
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
  Warning as WarningIcon
} from '@mui/icons-material';
import {
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
import { useUser } from '../contexts/UserContext';
import { Vehicle } from '../models/Vehicle';
import { Activity } from '../models/Activity';
import { getAllVehicles, addVehicle, updateVehicle } from '../services/vehicleService';
import { getAllActivities } from '../services/activityService';

const Vehicles: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    number: '',
    type: '',
    mileage: 0,
    lastMaintenance: '',
    nextMaintenance: '',
    status: 'available' as 'available' | 'on_mission' | 'maintenance'
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [vehiclesData, activitiesData] = await Promise.all([
        getAllVehicles(),
        getAllActivities()
      ]);
      
      setVehicles(vehiclesData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // קבלת פעילויות פעילות (מתוכננות או בביצוע)
  const activeActivities = activities.filter(activity => 
    ['מתוכננת', 'בביצוע'].includes(activity.status)
  );

  // קבלת רכבים שמשובצים לפעילויות
  const assignedVehicles = vehicles.filter(vehicle => 
    activeActivities.some(activity => activity.vehicleId === vehicle.id)
  );

  // קבלת רכבים פנויים
  const availableVehicles = vehicles.filter(vehicle => 
    !activeActivities.some(activity => activity.vehicleId === vehicle.id)
  );

  const handleVehicleClick = (vehicle: Vehicle) => {
    setEditId(vehicle.id);
    setFormData({
      number: vehicle.number,
      type: vehicle.type,
      mileage: vehicle.mileage,
      lastMaintenance: vehicle.lastMaintenance,
      nextMaintenance: vehicle.nextMaintenance,
      status: vehicle.status as 'available' | 'on_mission' | 'maintenance'
    });
    setOpenForm(true);
  };

  const handleAddVehicle = () => {
    setEditId(null);
    setFormData({
      number: '',
      type: '',
      mileage: 0,
      lastMaintenance: '',
      nextMaintenance: '',
      status: 'available' as 'available' | 'on_mission' | 'maintenance'
    });
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditId(null);
    setFormData({
      number: '',
      type: '',
      mileage: 0,
      lastMaintenance: '',
      nextMaintenance: '',
      status: 'available' as 'available' | 'on_mission' | 'maintenance'
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'mileage' ? parseInt(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value as any
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        // עדכון רכב קיים
        await updateVehicle(editId, formData);
      } else {
        // הוספת רכב חדש
        await addVehicle(formData);
      }
      handleCloseForm();
      loadData();
    } catch (error) {
      console.error('שגיאה בשמירת רכב:', error);
    }
  };

  const handleActivityClick = (activityId: string) => {
    navigate(`/activities/${activityId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'on_mission': return 'warning';
      case 'maintenance': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'פנוי';
      case 'on_mission': return 'במשימה';
      case 'maintenance': return 'בטיפול';
      default: return status;
    }
  };

  const getVehicleTypeText = (type: string) => {
    switch (type) {
      case 'jeep': return 'ג\'יפ';
      case 'truck': return 'משאית';
      case 'bus': return 'אוטובוס';
      case 'motorcycle': return 'אופנוע';
      case 'special': return 'מיוחד';
      default: return type;
    }
  };

  const getVehicleTypeColor = (type: string) => {
    switch (type) {
      case 'jeep': return 'primary';
      case 'truck': return 'secondary';
      case 'bus': return 'success';
      case 'motorcycle': return 'warning';
      case 'special': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>טוען נתוני רכבים...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            רכבים
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {vehicles.length} רכבים • {assignedVehicles.length} משובצים • {availableVehicles.length} פנויים
          </Typography>
        </Box>
        <Badge badgeContent={vehicles.length} color="primary">
          <DirectionsCarIcon />
        </Badge>
      </Box>
      
      {/* Add Vehicle Button */}
      {user && (user.role === 'mefaked_tzevet' || user.role === 'mefaked_pluga' || user.role === 'admin') && (
        <Fab
          color="primary"
          onClick={handleAddVehicle}
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* View Mode Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={viewMode === 'cards' ? 0 : 1} onChange={(_, newValue) => setViewMode(newValue === 0 ? 'cards' : 'table')}>
          <Tab label="תצוגת כרטיסים" />
          <Tab label="תצוגה טבלאית" />
        </Tabs>
      </Box>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {vehicles.map((vehicle) => {
            const assignedActivity = activeActivities.find(activity => activity.vehicleId === vehicle.id);
            
            return (
              <Card key={vehicle.id}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <DirectionsCarIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {vehicle.number}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {vehicle.type}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip 
                        label={getVehicleTypeText(vehicle.type)} 
                        size="small" 
                        color={getVehicleTypeColor(vehicle.type)}
                        variant="outlined"
                      />
                      {assignedActivity && (
                        <Chip 
                          label="משובץ לנסיעה" 
                          size="small" 
                          color="warning"
                          variant="outlined"
                        />
                      )}
                      {user && (user.role === 'mefaked_tzevet' || user.role === 'mefaked_pluga' || user.role === 'admin') && (
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVehicleClick(vehicle);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* פרטי רכב */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      פרטי רכב:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>קילומטרז:</strong> {vehicle.mileage?.toLocaleString()} ק"מ
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>טיפול אחרון:</strong> {vehicle.lastMaintenance}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>טיפול הבא:</strong> {vehicle.nextMaintenance}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        <Chip 
                          label={`סטטוס: ${getStatusText(vehicle.status)}`}
                          size="small"
                          color={getStatusColor(vehicle.status)}
                          variant="outlined"
                        />
                        {vehicle.returnEstimate && (
                          <Chip 
                            label={`צפי חזרה: ${vehicle.returnEstimate}`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* פעילות משובצת */}
                  {assignedActivity && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        פעילות משובצת:
                      </Typography>
                      <Box 
                        sx={{ 
                          cursor: 'pointer',
                          p: 1, 
                          bgcolor: 'white', 
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'warning.main'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivityClick(assignedActivity.id);
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          {assignedActivity.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {assignedActivity.plannedDate} - {assignedActivity.location}
                        </Typography>
                        <Chip 
                          label={assignedActivity.status} 
                          size="small" 
                          color={getStatusColor(assignedActivity.status)}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>מספר רכב</TableCell>
                <TableCell>סוג</TableCell>
                <TableCell>קילומטרז</TableCell>
                <TableCell>טיפול אחרון</TableCell>
                <TableCell>טיפול הבא</TableCell>
                <TableCell>סטטוס</TableCell>
                <TableCell>סטטוס שיבוץ</TableCell>
                <TableCell>פעילות משובצת</TableCell>
                <TableCell>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehicles.map((vehicle) => {
                const assignedActivity = activeActivities.find(activity => activity.vehicleId === vehicle.id);
                
                return (
                  <TableRow key={vehicle.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 1, width: 32, height: 32 }}>
                          <DirectionsCarIcon />
                        </Avatar>
                        <Typography variant="body2" fontWeight="bold">
                          {vehicle.number}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {vehicle.type}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {vehicle.mileage?.toLocaleString()} ק"מ
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {vehicle.lastMaintenance}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {vehicle.nextMaintenance}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(vehicle.status)}
                        size="small"
                        color={getStatusColor(vehicle.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {assignedActivity ? (
                        <Chip 
                          label="משובץ לנסיעה" 
                          size="small" 
                          color="warning"
                          variant="outlined"
                        />
                      ) : (
                        <Chip 
                          label="פנוי" 
                          size="small" 
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {assignedActivity ? (
                        <Box 
                          sx={{ 
                            cursor: 'pointer',
                            p: 1, 
                            bgcolor: 'warning.light', 
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'warning.main'
                          }}
                          onClick={() => handleActivityClick(assignedActivity.id)}
                        >
                          <Typography variant="body2" fontWeight="bold">
                            {assignedActivity.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {assignedActivity.plannedDate}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          אין פעילות משובצת
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVehicleClick(vehicle);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {vehicles.length === 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          לא נמצאו רכבים
        </Alert>
      )}

      {/* Add/Edit Vehicle Form Dialog */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editId ? 'עריכת רכב' : 'הוספת רכב חדש'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                name="number"
                label="מספר רכב"
                value={formData.number}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                name="type"
                label="סוג רכב"
                value={formData.type}
                onChange={handleChange}
                required
                fullWidth
                placeholder="למשל: ג'יפ, משאית, אוטובוס"
              />
              <TextField
                name="mileage"
                label="קילומטרז"
                type="number"
                value={formData.mileage}
                onChange={handleChange}
                required
                fullWidth
                inputProps={{ min: 0 }}
              />
              <TextField
                name="lastMaintenance"
                label="תאריך טיפול אחרון"
                type="date"
                value={formData.lastMaintenance}
                onChange={handleChange}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                name="nextMaintenance"
                label="תאריך טיפול הבא"
                type="date"
                value={formData.nextMaintenance}
                onChange={handleChange}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth>
                <InputLabel>סטטוס</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={(e) => handleSelectChange('status', e.target.value)}
                  label="סטטוס"
                >
                  <MenuItem value="available">פנוי</MenuItem>
                  <MenuItem value="on_mission">במשימה</MenuItem>
                  <MenuItem value="maintenance">בטיפול</MenuItem>
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
    </Container>
  );
};

export default Vehicles; 