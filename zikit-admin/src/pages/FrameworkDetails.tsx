import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button
} from '@mui/material';
import {
  Group as GroupIcon,
  Person as PersonIcon,
  Star as StarIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  AccountTree as AccountTreeIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as CalendarMonthIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { FrameworkWithDetails } from '../models/Framework';
import { Activity } from '../models/Activity';
import { Duty } from '../models/Duty';
import { getFrameworkWithDetails, getFrameworkNamesByIds } from '../services/frameworkService';
import { getActivitiesByFramework } from '../services/activityService';
import { getDutiesByFramework } from '../services/dutyService';
import { getPresenceColor, getProfileColor } from '../utils/colors';

const FrameworkDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [framework, setFramework] = useState<FrameworkWithDetails | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);
  const [frameworkNames, setFrameworkNames] = useState<{ [key: string]: string }>({});

  const loadData = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError('');
      
      // טעינת פרטי המסגרת
      const frameworkData = await getFrameworkWithDetails(id);
      if (!frameworkData) {
        setError('מסגרת לא נמצאה');
        return;
      }
      setFramework(frameworkData);
      
      // טעינת פעילויות ותורנויות
      const [activitiesData, dutiesData] = await Promise.all([
        getActivitiesByFramework(id),
        getDutiesByFramework(id)
      ]);
      
      setActivities(activitiesData);
      setDuties(dutiesData);
      
      // קבלת שמות המסגרות עבור החיילים בהיררכיה
      if (frameworkData.allSoldiersInHierarchy) {
        const frameworkIds = Array.from(new Set(frameworkData.allSoldiersInHierarchy.map(s => s.frameworkId)));
        const names = await getFrameworkNamesByIds(frameworkIds);
        setFrameworkNames(names);
      }
    } catch (error) {
      console.error('שגיאה בטעינת פרטי מסגרת:', error);
      setError('שגיאה בטעינת פרטי המסגרת');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSoldierClick = (soldierId: string) => {
    navigate(`/soldiers/${soldierId}`);
  };

  const handleChildFrameworkClick = (frameworkId: string) => {
    navigate(`/frameworks/${frameworkId}`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>טוען פרטי מסגרת...</Typography>
      </Container>
    );
  }

  if (error || !framework) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'מסגרת לא נמצאה'}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/teams')}
        >
          חזרה למסגרות
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/teams')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            {framework.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            רמה: {framework.level} • {framework.totalSoldiers} חיילים
          </Typography>
        </Box>
        <IconButton>
          <EditIcon />
        </IconButton>
      </Box>

      {/* Framework Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <AccountTreeIcon />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                {framework.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {framework.description || 'אין תיאור'}
              </Typography>
            </Box>
            <Chip label={framework.level} color="primary" variant="outlined" />
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                מפקד המסגרת
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {framework.commander?.name || 'לא מוגדר'}
              </Typography>
            </Box>
            
            {framework.parentFramework && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  מסגרת אב
                </Typography>
                <Typography 
                  variant="body1" 
                  fontWeight={600}
                  sx={{ 
                    cursor: 'pointer',
                    color: 'primary.main',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                  onClick={() => handleChildFrameworkClick(framework.parentFramework!.id)}
                >
                  {framework.parentFramework.name}
                </Typography>
              </Box>
            )}
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                מסגרות בנות
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {framework.childFrameworks.length}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label={`חיילים ישירים (${framework.soldiers.length})`} />
          <Tab label={`כל החיילים בהיררכיה (${framework.totalSoldiers})`} />
          <Tab label={`מסגרות בנות (${framework.childFrameworks.length})`} />
          <Tab label={`פעילויות (${activities.length})`} />
          <Tab label={`תורנויות (${duties.length})`} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              חיילי המסגרת (ישירים)
            </Typography>
            {framework.soldiers.length > 0 ? (
              <List>
                {framework.soldiers.map((soldier) => (
                  <ListItem key={soldier.id} disablePadding>
                    <ListItemButton onClick={() => handleSoldierClick(soldier.id)}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {soldier.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={soldier.name}
                        secondary={`${soldier.role} • ${soldier.personalNumber}`}
                      />
                      <ArrowBackIcon color="action" />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" align="center">
                אין חיילים במסגרת זו
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              כל החיילים בהיררכיה (כולל מסגרות בנות)
            </Typography>
            {framework.allSoldiersInHierarchy && framework.allSoldiersInHierarchy.length > 0 ? (
              <List>
                {framework.allSoldiersInHierarchy.map((soldier) => (
                  <ListItem key={soldier.id} disablePadding>
                    <ListItemButton onClick={() => handleSoldierClick(soldier.id)}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {soldier.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                                             <ListItemText
                         primary={soldier.name}
                         secondary={`${soldier.role} • ${soldier.personalNumber} • מסגרת: ${frameworkNames[soldier.frameworkId] || soldier.frameworkId}`}
                       />
                      <ArrowBackIcon color="action" />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" align="center">
                אין חיילים בהיררכיה זו
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              מסגרות בנות
            </Typography>
            {framework.childFrameworks.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                {framework.childFrameworks.map((child) => (
                  <Card key={child.id} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                          <AccountTreeIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography 
                            variant="h6" 
                            fontWeight="bold"
                            sx={{ 
                              cursor: 'pointer',
                              '&:hover': { 
                                color: 'primary.main',
                                textDecoration: 'underline'
                              }
                            }}
                            onClick={() => handleChildFrameworkClick(child.id)}
                          >
                            {child.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            רמה: {child.level}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary" align="center">
                אין מסגרות בנות
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              פעילויות
            </Typography>
            {activities.length > 0 ? (
              <List>
                {activities.map((activity) => (
                  <ListItem key={activity.id} disablePadding>
                    <ListItemButton onClick={() => navigate(`/activities/${activity.id}`)}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: getPresenceColor(activity.status) }}>
                          <AssignmentIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.name}
                        secondary={`${activity.status} • ${new Date(activity.plannedDate).toLocaleDateString('he-IL')}`}
                      />
                      <ArrowBackIcon color="action" />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" align="center">
                אין פעילויות למסגרת זו
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              תורנויות
            </Typography>
            {duties.length > 0 ? (
              <List>
                {duties.map((duty) => (
                  <ListItem key={duty.id} disablePadding>
                    <ListItemButton onClick={() => navigate(`/duties/${duty.id}`)}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                          <CalendarMonthIcon />
                        </Avatar>
                      </ListItemAvatar>
                                             <ListItemText
                         primary={`תורנות ${duty.type}`}
                         secondary={`${duty.status} • ${new Date(duty.startDate).toLocaleDateString('he-IL')} • ${duty.location}`}
                       />
                      <ArrowBackIcon color="action" />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" align="center">
                אין תורנויות למסגרת זו
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default FrameworkDetails; 