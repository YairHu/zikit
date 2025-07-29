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
  Add as AddIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { Soldier } from '../models/Soldier';
import { Activity } from '../models/Activity';
import { getAllSoldiers } from '../services/soldierService';
import { getAllActivities } from '../services/activityService';

const Drivers: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [soldiersData, activitiesData] = await Promise.all([
        getAllSoldiers(),
        getAllActivities()
      ]);
      
      setSoldiers(soldiersData);
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

  // סינון חיילים שיש להם כשירות "נהג"
  const drivers = soldiers.filter(soldier => 
    soldier.qualifications?.includes('נהג')
  );

  // קבלת פעילויות פעילות (מתוכננות או בביצוע)
  const activeActivities = activities.filter(activity => 
    ['מתוכננת', 'בביצוע'].includes(activity.status)
  );

  // קבלת נהגים שמשובצים לפעילויות
  const assignedDrivers = drivers.filter(driver => 
    activeActivities.some(activity => activity.driverId === driver.id)
  );

  // קבלת נהגים פנויים
  const availableDrivers = drivers.filter(driver => 
    !activeActivities.some(activity => activity.driverId === driver.id)
  );

  const handleSoldierClick = (soldier: Soldier) => {
    navigate(`/soldiers/${soldier.id}`);
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

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case '97': return '#4caf50';
      case '82': return '#ff9800';
      case '72': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'מפקד צוות': return '#1976d2';
      case 'סמל': return '#388e3c';
      case 'מפקד': return '#7b1fa2';
      case 'חייל': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>טוען נתוני נהגים...</Typography>
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
            נהגים
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {drivers.length} נהגים • {assignedDrivers.length} משובצים • {availableDrivers.length} פנויים
          </Typography>
        </Box>
        <Badge badgeContent={drivers.length} color="primary">
          <DirectionsCarIcon />
        </Badge>
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
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {drivers.map((driver) => {
            const assignedActivity = activeActivities.find(activity => activity.driverId === driver.id);
            
            return (
              <Card key={driver.id} sx={{ cursor: 'pointer' }} onClick={() => handleSoldierClick(driver)}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      {driver.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {driver.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {driver.personalNumber} • {driver.team}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip 
                        label={driver.role} 
                        size="small" 
                        sx={{ 
                          bgcolor: getRoleColor(driver.role),
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                      {assignedActivity && (
                        <Chip 
                          label="משובץ לנסיעה" 
                          size="small" 
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* פרופיל רפואי */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      פרופיל רפואי:
                    </Typography>
                    <Chip 
                      label={driver.profile}
                      sx={{ 
                        bgcolor: getProfileColor(driver.profile),
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  </Box>

                  {/* כשירויות */}
                  {driver.qualifications && driver.qualifications.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        כשירויות:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {driver.qualifications.map((qual, index) => (
                          <Chip 
                            key={index}
                            icon={<StarIcon />}
                            label={qual} 
                            size="small" 
                            color="success"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* רישיונות נהיגה */}
                  {driver.licenses && driver.licenses.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        רישיונות נהיגה:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {driver.licenses.map((license, index) => (
                          <Chip 
                            key={index}
                            label={license} 
                            size="small" 
                            color="info"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* היתרים לנהיגה */}
                  {driver.drivingLicenses && driver.drivingLicenses.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        היתרים לנהיגה:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {driver.drivingLicenses.map((license, index) => (
                          <Chip 
                            key={index}
                            label={license} 
                            size="small" 
                            color="secondary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

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
                <TableCell>שם</TableCell>
                <TableCell>מס' אישי</TableCell>
                <TableCell>צוות</TableCell>
                <TableCell>תפקיד</TableCell>
                <TableCell>פרופיל</TableCell>
                <TableCell>רישיונות</TableCell>
                <TableCell>סטטוס</TableCell>
                <TableCell>פעילות משובצת</TableCell>
                <TableCell>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drivers.map((driver) => {
                const assignedActivity = activeActivities.find(activity => activity.driverId === driver.id);
                
                return (
                  <TableRow key={driver.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 1, width: 32, height: 32 }}>
                          {driver.name.charAt(0)}
                        </Avatar>
                        <Typography variant="body2" fontWeight="bold">
                          {driver.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{driver.personalNumber}</TableCell>
                    <TableCell>{driver.team}</TableCell>
                    <TableCell>
                      <Chip 
                        label={driver.role} 
                        size="small" 
                        sx={{ 
                          bgcolor: getRoleColor(driver.role),
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={driver.profile}
                        size="small"
                        sx={{ 
                          bgcolor: getProfileColor(driver.profile),
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {driver.licenses?.map((license, index) => (
                          <Chip 
                            key={index}
                            label={license} 
                            size="small" 
                            color="info"
                            variant="outlined"
                          />
                        ))}
                      </Box>
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
                          handleSoldierClick(driver);
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

      {drivers.length === 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          לא נמצאו נהגים
        </Alert>
      )}
    </Container>
  );
};

export default Drivers; 