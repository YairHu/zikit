import React, { useEffect, useState } from 'react';
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
  CircularProgress,
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
import {
  Group as GroupIcon,
  Person as PersonIcon,
  Star as StarIcon,
  ExpandMore as ExpandMoreIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  DirectionsCar as DirectionsCarIcon,
  Security as SecurityIcon,
  FamilyRestroom as FamilyIcon,
  Description as DescriptionIcon,
  LocalHospital as MedicalIcon,
  AttachFile as DocumentIcon,
  LocalHospital as ReferralIcon
} from '@mui/icons-material';
import { getSoldierById } from '../services/soldierService';
import { getFrameworkNameById } from '../services/frameworkService';
import { getActivitiesBySoldier } from '../services/activityService';
import { getDutiesBySoldier } from '../services/dutyService';
import { getReferralsBySoldier } from '../services/referralService';
import { getPresenceColor, getProfileColor, getRoleColor, getStatusColor } from '../utils/colors';
import { Soldier } from '../models/Soldier';
import { Activity } from '../models/Activity';
import { Duty } from '../models/Duty';
import { Referral } from '../models/Referral';
import { useUser } from '../contexts/UserContext';
import SoldierForm from '../components/SoldierForm';

const SoldierProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [soldier, setSoldier] = useState<Soldier | null>(null);
  const [frameworkName, setFrameworkName] = useState<string>('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    if (id) {
      Promise.all([
        getSoldierById(id),
        getActivitiesBySoldier(id),
        getDutiesBySoldier(id),
        getReferralsBySoldier(id)
      ]).then(async ([soldierData, activitiesData, dutiesData, referralsData]) => {
        setSoldier(soldierData);
        setActivities(activitiesData);
        setDuties(dutiesData);
        setReferrals(referralsData);
        
        // קבלת שם המסגרת
        if (soldierData?.frameworkId) {
          const name = await getFrameworkNameById(soldierData.frameworkId);
          setFrameworkName(name);
        }
      }).finally(() => setLoading(false));
    }
  }, [id]);



  const isDriver = soldier?.qualifications?.includes('נהג');
  const hasDrivingLicenses = soldier?.drivingLicenses && soldier.drivingLicenses.length > 0;



  const statusLabels = {
    pending: 'ממתין',
    in_progress: 'בביצוע',
    completed: 'הושלם',
    cancelled: 'בוטל'
  };

  const handleOpenEditForm = () => {
    setShowEditForm(true);
  };

  const handleCloseEditForm = () => {
    setShowEditForm(false);
  };

  const handleEditSuccess = async (updatedSoldier: Soldier) => {
    // רענון הנתונים
    if (id) {
      const refreshedSoldier = await getSoldierById(id);
      setSoldier(refreshedSoldier);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!soldier) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">לא נמצא חייל</Alert>
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
            פרופיל חייל
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {soldier.name} • {soldier.personalNumber}
          </Typography>
        </Box>
        {user && (user.role === 'mefaked_tzevet' || user.role === 'mefaked_pluga' || user.role === 'admin') && (
          <IconButton 
            color="primary"
            onClick={handleOpenEditForm}
            sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            <EditIcon />
          </IconButton>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Soldier Info Card */}
        <Box sx={{ flex: { md: '0 0 400px' } }}>
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar 
                  sx={{ 
                    bgcolor: 'primary.main', 
                    width: 80, 
                    height: 80, 
                    fontSize: '2rem',
                    mr: 2
                  }}
                >
                  {soldier.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {soldier.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {soldier.personalNumber}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Basic Info */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <GroupIcon sx={{ mr: 1, fontSize: 20 }} />
                  מידע בסיסי
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">צוות:</Typography>
                    <Typography variant="body2" fontWeight="bold">{frameworkName || soldier.frameworkId || 'לא שויך למסגרת'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">תפקיד:</Typography>
                    <Chip 
                      label={soldier.role} 
                      size="small" 
                      sx={{ 
                        bgcolor: getRoleColor(soldier.role),
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">פרופיל:</Typography>
                    <Chip 
                      label={soldier.profile} 
                      size="small" 
                      sx={{ 
                        bgcolor: getProfileColor(soldier.profile),
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">נוכחות:</Typography>
                    <Chip 
                      label={soldier.presence === 'אחר' && soldier.presenceOther ? `${soldier.presence} - ${soldier.presenceOther}` : soldier.presence || 'לא מוגדר'} 
                      size="small" 
                      sx={{ 
                        bgcolor: getPresenceColor(soldier.presence),
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              {/* Qualifications */}
              {soldier.qualifications && soldier.qualifications.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <StarIcon sx={{ mr: 1, fontSize: 20 }} />
                    כשירויות
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

              {/* Licenses */}
              {soldier.licenses && soldier.licenses.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <DirectionsCarIcon sx={{ mr: 1, fontSize: 20 }} />
                    רישיונות
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

              {/* Driving Licenses */}
              {isDriver && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <DirectionsCarIcon sx={{ mr: 1, fontSize: 20 }} />
                    היתרים לנהיגה
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {hasDrivingLicenses ? (
                      soldier.drivingLicenses?.map((license, index) => (
                        <Chip
                          key={index}
                          label={license}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        אין היתרים מוגדרים
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              {/* ציוני מבחן בראור */}
              {soldier.braurTest && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <SecurityIcon sx={{ mr: 1, fontSize: 20 }} />
                    ציוני מבחן בראור
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">כח:</Typography>
                      <Chip
                        label={soldier.braurTest.strength === 'passed' ? 'עבר' : 'לא עבר'}
                        size="small"
                        color={soldier.braurTest.strength === 'passed' ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">ריצה:</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {soldier.braurTest.running}
                        </Typography>
                        {(() => {
                          const [minutes, seconds] = soldier.braurTest.running.split(':').map(Number);
                          const totalSeconds = minutes * 60 + seconds;
                          const isFailed = totalSeconds > 14 * 60 + 30; // 14:30
                          return (
                            <Chip
                              label={isFailed ? 'נכשל' : 'עבר'}
                              size="small"
                              color={isFailed ? 'error' : 'success'}
                              variant="outlined"
                            />
                          );
                        })()}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* ימי חופש */}
              {soldier.vacationDays && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <FamilyIcon sx={{ mr: 1, fontSize: 20 }} />
                    ימי חופש
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">ימי חופש שנותרו:</Typography>
                      <Typography variant="body2" fontWeight="bold">{soldier.vacationDays.total}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">ימי חופש שנוצלו:</Typography>
                      <Typography variant="body2" fontWeight="bold">{soldier.vacationDays.used}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">מצב:</Typography>
                      <Chip
                        label={
                          soldier.vacationDays.status === 'good' ? 'טוב' :
                          soldier.vacationDays.status === 'warning' ? 'אזהרה' : 'קריטי'
                        }
                        size="small"
                        color={
                          soldier.vacationDays.status === 'good' ? 'success' :
                          soldier.vacationDays.status === 'warning' ? 'warning' : 'error'
                        }
                        variant="outlined"
                      />
                    </Box>
                    {soldier.vacationDays.status === 'critical' && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        החייל לא מנצל מספיק את ימי החופש שלו!
                      </Alert>
                    )}
                    {soldier.vacationDays.status === 'warning' && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        יש לשים לב לניצול ימי החופש
                      </Alert>
                    )}
                  </Box>
                </Box>
              )}

              {/* Certifications */}
              {soldier.certifications && soldier.certifications.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <DescriptionIcon sx={{ mr: 1, fontSize: 20 }} />
                    הסמכות
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
            </CardContent>
          </Card>
        </Box>

        {/* Additional Info & Activities */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Additional Info */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                  מידע נוסף
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {soldier.family && (
                    <Box sx={{ flex: '1 1 300px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FamilyIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">משפחה:</Typography>
                      </Box>
                      <Typography variant="body1">{soldier.family}</Typography>
                    </Box>
                  )}
                  {soldier.militaryBackground && (
                    <Box sx={{ flex: '1 1 300px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <SecurityIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">רקע צבאי:</Typography>
                      </Box>
                      <Typography variant="body1">{soldier.militaryBackground}</Typography>
                    </Box>
                  )}
                  {soldier.medicalProfile && (
                    <Box sx={{ flex: '1 1 300px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <MedicalIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">פרופיל רפואי:</Typography>
                      </Box>
                      <Typography variant="body1">{soldier.medicalProfile}</Typography>
                    </Box>
                  )}
                  {soldier.notes && (
                    <Box sx={{ flex: '1 1 100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <DescriptionIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">הערות:</Typography>
                      </Box>
                      <Typography variant="body1">{soldier.notes}</Typography>
                    </Box>
                  )}
                  {soldier.documents && soldier.documents.length > 0 && (
                    <Box sx={{ flex: '1 1 100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <DocumentIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">מסמכים:</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {soldier.documents.map((url, i) => (
                          <Button
                            key={i}
                            variant="outlined"
                            size="small"
                            startIcon={<DocumentIcon />}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            קובץ {i+1}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Activities */}
            {activities.length > 0 && (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                      <AssignmentIcon sx={{ mr: 1, fontSize: 20 }} />
                      פעילויות מבצעיות ({activities.length})
                    </Typography>
                    <Badge badgeContent={activities.length} color="primary">
                      <AssignmentIcon />
                    </Badge>
                  </Box>

                  {/* View Mode Tabs */}
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs value={viewMode === 'cards' ? 0 : 1} onChange={(_, newValue) => setViewMode(newValue === 0 ? 'cards' : 'table')}>
                      <Tab label="תצוגת כרטיסים" />
                      <Tab label="תצוגה טבלאית" />
                    </Tabs>
                  </Box>

                  {/* Cards View */}
                  {viewMode === 'cards' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {activities.map((activity) => (
                        <Card key={activity.id} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/activities/${activity.id}`)}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Typography variant="h6" fontWeight="bold">
                                {activity.name}
                              </Typography>
                              <Chip 
                                label={activity.status} 
                                color={getStatusColor(activity.status) as any}
                                size="small"
                              />
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">
                                <strong>תאריך:</strong> {activity.plannedDate} - {activity.plannedTime}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>מיקום:</strong> {activity.location}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>תפקיד:</strong> {
                                  activity.commanderId === soldier.id ? 'מפקד הפעילות' :
                                  activity.taskLeaderId === soldier.id ? 'מוביל משימה' :
                                  activity.participants.find(p => p.soldierId === soldier.id)?.role || 'משתתף'
                                }
                              </Typography>
                              {activity.mobility && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>ניוד:</strong> {activity.mobility}
                                </Typography>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}

                  {/* Table View */}
                  {viewMode === 'table' && (
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>שם פעילות</TableCell>
                            <TableCell>תאריך</TableCell>
                            <TableCell>מיקום</TableCell>
                            <TableCell>תפקיד</TableCell>
                            <TableCell>סטטוס</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {activities.map((activity) => (
                            <TableRow key={activity.id} hover onClick={() => navigate(`/activities/${activity.id}`)} sx={{ cursor: 'pointer' }}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  {activity.name}
                                </Typography>
                              </TableCell>
                              <TableCell>{activity.plannedDate} - {activity.plannedTime}</TableCell>
                              <TableCell>{activity.location}</TableCell>
                              <TableCell>
                                {
                                  activity.commanderId === soldier.id ? 'מפקד הפעילות' :
                                  activity.taskLeaderId === soldier.id ? 'מוביל משימה' :
                                  activity.participants.find(p => p.soldierId === soldier.id)?.role || 'משתתף'
                                }
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={activity.status} 
                                  color={getStatusColor(activity.status) as any}
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Duties */}
            {duties.length > 0 && (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                      <ScheduleIcon sx={{ mr: 1, fontSize: 20 }} />
                      תורנויות ({duties.length})
                    </Typography>
                    <Badge badgeContent={duties.length} color="secondary">
                      <ScheduleIcon />
                    </Badge>
                  </Box>

                  <List>
                    {duties.map((duty) => (
                      <ListItem 
                        key={duty.id} 
                        sx={{ 
                          border: '1px solid #e0e0e0', 
                          borderRadius: 1, 
                          mb: 1, 
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                        onClick={() => navigate(`/duties/${duty.id}`)}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="h6" fontWeight="bold">
                                {duty.type}
                              </Typography>
                              <Chip 
                                label={duty.status} 
                                color={getStatusColor(duty.status) as any}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                <strong>תאריך:</strong> {duty.startDate} - {duty.startTime}
                                {duty.endTime && ` עד ${duty.endTime}`}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>מיקום:</strong> {duty.location}
                              </Typography>
                              {duty.requiredEquipment && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>ציוד:</strong> {duty.requiredEquipment}
                                </Typography>
                              )}
                              {duty.notes && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>הערות:</strong> {duty.notes}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}

            {/* Referrals */}
            {referrals.length > 0 && (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                      <ReferralIcon sx={{ mr: 1, fontSize: 20 }} />
                      הפניות ({referrals.length})
                    </Typography>
                    <Badge badgeContent={referrals.length} color="warning">
                      <ReferralIcon />
                    </Badge>
                  </Box>

                  <List>
                    {referrals.map((referral) => (
                      <ListItem 
                        key={referral.id} 
                        sx={{ 
                          border: '1px solid #e0e0e0', 
                          borderRadius: 1, 
                          mb: 1
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="h6" fontWeight="bold">
                                {referral.reason}
                              </Typography>
                              <Chip 
                                label={statusLabels[referral.status]} 
                                color={getStatusColor(referral.status) as any}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                <strong>תאריך:</strong> {referral.date}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>מיקום:</strong> {referral.location}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>
      </Box>

      {/* טופס עריכת חייל */}
      <SoldierForm
        open={showEditForm}
        onClose={handleCloseEditForm}
        soldier={soldier}
        onSuccess={handleEditSuccess}
        mode="edit"
      />
    </Container>
  );
};

export default SoldierProfile; 