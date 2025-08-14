import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { Duty } from '../models/Duty';
import { getDutyById } from '../services/dutyService';
import { getUserPermissions, UserRole } from '../models/UserRole';
import { canViewDuty, canEditItem, canDeleteItem } from '../utils/permissions';
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
  Paper
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationOnIcon,
  Group as GroupIcon
} from '@mui/icons-material';

const DutyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [duty, setDuty] = useState<Duty | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getDutyById(id).then((dutyData) => {
        // בדיקת הרשאות צפייה
        if (dutyData && user && !canViewDuty(user, dutyData)) {
          navigate('/duties');
          return;
        }
        setDuty(dutyData);
        setLoading(false);
      });
    }
  }, [id, user, navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'פעילה': return 'primary';
      case 'הסתיימה': return 'success';
      case 'בוטלה': return 'error';
      default: return 'default';
    }
  };

  const handleEdit = () => {
    navigate(`/duties?edit=${id}`);
  };

  const handleDelete = () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק תורנות זו?')) {
      // TODO: Implement delete
      navigate('/duties');
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!duty) {
    return (
      <Container>
        <Typography variant="h5" sx={{ mt: 4 }}>תורנות לא נמצאה</Typography>
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
            {duty.type}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            תורנות
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip 
            label={duty.status} 
            color={getStatusColor(duty.status) as any}
          />
          {user && canEditItem(user, duty, 'duty') && (
            <IconButton onClick={handleEdit}>
              <EditIcon />
            </IconButton>
          )}
          {user && canDeleteItem(user, duty, 'duty') && (
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
              <Typography variant="h6" sx={{ mb: 2 }}>פרטי התורנות</Typography>
              
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">תאריך ושעה</Typography>
                    <Typography variant="body1">{duty.startDate} - {duty.startTime}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationOnIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">מיקום</Typography>
                    <Typography variant="body1">{duty.location}</Typography>
                  </Box>
                </Box>

                {duty.endTime && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">שעת סיום</Typography>
                      <Typography variant="body1">{duty.endTime}</Typography>
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <GroupIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">צוות</Typography>
                    <Typography variant="body1">{duty.team}</Typography>
                  </Box>
                </Box>
              </Box>

              {duty.requiredEquipment && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">ציוד נדרש</Typography>
                  <Typography variant="body1">{duty.requiredEquipment}</Typography>
                </Box>
              )}

              {duty.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">הערות</Typography>
                  <Typography variant="body1">{duty.notes}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>משתתפים ({duty.participants.length})</Typography>
              <List>
                {duty.participants.map((participant, index) => (
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
                        secondary={participant.personalNumber}
                      />
                    </ListItem>
                    {index < duty.participants.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>

        {/* Right Column - Additional Info */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>מידע נוסף</Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">סוג תורנות</Typography>
                <Typography variant="body1">{duty.type}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">סטטוס</Typography>
                <Chip 
                  label={duty.status} 
                  color={getStatusColor(duty.status) as any}
                  size="small"
                />
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">נוצרה ב</Typography>
                <Typography variant="body1">
                  {new Date(duty.createdAt).toLocaleDateString('he-IL')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
};

export default DutyDetails; 