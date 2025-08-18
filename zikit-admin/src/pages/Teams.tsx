import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { UserRole, isAdmin } from '../models/UserRole';
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
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useUser();
  const [frameworks, setFrameworks] = useState<FrameworkWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [error, setError] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!user) return;
    
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
      let validFrameworks = frameworksWithDetails.filter(f => f !== null) as FrameworkWithDetails[];
      
      // סינון לפי הרשאות המשתמש
      if (user.role === UserRole.CHAYAL) {
        // חייל רואה רק את הצוות שלו
        if (teamId) {
          validFrameworks = validFrameworks.filter(f => f.id === teamId);
        } else {
          validFrameworks = validFrameworks.filter(f => f.id === user.team);
        }
      }
      // אם רואה כל הנתונים - לא מסנן
      
      setFrameworks(validFrameworks);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
      setError('שגיאה בטעינת נתוני המסגרות');
    } finally {
      setLoading(false);
    }
  }, [user, teamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSoldierClick = (soldierId: string) => {
    navigate(`/soldiers/${soldierId}`);
  };

  const handleFrameworkClick = (frameworkId: string) => {
    navigate(`/frameworks/${frameworkId}`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>טוען מסגרות...</Typography>
      </Container>
    );
  }

  // אם זה חייל ומועבר teamId - זה הצוות שלו
  const isPersonalTeam = user?.role === 'chayal' && teamId;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {isPersonalTeam ? 'הצוות שלי' : 'מסגרות'}
        </Typography>
        {user && isAdmin(user.role as UserRole) && (
          <Button
            variant="outlined"
            startIcon={<AccountTreeIcon />}
            onClick={() => navigate('/framework-management')}
          >
            ניהול מבנה פלוגה
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {frameworks.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {isPersonalTeam ? 'לא נמצאו נתונים לצוות שלך' : 'לא נמצאו מסגרות זמינות'}
        </Alert>
      ) : (
        <>
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
                          <GroupIcon sx={{ mr: 1 }} />
                          <Typography variant="subtitle1" fontWeight={600}>
                            חיילי המסגרת ({framework.soldiers.length})
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List dense>
                          {framework.soldiers.map((soldier) => (
                            <ListItem key={soldier.id} disablePadding>
                              <ListItemButton onClick={() => handleSoldierClick(soldier.id)}>
                                <ListItemAvatar>
                                  <Avatar 
                                    sx={{ 
                                      bgcolor: getProfileColor(soldier.role),
                                      width: 32,
                                      height: 32,
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    {soldier.name.charAt(0)}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={soldier.name}
                                  secondary={`${soldier.role} • ${soldier.personalNumber}`}
                                />
                                {soldier.role.includes('מפקד') && (
                                  <StarIcon sx={{ color: 'gold', fontSize: 20 }} />
                                )}
                              </ListItemButton>
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            ))}
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>שם המסגרת</TableCell>
                    <TableCell>רמה</TableCell>
                    <TableCell>מספר חיילים</TableCell>
                    <TableCell>מפקד</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {frameworks.map((framework) => (
                    <TableRow key={framework.id}>
                      <TableCell>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {framework.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{framework.level}</TableCell>
                      <TableCell>
                        <Badge badgeContent={framework.totalSoldiers} color="primary">
                          <GroupIcon />
                        </Badge>
                      </TableCell>
                      <TableCell>{framework.commander?.name || 'לא מוגדר'}</TableCell>
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
        </>
      )}
    </Container>
  );
};

export default Teams; 