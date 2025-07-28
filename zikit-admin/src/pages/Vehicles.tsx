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
  LinearProgress,
  IconButton,
  Tooltip,
  Fab,
  Grid
} from '@mui/material';
import {
  DirectionsCar as VehicleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalGasStation as FuelIcon,
  Build as MaintenanceIcon,
  CheckCircle as AvailableIcon,
  Schedule as InUseIcon,
  Warning as MaintenanceNeededIcon,
  Block as UnavailableIcon,
  Assignment as MissionIcon,
  Timeline as StatsIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { collection, query, getDocs, doc, updateDoc, addDoc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface Vehicle {
  id: string;
  vehicleNumber: string;
  type: 'jeep' | 'truck' | 'bus' | 'motorcycle' | 'special';
  model: string;
  year: number;
  status: 'available' | 'in_use' | 'maintenance' | 'unavailable';
  
  // Current assignment
  currentMission?: string;
  assignedDriver?: string;
  expectedReturn?: Date;
  
  // Maintenance
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  maintenanceKm?: number;
  currentKm: number;
  
  // Fuel
  fuelLevel: number; // 0-100%
  fuelCapacity: number; // liters
  lastRefuel?: Date;
  
  // Usage tracking
  totalKm: number;
  monthlyKm: number;
  usageHistory: VehicleUsage[];
  
  // Technical details
  licenseRequired: string[];
  maxPassengers?: number;
  equipment?: string[];
  
  // Issues and notes
  currentIssues: VehicleIssue[];
  notes?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

interface VehicleUsage {
  id: string;
  driverId: string;
  driverName: string;
  missionId: string;
  missionName: string;
  startTime: Date;
  endTime?: Date;
  startKm: number;
  endKm?: number;
  fuelStart: number;
  fuelEnd?: number;
  route?: string;
  notes?: string;
}

interface VehicleIssue {
  id: string;
  type: 'mechanical' | 'electrical' | 'bodywork' | 'safety' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reportedBy: string;
  reportedAt: Date;
  status: 'open' | 'in_progress' | 'resolved';
  resolvedBy?: string;
  resolvedAt?: Date;
  cost?: number;
}

const Vehicles: React.FC = () => {
  const { user } = useUser();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Form states
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNumber: '',
    type: 'jeep' as Vehicle['type'],
    model: '',
    year: new Date().getFullYear(),
    licenseRequired: [] as string[],
    maxPassengers: 5,
    fuelCapacity: 60,
    currentKm: 0,
    equipment: '',
    notes: ''
  });

  const [issueForm, setIssueForm] = useState({
    type: 'mechanical' as VehicleIssue['type'],
    severity: 'medium' as VehicleIssue['severity'],
    description: ''
  });

  const vehicleTypes = [
    { value: 'jeep', label: 'ג\'יפ' },
    { value: 'truck', label: 'משאית' },
    { value: 'bus', label: 'אוטובוס' },
    { value: 'motorcycle', label: 'אופנוע' },
    { value: 'special', label: 'רכב מיוחד' }
  ];

  const issueTypes = [
    { value: 'mechanical', label: 'מכני' },
    { value: 'electrical', label: 'חשמלי' },
    { value: 'bodywork', label: 'מרכב' },
    { value: 'safety', label: 'בטיחות' },
    { value: 'other', label: 'אחר' }
  ];

  const severityLevels = [
    { value: 'low', label: 'נמוכה', color: 'success' },
    { value: 'medium', label: 'בינונית', color: 'warning' },
    { value: 'high', label: 'גבוהה', color: 'error' },
    { value: 'critical', label: 'קריטית', color: 'error' }
  ];

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const vehiclesQuery = query(collection(db, 'vehicles'), orderBy('vehicleNumber'));
      const vehiclesSnapshot = await getDocs(vehiclesQuery);
      const vehiclesData: Vehicle[] = [];
      
      vehiclesSnapshot.forEach((doc) => {
        const data = doc.data();
        vehiclesData.push({
          id: doc.id,
          ...data,
          expectedReturn: data.expectedReturn?.toDate(),
          lastMaintenance: data.lastMaintenance?.toDate(),
          nextMaintenance: data.nextMaintenance?.toDate(),
          lastRefuel: data.lastRefuel?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          usageHistory: data.usageHistory?.map((usage: any) => ({
            ...usage,
            startTime: usage.startTime?.toDate(),
            endTime: usage.endTime?.toDate()
          })) || [],
          currentIssues: data.currentIssues?.map((issue: any) => ({
            ...issue,
            reportedAt: issue.reportedAt?.toDate(),
            resolvedAt: issue.resolvedAt?.toDate()
          })) || []
        } as Vehicle);
      });
      
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('שגיאה בטעינת רכבים:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const handleCreateVehicle = async () => {
    try {
      const newVehicle: Partial<Vehicle> = {
        vehicleNumber: vehicleForm.vehicleNumber,
        type: vehicleForm.type,
        model: vehicleForm.model,
        year: vehicleForm.year,
        status: 'available',
        licenseRequired: vehicleForm.licenseRequired,
        maxPassengers: vehicleForm.maxPassengers,
        fuelCapacity: vehicleForm.fuelCapacity,
        fuelLevel: 100, // Start with full tank
        currentKm: vehicleForm.currentKm,
        totalKm: vehicleForm.currentKm,
        monthlyKm: 0,
        equipment: vehicleForm.equipment ? vehicleForm.equipment.split(',').map(e => e.trim()) : [],
        notes: vehicleForm.notes,
        usageHistory: [],
        currentIssues: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'vehicles'), {
        ...newVehicle,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      setVehicleDialogOpen(false);
      resetVehicleForm();
      loadVehicles();
      alert('רכב נוצר בהצלחה!');
    } catch (error) {
      alert('שגיאה ביצירת רכב: ' + error);
    }
  };

  const handleReportIssue = async () => {
    if (!selectedVehicle) return;

    try {
      const newIssue: VehicleIssue = {
        id: Date.now().toString(),
        type: issueForm.type,
        severity: issueForm.severity,
        description: issueForm.description,
        reportedBy: user?.displayName || 'Unknown',
        reportedAt: new Date(),
        status: 'open'
      };

      const updatedIssues = [...selectedVehicle.currentIssues, newIssue];
      
      // Update vehicle status if critical issue
      const newStatus = issueForm.severity === 'critical' ? 'unavailable' : selectedVehicle.status;

      await updateDoc(doc(db, 'vehicles', selectedVehicle.id), {
        currentIssues: updatedIssues,
        status: newStatus,
        updatedAt: Timestamp.now()
      });

      setIssueDialogOpen(false);
      setIssueForm({
        type: 'mechanical',
        severity: 'medium',
        description: ''
      });
      
      loadVehicles();
      alert('תקלה דווחה בהצלחה!');
    } catch (error) {
      alert('שגיאה בדיווח תקלה: ' + error);
    }
  };

  const handleUpdateFuel = async (vehicleId: string, newFuelLevel: number) => {
    try {
      await updateDoc(doc(db, 'vehicles', vehicleId), {
        fuelLevel: newFuelLevel,
        lastRefuel: newFuelLevel > 90 ? Timestamp.now() : undefined,
        updatedAt: Timestamp.now()
      });

      loadVehicles();
    } catch (error) {
      alert('שגיאה בעדכון דלק: ' + error);
    }
  };

  const resetVehicleForm = () => {
    setVehicleForm({
      vehicleNumber: '',
      type: 'jeep',
      model: '',
      year: new Date().getFullYear(),
      licenseRequired: [],
      maxPassengers: 5,
      fuelCapacity: 60,
      currentKm: 0,
      equipment: '',
      notes: ''
    });
    setSelectedVehicle(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'in_use': return 'primary';
      case 'maintenance': return 'warning';
      case 'unavailable': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'זמין';
      case 'in_use': return 'בשימוש';
      case 'maintenance': return 'בתחזוקה';
      case 'unavailable': return 'לא זמין';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <AvailableIcon />;
      case 'in_use': return <InUseIcon />;
      case 'maintenance': return <MaintenanceIcon />;
      case 'unavailable': return <UnavailableIcon />;
      default: return <AvailableIcon />;
    }
  };

  const getVehicleTypeText = (type: string) => {
    return vehicleTypes.find(t => t.value === type)?.label || type;
  };

  const getFuelColor = (level: number) => {
    if (level > 50) return 'success';
    if (level > 25) return 'warning';
    return 'error';
  };

  const needsMaintenance = (vehicle: Vehicle) => {
    if (!vehicle.nextMaintenance) return false;
    const daysUntil = Math.floor((vehicle.nextMaintenance.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL');
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
          <VehicleIcon />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            ניהול רכבים
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {vehicles.filter(v => v.status === 'available').length} זמינים, {' '}
            {vehicles.filter(v => v.status === 'in_use').length} בשימוש, {' '}
            {vehicles.filter(v => needsMaintenance(v)).length} דורשים תחזוקה
          </Typography>
        </Box>
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setVehicleDialogOpen(true)}
          sx={{ ml: 2 }}
        >
          <AddIcon />
        </Fab>
      </Box>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`כל הרכבים (${vehicles.length})`} />
        <Tab label={`זמינים (${vehicles.filter(v => v.status === 'available').length})`} />
        <Tab label={`בשימוש (${vehicles.filter(v => v.status === 'in_use').length})`} />
        <Tab label={`תחזוקה (${vehicles.filter(v => v.status === 'maintenance' || needsMaintenance(v)).length})`} />
      </Tabs>

      {/* Vehicles List */}
      <Box sx={{ mb: 4 }}>
        {vehicles
          .filter(vehicle => {
            switch (tabValue) {
              case 1: return vehicle.status === 'available';
              case 2: return vehicle.status === 'in_use';
              case 3: return vehicle.status === 'maintenance' || needsMaintenance(vehicle);
              default: return true;
            }
          })
          .map((vehicle) => (
            <Card key={vehicle.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {vehicle.vehicleNumber} - {vehicle.model}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Chip
                        icon={getStatusIcon(vehicle.status)}
                        label={getStatusText(vehicle.status)}
                        color={getStatusColor(vehicle.status) as any}
                        size="small"
                      />
                      <Chip
                        label={getVehicleTypeText(vehicle.type)}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        label={`${vehicle.year}`}
                        variant="outlined"
                        size="small"
                      />
                      {vehicle.maxPassengers && (
                        <Chip
                          label={`${vehicle.maxPassengers} מקומות`}
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Box>

                    {/* Current assignment info */}
                    {vehicle.status === 'in_use' && vehicle.currentMission && (
                      <Alert severity="info" sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          במשימה: {vehicle.currentMission}
                          {vehicle.expectedReturn && (
                            ` | צפוי חזרה: ${formatDate(vehicle.expectedReturn)}`
                          )}
                        </Typography>
                      </Alert>
                    )}

                    {/* Issues */}
                    {vehicle.currentIssues.filter(issue => issue.status === 'open').length > 0 && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          <strong>תקלות פתוחות:</strong> {' '}
                          {vehicle.currentIssues.filter(issue => issue.status === 'open').length}
                        </Typography>
                      </Alert>
                    )}

                    {/* Maintenance warning */}
                    {needsMaintenance(vehicle) && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        <MaintenanceNeededIcon sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          דרוש תחזוקה עד: {vehicle.nextMaintenance && formatDate(vehicle.nextMaintenance)}
                        </Typography>
                      </Alert>
                    )}

                    {/* Vehicle stats grid */}
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, 
                      gap: 2, 
                      mt: 1 
                    }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">קילומטרז'</Typography>
                        <Typography variant="h6">{vehicle.currentKm.toLocaleString()}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">דלק</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={vehicle.fuelLevel}
                            color={getFuelColor(vehicle.fuelLevel) as any}
                            sx={{ width: 60, height: 8 }}
                          />
                          <Typography variant="body2">{vehicle.fuelLevel}%</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">נסיעות החודש</Typography>
                        <Typography variant="h6">{vehicle.monthlyKm}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">ציוד</Typography>
                        <Typography variant="body2">{vehicle.equipment?.length || 0}</Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Action buttons */}
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                    <Tooltip title="דווח תקלה">
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          setIssueDialogOpen(true);
                        }}
                      >
                        <MaintenanceNeededIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="עדכן דלק">
                      <IconButton 
                        size="small"
                        onClick={() => {
                          const newLevel = prompt('רמת דלק חדשה (0-100):', vehicle.fuelLevel.toString());
                          if (newLevel && !isNaN(Number(newLevel))) {
                            handleUpdateFuel(vehicle.id, Math.max(0, Math.min(100, Number(newLevel))));
                          }
                        }}
                      >
                        <FuelIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="ערוך רכב">
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          setVehicleForm({
                            vehicleNumber: vehicle.vehicleNumber,
                            type: vehicle.type,
                            model: vehicle.model,
                            year: vehicle.year,
                            licenseRequired: vehicle.licenseRequired,
                            maxPassengers: vehicle.maxPassengers || 5,
                            fuelCapacity: vehicle.fuelCapacity,
                            currentKm: vehicle.currentKm,
                            equipment: vehicle.equipment?.join(', ') || '',
                            notes: vehicle.notes || ''
                          });
                          setVehicleDialogOpen(true);
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

        {vehicles.length === 0 && (
          <Alert severity="info">
            אין רכבים במערכת. לחץ על הכפתור + להוספת רכב חדש.
          </Alert>
        )}
      </Box>

      {/* Create/Edit Vehicle Dialog */}
      <Dialog open={vehicleDialogOpen} onClose={() => {
        setVehicleDialogOpen(false);
        resetVehicleForm();
      }} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedVehicle ? 'עריכת רכב' : 'רכב חדש'}
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
              label="מספר רכב"
              value={vehicleForm.vehicleNumber}
              onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>סוג רכב</InputLabel>
              <Select
                value={vehicleForm.type}
                onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value as Vehicle['type'] })}
                label="סוג רכב"
              >
                {vehicleTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="דגם"
              value={vehicleForm.model}
              onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
            />

            <TextField
              fullWidth
              label="שנת יצור"
              type="number"
              value={vehicleForm.year}
              onChange={(e) => setVehicleForm({ ...vehicleForm, year: Number(e.target.value) })}
            />

            <TextField
              fullWidth
              label="מספר מקומות"
              type="number"
              value={vehicleForm.maxPassengers}
              onChange={(e) => setVehicleForm({ ...vehicleForm, maxPassengers: Number(e.target.value) })}
            />

            <TextField
              fullWidth
              label="קיבולת דלק (ליטר)"
              type="number"
              value={vehicleForm.fuelCapacity}
              onChange={(e) => setVehicleForm({ ...vehicleForm, fuelCapacity: Number(e.target.value) })}
            />

            <TextField
              fullWidth
              label="קילומטרז' נוכחי"
              type="number"
              value={vehicleForm.currentKm}
              onChange={(e) => setVehicleForm({ ...vehicleForm, currentKm: Number(e.target.value) })}
            />

            <TextField
              fullWidth
              label="ציוד (מופרד בפסיקים)"
              value={vehicleForm.equipment}
              onChange={(e) => setVehicleForm({ ...vehicleForm, equipment: e.target.value })}
            />

            <TextField
              fullWidth
              label="הערות"
              multiline
              rows={3}
              value={vehicleForm.notes}
              onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
              sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setVehicleDialogOpen(false);
            resetVehicleForm();
          }}>
            ביטול
          </Button>
          <Button onClick={handleCreateVehicle} variant="contained">
            {selectedVehicle ? 'עדכן' : 'צור רכב'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Report Issue Dialog */}
      <Dialog open={issueDialogOpen} onClose={() => setIssueDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          דיווח תקלה - {selectedVehicle?.vehicleNumber}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: 2, 
            mt: 1 
          }}>
            <FormControl fullWidth>
              <InputLabel>סוג תקלה</InputLabel>
              <Select
                value={issueForm.type}
                onChange={(e) => setIssueForm({ ...issueForm, type: e.target.value as VehicleIssue['type'] })}
                label="סוג תקלה"
              >
                {issueTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>חומרת התקלה</InputLabel>
              <Select
                value={issueForm.severity}
                onChange={(e) => setIssueForm({ ...issueForm, severity: e.target.value as VehicleIssue['severity'] })}
                label="חומרת התקלה"
              >
                {severityLevels.map((level) => (
                  <MenuItem key={level.value} value={level.value}>
                    {level.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="תיאור התקלה"
              multiline
              rows={4}
              value={issueForm.description}
              onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleReportIssue} variant="contained">
            דווח תקלה
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Vehicles; 