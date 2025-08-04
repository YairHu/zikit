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
  Badge
} from '@mui/material';
import {
  Group as GroupIcon,
  Person as PersonIcon,
  Star as StarIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { Soldier } from '../models/Soldier';
import { Activity } from '../models/Activity';
import { Duty } from '../models/Duty';
import { Referral } from '../models/Referral';
import { getAllSoldiers } from '../services/soldierService';
import { getActivitiesByTeam } from '../services/activityService';
import { getDutiesByTeam } from '../services/dutyService';
import { getReferralsByTeam } from '../services/referralService';
import { getPresenceColor, getProfileColor } from '../utils/colors';

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
  referrals: Referral[];
}

const TeamDetails: React.FC = () => {
  const { teamId, id } = useParams<{ teamId?: string; id?: string }>();
  const frameworkId = teamId || id; // תמיכה בשני הפרמטרים
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // טעינת כל החיילים, הפעילויות, התורנויות וההפניות
      const [allSoldiers, activities, duties, referrals] = await Promise.all([
        getAllSoldiers(),
        getActivitiesByTeam(`צוות ${frameworkId}`),
        getDutiesByTeam(`צוות ${frameworkId}`),
        getReferralsByTeam(`צוות ${frameworkId}`)
      ]);
      setSoldiers(allSoldiers);
      
      // יצירת צוות לפי frameworkId
      const teamSoldiers = allSoldiers.filter(s => s.frameworkId === frameworkId);
      
      // סינון פעילויות שמכילות חיילים מהצוות (גם אם הצוות לא מוגדר בפעילות)
      const teamActivities = activities.filter(activity => {
        // אם הפעילות מוגדרת לצוות זה
        if (activity.team === `צוות ${frameworkId}`) return true;
        
        // אם יש חיילים מהצוות שמשתתפים בפעילות
        const hasTeamParticipants = activity.participants.some(p => 
          teamSoldiers.some(s => s.id === p.soldierId)
        );
        const hasTeamCommander = teamSoldiers.some(s => s.id === activity.commanderId);
        const hasTeamTaskLeader = teamSoldiers.some(s => s.id === activity.taskLeaderId);
        const hasTeamDriver = false; // נהגים לא נשמרים יותר ישירות בפעילות
        
        return hasTeamParticipants || hasTeamCommander || hasTeamTaskLeader || hasTeamDriver;
      });
      
      // סינון תורנויות שמכילות חיילים מהצוות (גם אם הצוות לא מוגדר בתורנות)
      const teamDuties = duties.filter(duty => {
        // אם התורנות מוגדרת לצוות זה
        if (duty.team === `צוות ${frameworkId}`) return true;
        
        // אם יש חיילים מהצוות שמשתתפים בתורנות
        const hasTeamParticipants = duty.participants.some(p => 
          teamSoldiers.some(s => s.id === p.soldierId)
        );
        
        return hasTeamParticipants;
      });

      const teamData: Team = {
        id: frameworkId!,
        name: `צוות ${frameworkId}`,
        plagaId: frameworkId === '10' || frameworkId === '20' || frameworkId === '30' ? 'A' : 'B',
        plagaName: frameworkId === '10' || frameworkId === '20' || frameworkId === '30' ? 'פלגה א' : 'פלגה ב',
        soldiers: teamSoldiers,
        totalSoldiers: teamSoldiers.length,
        commanders: teamSoldiers.filter(s => 
          s.role === 'מפקד צוות' || s.role === 'סמל' || s.role === 'מפקד'
        ),
        fighters: teamSoldiers.filter(s => s.role === 'חייל'),
        activities: teamActivities,
        duties: teamDuties,
        referrals: referrals
      };
      
      setTeam(teamData);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
    } finally {
      setLoading(false);
    }
      }, [frameworkId]);

  useEffect(() => {
    loadData();
  }, [loadData]);



  const handleSoldierClick = (soldier: Soldier) => {
    navigate(`/soldiers/${soldier.id}`);
  };





  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>טוען פרטי צוות...</Typography>
      </Container>
    );
  }

  if (!team) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">לא נמצא צוות</Alert>
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
          <Typography variant="h4" component="h1" gutterBottom>
            {team.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {team.plagaName} • {team.totalSoldiers} חיילים
          </Typography>
        </Box>
        <Badge badgeContent={team.totalSoldiers} color="primary">
          <GroupIcon />
        </Badge>
      </Box>

      {/* View Mode Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={viewMode} 
          onChange={(e, newValue) => setViewMode(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab label="תצוגת כרטיסים" value="cards" />
          <Tab label="תצוגה טבלאית" value="table" />
        </Tabs>
      </Box>

      {/* סגל הצוות */}
      {team.commanders.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <StarIcon sx={{ mr: 1, color: 'primary.main' }} />
            סגל הצוות ({team.commanders.length})
          </Typography>
          
          {viewMode === 'table' ? (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>שם</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>מספר אישי</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>תפקיד</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>פרופיל</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>נוכחות</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>כשירויות</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>רישיונות</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>היתרים</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {team.commanders.map((soldier) => (
                    <TableRow key={soldier.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: getProfileColor(soldier.profile) }}>
                            {soldier.name.charAt(0)}
                          </Avatar>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 500,
                              cursor: 'pointer',
                              '&:hover': { 
                                color: 'primary.main',
                                textDecoration: 'underline'
                              }
                            }}
                            onClick={() => handleSoldierClick(soldier)}
                          >
                            {soldier.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{soldier.personalNumber}</TableCell>
                      <TableCell>
                        <Chip label={soldier.role} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={soldier.profile} 
                          size="small" 
                          sx={{ bgcolor: getProfileColor(soldier.profile), color: 'white' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={soldier.presence === 'אחר' && soldier.presenceOther ? `${soldier.presence} - ${soldier.presenceOther}` : soldier.presence || 'לא מוגדר'} 
                          size="small" 
                          sx={{ 
                            bgcolor: getPresenceColor(soldier.presence),
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {soldier.qualifications?.slice(0, 2).map((qual, index) => (
                            <Chip key={index} label={qual} size="small" variant="outlined" />
                          ))}
                          {soldier.qualifications && soldier.qualifications.length > 2 && (
                            <Chip label={`+${soldier.qualifications.length - 2}`} size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {soldier.licenses?.map((license, index) => (
                            <Chip key={index} label={license} size="small" color="success" variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {soldier.qualifications?.includes('נהג') ? (
                            soldier.drivingLicenses && soldier.drivingLicenses.length > 0 ? (
                              soldier.drivingLicenses.map((license, index) => (
                                <Chip key={index} label={license} size="small" color="warning" variant="filled" />
                              ))
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                אין היתרים
                              </Typography>
                            )
                          ) : (
                            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                              לא נהג
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              {team.commanders.map((soldier) => (
                <Box key={soldier.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      transition: 'all 0.3s ease',
                      border: `2px solid ${getPresenceColor(soldier.presence)}`,
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography 
                            variant="h6" 
                            component={Box}
                            onClick={() => handleSoldierClick(soldier)}
                            sx={{ 
                              textDecoration: 'none', 
                              color: 'primary.main',
                              fontWeight: 600,
                              cursor: 'pointer',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                          >
                            {soldier.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                            מס' אישי: {soldier.personalNumber}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <Chip 
                              label={soldier.role} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => navigate(`/soldiers?edit=${soldier.id}`)}
                          sx={{ ml: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                          פרופיל רפואי:
                        </Typography>
                        <Chip 
                          label={soldier.profile}
                          sx={{ 
                            bgcolor: getProfileColor(soldier.profile),
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                          נוכחות:
                        </Typography>
                        <Chip 
                          label={soldier.presence === 'אחר' && soldier.presenceOther ? `${soldier.presence} - ${soldier.presenceOther}` : soldier.presence || 'לא מוגדר'}
                          sx={{ 
                            bgcolor: getPresenceColor(soldier.presence),
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </Box>

                      {soldier.qualifications && soldier.qualifications.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            כשירויות:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {soldier.qualifications.map((qual, index) => (
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

                      {soldier.licenses && soldier.licenses.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            רישיונות נהיגה:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {soldier.licenses.map((license, index) => (
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

                      {soldier.certifications && soldier.certifications.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            הסמכות:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {soldier.certifications.map((cert, index) => (
                              <Chip 
                                key={index}
                                label={cert} 
                                size="small" 
                                color="warning"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* היתרים לנהיגה */}
                      {soldier.qualifications?.includes('נהג') && (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            היתרים לנהיגה:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {soldier.drivingLicenses && soldier.drivingLicenses.length > 0 ? (
                              soldier.drivingLicenses.map((license, index) => (
                                <Chip 
                                  key={index}
                                  label={license} 
                                  size="small" 
                                  color="success"
                                  variant="filled"
                                />
                              ))
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                אין היתרים מוגדרים
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* לוחמי הצוות */}
      {team.fighters.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ mr: 1, color: 'secondary.main' }} />
            לוחמים ({team.fighters.length})
          </Typography>
          
          {viewMode === 'table' ? (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>שם</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>מספר אישי</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>תפקיד</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>פרופיל</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>נוכחות</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>כשירויות</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>רישיונות</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>היתרים</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {team.fighters.map((soldier) => (
                    <TableRow key={soldier.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: getProfileColor(soldier.profile) }}>
                            {soldier.name.charAt(0)}
                          </Avatar>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 500,
                              cursor: 'pointer',
                              '&:hover': { 
                                color: 'primary.main',
                                textDecoration: 'underline'
                              }
                            }}
                            onClick={() => handleSoldierClick(soldier)}
                          >
                            {soldier.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{soldier.personalNumber}</TableCell>
                      <TableCell>
                        <Chip label={soldier.role} size="small" color="secondary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={soldier.profile} 
                          size="small" 
                          sx={{ bgcolor: getProfileColor(soldier.profile), color: 'white' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={soldier.presence === 'אחר' && soldier.presenceOther ? `${soldier.presence} - ${soldier.presenceOther}` : soldier.presence || 'לא מוגדר'} 
                          size="small" 
                          sx={{ 
                            bgcolor: getPresenceColor(soldier.presence),
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {soldier.qualifications?.slice(0, 2).map((qual, index) => (
                            <Chip key={index} label={qual} size="small" variant="outlined" />
                          ))}
                          {soldier.qualifications && soldier.qualifications.length > 2 && (
                            <Chip label={`+${soldier.qualifications.length - 2}`} size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {soldier.licenses?.map((license, index) => (
                            <Chip key={index} label={license} size="small" color="success" variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {soldier.qualifications?.includes('נהג') ? (
                            soldier.drivingLicenses && soldier.drivingLicenses.length > 0 ? (
                              soldier.drivingLicenses.map((license, index) => (
                                <Chip key={index} label={license} size="small" color="warning" variant="filled" />
                              ))
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                אין היתרים
                              </Typography>
                            )
                          ) : (
                            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                              לא נהג
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              {team.fighters.map((soldier) => (
                <Box key={soldier.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      transition: 'all 0.3s ease',
                      border: `2px solid ${getPresenceColor(soldier.presence)}`,
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography 
                            variant="h6" 
                            component={Box}
                            onClick={() => handleSoldierClick(soldier)}
                            sx={{ 
                              textDecoration: 'none', 
                              color: 'primary.main',
                              fontWeight: 600,
                              cursor: 'pointer',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                          >
                            {soldier.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                            מס' אישי: {soldier.personalNumber}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <Chip 
                              label={soldier.role} 
                              size="small" 
                              color="secondary" 
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => navigate(`/soldiers?edit=${soldier.id}`)}
                          sx={{ ml: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                          פרופיל רפואי:
                        </Typography>
                        <Chip 
                          label={soldier.profile}
                          sx={{ 
                            bgcolor: getProfileColor(soldier.profile),
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                          נוכחות:
                        </Typography>
                        <Chip 
                          label={soldier.presence === 'אחר' && soldier.presenceOther ? `${soldier.presence} - ${soldier.presenceOther}` : soldier.presence || 'לא מוגדר'}
                          sx={{ 
                            bgcolor: getPresenceColor(soldier.presence),
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </Box>

                      {soldier.qualifications && soldier.qualifications.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            כשירויות:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {soldier.qualifications.map((qual, index) => (
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

                      {soldier.licenses && soldier.licenses.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            רישיונות נהיגה:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {soldier.licenses.map((license, index) => (
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

                      {soldier.certifications && soldier.certifications.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            הסמכות:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {soldier.certifications.map((cert, index) => (
                              <Chip 
                                key={index}
                                label={cert} 
                                size="small" 
                                color="warning"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* היתרים לנהיגה */}
                      {soldier.qualifications?.includes('נהג') && (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            היתרים לנהיגה:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {soldier.drivingLicenses && soldier.drivingLicenses.length > 0 ? (
                              soldier.drivingLicenses.map((license, index) => (
                                <Chip 
                                  key={index}
                                  label={license} 
                                  size="small" 
                                  color="success"
                                  variant="filled"
                                />
                              ))
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                אין היתרים מוגדרים
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {team.soldiers.length === 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          לא נמצאו חיילים בצוות זה.
        </Alert>
      )}

      {/* פעילויות מבצעיות */}
      {team.activities.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            פעילויות מבצעיות ({team.activities.length})
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {team.activities.map((activity) => (
              <Card key={activity.id} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/activities/${activity.id}`)}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {activity.name}
                    </Typography>
                    <Chip 
                      label={activity.status} 
                      color={activity.status === 'מתוכננת' ? 'primary' : activity.status === 'בביצוע' ? 'warning' : 'success'}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {activity.plannedDate} - {activity.location}
                  </Typography>

                  {/* משתתפים מהצוות */}
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      משתתפים מהצוות:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {team.soldiers
                        .filter(soldier => 
                          activity.commanderId === soldier.id ||
                          activity.taskLeaderId === soldier.id ||
                          // נהגים לא נשמרים יותר ישירות בפעילות
                          activity.participants.some(p => p.soldierId === soldier.id)
                        )
                        .map((soldier) => (
                          <Chip
                            key={soldier.id}
                            label={soldier.name}
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/soldiers/${soldier.id}`);
                            }}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* תורנויות */}
      {team.duties.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            תורנויות ({team.duties.length})
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {team.duties.map((duty) => (
              <Card key={duty.id} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/duties/${duty.id}`)}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {duty.type}
                    </Typography>
                    <Chip 
                      label={duty.status} 
                      color={duty.status === 'פעילה' ? 'primary' : duty.status === 'הסתיימה' ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {duty.startDate} {duty.startTime} - {duty.location}
                  </Typography>

                  {/* משתתפים מהצוות */}
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      משתתפים מהצוות:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {duty.participants
                        .filter(participant => 
                          team.soldiers.some(s => s.id === participant.soldierId)
                        )
                        .map((participant) => (
                          <Chip
                            key={participant.soldierId}
                            label={participant.soldierName}
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/soldiers/${participant.soldierId}`);
                            }}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* הפניות */}
      {team.referrals.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            הפניות ({team.referrals.length})
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {team.referrals.map((referral) => (
              <Card key={referral.id}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {referral.reason}
                    </Typography>
                    <Chip 
                      label={referral.status === 'pending' ? 'ממתין' : 
                             referral.status === 'in_progress' ? 'בביצוע' : 
                             referral.status === 'completed' ? 'הושלם' : 'בוטל'} 
                      color={referral.status === 'pending' ? 'warning' : 
                             referral.status === 'in_progress' ? 'info' : 
                             referral.status === 'completed' ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {referral.date} - {referral.location}
                  </Typography>

                  {/* חייל מהצוות */}
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      חייל מהצוות:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {team.soldiers
                        .filter(soldier => soldier.id === referral.soldierId)
                        .map((soldier) => (
                          <Chip
                            key={soldier.id}
                            label={soldier.name}
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/soldiers/${soldier.id}`);
                            }}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default TeamDetails; 