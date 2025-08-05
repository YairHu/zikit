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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Button,
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
  Group as GroupIcon,
  Person as PersonIcon,
  Star as StarIcon,
  ExpandMore as ExpandMoreIcon,
  ArrowForward as ArrowForwardIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  AccountTree as AccountTreeIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { Soldier } from '../models/Soldier';
import { Activity } from '../models/Activity';
import { Duty } from '../models/Duty';
import { Framework, FrameworkWithDetails } from '../models/Framework';
import { getAllSoldiers } from '../services/soldierService';
import { getAllFrameworks, getFrameworkWithDetails } from '../services/frameworkService';
import { getActivitiesByTeam } from '../services/activityService';
import { getDutiesByTeam } from '../services/dutyService';
import { getPresenceColor, getProfileColor } from '../utils/colors';

const Teams: React.FC = () => {
  const navigate = useNavigate();
  const [frameworks, setFrameworks] = useState<FrameworkWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [error, setError] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // טעינת כל המסגרות
      const allFrameworks = await getAllFrameworks();
      
      // לכל מסגרת, נטען את הפרטים המלאים
      const frameworksWithDetails = await Promise.all(
        allFrameworks.map(framework => getFrameworkWithDetails(framework.id))
      );
      
      // סינון רק המסגרות שנטענו בהצלחה
      const validFrameworks = frameworksWithDetails.filter(f => f !== null) as FrameworkWithDetails[];
      
      setFrameworks(validFrameworks);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
      setError('שגיאה בטעינת נתוני המסגרות');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);



  const handleSoldierClick = (soldierId: string) => {
    navigate(`/soldiers/${soldierId}`);
  };

  const handleFrameworkClick = (frameworkId: string) => {
    navigate(`/frameworks/${frameworkId}`); // יצטרך ליצור עמוד פרטי מסגרת
  };





  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>טוען מסגרות...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          מסגרות
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AccountTreeIcon />}
          onClick={() => navigate('/framework-management')}
        >
          ניהול מבנה פלוגה
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* View Mode Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={viewMode === 'cards' ? 0 : 1} onChange={(_, newValue) => setViewMode(newValue === 0 ? 'cards' : 'table')}>
          <Tab icon={<ViewModuleIcon />} label="כרטיסים" />
          <Tab icon={<ViewListIcon />} label="טבלה" />
        </Tabs>
      </Box>
      
      {viewMode === 'cards' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        {frameworks.map((framework) => (
          <Card key={framework.id}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <AccountTreeIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="h6" 
                    fontWeight="bold"
                    onClick={() => handleFrameworkClick(framework.id)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { 
                        color: 'primary.main',
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {framework.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {framework.level} • {framework.totalSoldiers} חיילים • מפקד: {framework.commander?.name || 'לא מוגדר'}
                  </Typography>
                </Box>
                <Badge badgeContent={framework.totalSoldiers} color="primary">
                  <GroupIcon />
                </Badge>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleFrameworkClick(framework.id)}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  צפה בפרטי המסגרת
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* חיילי המסגרת */}
              {framework.soldiers.length > 0 && (
                <Accordion defaultExpanded>
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">חיילי המסגרת</Typography>
                      <Chip 
                        label={framework.soldiers.length} 
                        size="small" 
                        color="primary" 
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {framework.soldiers.map((soldier) => (
                        <ListItem key={soldier.id} disablePadding>
                          <ListItemButton 
                            onClick={() => handleSoldierClick(soldier.id)}
                            sx={{ 
                              borderRadius: 1,
                              mb: 0.5
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                {soldier.name.charAt(0)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography variant="body1" fontWeight={600}>
                                  {soldier.name}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                  <Chip 
                                    label={soldier.role} 
                                    size="small" 
                                    color="primary" 
                                    variant="outlined"
                                  />
                                  <Typography variant="body2" color="text.secondary">
                                    {soldier.personalNumber}
                                  </Typography>
                                </Box>
                              }
                            />
                            <ArrowForwardIcon color="action" />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* מסגרות בנות */}
              {framework.childFrameworks.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    מסגרות בנות:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {framework.childFrameworks.map((child) => (
                      <Chip 
                        key={child.id} 
                        label={child.name} 
                        size="small" 
                        variant="outlined"
                        onClick={() => handleFrameworkClick(child.id)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* פעילויות, תורנויות ונסיעות של המסגרת ומסגרות בנות */}
              {(framework.totalActivities || 0) > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    פעילויות מבצעיות:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                     {framework.activities?.slice(0, 3).map((activity: any) => {
                       // יצירת תיאור של מי הביא את הפעילות
                       let broughtBy = '';
                       if (activity.participantsFromCurrentFramework?.length > 0) {
                         const participants = activity.participantsFromCurrentFramework.map((p: any) => p.soldierName).join(', ');
                         broughtBy = `משתתפים: ${participants}`;
                       } else if (activity.commanderFromCurrentFramework) {
                         broughtBy = `מפקד: ${activity.commanderFromCurrentFramework.soldierName}`;
                                               } else if (activity.taskLeaderFromCurrentFramework) {
                          broughtBy = `מוביל משימה: ${activity.taskLeaderFromCurrentFramework.soldierName}`;
                       } else {
                         broughtBy = activity.sourceFrameworkName || activity.frameworkId || activity.team || '';
                       }
                       
                       return (
                         <Chip 
                           key={activity.id} 
                           label={`${activity.name} (${broughtBy})`} 
                           size="small" 
                           color="primary"
                           variant="outlined"
                           sx={{ cursor: 'pointer' }}
                         />
                       );
                     })}
                    {(framework.totalActivities || 0) > 3 && (
                      <Chip 
                        label={`+${(framework.totalActivities || 0) - 3} נוספות`} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              )}

              {(framework.totalDuties || 0) > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    תורנויות:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                     {framework.duties?.slice(0, 3).map((duty: any) => {
                       // יצירת תיאור של מי הביא את התורנות
                       let broughtBy = '';
                       if (duty.participantsFromCurrentFramework?.length > 0) {
                         const participants = duty.participantsFromCurrentFramework.map((p: any) => p.soldierName).join(', ');
                         broughtBy = `משתתפים: ${participants}`;
                       } else {
                         broughtBy = duty.sourceFrameworkName || duty.frameworkId || duty.team || '';
                       }
                       
                       return (
                         <Chip 
                           key={duty.id} 
                           label={`${duty.type} (${broughtBy})`} 
                           size="small" 
                           color="secondary"
                           variant="outlined"
                           sx={{ cursor: 'pointer' }}
                         />
                       );
                     })}
                    {(framework.totalDuties || 0) > 3 && (
                      <Chip 
                        label={`+${(framework.totalDuties || 0) - 3} נוספות`} 
                        size="small" 
                        color="secondary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              )}

              {(framework.totalTrips || 0) > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    נסיעות:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                     {framework.trips?.slice(0, 3).map((trip: any) => {
                       // יצירת תיאור של מי הביא את הנסיעה
                       let broughtBy = '';
                       if (trip.participantsFromCurrentFramework?.length > 0) {
                         const participants = trip.participantsFromCurrentFramework.map((p: any) => p.soldierName).join(', ');
                         broughtBy = `משתתפים: ${participants}`;
                       } else {
                         broughtBy = trip.sourceFrameworkName || trip.frameworkId || trip.team || '';
                       }
                       
                       return (
                         <Chip 
                           key={trip.id} 
                           label={`${trip.purpose} (${broughtBy})`} 
                           size="small" 
                           color="info"
                           variant="outlined"
                           sx={{ cursor: 'pointer' }}
                         />
                       );
                     })}
                    {(framework.totalTrips || 0) > 3 && (
                      <Chip 
                        label={`+${(framework.totalTrips || 0) - 3} נוספות`} 
                        size="small" 
                        color="info"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
      ) : (
        // Table View
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>שם מסגרת</TableCell>
                <TableCell>רמה</TableCell>
                <TableCell>מפקד</TableCell>
                <TableCell>חיילים ישירים</TableCell>
                <TableCell>סה"כ חיילים</TableCell>
                <TableCell>מסגרות בנות</TableCell>
                <TableCell>פעילויות</TableCell>
                <TableCell>תורנויות</TableCell>
                <TableCell>נסיעות</TableCell>
                <TableCell>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {frameworks.map((framework) => (
                <TableRow key={framework.id} hover>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      sx={{ 
                        cursor: 'pointer',
                        color: 'primary.main',
                        '&:hover': { 
                          textDecoration: 'underline'
                        }
                      }}
                      onClick={() => handleFrameworkClick(framework.id)}
                    >
                      {framework.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={framework.level} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {framework.commander?.name || 'לא מוגדר'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {framework.soldiers.length}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {framework.totalSoldiers}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {framework.childFrameworks.length}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {framework.totalActivities || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {framework.totalDuties || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {framework.totalTrips || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleFrameworkClick(framework.id)}
                    >
                      צפה בפרטים
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {frameworks.length === 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          לא נמצאו מסגרות. לחץ על "ניהול מבנה פלוגה" כדי ליצור מסגרות חדשות.
        </Alert>
      )}
    </Container>
  );
};

export default Teams; 