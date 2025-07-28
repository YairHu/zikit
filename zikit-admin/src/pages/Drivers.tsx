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
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  LinearProgress,
  IconButton,
  Tooltip,
  Fab
} from '@mui/material';
import {
  DriveEta as DriveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  DirectionsCar as CarIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Block as BlockIcon,
  Schedule as ScheduleIcon,
  Assignment as MissionIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { collection, query, getDocs, doc, updateDoc, addDoc, deleteDoc, Timestamp, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface Driver {
  id: string;
  soldierName: string;
  personalNumber: string;
  licenseTypes: string[];
  status: 'available' | 'driving' | 'resting' | 'unavailable';
  currentMission?: string;
  lastDriveEnd?: Date;
  restEndTime?: Date;
  totalDrivingHours: number;
  drivingHistory: DrivingRecord[];
  restrictions?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DrivingRecord {
  id: string;
  missionId: string;
  missionName: string;
  vehicleId: string;
  vehicleName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  route?: string;
  kilometers?: number;
  fuel?: {
    start: number;
    end?: number;
  };
  notes?: string;
}

interface Mission {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'completed';
  requiredDrivers: number;
  assignedDrivers: string[];
  vehiclesNeeded: string[];
  startTime: Date;
  estimatedDuration: number; // hours
}

const Drivers: React.FC = () => {
  const { user } = useUser();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [missionDialogOpen, setMissionDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  
  // Form state
  const [driverForm, setDriverForm] = useState({
    soldierName: '',
    personalNumber: '',
    licenseTypes: [] as string[],
    restrictions: '',
    notes: ''
  });

  const [missionForm, setMissionForm] = useState({
    name: '',
    requiredDrivers: 1,
    vehiclesNeeded: [] as string[],
    estimatedDuration: 4
  });

  const licenseTypeOptions = [
    { value: 'B', label: 'B - רכב פרטי' },
    { value: 'C', label: 'C - משאית קלה' },
    { value: 'C1', label: 'C1 - משאית בינונית' },
    { value: 'D', label: 'D - אוטובוס' },
    { value: 'MILITARY', label: 'רישיון צבאי' },
    { value: 'MOTORCYCLE', label: 'אופנוע' }
  ];

  const loadDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const driversQuery = query(collection(db, 'drivers'), orderBy('soldierName'));
      const driversSnapshot = await getDocs(driversQuery);
      const driversData: Driver[] = [];
      
      driversSnapshot.forEach((doc) => {
        const data = doc.data();
        driversData.push({
          id: doc.id,
          ...data,
          lastDriveEnd: data.lastDriveEnd?.toDate(),
          restEndTime: data.restEndTime?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          drivingHistory: data.drivingHistory?.map((record: any) => ({
            ...record,
            startTime: record.startTime?.toDate(),
            endTime: record.endTime?.toDate()
          })) || []
        } as Driver);
      });
      
      setDrivers(driversData);
    } catch (error) {
      console.error('שגיאה בטעינת נהגים:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMissions = useCallback(async () => {
    try {
      const missionsQuery = query(
        collection(db, 'missions'),
        where('status', 'in', ['planning', 'active']),
        orderBy('startTime')
      );
      const missionsSnapshot = await getDocs(missionsQuery);
      const missionsData: Mission[] = [];
      
      missionsSnapshot.forEach((doc) => {
        const data = doc.data();
        missionsData.push({
          id: doc.id,
          ...data,
          startTime: data.startTime?.toDate()
        } as Mission);
      });
      
      setMissions(missionsData);
    } catch (error) {
      console.error('שגיאה בטעינת משימות:', error);
    }
  }, []);

  useEffect(() => {
    loadDrivers();
    loadMissions();
    
    // Update driver statuses every minute
    const interval = setInterval(() => {
      updateDriverStatuses();
    }, 60000);

    return () => clearInterval(interval);
  }, [loadDrivers, loadMissions]);

  const updateDriverStatuses = async () => {
    const now = new Date();
    
    drivers.forEach(async (driver) => {
      if (driver.status === 'resting' && driver.restEndTime && now >= driver.restEndTime) {
        // Driver finished resting
        await updateDoc(doc(db, 'drivers', driver.id), {
          status: 'available',
          restEndTime: null,
          updatedAt: Timestamp.now()
        });
      }
    });
    
    // Reload drivers to reflect changes
    loadDrivers();
  };

  const handleStartMission = async (driverId: string, missionId: string) => {
    try {
      const driver = drivers.find(d => d.id === driverId);
      const mission = missions.find(m => m.id === missionId);
      
      if (!driver || !mission) return;

      // Update driver status
      await updateDoc(doc(db, 'drivers', driverId), {
        status: 'driving',
        currentMission: missionId,
        updatedAt: Timestamp.now()
      });

      // Add driving record
      const newRecord: DrivingRecord = {
        id: Date.now().toString(),
        missionId,
        missionName: mission.name,
        vehicleId: '', // Will be set when vehicle is assigned
        vehicleName: '',
        startTime: new Date(),
        route: '',
        notes: ''
      };

      const updatedHistory = [...driver.drivingHistory, newRecord];
      
      await updateDoc(doc(db, 'drivers', driverId), {
        drivingHistory: updatedHistory
      });

      loadDrivers();
      alert('משימה החלה בהצלחה!');
    } catch (error) {
      alert('שגיאה בהתחלת משימה: ' + error);
    }
  };

  const handleEndMission = async (driverId: string) => {
    try {
      const driver = drivers.find(d => d.id === driverId);
      if (!driver) return;

      const now = new Date();
      const restEndTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // 7 hours from now

      // Update current driving record
      const updatedHistory = driver.drivingHistory.map(record => {
        if (!record.endTime && record.missionId === driver.currentMission) {
          const duration = Math.floor((now.getTime() - record.startTime.getTime()) / (1000 * 60));
          return {
            ...record,
            endTime: now,
            duration
          };
        }
        return record;
      });

      // Update driver
      await updateDoc(doc(db, 'drivers', driverId), {
        status: 'resting',
        currentMission: null,
        lastDriveEnd: Timestamp.fromDate(now),
        restEndTime: Timestamp.fromDate(restEndTime),
        drivingHistory: updatedHistory,
        updatedAt: Timestamp.now()
      });

      loadDrivers();
      alert('משימה הסתיימה. הנהג נכנס למנוחה של 7 שעות.');
    } catch (error) {
      alert('שגיאה בסיום משימה: ' + error);
    }
  };

  const handleCreateDriver = async () => {
    try {
      const newDriver: Partial<Driver> = {
        soldierName: driverForm.soldierName,
        personalNumber: driverForm.personalNumber,
        licenseTypes: driverForm.licenseTypes,
        status: 'available',
        totalDrivingHours: 0,
        drivingHistory: [],
        restrictions: driverForm.restrictions ? [driverForm.restrictions] : [],
        notes: driverForm.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'drivers'), {
        ...newDriver,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      setDriverDialogOpen(false);
      setDriverForm({
        soldierName: '',
        personalNumber: '',
        licenseTypes: [],
        restrictions: '',
        notes: ''
      });
      
      loadDrivers();
      alert('נהג נוצר בהצלחה!');
    } catch (error) {
      alert('שגיאה ביצירת נהג: ' + error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'driving': return 'primary';
      case 'resting': return 'warning';
      case 'unavailable': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'זמין';
      case 'driving': return 'בנסיעה';
      case 'resting': return 'במנוחה';
      case 'unavailable': return 'לא זמין';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckIcon />;
      case 'driving': return <CarIcon />;
      case 'resting': return <TimeIcon />;
      case 'unavailable': return <BlockIcon />;
      default: return <WarningIcon />;
    }
  };

  const getRestTimeRemaining = (restEndTime?: Date) => {
    if (!restEndTime) return null;
    
    const now = new Date();
    const remaining = restEndTime.getTime() - now.getTime();
    
    if (remaining <= 0) return 'המנוחה הסתיימה';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}:${minutes.toString().padStart(2, '0')} שעות נותרו`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL') + ' ' + date.toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
          <DriveIcon />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            ניהול נהגים
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {drivers.filter(d => d.status === 'available').length} זמינים, {' '}
            {drivers.filter(d => d.status === 'driving').length} בנסיעה, {' '}
            {drivers.filter(d => d.status === 'resting').length} במנוחה
          </Typography>
        </Box>
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setDriverDialogOpen(true)}
          sx={{ ml: 2 }}
        >
          <AddIcon />
        </Fab>
      </Box>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`כל הנהגים (${drivers.length})`} />
        <Tab label={`זמינים (${drivers.filter(d => d.status === 'available').length})`} />
        <Tab label={`בנסיעה (${drivers.filter(d => d.status === 'driving').length})`} />
        <Tab label={`במנוחה (${drivers.filter(d => d.status === 'resting').length})`} />
      </Tabs>

      {/* Active Missions Alert */}
      {missions.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>משימות פעילות:</strong> {missions.map(m => m.name).join(', ')}
          </Typography>
        </Alert>
      )}

      {/* Drivers List */}
      <Box sx={{ mb: 4 }}>
        {drivers
          .filter(driver => {
            switch (tabValue) {
              case 1: return driver.status === 'available';
              case 2: return driver.status === 'driving';
              case 3: return driver.status === 'resting';
              default: return true;
            }
          })
          .map((driver) => (
            <Card key={driver.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {driver.soldierName}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Chip
                        icon={getStatusIcon(driver.status)}
                        label={getStatusText(driver.status)}
                        color={getStatusColor(driver.status) as any}
                        size="small"
                      />
                      <Chip
                        label={`מס' אישי: ${driver.personalNumber}`}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        label={`רישיונות: ${driver.licenseTypes.join(', ')}`}
                        variant="outlined"
                        size="small"
                      />
                    </Box>

                    {/* Status specific info */}
                    {driver.status === 'driving' && driver.currentMission && (
                      <Alert severity="info" sx={{ mb: 1 }}>
                        נוסע במשימה: {missions.find(m => m.id === driver.currentMission)?.name}
                      </Alert>
                    )}

                    {driver.status === 'resting' && driver.restEndTime && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ScheduleIcon fontSize="small" />
                          <Typography variant="body2">
                            {getRestTimeRemaining(driver.restEndTime)}
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.max(0, Math.min(100, 
                            ((new Date().getTime() - (driver.lastDriveEnd?.getTime() || 0)) / (7 * 60 * 60 * 1000)) * 100
                          ))}
                          sx={{ mt: 1 }}
                        />
                      </Alert>
                    )}

                    {/* Driving statistics */}
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      סה"כ שעות נהיגה: {driver.totalDrivingHours} | {' '}
                      נסיעות השבוע: {driver.drivingHistory.filter(r => 
                        r.startTime > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      ).length}
                    </Typography>

                    {driver.restrictions && driver.restrictions.length > 0 && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        <strong>מגבלות:</strong> {driver.restrictions.join(', ')}
                      </Alert>
                    )}
                  </Box>

                  {/* Action buttons */}
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                    {driver.status === 'available' && missions.length > 0 && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<MissionIcon />}
                        onClick={() => {
                          // Show mission selection dialog
                          const missionId = missions[0].id; // For now, assign to first mission
                          handleStartMission(driver.id, missionId);
                        }}
                      >
                        התחל משימה
                      </Button>
                    )}
                    
                    {driver.status === 'driving' && (
                      <Button
                        variant="contained"
                        color="secondary"
                        size="small"
                        startIcon={<CheckIcon />}
                        onClick={() => handleEndMission(driver.id)}
                      >
                        סיים משימה
                      </Button>
                    )}

                    <Tooltip title="ערוך נהג">
                      <IconButton size="small" onClick={() => {
                        setSelectedDriver(driver);
                        setDriverForm({
                          soldierName: driver.soldierName,
                          personalNumber: driver.personalNumber,
                          licenseTypes: driver.licenseTypes,
                          restrictions: driver.restrictions?.join(', ') || '',
                          notes: driver.notes || ''
                        });
                        setDriverDialogOpen(true);
                      }}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}

        {drivers.length === 0 && (
          <Alert severity="info">
            אין נהגים במערכת. לחץ על הכפתור + להוספת נהג חדש.
          </Alert>
        )}
      </Box>

      {/* Create/Edit Driver Dialog */}
      <Dialog open={driverDialogOpen} onClose={() => setDriverDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedDriver ? 'עריכת נהג' : 'נהג חדש'}
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
              label="שם החייל"
              value={driverForm.soldierName}
              onChange={(e) => setDriverForm({ ...driverForm, soldierName: e.target.value })}
            />

            <TextField
              fullWidth
              label="מספר אישי"
              value={driverForm.personalNumber}
              onChange={(e) => setDriverForm({ ...driverForm, personalNumber: e.target.value })}
            />

            <FormControl fullWidth sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <InputLabel>סוגי רישיון</InputLabel>
              <Select
                multiple
                value={driverForm.licenseTypes}
                onChange={(e) => setDriverForm({ 
                  ...driverForm, 
                  licenseTypes: e.target.value as string[] 
                })}
                label="סוגי רישיון"
              >
                {licenseTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="מגבלות"
              value={driverForm.restrictions}
              onChange={(e) => setDriverForm({ ...driverForm, restrictions: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
            />

            <TextField
              fullWidth
              label="הערות"
              multiline
              rows={3}
              value={driverForm.notes}
              onChange={(e) => setDriverForm({ ...driverForm, notes: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDriverDialogOpen(false);
            setSelectedDriver(null);
          }}>
            ביטול
          </Button>
          <Button onClick={handleCreateDriver} variant="contained">
            {selectedDriver ? 'עדכן' : 'צור נהג'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Drivers; 