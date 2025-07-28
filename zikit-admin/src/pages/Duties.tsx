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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Schedule as DutyIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  CalendarToday as CalendarIcon,
  Autorenew as AutorenewIcon,
  Download as ExportIcon,
  Shuffle as AutoAssignIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { UserRole, isHigherRole } from '../models/UserRole';
import { collection, query, getDocs, doc, updateDoc, addDoc, deleteDoc, Timestamp, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface Duty {
  id: string;
  type: 'guard' | 'kitchen' | 'cleaning' | 'maintenance' | 'office' | 'other';
  name: string;
  description?: string;
  date: Date;
  shift: 'morning' | 'afternoon' | 'night' | 'full_day';
  startTime: string;
  endTime: string;
  
  // Personnel
  requiredPersonnel: number;
  assignedPersonnel: DutyAssignment[];
  
  // Location and details
  location: string;
  equipment?: string[];
  instructions?: string;
  
  // Status
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  
  // Rotation and recurrence
  isRecurring: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly';
  recurrenceEnd?: Date;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DutyAssignment {
  userId: string;
  userName: string;
  personalNumber: string;
  team?: string;
  role: string;
  status: 'assigned' | 'confirmed' | 'completed' | 'absent' | 'replaced';
  assignedAt: Date;
  notes?: string;
  
  // Replacement info
  replacedBy?: {
    userId: string;
    userName: string;
    reason: string;
    replacedAt: Date;
  };
}

interface DutyStats {
  totalDuties: number;
  completionRate: number;
  averageAssignments: number;
  soldierStats: { [userId: string]: number };
}

const Duties: React.FC = () => {
  const { user } = useUser();
  const [duties, setDuties] = useState<Duty[]>([]);
  const [soldiers, setSoldiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [dutyDialogOpen, setDutyDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDuty, setSelectedDuty] = useState<Duty | null>(null);
  const [stats, setStats] = useState<DutyStats | null>(null);
  
  // Form states
  const [dutyForm, setDutyForm] = useState({
    type: 'guard' as Duty['type'],
    name: '',
    description: '',
    date: new Date(),
    shift: 'morning' as Duty['shift'],
    startTime: '06:00',
    endTime: '14:00',
    location: '',
    requiredPersonnel: 2,
    equipment: '',
    instructions: '',
    isRecurring: false,
    recurrencePattern: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recurrenceEnd: new Date()
  });

  const [assignmentForm, setAssignmentForm] = useState({
    selectedSoldiers: [] as string[]
  });

  const dutyTypes = [
    { value: 'guard', label: 'שמירה', color: 'error' },
    { value: 'kitchen', label: 'מטבח', color: 'warning' },
    { value: 'cleaning', label: 'ניקיון', color: 'info' },
    { value: 'maintenance', label: 'תחזוקה', color: 'secondary' },
    { value: 'office', label: 'משרד', color: 'primary' },
    { value: 'other', label: 'אחר', color: 'default' }
  ];

  const shifts = [
    { value: 'morning', label: 'בוקר', time: '06:00-14:00' },
    { value: 'afternoon', label: 'צהריים', time: '14:00-22:00' },
    { value: 'night', label: 'לילה', time: '22:00-06:00' },
    { value: 'full_day', label: 'יום מלא', time: '06:00-18:00' }
  ];

  const loadDuties = useCallback(async () => {
    try {
      setLoading(true);
      const dutiesQuery = query(
        collection(db, 'duties'),
        orderBy('date', 'desc')
      );
      const dutiesSnapshot = await getDocs(dutiesQuery);
      const dutiesData: Duty[] = [];
      
      dutiesSnapshot.forEach((doc) => {
        const data = doc.data();
        dutiesData.push({
          id: doc.id,
          ...data,
          date: data.date?.toDate(),
          recurrenceEnd: data.recurrenceEnd?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          assignedPersonnel: data.assignedPersonnel?.map((assignment: any) => ({
            ...assignment,
            assignedAt: assignment.assignedAt?.toDate(),
            replacedBy: assignment.replacedBy ? {
              ...assignment.replacedBy,
              replacedAt: assignment.replacedBy.replacedAt?.toDate()
            } : undefined
          })) || []
        } as Duty);
      });
      
      setDuties(dutiesData);
      calculateStats(dutiesData);
    } catch (error) {
      console.error('שגיאה בטעינת תורנויות:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSoldiers = useCallback(async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('isActive', '==', true)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const usersData: any[] = [];
      
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role !== 'admin') {
          usersData.push({
            uid: doc.id,
            ...data
          });
        }
      });
      
      setSoldiers(usersData);
    } catch (error) {
      console.error('שגיאה בטעינת חיילים:', error);
    }
  }, []);

  const calculateStats = (dutiesData: Duty[]) => {
    const totalDuties = dutiesData.length;
    const completedDuties = dutiesData.filter(d => d.status === 'completed').length;
    const completionRate = totalDuties > 0 ? (completedDuties / totalDuties) * 100 : 0;
    
    const soldierStats: { [userId: string]: number } = {};
    dutiesData.forEach(duty => {
      duty.assignedPersonnel.forEach(assignment => {
        soldierStats[assignment.userId] = (soldierStats[assignment.userId] || 0) + 1;
      });
    });
    
    const averageAssignments = Object.keys(soldierStats).length > 0 
      ? Object.values(soldierStats).reduce((a, b) => a + b, 0) / Object.keys(soldierStats).length 
      : 0;

    setStats({
      totalDuties,
      completionRate,
      averageAssignments,
      soldierStats
    });
  };

  useEffect(() => {
    loadDuties();
    loadSoldiers();
  }, [loadDuties, loadSoldiers]);

  const handleCreateDuty = async () => {
    if (!user) return;

    try {
      const newDuty: Partial<Duty> = {
        type: dutyForm.type,
        name: dutyForm.name,
        description: dutyForm.description,
        date: dutyForm.date,
        shift: dutyForm.shift,
        startTime: dutyForm.startTime,
        endTime: dutyForm.endTime,
        location: dutyForm.location,
        requiredPersonnel: dutyForm.requiredPersonnel,
        equipment: dutyForm.equipment ? dutyForm.equipment.split(',').map(e => e.trim()) : [],
        instructions: dutyForm.instructions,
        status: 'scheduled',
        isRecurring: dutyForm.isRecurring,
        recurrencePattern: dutyForm.isRecurring ? dutyForm.recurrencePattern : undefined,
        recurrenceEnd: dutyForm.isRecurring ? dutyForm.recurrenceEnd : undefined,
        assignedPersonnel: [],
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'duties'), {
        ...newDuty,
        date: Timestamp.fromDate(dutyForm.date),
        recurrenceEnd: dutyForm.isRecurring ? Timestamp.fromDate(dutyForm.recurrenceEnd) : undefined,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // If recurring, create multiple duties
      if (dutyForm.isRecurring) {
        await createRecurringDuties(newDuty);
      }

      setDutyDialogOpen(false);
      resetDutyForm();
      loadDuties();
      alert('תורנות נוצרה בהצלחה!');
    } catch (error) {
      alert('שגיאה ביצירת תורנות: ' + error);
    }
  };

  const createRecurringDuties = async (baseDuty: Partial<Duty>) => {
    if (!baseDuty.recurrenceEnd || !baseDuty.recurrencePattern) return;

    const currentDate = new Date(baseDuty.date!);
    const endDate = baseDuty.recurrenceEnd;
    const duties: any[] = [];

    while (currentDate <= endDate) {
      // Move to next occurrence
      switch (baseDuty.recurrencePattern) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }

      if (currentDate <= endDate) {
        duties.push({
          ...baseDuty,
          date: Timestamp.fromDate(new Date(currentDate)),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
    }

    // Batch create recurring duties
    for (const duty of duties) {
      await addDoc(collection(db, 'duties'), duty);
    }
  };

  const handleAssignSoldiers = async () => {
    if (!selectedDuty) return;

    try {
      const newAssignments: DutyAssignment[] = assignmentForm.selectedSoldiers.map(soldierUid => {
        const soldier = soldiers.find(s => s.uid === soldierUid);
        return {
          userId: soldierUid,
          userName: soldier?.displayName || 'Unknown',
          personalNumber: soldier?.personalNumber || '',
          team: soldier?.team,
          role: soldier?.role,
          status: 'assigned',
          assignedAt: new Date()
        };
      });

      const updatedAssignments = [...selectedDuty.assignedPersonnel, ...newAssignments];

      await updateDoc(doc(db, 'duties', selectedDuty.id), {
        assignedPersonnel: updatedAssignments,
        updatedAt: Timestamp.now()
      });

      setAssignDialogOpen(false);
      setAssignmentForm({ selectedSoldiers: [] });
      loadDuties();
      alert('חיילים שובצו בהצלחה!');
    } catch (error) {
      alert('שגיאה בשיבוץ חיילים: ' + error);
    }
  };

  const handleAutoAssign = async (dutyId: string) => {
    try {
      const duty = duties.find(d => d.id === dutyId);
      if (!duty) return;

      // Simple auto-assignment logic: least assigned soldiers first
      const availableSoldiers = soldiers.filter(soldier => {
        // Filter out already assigned soldiers
        const isAlreadyAssigned = duty.assignedPersonnel.some(a => a.userId === soldier.uid);
        if (isAlreadyAssigned) return false;

        // Basic availability check (can be expanded)
        return soldier.isActive;
      });

      // Sort by assignment count (ascending)
      availableSoldiers.sort((a, b) => {
        const aCount = stats?.soldierStats[a.uid] || 0;
        const bCount = stats?.soldierStats[b.uid] || 0;
        return aCount - bCount;
      });

      const needed = duty.requiredPersonnel - duty.assignedPersonnel.length;
      const toAssign = availableSoldiers.slice(0, needed);

      const newAssignments: DutyAssignment[] = toAssign.map(soldier => ({
        userId: soldier.uid,
        userName: soldier.displayName,
        personalNumber: soldier.personalNumber || '',
        team: soldier.team,
        role: soldier.role,
        status: 'assigned',
        assignedAt: new Date()
      }));

      const updatedAssignments = [...duty.assignedPersonnel, ...newAssignments];

      await updateDoc(doc(db, 'duties', dutyId), {
        assignedPersonnel: updatedAssignments,
        updatedAt: Timestamp.now()
      });

      loadDuties();
      alert(`${newAssignments.length} חיילים שובצו אוטומטית!`);
    } catch (error) {
      alert('שגיאה בשיבוץ אוטומטי: ' + error);
    }
  };

  const handleMarkComplete = async (dutyId: string) => {
    try {
      await updateDoc(doc(db, 'duties', dutyId), {
        status: 'completed',
        updatedAt: Timestamp.now()
      });

      // Mark all assignments as completed
      const duty = duties.find(d => d.id === dutyId);
      if (duty) {
        const updatedAssignments = duty.assignedPersonnel.map(assignment => ({
          ...assignment,
          status: 'completed'
        }));

        await updateDoc(doc(db, 'duties', dutyId), {
          assignedPersonnel: updatedAssignments
        });
      }

      loadDuties();
    } catch (error) {
      alert('שגיאה בסימון השלמה: ' + error);
    }
  };

  const resetDutyForm = () => {
    setDutyForm({
      type: 'guard',
      name: '',
      description: '',
      date: new Date(),
      shift: 'morning',
      startTime: '06:00',
      endTime: '14:00',
      location: '',
      requiredPersonnel: 2,
      equipment: '',
      instructions: '',
      isRecurring: false,
      recurrencePattern: 'weekly',
      recurrenceEnd: new Date()
    });
    setSelectedDuty(null);
  };

  const getTypeColor = (type: string) => {
    return dutyTypes.find(t => t.value === type)?.color || 'default';
  };

  const getTypeText = (type: string) => {
    return dutyTypes.find(t => t.value === type)?.label || type;
  };

  const getShiftText = (shift: string) => {
    return shifts.find(s => s.value === shift)?.label || shift;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'active': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL');
  };

  const formatTime = (time: string) => {
    return time;
  };

  const canUserManageDuties = (): boolean => {
    if (!user) return false;
    return user.canAssignRoles || isHigherRole(user.role, UserRole.MEFAKED_TZEVET);
  };

  const exportToExcel = () => {
    // Simple CSV export
    const csvData = duties.map(duty => [
      duty.name,
      getTypeText(duty.type),
      formatDate(duty.date),
      getShiftText(duty.shift),
      duty.location,
      duty.assignedPersonnel.map(p => p.userName).join('; '),
      duty.status
    ]);

    const csvContent = [
      ['שם התורנות', 'סוג', 'תאריך', 'משמרת', 'מיקום', 'משובצים', 'סטטוס'],
      ...csvData
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `duties_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
          <DutyIcon />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            ניהול תורנויות
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {duties.filter(d => d.status === 'scheduled').length} מתוכננות, {' '}
            {duties.filter(d => d.status === 'active').length} פעילות, {' '}
            {stats && `${Math.round(stats.completionRate)}% השלמה`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="ייצא לאקסל">
            <IconButton onClick={exportToExcel}>
              <ExportIcon />
            </IconButton>
          </Tooltip>
          {canUserManageDuties() && (
            <Fab
              color="primary"
              aria-label="add"
              onClick={() => setDutyDialogOpen(true)}
              size="medium"
            >
              <AddIcon />
            </Fab>
          )}
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, 
          gap: 2, 
          mb: 3 
        }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary">{stats.totalDuties}</Typography>
              <Typography variant="body2" color="text.secondary">סה"כ תורנויות</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">{Math.round(stats.completionRate)}%</Typography>
              <Typography variant="body2" color="text.secondary">אחוז השלמה</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="info.main">{Math.round(stats.averageAssignments)}</Typography>
              <Typography variant="body2" color="text.secondary">ממוצע שיבוצים</Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`כל התורנויות (${duties.length})`} />
        <Tab label={`מתוכננות (${duties.filter(d => d.status === 'scheduled').length})`} />
        <Tab label={`פעילות (${duties.filter(d => d.status === 'active').length})`} />
        <Tab label={`הושלמו (${duties.filter(d => d.status === 'completed').length})`} />
      </Tabs>

      {/* Duties List */}
      <Box sx={{ mb: 4 }}>
        {duties
          .filter(duty => {
            switch (tabValue) {
              case 1: return duty.status === 'scheduled';
              case 2: return duty.status === 'active';
              case 3: return duty.status === 'completed';
              default: return true;
            }
          })
          .map((duty) => (
            <Card key={duty.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {duty.name}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Chip
                        label={duty.status}
                        color={getStatusColor(duty.status) as any}
                        size="small"
                      />
                      <Chip
                        label={getTypeText(duty.type)}
                        color={getTypeColor(duty.type) as any}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        label={getShiftText(duty.shift)}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        label={`${duty.assignedPersonnel.length}/${duty.requiredPersonnel} משובצים`}
                        variant="outlined"
                        size="small"
                        color={duty.assignedPersonnel.length >= duty.requiredPersonnel ? 'success' : 'warning'}
                      />
                    </Box>

                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      <strong>תאריך:</strong> {formatDate(duty.date)} | {' '}
                      <strong>שעות:</strong> {formatTime(duty.startTime)} - {formatTime(duty.endTime)} | {' '}
                      <strong>מיקום:</strong> {duty.location}
                    </Typography>

                    {duty.assignedPersonnel.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          משובצים:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {duty.assignedPersonnel.map((assignment) => (
                            <Chip
                              key={assignment.userId}
                              label={assignment.userName}
                              size="small"
                              variant="outlined"
                              color={assignment.status === 'completed' ? 'success' : 'default'}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {duty.description && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        {duty.description}
                      </Typography>
                    )}
                  </Box>

                  {/* Action buttons */}
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                    {canUserManageDuties() && duty.status === 'scheduled' && (
                      <>
                        {duty.assignedPersonnel.length < duty.requiredPersonnel && (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<GroupIcon />}
                              onClick={() => {
                                setSelectedDuty(duty);
                                setAssignDialogOpen(true);
                              }}
                            >
                              שבץ
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AutoAssignIcon />}
                              onClick={() => handleAutoAssign(duty.id)}
                            >
                              שיבוץ אוטומטי
                            </Button>
                          </>
                        )}
                        
                        {duty.assignedPersonnel.length >= duty.requiredPersonnel && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CompleteIcon />}
                            onClick={() => handleMarkComplete(duty.id)}
                          >
                            סמן כהושלם
                          </Button>
                        )}
                      </>
                    )}

                    <Tooltip title="ערוך תורנות">
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedDuty(duty);
                          setDutyForm({
                            type: duty.type,
                            name: duty.name,
                            description: duty.description || '',
                            date: duty.date,
                            shift: duty.shift,
                            startTime: duty.startTime,
                            endTime: duty.endTime,
                            location: duty.location,
                            requiredPersonnel: duty.requiredPersonnel,
                            equipment: duty.equipment?.join(', ') || '',
                            instructions: duty.instructions || '',
                            isRecurring: duty.isRecurring,
                            recurrencePattern: duty.recurrencePattern || 'weekly',
                            recurrenceEnd: duty.recurrenceEnd || new Date()
                          });
                          setDutyDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}

        {duties.length === 0 && (
          <Alert severity="info">
            אין תורנויות במערכת. {canUserManageDuties() && 'לחץ על הכפתור + ליצירת תורנות חדשה.'}
          </Alert>
        )}
      </Box>

      {/* Create/Edit Duty Dialog */}
      <Dialog open={dutyDialogOpen} onClose={() => {
        setDutyDialogOpen(false);
        resetDutyForm();
      }} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedDuty ? 'עריכת תורנות' : 'תורנות חדשה'}
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
              label="שם התורנות"
              value={dutyForm.name}
              onChange={(e) => setDutyForm({ ...dutyForm, name: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>סוג תורנות</InputLabel>
              <Select
                value={dutyForm.type}
                onChange={(e) => setDutyForm({ ...dutyForm, type: e.target.value as Duty['type'] })}
                label="סוג תורנות"
              >
                {dutyTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="תאריך"
              type="date"
              value={dutyForm.date.toISOString().split('T')[0]}
              onChange={(e) => setDutyForm({ ...dutyForm, date: new Date(e.target.value) })}
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>משמרת</InputLabel>
              <Select
                value={dutyForm.shift}
                onChange={(e) => setDutyForm({ ...dutyForm, shift: e.target.value as Duty['shift'] })}
                label="משמרת"
              >
                {shifts.map((shift) => (
                  <MenuItem key={shift.value} value={shift.value}>
                    {shift.label} ({shift.time})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="שעת התחלה"
              type="time"
              value={dutyForm.startTime}
              onChange={(e) => setDutyForm({ ...dutyForm, startTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="שעת סיום"
              type="time"
              value={dutyForm.endTime}
              onChange={(e) => setDutyForm({ ...dutyForm, endTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="מיקום"
              value={dutyForm.location}
              onChange={(e) => setDutyForm({ ...dutyForm, location: e.target.value })}
            />

            <TextField
              fullWidth
              label="כוח אדם נדרש"
              type="number"
              value={dutyForm.requiredPersonnel}
              onChange={(e) => setDutyForm({ ...dutyForm, requiredPersonnel: Number(e.target.value) })}
            />

            <TextField
              fullWidth
              label="תיאור"
              value={dutyForm.description}
              onChange={(e) => setDutyForm({ ...dutyForm, description: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
            />

            <TextField
              fullWidth
              label="ציוד נדרש (מופרד בפסיקים)"
              value={dutyForm.equipment}
              onChange={(e) => setDutyForm({ ...dutyForm, equipment: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
            />

            <TextField
              fullWidth
              label="הוראות מיוחדות"
              multiline
              rows={3}
              value={dutyForm.instructions}
              onChange={(e) => setDutyForm({ ...dutyForm, instructions: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={dutyForm.isRecurring}
                  onChange={(e) => setDutyForm({ ...dutyForm, isRecurring: e.target.checked })}
                />
              }
              label="תורנות חוזרת"
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
            />

            {dutyForm.isRecurring && (
              <>
                <FormControl fullWidth>
                  <InputLabel>תדירות חזרה</InputLabel>
                  <Select
                    value={dutyForm.recurrencePattern}
                    onChange={(e) => setDutyForm({ ...dutyForm, recurrencePattern: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                    label="תדירות חזרה"
                  >
                    <MenuItem value="daily">יומית</MenuItem>
                    <MenuItem value="weekly">שבועית</MenuItem>
                    <MenuItem value="monthly">חודשית</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="תאריך סיום חזרה"
                  type="date"
                  value={dutyForm.recurrenceEnd.toISOString().split('T')[0]}
                  onChange={(e) => setDutyForm({ ...dutyForm, recurrenceEnd: new Date(e.target.value) })}
                  InputLabelProps={{ shrink: true }}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDutyDialogOpen(false);
            resetDutyForm();
          }}>
            ביטול
          </Button>
          <Button onClick={handleCreateDuty} variant="contained">
            {selectedDuty ? 'עדכן' : 'צור תורנות'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Soldiers Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          שיבוץ חיילים - {selectedDuty?.name}
        </DialogTitle>
        <DialogContent>
          {selectedDuty && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                נדרשים: {selectedDuty.requiredPersonnel} | {' '}
                משובצים: {selectedDuty.assignedPersonnel.length} | {' '}
                חסרים: {selectedDuty.requiredPersonnel - selectedDuty.assignedPersonnel.length}
              </Typography>

              <FormControl fullWidth>
                <InputLabel>בחר חיילים</InputLabel>
                <Select
                  multiple
                  value={assignmentForm.selectedSoldiers}
                  onChange={(e) => setAssignmentForm({ 
                    selectedSoldiers: e.target.value as string[] 
                  })}
                  label="בחר חיילים"
                >
                  {soldiers
                    .filter(soldier => !selectedDuty.assignedPersonnel.some(a => a.userId === soldier.uid))
                    .map((soldier) => (
                      <MenuItem key={soldier.uid} value={soldier.uid}>
                        {soldier.displayName} ({soldier.personalNumber})
                        {soldier.team && ` - צוות ${soldier.team}`}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleAssignSoldiers} variant="contained">
            שבץ חיילים
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Duties; 