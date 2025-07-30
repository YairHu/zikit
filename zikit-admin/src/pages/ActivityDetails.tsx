import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { Activity, ActivityDeliverable } from '../models/Activity';
import { getActivityById, addActivityDeliverable, updateActivityStatus } from '../services/activityService';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'מתוכננת': return 'primary';
      case 'בביצוע': return 'warning';
      case 'הסתיימה': return 'success';
      case 'בוטלה': return 'error';
      default: return 'default';
    }
  };

  const handleEdit = () => {
    navigate(`/activities?edit=${id}`);
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
      // רענון הפעילות
      const updatedActivity = await getActivityById(activity.id);
      setActivity(updatedActivity);
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס:', error);
    }
  };

  const handleAddDeliverable = async () => {
    if (!activity || !newDeliverable.title || !newDeliverable.content) {
      return;
    }

    try {
      await addActivityDeliverable(activity.id, {
        ...newDeliverable,
        createdBy: user?.displayName || user?.email || 'משתמש לא ידוע'
      });

      // רענון הפעילות
      const updatedActivity = await getActivityById(activity.id);
      setActivity(updatedActivity);

      // איפוס הטופס
      setNewDeliverable({
        type: 'text',
        title: '',
        content: ''
      });
      setShowDeliverablesDialog(false);
    } catch (error) {
      console.error('שגיאה בהוספת תוצר:', error);
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!activity) {
    return (
      <Container>
        <Typography variant="h5" sx={{ mt: 4 }}>פעילות לא נמצאה</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1">
            {activity.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            פעילות מבצעית
          </Typography>
        </Box>
                 <Box sx={{ display: 'flex', gap: 1 }}>
           <Chip 
             label={activity.status} 
             color={getStatusColor(activity.status) as any}
           />
           <FormControl size="small" sx={{ minWidth: 120 }}>
             <Select
               value={activity.status}
               onChange={(e) => handleStatusChange(e.target.value as Activity['status'])}
               sx={{ height: 32 }}
             >
               <MenuItem value="מתוכננת">מתוכננת</MenuItem>
               <MenuItem value="בביצוע">בביצוע</MenuItem>
               <MenuItem value="הסתיימה">הסתיימה</MenuItem>
               <MenuItem value="בוטלה">בוטלה</MenuItem>
             </Select>
           </FormControl>
           <Button
             variant="outlined"
             startIcon={<AddIcon />}
             onClick={() => setShowDeliverablesDialog(true)}
             sx={{ mr: 1 }}
           >
             תוצרים
           </Button>
           <IconButton onClick={handleEdit}>
             <EditIcon />
           </IconButton>
           <IconButton color="error" onClick={handleDelete}>
             <DeleteIcon />
           </IconButton>
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
                    <Typography variant="body2" color="text.secondary">אזור</Typography>
                    <Typography variant="body1">{activity.region}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">משך</Typography>
                    <Typography variant="body1">{activity.duration} שעות</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AssignmentIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">סוג פעילות</Typography>
                    <Typography variant="body1">
                      {activity.activityType === 'אחר' && activity.activityTypeOther 
                        ? activity.activityTypeOther 
                        : activity.activityType}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {activity.vehicleNumber && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                  <DirectionsCarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">רכב</Typography>
                    <Typography variant="body1">{activity.vehicleNumber}</Typography>
                  </Box>
                </Box>
              )}

              {activity.driverName && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                  <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">נהג</Typography>
                    <Typography variant="body1">{activity.driverName}</Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>משתתפים ({activity.participants.length})</Typography>
              <List>
                {activity.participants.map((participant, index) => (
                  <React.Fragment key={participant.soldierId}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Button
                            onClick={() => navigate(`/soldiers/${participant.soldierId}`)}
                            sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                          >
                            {participant.soldierName}
                          </Button>
                        }
                        secondary={`${participant.personalNumber} - ${participant.role}`}
                      />
                    </ListItem>
                    {index < activity.participants.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>

        {/* Right Column - Commanders */}
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>מפקדים</Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">מפקד הפעילות</Typography>
                <Button
                  onClick={() => navigate(`/soldiers/${activity.commanderId}`)}
                  sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                >
                  {activity.commanderName}
                </Button>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">מוביל משימה</Typography>
                <Button
                  onClick={() => navigate(`/soldiers/${activity.taskLeaderId}`)}
                  sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                >
                  {activity.taskLeaderName}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Team Info */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>צוות</Typography>
              <Typography variant="body1">{activity.team}</Typography>
            </CardContent>
          </Card>

          {/* Deliverables */}
          {activity.deliverables && activity.deliverables.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>תוצרים ({activity.deliverables.length})</Typography>
                <List>
                  {activity.deliverables.map((deliverable, index) => (
                    <React.Fragment key={deliverable.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            {deliverable.type === 'text' ? <DescriptionIcon /> : <ImageIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={deliverable.title}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {deliverable.content}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                נוצר על ידי: {deliverable.createdBy} | {new Date(deliverable.createdAt).toLocaleDateString('he-IL')}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {activity.deliverables && index < activity.deliverables.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Dialog for adding deliverables */}
      <Dialog 
        open={showDeliverablesDialog} 
        onClose={() => setShowDeliverablesDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>הוספת תוצר לפעילות</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
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
              value={newDeliverable.title}
              onChange={(e) => setNewDeliverable(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
            />

            <TextField
              label={newDeliverable.type === 'text' ? 'תוכן' : 'URL של תמונה'}
              value={newDeliverable.content}
              onChange={(e) => setNewDeliverable(prev => ({ ...prev, content: e.target.value }))}
              multiline={newDeliverable.type === 'text'}
              rows={newDeliverable.type === 'text' ? 4 : 1}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeliverablesDialog(false)}>ביטול</Button>
          <Button 
            onClick={handleAddDeliverable}
            variant="contained"
            disabled={!newDeliverable.title || !newDeliverable.content}
          >
            הוסף תוצר
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ActivityDetails; 