import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Avatar,
  Chip,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Tv as HamalIcon,
  DirectionsCar as VehicleIcon,
  Person as PersonIcon,
  Assignment as MissionIcon,
  Schedule as DutyIcon,
  Build as MaintenanceIcon,
  LocalGasStation as FuelIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as ExitFullscreenIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as PendingIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { collection, query, getDocs, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface HamalData {
  vehicles: VehicleStatus[];
  personnel: PersonnelStatus[];
  missions: MissionStatus[];
  duties: DutyStatus[];
  alerts: SystemAlert[];
  lastUpdated: Date;
}

interface VehicleStatus {
  id: string;
  vehicleNumber: string;
  type: string;
  status: 'available' | 'in_use' | 'maintenance' | 'unavailable';
  fuelLevel: number;
  currentMission?: string;
  driverName?: string;
  expectedReturn?: Date;
  location?: string;
  issues: number;
}

interface PersonnelStatus {
  id: string;
  name: string;
  role: string;
  team?: string;
  status: 'available' | 'on_mission' | 'on_duty' | 'resting' | 'unavailable';
  currentActivity?: string;
  endTime?: Date;
}

interface MissionStatus {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  participants: number;
  startTime: Date;
  estimatedEnd?: Date;
  commander: string;
}

interface DutyStatus {
  id: string;
  name: string;
  type: string;
  date: Date;
  shift: string;
  assigned: number;
  required: number;
  status: 'scheduled' | 'active' | 'completed';
  location: string;
}

interface SystemAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'vehicle' | 'personnel' | 'mission' | 'duty' | 'system';
  message: string;
  timestamp: Date;
  isResolved: boolean;
}

