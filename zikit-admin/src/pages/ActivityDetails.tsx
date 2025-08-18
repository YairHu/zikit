import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { Activity, ActivityDeliverable } from '../models/Activity';
import { Trip } from '../models/Trip';
import { getActivityById, addActivityDeliverable, updateActivityStatus } from '../services/activityService';
import { getAllTrips } from '../services/tripService';
import { UserRole } from '../models/UserRole';

import TripManagement from '../components/TripManagement';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  CircularProgress,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  DirectionsCar as DirectionsCarIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationOnIcon,
  Assignment as AssignmentIcon,
  Add as AddIcon,
  Description as DescriptionIcon,
  Image as ImageIcon
} from '@mui/icons-material';


const ActivityDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeliverablesDialog, setShowDeliverablesDialog] = useState(false);
  const [showTripManagement, setShowTripManagement] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [newDeliverable, setNewDeliverable] = useState<{
    type: 'text' | 'image';
    title: string;
    content: string;
  }>({
    type: 'text',
    title: '',
    content: ''
  });

  useEffect(() => {
    if (id) {
      getActivityById(id).then((activityData) => {
        setActivity(activityData);
        setLoading(false);
      });
    }
  }, [id]);

  useEffect(() => {
    // Load trips for mobility display
    const loadTrips = async () => {
      try {
        const tripsData = await getAllTrips();
        setTrips(tripsData);
      } catch (error) {
        console.error('Error loading trips:', error);
      }
    };
    loadTrips();
  }, []);



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

  const handleEdit = () => {
    if (id) {
      navigate(`/activities?edit=${id}`);
    }
  };

  const handleDelete = () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק פעילות זו?')) {
      // TODO: Implement delete
      navigate('/activities');
    }
  };

  const handleStatusChange = async (newStatus: Activity['status']) => {
    if (!activity) return;
    
    try {
      await updateActivityStatus(activity.id, newStatus);
      setActivity({ ...activity, status: newStatus });
    } catch (error) {
      console.error('Error updating activity status:', error);
    }
  };

  const handleActivityUpdate = (updatedActivity: Activity) => {
    setActivity(updatedActivity);
    setShowTripManagement(false);
  };

  const handleAddDeliverable = async () => {
    if (!activity || !newDeliverable.title || !newDeliverable.content) return;
    
    try {
      await addActivityDeliverable(activity.id, {
        type: newDeliverable.type,
        title: newDeliverable.title,
        content: newDeliverable.content,
        createdBy: user?.displayName || user?.email || 'משתמש לא ידוע'
      });
      
      // Refresh activity data
      const updatedActivity = await getActivityById(activity.id);
      if (updatedActivity) {
        setActivity(updatedActivity);
      }
      
      setNewDeliverable({ type: 'text', title: '', content: '' });
      setShowDeliverablesDialog(false);
    } catch (error) {
      console.error('Error adding deliverable:', error);
    }
  };



  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!activity) {
    return (
      <Container>
        <Alert severity="error">פעילות לא נמצאה</Alert>
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
            {activity.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip 
              label={activity.status} 
              color={getStatusColor(activity.status) as any}
              size="small"
            />
            <Typography variant="body2" color="text.secondary">
              • {activity.team}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowDeliverablesDialog(true)}
            sx={{ mr: 1 }}
          >
            תוצרים
          </Button>
          {user && (user.role === 'admin' || user.role === 'manager') && (
            <IconButton onClick={handleEdit}>
              <EditIcon />
            </IconButton>
          )}
          {user && (user.role === 'admin' || user.role === 'manager') && (
            <IconButton color="error" onClick={handleDelete}>
              <DeleteIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
        {/* Left Column - Details */}
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>פרטי הפעילות</Typography>
              
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">תאריך ושעה</Typography>
                    <Typography variant="body1">{activity.plannedDate} - {activity.plannedTime}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationOnIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">מיקום</Typography>
                    <Typography variant="body1">{activity.location}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AssignmentIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">סוג פעילות</Typography>
                    <Typography variant="body1">{activity.activityType}</Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Deliverables */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">תוצרים</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setShowDeliverablesDialog(true)}
                >
                  הוסף תוצר
                </Button>
              </Box>

              {activity.deliverables && activity.deliverables.length > 0 ? (
                <List>
                  {activity.deliverables.map((deliv: ActivityDeliverable, idx: number) => (
                    <React.Fragment key={idx}>
                      <ListItem alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar>
                            {deliv.type === 'image' ? <ImageIcon /> : <DescriptionIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={deliv.title}
                          secondary={deliv.content}
                        />
                      </ListItem>
                      {idx < (activity.deliverables?.length || 0) - 1 && <Divider component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">אין תוצרים</Typography>
              )}
            </CardContent>
          </Card>

          {/* Trip Management */}
          <TripManagement
            open={showTripManagement}
            onClose={() => setShowTripManagement(false)}
            activity={activity}
            onActivityUpdate={handleActivityUpdate}
          />
        </Box>

        {/* Right Column - Actions */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>פעולות</Typography>
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Button variant="outlined" onClick={() => setShowTripManagement(true)} startIcon={<DirectionsCarIcon />}>
                  ניהול נסיעות
                </Button>
                <Button variant="outlined" onClick={() => handleStatusChange('בביצוע')}>
                  סמן כ'בביצוע'
                </Button>
                <Button variant="outlined" onClick={() => handleStatusChange('הסתיימה')}>
                  סמן כ'הסתיימה'
                </Button>
                <Button variant="outlined" color="error" onClick={() => handleStatusChange('בוטלה')}>
                  סמן כ'בוטלה'
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Add Deliverable Dialog */}
      <Dialog open={showDeliverablesDialog} onClose={() => setShowDeliverablesDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>הוסף תוצר</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>סוג תוצר</InputLabel>
            <Select
              value={newDeliverable.type}
              label="סוג תוצר"
              onChange={(e) => setNewDeliverable(prev => ({ ...prev, type: e.target.value as 'text' | 'image' }))}
            >
              <MenuItem value="text">טקסט</MenuItem>
              <MenuItem value="image">תמונה</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="כותרת"
            fullWidth
            sx={{ mt: 2 }}
            value={newDeliverable.title}
            onChange={(e) => setNewDeliverable(prev => ({ ...prev, title: e.target.value }))}
          />
          <TextField
            label="תוכן"
            fullWidth
            multiline
            minRows={3}
            sx={{ mt: 2 }}
            value={newDeliverable.content}
            onChange={(e) => setNewDeliverable(prev => ({ ...prev, content: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeliverablesDialog(false)}>ביטול</Button>
          <Button variant="contained" onClick={handleAddDeliverable}>הוסף</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ActivityDetails; 