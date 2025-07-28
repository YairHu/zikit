import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Avatar,
  Chip,
  Alert,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Fab,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  LinearProgress,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import {
  Assignment as MissionIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  DirectionsCar as VehicleIcon,
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as PendingIcon,
  PlayArrow as ActiveIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { UserRole, isHigherRole } from '../models/UserRole';
import { collection, query, getDocs, doc, updateDoc, addDoc, deleteDoc, Timestamp, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface Mission {
  id: string;
  name: string;
  description: string;
  type: 'training' | 'operation' | 'guard' | 'maintenance' | 'administrative' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planning' | 'approved' | 'active' | 'completed' | 'cancelled';
  
  // Timing
  plannedStart: Date;
  plannedEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  
  // Personnel
  commanderId: string;
  commanderName: string;
  participants: MissionParticipant[];
  requiredPersonnel: number;
  
  // Resources
  vehiclesAssigned: string[];
  equipmentNeeded: string[];
  location: string;
  
  // Permissions & Visibility
  visibleToTeams: string[]; // Which teams can see this mission
  visibleToRoles: UserRole[]; // Which roles can see this mission
  createdBy: string;
  
  // Progress tracking
  milestones: Milestone[];
  currentPhase: string;
  progressPercentage: number;
  
  // Documentation
  briefingNotes?: string;
  afterActionReport?: string;
  lessonsLearned?: string;
  attachments?: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

interface MissionParticipant {
  userId: string;
  userName: string;
  role: string;
  team?: string;
  specialization?: string;
  status: 'assigned' | 'confirmed' | 'absent' | 'replaced';
  attendance?: {
    checkedIn?: Date;
    checkedOut?: Date;
    notes?: string;
  };
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  plannedDate: Date;
  actualDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  responsiblePerson: string;
  notes?: string;
}

const Missions: React.FC = () => {
  const { user } = useUser();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [missionDialogOpen, setMissionDialogOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Form state
  const [missionForm, setMissionForm] = useState({
    name: '',
    description: '',
    type: 'training' as Mission['type'],
    priority: 'medium' as Mission['priority'],
    plannedStart: new Date(),
    plannedEnd: new Date(),
    location: '',
    requiredPersonnel: 5,
    equipmentNeeded: '',
    briefingNotes: '',
    visibleToTeams: [] as string[],
    participants: [] as string[]
  });

  const missionTypes = [
    { value: 'training', label: 'אימון', color: 'primary' },
    { value: 'operation', label: 'מבצע', color: 'error' },
    { value: 'guard', label: 'שמירה', color: 'warning' },
    { value: 'maintenance', label: 'תחזוקה', color: 'info' },
    { value: 'administrative', label: 'מנהלי', color: 'default' },
    { value: 'other', label: 'אחר', color: 'secondary' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'נמוכה', color: 'success' },
    { value: 'medium', label: 'בינונית', color: 'warning' },
    { value: 'high', label: 'גבוהה', color: 'error' },
    { value: 'critical', label: 'קריטית', color: 'error' }
  ];

  const statusOptions = [
    { value: 'planning', label: 'בתכנון', icon: <PendingIcon /> },
    { value: 'approved', label: 'מאושרת', icon: <CompletedIcon /> },
    { value: 'active', label: 'פעילה', icon: <ActiveIcon /> },
    { value: 'completed', label: 'הושלמה', icon: <CompletedIcon /> },
    { value: 'cancelled', label: 'בוטלה', icon: <DeleteIcon /> }
  ];

  const loadMissions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const missionsQuery = query(collection(db, 'missions'), orderBy('plannedStart', 'desc'));
      const missionsSnapshot = await getDocs(missionsQuery);
      const missionsData: Mission[] = [];
      
      missionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const mission = {
          id: doc.id,
          ...data,
          plannedStart: data.plannedStart?.toDate(),
          plannedEnd: data.plannedEnd?.toDate(),
          actualStart: data.actualStart?.toDate(),
          actualEnd: data.actualEnd?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          milestones: data.milestones?.map((m: any) => ({
            ...m,
            plannedDate: m.plannedDate?.toDate(),
            actualDate: m.actualDate?.toDate()
          })) || []
        } as Mission;
        
        // Check if user can see this mission
        if (canUserSeeMission(user, mission)) {
          missionsData.push(mission);
        }
      });
      
      setMissions(missionsData);
    } catch (error) {
      console.error('שגיאה בטעינת משימות:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const canUserSeeMission = (currentUser: any, mission: Mission): boolean => {
    // אדמין ומ"פ רואים הכל
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MEFAKED_PLUGA) {
      return true;
    }

    // סמ"פ רואה הכל
    if (currentUser.role === UserRole.SAMAL_PLUGA) {
      return true;
    }

    // חמ"ל רואה הכל לצורכי תצוגה
    if (currentUser.role === UserRole.HAMAL) {
      return true;
    }

    // בדיקה אם המשתמש משתתף במשימה
    if (mission.participants.some(p => p.userId === currentUser.uid)) {
      return true;
    }

    // בדיקה אם המשימה נראית לתפקיד שלו
    if (mission.visibleToRoles.includes(currentUser.role)) {
      return true;
    }

    // בדיקה אם המשימה נראית לצוות שלו
    if (currentUser.team && mission.visibleToTeams.includes(currentUser.team)) {
      return true;
    }

    // מפקד יכול לראות משימות של הכפופים שלו
    if (isHigherRole(currentUser.role, UserRole.CHAYAL)) {
      const subordinateParticipants = mission.participants.filter(p => 
        // לוגיקה לבדוק אם המשתתף כפוף למשתמש הנוכחי
        currentUser.team === mission.visibleToTeams.find(team => team === currentUser.team)
      );
      return subordinateParticipants.length > 0;
    }

    return false;
  };

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  const handleCreateMission = async () => {
    if (!user) return;

    try {
      const newMission: Partial<Mission> = {
        name: missionForm.name,
        description: missionForm.description,
        type: missionForm.type,
        priority: missionForm.priority,
        status: 'planning',
        plannedStart: missionForm.plannedStart,
        plannedEnd: missionForm.plannedEnd,
        location: missionForm.location,
        requiredPersonnel: missionForm.requiredPersonnel,
        equipmentNeeded: missionForm.equipmentNeeded ? missionForm.equipmentNeeded.split(',').map(e => e.trim()) : [],
        briefingNotes: missionForm.briefingNotes,
        visibleToTeams: missionForm.visibleToTeams,
        visibleToRoles: [UserRole.ADMIN, UserRole.MEFAKED_PLUGA, UserRole.SAMAL_PLUGA],
        commanderId: user.uid,
        commanderName: user.displayName,
        participants: [],
        vehiclesAssigned: [],
        milestones: [],
        currentPhase: 'planning',
        progressPercentage: 0,
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'missions'), {
        ...newMission,
        plannedStart: Timestamp.fromDate(missionForm.plannedStart),
        plannedEnd: Timestamp.fromDate(missionForm.plannedEnd),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      setMissionDialogOpen(false);
      resetMissionForm();
      loadMissions();
      alert('משימה נוצרה בהצלחה!');
    } catch (error) {
      alert('שגיאה ביצירת משימה: ' + error);
    }
  };

  const handleUpdateMissionStatus = async (missionId: string, newStatus: Mission['status']) => {
    try {
      const updates: any = {
        status: newStatus,
        updatedAt: Timestamp.now()
      };

      if (newStatus === 'active' && !missions.find(m => m.id === missionId)?.actualStart) {
        updates.actualStart = Timestamp.now();
      }

      if (newStatus === 'completed' && !missions.find(m => m.id === missionId)?.actualEnd) {
        updates.actualEnd = Timestamp.now();
        updates.progressPercentage = 100;
      }

      await updateDoc(doc(db, 'missions', missionId), updates);
      loadMissions();
    } catch (error) {
      alert('שגיאה בעדכון סטטוס: ' + error);
    }
  };

  const resetMissionForm = () => {
    setMissionForm({
      name: '',
      description: '',
      type: 'training',
      priority: 'medium',
      plannedStart: new Date(),
      plannedEnd: new Date(),
      location: '',
      requiredPersonnel: 5,
      equipmentNeeded: '',
      briefingNotes: '',
      visibleToTeams: [],
      participants: []
    });
    setSelectedMission(null);
  };

  const getTypeColor = (type: string) => {
    return missionTypes.find(t => t.value === type)?.color || 'default';
  };

  const getTypeText = (type: string) => {
    return missionTypes.find(t => t.value === type)?.label || type;
  };

  const getPriorityColor = (priority: string) => {
    return priorityLevels.find(p => p.value === priority)?.color || 'default';
  };

  const getPriorityText = (priority: string) => {
    return priorityLevels.find(p => p.value === priority)?.label || priority;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'default';
      case 'approved': return 'info';
      case 'active': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    return statusOptions.find(s => s.value === status)?.label || status;
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('he-IL') + ' ' + date.toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (start: Date, end: Date) => {
    const hours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} ימים, ${hours % 24} שעות`;
    }
    return `${hours} שעות`;
  };

  const canUserEditMission = (mission: Mission): boolean => {
    if (!user) return false;
    
    // אדמין ומ"פ יכולים לערוך הכל
    if (user.role === UserRole.ADMIN || user.role === UserRole.MEFAKED_PLUGA) {
      return true;
    }
    
    // מפקד המשימה יכול לערוך
    if (mission.commanderId === user.uid) {
      return true;
    }
    
    return false;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, textAlign: 'center' }}>
        <Typography>טוען...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
          <MissionIcon />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            משימות פלוגתיות
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {missions.filter(m => m.status === 'active').length} פעילות, {' '}
            {missions.filter(m => m.status === 'planning').length} בתכנון, {' '}
            {missions.filter(m => m.status === 'completed').length} הושלמו
          </Typography>
        </Box>
        {(user?.canAssignRoles || isHigherRole(user?.role || UserRole.CHAYAL, UserRole.MEFAKED_TZEVET)) && (
          <Fab
            color="primary"
            aria-label="add"
            onClick={() => setMissionDialogOpen(true)}
            sx={{ ml: 2 }}
          >
            <AddIcon />
          </Fab>
        )}
      </Box>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`כל המשימות (${missions.length})`} />
        <Tab label={`פעילות (${missions.filter(m => m.status === 'active').length})`} />
        <Tab label={`בתכנון (${missions.filter(m => m.status === 'planning').length})`} />
        <Tab label={`הושלמו (${missions.filter(m => m.status === 'completed').length})`} />
      </Tabs>

      {/* My Missions Alert */}
      {user && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>המשימות שלי:</strong> {' '}
            {missions.filter(m => m.participants.some(p => p.userId === user.uid)).length} משימות
          </Typography>
        </Alert>
      )}

      {/* Missions List */}
      <Box sx={{ mb: 4 }}>
        {missions
          .filter(mission => {
            switch (tabValue) {
              case 1: return mission.status === 'active';
              case 2: return mission.status === 'planning';
              case 3: return mission.status === 'completed';
              default: return true;
            }
          })
          .map((mission) => (
            <Card key={mission.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {mission.name}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Chip
                        label={getStatusText(mission.status)}
                        color={getStatusColor(mission.status) as any}
                        size="small"
                      />
                      <Chip
                        label={getTypeText(mission.type)}
                        color={getTypeColor(mission.type) as any}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        label={getPriorityText(mission.priority)}
                        color={getPriorityColor(mission.priority) as any}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        label={`${mission.participants.length}/${mission.requiredPersonnel} משתתפים`}
                        variant="outlined"
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      <strong>מפקד:</strong> {mission.commanderName}
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      <strong>מתוכנן:</strong> {formatDateTime(mission.plannedStart)} - {formatDateTime(mission.plannedEnd)}
                      {' '} ({formatDuration(mission.plannedStart, mission.plannedEnd)})
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      <strong>מיקום:</strong> {mission.location}
                    </Typography>

                    {mission.description && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {mission.description.length > 100 
                          ? mission.description.substring(0, 100) + '...'
                          : mission.description
                        }
                      </Typography>
                    )}

                    {/* Progress bar for active missions */}
                    {mission.status === 'active' && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          התקדמות: {mission.progressPercentage}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={mission.progressPercentage} 
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    )}
                  </Box>

                  {/* Action buttons */}
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                    <Tooltip title="צפה בפרטים">
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedMission(mission);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>

                    {canUserEditMission(mission) && (
                      <>
                        <Tooltip title="ערוך משימה">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSelectedMission(mission);
                              setMissionForm({
                                name: mission.name,
                                description: mission.description,
                                type: mission.type,
                                priority: mission.priority,
                                plannedStart: mission.plannedStart,
                                plannedEnd: mission.plannedEnd,
                                location: mission.location,
                                requiredPersonnel: mission.requiredPersonnel,
                                equipmentNeeded: mission.equipmentNeeded.join(', '),
                                briefingNotes: mission.briefingNotes || '',
                                visibleToTeams: mission.visibleToTeams,
                                participants: mission.participants.map(p => p.userId)
                              });
                              setMissionDialogOpen(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>

                        {mission.status === 'planning' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => handleUpdateMissionStatus(mission.id, 'active')}
                          >
                            התחל
                          </Button>
                        )}

                        {mission.status === 'active' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleUpdateMissionStatus(mission.id, 'completed')}
                          >
                            סיים
                          </Button>
                        )}
                      </>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}

        {missions.length === 0 && (
          <Alert severity="info">
            אין משימות במערכת. {(user?.canAssignRoles || isHigherRole(user?.role || UserRole.CHAYAL, UserRole.MEFAKED_TZEVET)) && 'לחץ על הכפתור + ליצירת משימה חדשה.'}
          </Alert>
        )}
      </Box>

      {/* Create/Edit Mission Dialog */}
      <Dialog open={missionDialogOpen} onClose={() => {
        setMissionDialogOpen(false);
        resetMissionForm();
      }} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedMission ? 'עריכת משימה' : 'משימה חדשה'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
            gap: 2, 
            mt: 1 
          }}>
            <TextField
              fullWidth
              label="שם המשימה"
              value={missionForm.name}
              onChange={(e) => setMissionForm({ ...missionForm, name: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
            />

            <TextField
              fullWidth
              label="תיאור"
              multiline
              rows={3}
              value={missionForm.description}
              onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
            />

            <FormControl fullWidth>
              <InputLabel>סוג משימה</InputLabel>
              <Select
                value={missionForm.type}
                onChange={(e) => setMissionForm({ ...missionForm, type: e.target.value as Mission['type'] })}
                label="סוג משימה"
              >
                {missionTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>עדיפות</InputLabel>
              <Select
                value={missionForm.priority}
                onChange={(e) => setMissionForm({ ...missionForm, priority: e.target.value as Mission['priority'] })}
                label="עדיפות"
              >
                {priorityLevels.map((level) => (
                  <MenuItem key={level.value} value={level.value}>
                    {level.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="מיקום"
              value={missionForm.location}
              onChange={(e) => setMissionForm({ ...missionForm, location: e.target.value })}
            />

            <TextField
              fullWidth
              label="כוח אדם נדרש"
              type="number"
              value={missionForm.requiredPersonnel}
              onChange={(e) => setMissionForm({ ...missionForm, requiredPersonnel: Number(e.target.value) })}
            />

            <TextField
              fullWidth
              label="ציוד נדרש (מופרד בפסיקים)"
              value={missionForm.equipmentNeeded}
              onChange={(e) => setMissionForm({ ...missionForm, equipmentNeeded: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
            />

            <TextField
              fullWidth
              label="הערות תדרוך"
              multiline
              rows={3}
              value={missionForm.briefingNotes}
              onChange={(e) => setMissionForm({ ...missionForm, briefingNotes: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setMissionDialogOpen(false);
            resetMissionForm();
          }}>
            ביטול
          </Button>
          <Button onClick={handleCreateMission} variant="contained">
            {selectedMission ? 'עדכן' : 'צור משימה'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mission Details Dialog */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          פרטי משימה: {selectedMission?.name}
        </DialogTitle>
        <DialogContent>
          {selectedMission && (
            <Box sx={{ mt: 1 }}>
              {/* Mission Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>מידע כללי</Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
                  gap: 2 
                }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">תיאור:</Typography>
                    <Typography>{selectedMission.description}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">מיקום:</Typography>
                    <Typography>{selectedMission.location}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">מפקד:</Typography>
                    <Typography>{selectedMission.commanderName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">סטטוס:</Typography>
                    <Chip
                      label={getStatusText(selectedMission.status)}
                      color={getStatusColor(selectedMission.status) as any}
                      size="small"
                    />
                  </Box>
                </Box>
              </Box>

              {/* Participants */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    משתתפים ({selectedMission.participants.length}/{selectedMission.requiredPersonnel})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {selectedMission.participants.map((participant) => (
                      <ListItem key={participant.userId}>
                        <ListItemAvatar>
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={participant.userName}
                          secondary={`${participant.role} ${participant.team ? `- צוות ${participant.team}` : ''}`}
                        />
                        <Chip
                          label={participant.status}
                          size="small"
                          color={participant.status === 'confirmed' ? 'success' : 'default'}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>

              {/* Equipment */}
              {selectedMission.equipmentNeeded.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">ציוד נדרש</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {selectedMission.equipmentNeeded.map((equipment, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={equipment} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Briefing Notes */}
              {selectedMission.briefingNotes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>הערות תדרוך</Typography>
                  <Typography>{selectedMission.briefingNotes}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>סגור</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Missions; 