const Hamal: React.FC = () => {
  const { user } = useUser();
  const [data, setData] = useState<HamalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time data loading
  const loadHamalData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load vehicles
      const vehiclesQuery = query(collection(db, 'vehicles'));
      const vehiclesSnapshot = await getDocs(vehiclesQuery);
      const vehicles: VehicleStatus[] = [];
      vehiclesSnapshot.forEach((doc) => {
        const data = doc.data();
        vehicles.push({
          id: doc.id,
          vehicleNumber: data.vehicleNumber,
          type: data.type,
          status: data.status,
          fuelLevel: data.fuelLevel || 0,
          currentMission: data.currentMission,
          driverName: data.assignedDriver,
          expectedReturn: data.expectedReturn?.toDate(),
          location: data.location,
          issues: data.currentIssues?.length || 0
        });
      });

      // Load personnel (simplified for Hamal view)
      const usersQuery = query(
        collection(db, 'users'),
        where('isActive', '==', true)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const personnel: PersonnelStatus[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role !== 'admin') {
          personnel.push({
            id: doc.id,
            name: data.displayName,
            role: data.role,
            team: data.team,
            status: determinePersonnelStatus(data),
            currentActivity: data.currentActivity,
            endTime: data.activityEndTime?.toDate()
          });
        }
      });

      // Load missions
      const missionsQuery = query(
        collection(db, 'missions'),
        where('status', 'in', ['planning', 'active']),
        orderBy('plannedStart', 'desc')
      );
      const missionsSnapshot = await getDocs(missionsQuery);
      const missions: MissionStatus[] = [];
      missionsSnapshot.forEach((doc) => {
        const data = doc.data();
        missions.push({
          id: doc.id,
          name: data.name,
          status: data.status,
          priority: data.priority,
          progress: data.progressPercentage || 0,
          participants: data.participants?.length || 0,
          startTime: data.plannedStart?.toDate() || new Date(),
          estimatedEnd: data.plannedEnd?.toDate(),
          commander: data.commanderName
        });
      });

      // Load duties
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const dutiesQuery = query(
        collection(db, 'duties'),
        where('date', '>=', startOfDay),
        where('date', '<', endOfDay)
      );
      const dutiesSnapshot = await getDocs(dutiesQuery);
      const duties: DutyStatus[] = [];
      dutiesSnapshot.forEach((doc) => {
        const data = doc.data();
        duties.push({
          id: doc.id,
          name: data.name,
          type: data.type,
          date: data.date?.toDate(),
          shift: data.shift,
          assigned: data.assignedPersonnel?.length || 0,
          required: data.requiredPersonnel || 0,
          status: data.status,
          location: data.location
        });
      });

      // Generate alerts
      const alerts = generateAlerts(vehicles, personnel, missions, duties);

      setData({
        vehicles,
        personnel,
        missions,
        duties,
        alerts,
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('שגיאה בטעינת נתוני חמ"ל:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const determinePersonnelStatus = (userData: any): PersonnelStatus['status'] => {
    // Logic to determine personnel status based on current assignments
    if (userData.currentMission) return 'on_mission';
    if (userData.currentDuty) return 'on_duty';
    if (userData.status === 'resting') return 'resting';
    if (userData.isActive === false) return 'unavailable';
    return 'available';
  };

  const generateAlerts = (
    vehicles: VehicleStatus[],
    personnel: PersonnelStatus[],
    missions: MissionStatus[],
    duties: DutyStatus[]
  ): SystemAlert[] => {
    const alerts: SystemAlert[] = [];

    // Vehicle alerts
    vehicles.forEach(vehicle => {
      if (vehicle.fuelLevel < 25) {
        alerts.push({
          id: `fuel-${vehicle.id}`,
          type: vehicle.fuelLevel < 10 ? 'critical' : 'warning',
          category: 'vehicle',
          message: `רכב ${vehicle.vehicleNumber} - דלק נמוך (${vehicle.fuelLevel}%)`,
          timestamp: new Date(),
          isResolved: false
        });
      }
      if (vehicle.issues > 0) {
        alerts.push({
          id: `issues-${vehicle.id}`,
          type: 'warning',
          category: 'vehicle',
          message: `רכב ${vehicle.vehicleNumber} - ${vehicle.issues} תקלות פתוחות`,
          timestamp: new Date(),
          isResolved: false
        });
      }
    });

    // Mission alerts
    missions.forEach(mission => {
      if (mission.priority === 'critical' && mission.status === 'planning') {
        alerts.push({
          id: `mission-${mission.id}`,
          type: 'critical',
          category: 'mission',
          message: `משימה קריטית ממתינה לאישור: ${mission.name}`,
          timestamp: new Date(),
          isResolved: false
        });
      }
    });

    // Duty alerts
    duties.forEach(duty => {
      if (duty.assigned < duty.required) {
        alerts.push({
          id: `duty-${duty.id}`,
          type: 'warning',
          category: 'duty',
          message: `תורנות ${duty.name} - חסרים ${duty.required - duty.assigned} חיילים`,
          timestamp: new Date(),
          isResolved: false
        });
      }
    });

    return alerts.sort((a, b) => {
      const priorityOrder = { critical: 3, warning: 2, info: 1 };
      return priorityOrder[b.type] - priorityOrder[a.type];
    });
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadHamalData();
    
    if (autoRefresh) {
      const interval = setInterval(loadHamalData, 30000);
      return () => clearInterval(interval);
    }
  }, [loadHamalData, autoRefresh]);

  // Update current time every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timeInterval);
  }, []);

  // Fullscreen handling
  const toggleFullscreen = () => {
    if (!fullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setFullscreen(!fullscreen);
  };

  const getVehicleStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#4caf50';
      case 'in_use': return '#2196f3';
      case 'maintenance': return '#ff9800';
      case 'unavailable': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getPersonnelStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#4caf50';
      case 'on_mission': return '#2196f3';
      case 'on_duty': return '#ff9800';
      case 'resting': return '#9c27b0';
      case 'unavailable': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getMissionPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#ff5722';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <WarningIcon sx={{ color: '#f44336' }} />;
      case 'warning': return <WarningIcon sx={{ color: '#ff9800' }} />;
      case 'info': return <CheckIcon sx={{ color: '#2196f3' }} />;
      default: return <PendingIcon />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL');
  };

  if (loading && !data) {
    return (
      <Container maxWidth="xl" sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="h4">טוען נתוני חמ"ל...</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: fullscreen ? '#000' : 'inherit',
      color: fullscreen ? '#fff' : 'inherit',
      p: fullscreen ? 2 : 0
    }}>
      <Container maxWidth="xl" sx={{ py: 2 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 3,
          borderBottom: fullscreen ? '2px solid #333' : 'none',
          pb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
              <HamalIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant={fullscreen ? "h3" : "h4"} component="h1" sx={{ fontWeight: 700 }}>
                מסך חמ"ל - פלוגה לוחמת
              </Typography>
              <Typography variant={fullscreen ? "h6" : "body1"} sx={{ color: 'text.secondary' }}>
                {formatDate(currentTime)} | {formatTime(currentTime)}
                {data && ` | עודכן לאחרונה: ${formatTime(data.lastUpdated)}`}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label="רענון אוטומטי"
            />
            <Tooltip title="רענן נתונים">
              <IconButton onClick={loadHamalData} size={fullscreen ? "large" : "medium"}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={fullscreen ? "צא ממסך מלא" : "מסך מלא"}>
              <IconButton onClick={toggleFullscreen} size={fullscreen ? "large" : "medium"}>
                {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {data && (
          <>
            {/* Alerts Section */}
            {data.alerts.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant={fullscreen ? "h5" : "h6"} sx={{ mb: 2, fontWeight: 600 }}>
                  🚨 התראות מערכת ({data.alerts.length})
                </Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, 
                  gap: 1 
                }}>
                  {data.alerts.slice(0, 4).map((alert) => (
                    <Alert 
                      key={alert.id} 
                      severity={alert.type as any}
                      icon={getAlertIcon(alert.type)}
                      sx={{ fontSize: fullscreen ? '1.2rem' : 'inherit' }}
                    >
                      <strong>{alert.category.toUpperCase()}:</strong> {alert.message}
                    </Alert>
                  ))}
                </Box>
              </Box>
            )}

            {/* Main Dashboard Grid */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
              gap: 2 
            }}>
              {/* Vehicles Status */}
              <Box>
                <Card sx={{ height: '100%', bgcolor: fullscreen ? '#1a1a1a' : 'inherit' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <VehicleIcon sx={{ mr: 1, fontSize: fullscreen ? 32 : 24 }} />
                      <Typography variant={fullscreen ? "h5" : "h6"} sx={{ fontWeight: 600 }}>
                        רכבים ({data.vehicles.length})
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
                      gap: 1 
                    }}>
                      {data.vehicles.map((vehicle) => (
                        <Box
                          key={vehicle.id}
                          sx={{
                            p: 1.5,
                            border: `2px solid ${getVehicleStatusColor(vehicle.status)}`,
                            borderRadius: 1,
                            bgcolor: fullscreen ? '#2a2a2a' : 'background.paper'
                          }}
                        >
                          <Typography variant={fullscreen ? "subtitle1" : "body2"} sx={{ fontWeight: 600 }}>
                            {vehicle.vehicleNumber}
                          </Typography>
                          <Typography variant={fullscreen ? "body1" : "caption"} color="text.secondary">
                            {vehicle.type} | {vehicle.status}
                          </Typography>
                          
                          {/* Fuel level */}
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption">דלק: {vehicle.fuelLevel}%</Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={vehicle.fuelLevel}
                              color={vehicle.fuelLevel > 50 ? 'success' : vehicle.fuelLevel > 25 ? 'warning' : 'error'}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>

                          {vehicle.currentMission && (
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                              📋 {vehicle.currentMission}
                            </Typography>
                          )}

                          {vehicle.issues > 0 && (
                            <Chip 
                              label={`${vehicle.issues} תקלות`}
                              color="error"
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      ))}
                    </Box>

                    {/* Vehicle summary */}
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #ddd' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <Chip label={`זמינים: ${data.vehicles.filter(v => v.status === 'available').length}`} color="success" />
                        <Chip label={`בשימוש: ${data.vehicles.filter(v => v.status === 'in_use').length}`} color="primary" />
                        <Chip label={`תחזוקה: ${data.vehicles.filter(v => v.status === 'maintenance').length}`} color="warning" />
                        <Chip label={`לא זמינים: ${data.vehicles.filter(v => v.status === 'unavailable').length}`} color="error" />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Personnel Status */}
              <Box>
                <Card sx={{ height: '100%', bgcolor: fullscreen ? '#1a1a1a' : 'inherit' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PersonIcon sx={{ mr: 1, fontSize: fullscreen ? 32 : 24 }} />
                      <Typography variant={fullscreen ? "h5" : "h6"} sx={{ fontWeight: 600 }}>
                        כוח אדם ({data.personnel.length})
                      </Typography>
                    </Box>

                    {/* Personnel summary */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', mb: 2 }}>
                      <Chip 
                        label={`זמינים: ${data.personnel.filter(p => p.status === 'available').length}`} 
                        color="success" 
                        sx={{ fontSize: fullscreen ? '1rem' : 'inherit' }}
                      />
                      <Chip 
                        label={`במשימות: ${data.personnel.filter(p => p.status === 'on_mission').length}`} 
                        color="primary" 
                        sx={{ fontSize: fullscreen ? '1rem' : 'inherit' }}
                      />
                      <Chip 
                        label={`בתורנות: ${data.personnel.filter(p => p.status === 'on_duty').length}`} 
                        color="warning" 
                        sx={{ fontSize: fullscreen ? '1rem' : 'inherit' }}
                      />
                      <Chip 
                        label={`במנוחה: ${data.personnel.filter(p => p.status === 'resting').length}`} 
                        color="secondary" 
                        sx={{ fontSize: fullscreen ? '1rem' : 'inherit' }}
                      />
                    </Box>

                    {/* Activity breakdown */}
                    {data.personnel.filter(p => p.status !== 'available').slice(0, 8).map((person) => (
                      <Box
                        key={person.id}
                        sx={{
                          p: 1,
                          mb: 1,
                          border: `1px solid ${getPersonnelStatusColor(person.status)}`,
                          borderRadius: 1,
                          bgcolor: fullscreen ? '#2a2a2a' : 'background.paper'
                        }}
                      >
                        <Typography variant={fullscreen ? "body1" : "body2"} sx={{ fontWeight: 600 }}>
                          {person.name} ({person.role})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {person.currentActivity || person.status}
                          {person.endTime && ` עד ${formatTime(person.endTime)}`}
                        </Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Box>

              {/* Active Missions */}
              <Box>
                <Card sx={{ height: '100%', bgcolor: fullscreen ? '#1a1a1a' : 'inherit' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <MissionIcon sx={{ mr: 1, fontSize: fullscreen ? 32 : 24 }} />
                      <Typography variant={fullscreen ? "h5" : "h6"} sx={{ fontWeight: 600 }}>
                        משימות פעילות ({data.missions.length})
                      </Typography>
                    </Box>

                    {data.missions.map((mission) => (
                      <Box
                        key={mission.id}
                        sx={{
                          p: 2,
                          mb: 2,
                          border: `2px solid ${getMissionPriorityColor(mission.priority)}`,
                          borderRadius: 1,
                          bgcolor: fullscreen ? '#2a2a2a' : 'background.paper'
                        }}
                      >
                        <Typography variant={fullscreen ? "subtitle1" : "body1"} sx={{ fontWeight: 600 }}>
                          {mission.name}
                        </Typography>
                        <Typography variant={fullscreen ? "body1" : "body2"} color="text.secondary">
                          מפקד: {mission.commander} | משתתפים: {mission.participants}
                        </Typography>
                        
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">התקדמות: {mission.progress}%</Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={mission.progress}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Chip 
                            label={mission.status}
                            color={mission.status === 'active' ? 'primary' : 'default'}
                            size="small"
                          />
                          <Chip 
                            label={mission.priority}
                            sx={{ bgcolor: getMissionPriorityColor(mission.priority), color: '#fff' }}
                            size="small"
                          />
                        </Box>
                      </Box>
                    ))}

                    {data.missions.length === 0 && (
                      <Alert severity="info" sx={{ fontSize: fullscreen ? '1.1rem' : 'inherit' }}>
                        אין משימות פעילות כרגע
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Box>

              {/* Today's Duties */}
              <Box>
                <Card sx={{ height: '100%', bgcolor: fullscreen ? '#1a1a1a' : 'inherit' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <DutyIcon sx={{ mr: 1, fontSize: fullscreen ? 32 : 24 }} />
                      <Typography variant={fullscreen ? "h5" : "h6"} sx={{ fontWeight: 600 }}>
                        תורנויות היום ({data.duties.length})
                      </Typography>
                    </Box>

                    {data.duties.map((duty) => (
                      <Box
                        key={duty.id}
                        sx={{
                          p: 1.5,
                          mb: 1.5,
                          border: `1px solid ${duty.assigned >= duty.required ? '#4caf50' : '#ff9800'}`,
                          borderRadius: 1,
                          bgcolor: fullscreen ? '#2a2a2a' : 'background.paper'
                        }}
                      >
                        <Typography variant={fullscreen ? "subtitle1" : "body2"} sx={{ fontWeight: 600 }}>
                          {duty.name} - {duty.shift}
                        </Typography>
                        <Typography variant={fullscreen ? "body1" : "caption"} color="text.secondary">
                          {duty.location} | {duty.type}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Typography variant="caption">
                            משובצים: {duty.assigned}/{duty.required}
                          </Typography>
                          <Chip 
                            label={duty.status}
                            color={duty.status === 'completed' ? 'success' : duty.status === 'active' ? 'primary' : 'default'}
                            size="small"
                          />
                        </Box>

                        {duty.assigned < duty.required && (
                          <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                            חסרים {duty.required - duty.assigned} חיילים
                          </Alert>
                        )}
                      </Box>
                    ))}

                    {data.duties.length === 0 && (
                      <Alert severity="info" sx={{ fontSize: fullscreen ? '1.1rem' : 'inherit' }}>
                        אין תורנויות מתוכננות להיום
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </Box>

            {/* Footer */}
            <Box sx={{ 
              mt: 3, 
              pt: 2, 
              borderTop: fullscreen ? '1px solid #333' : '1px solid #ddd',
              textAlign: 'center'
            }}>
              <Typography variant="caption" color="text.secondary">
                מערכת ניהול פלוגה | עודכן אוטומטית כל 30 שניות | 
                סה"כ: {data.vehicles.length} רכבים, {data.personnel.length} חיילים, {data.missions.length} משימות פעילות
              </Typography>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
};

export default Hamal; 