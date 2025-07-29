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
  Grid,
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
  Button
} from '@mui/material';
import {
  Group as GroupIcon,
  Person as PersonIcon,
  Star as StarIcon,
  ExpandMore as ExpandMoreIcon,
  ArrowForward as ArrowForwardIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { Soldier } from '../models/Soldier';
import { Activity } from '../models/Activity';
import { Duty } from '../models/Duty';
import { getAllSoldiers } from '../services/soldierService';
import { getActivitiesByTeam } from '../services/activityService';
import { getDutiesByTeam } from '../services/dutyService';

interface Team {
  id: string;
  name: string;
  plagaId: 'A' | 'B' | 'ZAVIT';
  plagaName: string;
  soldiers: Soldier[];
  totalSoldiers: number;
  commanders: Soldier[];
  fighters: Soldier[];
  activities: Activity[];
  duties: Duty[];
}

const Teams: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // טעינת כל החיילים, הפעילויות והתורנויות
      const [allSoldiers, activities10, activities20, activities30, activities40, activities50, duties10, duties20, duties30, duties40, duties50] = await Promise.all([
        getAllSoldiers(),
        getActivitiesByTeam('צוות 10'),
        getActivitiesByTeam('צוות 20'),
        getActivitiesByTeam('צוות 30'),
        getActivitiesByTeam('צוות 40'),
        getActivitiesByTeam('צוות 50'),
        getDutiesByTeam('צוות 10'),
        getDutiesByTeam('צוות 20'),
        getDutiesByTeam('צוות 30'),
        getDutiesByTeam('צוות 40'),
        getDutiesByTeam('צוות 50')
      ]);
      setSoldiers(allSoldiers);
      
      // יצירת צוותים לפי הנתונים
      const teamsData: Team[] = [
        {
          id: '10',
          name: 'צוות 10',
          plagaId: 'A',
          plagaName: 'פלגה א',
          soldiers: allSoldiers.filter(s => s.team === 'צוות 10'),
          totalSoldiers: allSoldiers.filter(s => s.team === 'צוות 10').length,
          commanders: allSoldiers.filter(s => s.team === 'צוות 10' && 
            (s.role === 'מפקד צוות' || s.role === 'סמל' || s.role === 'מפקד')),
          fighters: allSoldiers.filter(s => s.team === 'צוות 10' && s.role === 'חייל'),
          activities: activities10,
          duties: duties10
        },
        {
          id: '20',
          name: 'צוות 20',
          plagaId: 'A',
          plagaName: 'פלגה א',
          soldiers: allSoldiers.filter(s => s.team === 'צוות 20'),
          totalSoldiers: allSoldiers.filter(s => s.team === 'צוות 20').length,
          commanders: allSoldiers.filter(s => s.team === 'צוות 20' && 
            (s.role === 'מפקד צוות' || s.role === 'סמל' || s.role === 'מפקד')),
          fighters: allSoldiers.filter(s => s.team === 'צוות 20' && s.role === 'חייל'),
          activities: activities20,
          duties: duties20
        },
        {
          id: '30',
          name: 'צוות 30',
          plagaId: 'A',
          plagaName: 'פלגה א',
          soldiers: allSoldiers.filter(s => s.team === 'צוות 30'),
          totalSoldiers: allSoldiers.filter(s => s.team === 'צוות 30').length,
          commanders: allSoldiers.filter(s => s.team === 'צוות 30' && 
            (s.role === 'מפקד צוות' || s.role === 'סמל' || s.role === 'מפקד')),
          fighters: allSoldiers.filter(s => s.team === 'צוות 30' && s.role === 'חייל'),
          activities: activities30,
          duties: duties30
        },
        {
          id: '40',
          name: 'צוות 40',
          plagaId: 'B',
          plagaName: 'פלגה ב',
          soldiers: allSoldiers.filter(s => s.team === 'צוות 40'),
          totalSoldiers: allSoldiers.filter(s => s.team === 'צוות 40').length,
          commanders: allSoldiers.filter(s => s.team === 'צוות 40' && 
            (s.role === 'מפקד צוות' || s.role === 'סמל' || s.role === 'מפקד')),
          fighters: allSoldiers.filter(s => s.team === 'צוות 40' && s.role === 'חייל'),
          activities: activities40,
          duties: duties40
        },
        {
          id: '50',
          name: 'צוות 50',
          plagaId: 'B',
          plagaName: 'פלגה ב',
          soldiers: allSoldiers.filter(s => s.team === 'צוות 50'),
          totalSoldiers: allSoldiers.filter(s => s.team === 'צוות 50').length,
          commanders: allSoldiers.filter(s => s.team === 'צוות 50' && 
            (s.role === 'מפקד צוות' || s.role === 'סמל' || s.role === 'מפקד')),
          fighters: allSoldiers.filter(s => s.team === 'צוות 50' && s.role === 'חייל'),
          activities: activities50,
          duties: duties50
        }
      ];
      
      setTeams(teamsData);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSoldierClick = (soldier: Soldier) => {
    navigate(`/soldiers/${soldier.id}`);
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
        <Typography>טוען צוותים...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        צוותים
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        {teams.map((team) => (
          <Card key={team.id}>
            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <GroupIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="h6" 
                      fontWeight="bold"
                      onClick={() => navigate(`/teams/${team.id}`)}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { 
                          color: 'primary.main',
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      {team.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {team.plagaName} • {team.totalSoldiers} חיילים
                    </Typography>
                  </Box>
                  <Badge badgeContent={team.totalSoldiers} color="primary">
                    <GroupIcon />
                  </Badge>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/teams/${team.id}`)}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    צפה בפרטי הצוות
                  </Button>
                </Box>

              <Divider sx={{ my: 2 }} />

              {/* פעילויות מבצעיות */}
              {team.activities.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AssignmentIcon sx={{ mr: 1, color: 'warning.main' }} />
                      <Typography variant="h6">פעילויות מבצעיות</Typography>
                      <Chip 
                        label={team.activities.length} 
                        size="small" 
                        color="warning" 
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {team.activities.map((activity) => (
                        <ListItem key={activity.id} disablePadding>
                          <ListItemButton onClick={() => navigate(`/activities/${activity.id}`)}>
                            <ListItemText
                              primary={activity.name}
                              secondary={`${activity.plannedDate} - ${activity.location} (${activity.status})`}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* תורנויות */}
              {team.duties.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ScheduleIcon sx={{ mr: 1, color: 'info.main' }} />
                      <Typography variant="h6">תורנויות</Typography>
                      <Chip 
                        label={team.duties.length} 
                        size="small" 
                        color="info" 
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {team.duties.map((duty) => (
                        <ListItem key={duty.id} disablePadding>
                          <ListItemButton onClick={() => navigate(`/duties/${duty.id}`)}>
                            <ListItemText
                              primary={duty.type}
                              secondary={`${duty.startDate} ${duty.startTime} - ${duty.location} (${duty.status})`}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* סגל הצוות */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <StarIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">סגל הצוות</Typography>
                    <Chip 
                      label={team.commanders.length} 
                      size="small" 
                      color="primary" 
                      sx={{ ml: 1 }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {team.commanders.map((soldier) => (
                      <ListItem key={soldier.id} disablePadding>
                        <ListItemButton onClick={() => handleSoldierClick(soldier)}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: getProfileColor(soldier.profile) }}>
                              {soldier.name.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={soldier.name}
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

              {/* לוחמי הצוות */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1, color: 'secondary.main' }} />
                    <Typography variant="h6">לוחמים</Typography>
                    <Chip 
                      label={team.fighters.length} 
                      size="small" 
                      color="secondary" 
                      sx={{ ml: 1 }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {team.fighters.map((soldier) => (
                      <ListItem key={soldier.id} disablePadding>
                        <ListItemButton onClick={() => handleSoldierClick(soldier)}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: getProfileColor(soldier.profile) }}>
                              {soldier.name.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={soldier.name}
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                  label={soldier.role} 
                                  size="small" 
                                  color="secondary" 
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

              {/* כשירויות הצוות */}
              {team.soldiers.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    כשירויות נבחרות:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {Array.from(new Set(
                      team.soldiers.flatMap(s => s.qualifications || [])
                    )).slice(0, 5).map((qual) => (
                      <Chip key={qual} label={qual} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {teams.length === 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          לא נמצאו צוותים. ייתכן שצריך להכניס נתונים ראשוניים.
        </Alert>
      )}
    </Container>
  );
};

export default Teams; 