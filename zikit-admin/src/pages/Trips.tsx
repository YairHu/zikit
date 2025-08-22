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
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Group as GroupIcon,
  Person as PersonIcon,
  Star as StarIcon,
  ExpandMore as ExpandMoreIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DirectionsCar as DirectionsCarIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Add as AddIcon,
  LocalGasStation as FuelIcon,
  Build as MaintenanceIcon,
  CheckCircle as AvailableIcon,
  Warning as WarningIcon,
  TripOrigin as TripIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { Trip } from '../models/Trip';
import { Vehicle } from '../models/Vehicle';

import { Soldier } from '../models/Soldier';
import { Activity } from '../models/Activity';
import { getAllTrips, addTrip, updateTrip, deleteTrip, checkAvailability, checkAdvancedAvailability, setDriverRest, updateDriverStatuses, updateDriverStatusByTrip, getDriversWithRequiredLicense, getVehiclesCompatibleWithDriver, updateTripStatusesAutomatically, updateTripActualTimes } from '../services/tripService';
import { getAllVehicles, addVehicle, updateVehicle, deleteVehicle } from '../services/vehicleService';
import { getAllSoldiers, updateSoldier } from '../services/soldierService';
import { getAllActivities, updateActivity } from '../services/activityService';
import { getAllFrameworks } from '../services/frameworkService';
import { UserRole, SystemPath, PermissionLevel, DataScope } from '../models/UserRole';
import { canUserAccessPath, getUserPermissions } from '../services/permissionService';
import TripsDashboard from '../components/TripsDashboard';
import TripsTimeline from '../components/TripsTimeline';

const Trips: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Soldier[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Soldier[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [activeTab, setActiveTab] = useState(1); // ציר זמן ברירת מחדל
  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    vehicleId: '',
    driverId: '',
    commanderId: '',
    location: '',
    departureTime: '',
    returnTime: '',
    purpose: '',
    status: 'מתוכננת' as 'מתוכננת' | 'בביצוע' | 'הסתיימה'
  });
  const [error, setError] = useState<string | null>(null);
  const [openVehicleForm, setOpenVehicleForm] = useState(false);
  const [editVehicleId, setEditVehicleId] = useState<string | null>(null);
  const [vehicleFormData, setVehicleFormData] = useState({
    type: '',
    number: '',
    mileage: 0,
    lastMaintenance: '',
    nextMaintenance: '',
    seats: 0,
    status: 'available' as 'available' | 'on_mission' | 'maintenance',
    requiredLicense: ''
  });
  
  // דיאלוג היתרי נהיגה
  const [openLicenseDialog, setOpenLicenseDialog] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Soldier | null>(null);
  const [licenseFormData, setLicenseFormData] = useState({
    drivingLicenses: ''
  });

  // דיאלוגי שינוי סטטוס נסיעה
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [statusAction, setStatusAction] = useState<'start' | 'end'>('start');
  const [statusFormData, setStatusFormData] = useState({
    actualTime: '',
    actualDepartureTime: ''
  });
  
  // צ'קבוקס להצגת נסיעות שהסתיימו
  const [showCompletedTrips, setShowCompletedTrips] = useState(false);
  
  // תצוגה של רכבים ונהגים
  const [vehiclesViewMode, setVehiclesViewMode] = useState<'cards' | 'table'>('cards');
  const [driversViewMode, setDriversViewMode] = useState<'cards' | 'table'>('cards');
  
  // התראה על התנגשות שעות מנוחה
  const [restConflictAlert, setRestConflictAlert] = useState<{
    show: boolean;
    message: string;
    conflicts: Array<{
      tripId: string;
      tripPurpose: string;
      departureTime: string;
      returnTime: string;
    }>;
  }>({
    show: false,
    message: '',
    conflicts: []
  });

  // דיאלוג עדכון זמנים בפועל
  const [actualTimesDialog, setActualTimesDialog] = useState<{
    open: boolean;
    trip: Trip | null;
    actualDepartureTime: string;
    actualReturnTime: string;
  }>({
    open: false,
    trip: null,
    actualDepartureTime: '',
    actualReturnTime: ''
  });

  // הרשאות
  const [permissions, setPermissions] = useState({
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false
  });

  // פונקציה למציאת החייל של המשתמש
  const findUserSoldier = (soldiers: Soldier[], user: any): Soldier | null => {
    // חיפוש לפי email
    let soldier = soldiers.find(s => s.email === user.email);
    if (soldier) return soldier;
    
    // חיפוש לפי personalNumber אם יש
    if (user.personalNumber) {
      soldier = soldiers.find(s => s.personalNumber === user.personalNumber);
      if (soldier) return soldier;
    }
    
    // חיפוש לפי name
    if (user.displayName) {
      soldier = soldiers.find(s => s.name === user.displayName);
      if (soldier) return soldier;
    }
    
    return null;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // עדכון אוטומטי של סטטוס נסיעות
      await updateTripStatusesAutomatically();
      
      // בדיקת הרשאות המשתמש
      if (user) {
        const canView = await canUserAccessPath(user.uid, SystemPath.TRIPS, PermissionLevel.VIEW);
        const canCreate = await canUserAccessPath(user.uid, SystemPath.TRIPS, PermissionLevel.CREATE);
        const canEdit = await canUserAccessPath(user.uid, SystemPath.TRIPS, PermissionLevel.EDIT);
        const canDelete = await canUserAccessPath(user.uid, SystemPath.TRIPS, PermissionLevel.DELETE);
        
        setPermissions({ canView, canCreate, canEdit, canDelete });
        
        // אם אין הרשאת צפייה - לא טוען נתונים
        if (!canView) {
          setTrips([]);
          setVehicles([]);
          setSoldiers([]);
          setActivities([]);
          setDrivers([]);
          return;
        }
      }

      const [tripsData, vehiclesData, soldiersData, activitiesData, frameworksData] = await Promise.all([
        getAllTrips(),
        getAllVehicles(),
        getAllSoldiers(),
        getAllActivities(),
        getAllFrameworks()
      ]);
      
      // טעינת נסיעות לפי הרשאות המשתמש
      let filteredTrips = tripsData;
      if (user) {
        // קבלת הרשאות המשתמש עם פרטי המדיניות
        const userPermissions = await getUserPermissions(user.uid);
        
        // חיפוש מדיניות שמתאימה לנסיעות
        const tripsPolicy = userPermissions.policies.find(policy => 
          policy.paths.includes(SystemPath.TRIPS)
        );
        
        if (tripsPolicy) {
          // טעינת נסיעות לפי היקף הנתונים
          switch (tripsPolicy.dataScope) {
            case DataScope.USER_ONLY:
              // נתוני משתמש בלבד - רק נסיעות שהמשתמש משתתף בהן
              const userSoldierForUserOnly = findUserSoldier(soldiersData, user);
              if (userSoldierForUserOnly) {
                filteredTrips = tripsData.filter(trip => 
                  (trip.driverId && trip.driverId === userSoldierForUserOnly.id) || 
                  (trip.commanderId && trip.commanderId === userSoldierForUserOnly.id)
                );
              } else {
                filteredTrips = [];
              }
              break;
            
            case DataScope.FRAMEWORK_ONLY:
              // נתוני המסגרת שלו - נסיעות שבהן יש משתתף מהמסגרת (כולל מסגרות-בנות)
              const userSoldier = findUserSoldier(soldiersData, user);
              if (userSoldier?.frameworkId) {
                // פונקציה למציאת כל החיילים בהיררכיה כולל מסגרות-בנות
                const getAllSoldiersInHierarchy = (frameworkId: string): string[] => {
                  const directSoldiers = soldiersData.filter(s => s.frameworkId === frameworkId).map(s => s.id);
                  const childFrameworks = frameworksData.filter(f => f.parentFrameworkId === frameworkId);
                  const childSoldiers = childFrameworks.flatMap(child => getAllSoldiersInHierarchy(child.id));
                  return [...directSoldiers, ...childSoldiers];
                };
                
                // קבלת כל החיילים בהיררכיה
                const allSoldiersInHierarchy = getAllSoldiersInHierarchy(userSoldier.frameworkId);
                
                filteredTrips = tripsData.filter(trip => {
                  return (trip.driverId && allSoldiersInHierarchy.includes(trip.driverId)) || 
                         (trip.commanderId && allSoldiersInHierarchy.includes(trip.commanderId));
                });
              } else {
                // אם לא נמצאה מסגרת - רק הנסיעות של המשתמש
                if (userSoldier) {
                                  filteredTrips = tripsData.filter(trip => 
                  (trip.driverId && trip.driverId === userSoldier.id) || 
                  (trip.commanderId && trip.commanderId === userSoldier.id)
                );
                } else {
                  filteredTrips = [];
                }
              }
              break;
            
            case DataScope.ALL_DATA:
            default:
              // כלל הנתונים - כל הנסיעות
              filteredTrips = tripsData;
              break;
          }
        } else {
          // אם אין מדיניות מתאימה - רק הנסיעות של המשתמש
          const userSoldierForDefault = findUserSoldier(soldiersData, user);
          if (userSoldierForDefault) {
            filteredTrips = tripsData.filter(trip => 
              (trip.driverId && trip.driverId === userSoldierForDefault.id) || 
              (trip.commanderId && trip.commanderId === userSoldierForDefault.id)
            );
          } else {
            filteredTrips = [];
          }
        }
      }
      
      setTrips(filteredTrips);
      setVehicles(vehiclesData);
      setFilteredVehicles(vehiclesData); // התחלתי - כל הרכבים
      setSoldiers(soldiersData);
      setActivities(activitiesData);
      setFrameworks(frameworksData);

      // סינון נהגים מתוך החיילים
      const driversData = soldiersData.filter(soldier => 
        soldier.qualifications?.includes('נהג')
      );
      setDrivers(driversData);
      setFilteredDrivers(driversData); // התחלתי - כל הנהגים
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // עדכון סטטוס נהגים רק בטעינת העמוד
  useEffect(() => {
    const updateStatuses = async () => {
      try {
        await updateDriverStatuses();
      } catch (error) {
        console.error('שגיאה בעדכון סטטוס נהגים:', error);
      }
    };
    
    updateStatuses();
  }, []); // רק בטעינת העמוד

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddTrip = () => {
    // בדיקת הרשאות
    if (!permissions.canCreate) {
      alert('אין לך הרשאה ליצור נסיעות');
      return;
    }
    
    setEditId(null);
    setFormData({
      vehicleId: '',
      driverId: '',
      commanderId: '',
      location: '',
      departureTime: '',
      returnTime: '',
      purpose: '',
      status: 'מתוכננת'
    });
    setError(null);
    setOpenForm(true);
  };

  const handleCreateTripFromTimeline = (tripData: {
    departureTime: string;
    returnTime: string;
    vehicleId?: string;
    driverId?: string;
  }) => {
    // בדיקת הרשאות
    if (!permissions.canCreate) {
      alert('אין לך הרשאה ליצור נסיעות');
      return;
    }
    
    setEditId(null);
    setFormData({
      vehicleId: tripData.vehicleId || '',
      driverId: tripData.driverId || '',
      commanderId: '',
      location: '',
      departureTime: formatDateTimeForInput(tripData.departureTime),
      returnTime: formatDateTimeForInput(tripData.returnTime),
      purpose: '',
      status: 'מתוכננת'
    });
    setError(null);
    setOpenForm(true);
  };

  // פונקציה להמרת זמן לפורמט datetime-local (זמן ישראל)
  const formatDateTimeForInput = (dateString: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // המרה לזמן ישראל עם אזור זמן נכון
    const israelTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
    
    // המרה לפורמט datetime-local
    const year = israelTime.getFullYear();
    const month = String(israelTime.getMonth() + 1).padStart(2, '0');
    const day = String(israelTime.getDate()).padStart(2, '0');
    const hours = String(israelTime.getHours()).padStart(2, '0');
    const minutes = String(israelTime.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // פתיחת דיאלוג עדכון זמנים בפועל
  const handleOpenActualTimesDialog = (trip: Trip) => {
    setActualTimesDialog({
      open: true,
      trip: trip,
      actualDepartureTime: trip.actualDepartureTime || trip.departureTime,
      actualReturnTime: trip.actualReturnTime || trip.returnTime
    });
  };

  // סגירת דיאלוג עדכון זמנים בפועל
  const handleCloseActualTimesDialog = () => {
    setActualTimesDialog({
      open: false,
      trip: null,
      actualDepartureTime: '',
      actualReturnTime: ''
    });
  };

  // שמירת זמנים בפועל
  const handleSaveActualTimes = async () => {
    if (!actualTimesDialog.trip) return;

    try {
      await updateTripActualTimes(
        actualTimesDialog.trip.id,
        actualTimesDialog.actualDepartureTime,
        actualTimesDialog.actualReturnTime
      );
      
      // רענון הנתונים
      await loadData();
      handleCloseActualTimesDialog();
    } catch (error) {
      console.error('שגיאה בעדכון זמנים בפועל:', error);
    }
  };

  const handleEditTrip = (trip: Trip) => {
    // בדיקת הרשאות
    if (!permissions.canEdit) {
      alert('אין לך הרשאה לערוך נסיעות');
      return;
    }
    
    setEditId(trip.id);
    
    setFormData({
      vehicleId: trip.vehicleId || '',
      driverId: trip.driverId || '',
      commanderId: trip.commanderId || '',
      location: trip.location,
      departureTime: formatDateTimeForInput(trip.departureTime || ''),
      returnTime: formatDateTimeForInput(trip.returnTime || ''),
      purpose: trip.purpose,
      status: trip.status
    });
    setError(null);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditId(null);
    setFormData({
      vehicleId: '',
      driverId: '',
      commanderId: '',
      location: '',
      departureTime: '',
      returnTime: '',
      purpose: '',
      status: 'מתוכננת'
    });
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // אם נבחר רכב, סנן נהגים לפי היתר נדרש
    if (name === 'vehicleId' && value) {
      filterDriversByVehicle(value);
    } else if (name === 'vehicleId' && !value) {
      // אם לא נבחר רכב, הצג את כל הנהגים
      setFilteredDrivers(drivers);
    }

    // אם נבחר נהג, סנן רכבים לפי היתרי הנהג
    if (name === 'driverId' && value) {
      filterVehiclesByDriver(value);
    } else if (name === 'driverId' && !value) {
      // אם לא נבחר נהג, הצג את כל הרכבים
      setFilteredVehicles(vehicles);
    }
  };

  const filterDriversByVehicle = async (vehicleId: string) => {
    try {
      const selectedVehicle = vehicles.find(v => v.id === vehicleId);
      if (selectedVehicle?.requiredLicense) {
        const compatibleDrivers = await getDriversWithRequiredLicense(selectedVehicle.requiredLicense);
        setFilteredDrivers(compatibleDrivers);
        
        // בדוק אם הנהג הנבחר עדיין תואם
        if (formData.driverId && !compatibleDrivers.find(d => d.id === formData.driverId)) {
          setFormData(prev => ({ ...prev, driverId: '' }));
        }
      } else {
        // אם אין היתר נדרש, הצג את כל הנהגים
        setFilteredDrivers(drivers);
      }
    } catch (error) {
      console.error('שגיאה בסינון נהגים:', error);
      setFilteredDrivers(drivers);
    }
  };

  const filterVehiclesByDriver = async (driverId: string) => {
    try {
      const selectedDriver = drivers.find(d => d.id === driverId);
      if (selectedDriver?.drivingLicenses && selectedDriver.drivingLicenses.length > 0) {
        const compatibleVehicles = await getVehiclesCompatibleWithDriver(selectedDriver.drivingLicenses);
        setFilteredVehicles(compatibleVehicles);
        
        // בדוק אם הרכב הנבחר עדיין תואם
        if (formData.vehicleId && !compatibleVehicles.find(v => v.id === formData.vehicleId)) {
          setFormData(prev => ({ ...prev, vehicleId: '' }));
        }
      } else {
        // אם אין היתרים, הצג את כל הרכבים
        setFilteredVehicles(vehicles);
      }
    } catch (error) {
      console.error('שגיאה בסינון רכבים:', error);
      setFilteredVehicles(vehicles);
    }
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // אם נבחר רכב, סנן נהגים לפי היתר נדרש
    if (name === 'vehicleId' && value) {
      filterDriversByVehicle(value);
    } else if (name === 'vehicleId' && !value) {
      // אם לא נבחר רכב, הצג את כל הנהגים
      setFilteredDrivers(drivers);
    }

    // אם נבחר נהג, סנן רכבים לפי היתרי הנהג
    if (name === 'driverId' && value) {
      filterVehiclesByDriver(value);
    } else if (name === 'driverId' && !value) {
      // אם לא נבחר נהג, הצג את כל הרכבים
      setFilteredVehicles(vehicles);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // בדיקת הרשאות
    if (editId && !permissions.canEdit) {
      alert('אין לך הרשאה לערוך נסיעות');
      return;
    }
    if (!editId && !permissions.canCreate) {
      alert('אין לך הרשאה ליצור נסיעות');
      return;
    }
    
    try {
      // בדיקת שדות חובה
      if (!formData.departureTime || !formData.returnTime) {
        setError('שעת יציאה ושעת חזרה הן שדות חובה');
        return;
      }

      // בדיקת זמן חזרה אחרי זמן יציאה
      const departureDate = new Date(formData.departureTime);
      const returnDate = new Date(formData.returnTime);
      if (returnDate <= departureDate) {
        setError('זמן חזרה חייב להיות אחרי זמן יציאה');
        return;
      }

      // בדיקת זמינות מתקדמת אם יש רכב ונהג
      if (formData.vehicleId && formData.driverId) {
        const availability = await checkAdvancedAvailability(
          formData.vehicleId,
          formData.driverId,
          formData.departureTime,
          formData.returnTime,
          editId || undefined
        );
        
        if (!availability.isAvailable) {
          setError(availability.message || 'הרכב או הנהג לא זמינים לנסיעה בזמן זה');
          return;
        }
      }

      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
      const selectedDriver = drivers.find(d => d.id === formData.driverId);
      const selectedCommander = soldiers.find(s => s.id === formData.commanderId);

      // יצירת אובייקט נסיעה ללא ערכים ריקים/undefined (Firebase לא תומך)
      const tripData: any = {
        location: formData.location || '',
        purpose: formData.purpose || '',
        status: formData.status
      };

      // הוספת שדות אופציונליים רק אם יש להם ערכים תקינים
      if (formData.vehicleId && formData.vehicleId.trim()) {
        tripData.vehicleId = formData.vehicleId;
        if (selectedVehicle?.number) {
          tripData.vehicleNumber = selectedVehicle.number;
        }
        if (selectedVehicle?.type) {
          tripData.vehicleType = selectedVehicle.type;
        }
      }

      if (formData.driverId && formData.driverId.trim()) {
        tripData.driverId = formData.driverId;
        if (selectedDriver?.name) {
          tripData.driverName = selectedDriver.name;
        }
      }

      if (formData.commanderId && formData.commanderId.trim()) {
        tripData.commanderId = formData.commanderId;
        if (selectedCommander?.name) {
          tripData.commanderName = selectedCommander.name;
        }
      }

      if (formData.departureTime && formData.departureTime.trim()) {
        tripData.departureTime = formData.departureTime;
      }

      if (formData.returnTime && formData.returnTime.trim()) {
        tripData.returnTime = formData.returnTime;
      }



      let tripId: string;
      
      if (editId) {
        // מציאת הנסיעה הקיימת לפני העדכון
        const existingTrip = trips.find(t => t.id === editId);
        
        // הסרת הנסיעה מעמוד האישי של הנהג הקודם
        if (existingTrip?.driverId && existingTrip.driverId !== formData.driverId) {
          const oldDriver = soldiers.find(s => s.id === existingTrip.driverId);
          if (oldDriver) {
            const currentTrips = oldDriver.trips || [];
            const updatedTrips = currentTrips.filter(id => id !== editId);
            await updateSoldier(existingTrip.driverId, {
              trips: updatedTrips
            });
          }
        }
        
        // הסרת הנסיעה מעמוד האישי של מפקד הנסיעה הקודם
        if (existingTrip?.commanderId && existingTrip.commanderId !== formData.commanderId) {
          const oldCommander = soldiers.find(s => s.id === existingTrip.commanderId);
          if (oldCommander) {
            const currentTrips = oldCommander.trips || [];
            const updatedTrips = currentTrips.filter(id => id !== editId);
            await updateSoldier(existingTrip.commanderId, {
              trips: updatedTrips
            });
          }
        }
        
        await updateTrip(editId, tripData);
        tripId = editId;
      } else {
        tripId = await addTrip(tripData);
      }

      // עדכון עמוד האישי של הנהג החדש
      if (formData.driverId && selectedDriver) {
        const currentTrips = selectedDriver.trips || [];
        if (!currentTrips.includes(tripId)) {
          await updateSoldier(formData.driverId, {
            trips: [...currentTrips, tripId]
          });
        }
      }

      // עדכון עמוד האישי של מפקד הנסיעה החדש
      if (formData.commanderId && selectedCommander) {
        const currentTrips = selectedCommander.trips || [];
        if (!currentTrips.includes(tripId)) {
          await updateSoldier(formData.commanderId, {
            trips: [...currentTrips, tripId]
          });
        }
      }

      // עדכון פעילויות מקושרות
      if (editId) {
        const existingTrip = trips.find(t => t.id === editId);
        if (existingTrip) {
          await updateLinkedActivities(editId, existingTrip, tripData);
        }
      }

      // עדכון סטטוס נהג אם הנסיעה הסתיימה
      if (tripData.status === 'הסתיימה' && formData.driverId && formData.returnTime) {
        await setDriverRest(formData.driverId, formData.returnTime);
      }

      // עדכון סטטוס נהג אם הנסיעה מתחילה
      if (tripData.status === 'בביצוע' && formData.driverId) {
        await updateSoldier(formData.driverId, {
          status: 'on_trip'
        });
      }

      // עדכון סטטוס נהג אם הנסיעה מבוטלת
      if (tripData.status === 'בוטלה' && formData.driverId) {
        await updateSoldier(formData.driverId, {
          status: 'available'
        });
      }

      handleCloseForm();
      loadData();
    } catch (error) {
      console.error('שגיאה בשמירת נסיעה:', error);
      setError('שגיאה בשמירת הנסיעה');
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    // בדיקת הרשאות
    if (!permissions.canDelete) {
      alert('אין לך הרשאה למחוק נסיעות');
      return;
    }
    
    if (window.confirm('האם אתה בטוח שברצונך למחוק נסיעה זו?')) {
      try {
        // מציאת הנסיעה לפני המחיקה
        const tripToDelete = trips.find(t => t.id === tripId);
        
        if (tripToDelete) {
          // הסרת הנסיעה מעמוד האישי של הנהג
          if (tripToDelete.driverId) {
            const driver = soldiers.find(s => s.id === tripToDelete.driverId);
            if (driver) {
              const currentTrips = driver.trips || [];
              const updatedTrips = currentTrips.filter(id => id !== tripId);
              await updateSoldier(tripToDelete.driverId, {
                trips: updatedTrips
              });
            }
          }
          
          // הסרת הנסיעה מעמוד האישי של מפקד הנסיעה
          if (tripToDelete.commanderId) {
            const commander = soldiers.find(s => s.id === tripToDelete.commanderId);
            if (commander) {
              const currentTrips = commander.trips || [];
              const updatedTrips = currentTrips.filter(id => id !== tripId);
              await updateSoldier(tripToDelete.commanderId, {
                trips: updatedTrips
              });
            }
          }
        }
        
        // עדכון פעילויות מקושרות לפני המחיקה
        await updateLinkedActivities(tripId, tripToDelete);
        
        // עדכון סטטוס נהג לפני המחיקה
        if (tripToDelete?.driverId) {
          await updateSoldier(tripToDelete.driverId, {
            status: 'available'
          });
        }
        
        await deleteTrip(tripId);
        loadData();
      } catch (error) {
        console.error('שגיאה במחיקת נסיעה:', error);
      }
    }
  };

  // פונקציות לניהול רכבים
  const handleAddVehicle = () => {
    setEditVehicleId(null);
    setVehicleFormData({
      type: '',
      number: '',
      mileage: 0,
      lastMaintenance: '',
      nextMaintenance: '',
      seats: 0,
      status: 'available',
      requiredLicense: ''
    });
    setOpenVehicleForm(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditVehicleId(vehicle.id);
    setVehicleFormData({
      type: vehicle.type,
      number: vehicle.number,
      mileage: vehicle.mileage,
      lastMaintenance: vehicle.lastMaintenance,
      nextMaintenance: vehicle.nextMaintenance,
      seats: vehicle.seats,
      status: vehicle.status,
      requiredLicense: vehicle.requiredLicense || ''
    });
    setOpenVehicleForm(true);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק רכב זה?')) {
      return;
    }

    try {
      await deleteVehicle(vehicleId);
      await loadData();
      alert('רכב נמחק בהצלחה!');
    } catch (error) {
      console.error('שגיאה במחיקת רכב:', error);
      alert('שגיאה במחיקת רכב');
    }
  };

  const handleCloseVehicleForm = () => {
    setOpenVehicleForm(false);
    setEditVehicleId(null);
    setVehicleFormData({
      type: '',
      number: '',
      mileage: 0,
      lastMaintenance: '',
      nextMaintenance: '',
      seats: 0,
      status: 'available',
      requiredLicense: ''
    });
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVehicleFormData(prev => ({
      ...prev,
      [name]: name === 'mileage' || name === 'seats' ? parseInt(value) || 0 : value
    }));
  };

  const handleVehicleSelectChange = (name: string, value: any) => {
    setVehicleFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // פונקציות לטיפול בהיתרי נהיגה
  const handleOpenLicenseDialog = (driver: Soldier) => {
    setSelectedDriver(driver);
    setLicenseFormData({
      drivingLicenses: (driver.drivingLicenses || []).join(', ')
    });
    setOpenLicenseDialog(true);
  };

  const handleCloseLicenseDialog = () => {
    setOpenLicenseDialog(false);
    setSelectedDriver(null);
    setLicenseFormData({
      drivingLicenses: ''
    });
  };

  const handleLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLicenseFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDriver) return;
    
    try {
      const drivingLicenses = licenseFormData.drivingLicenses
        .split(',')
        .map(license => license.trim())
        .filter(license => license.length > 0);
      
      await updateSoldier(selectedDriver.id, {
        drivingLicenses
      });
      
      handleCloseLicenseDialog();
      loadData(); // רענון הנתונים
      alert('היתרי הנהיגה עודכנו בהצלחה!');
    } catch (error) {
      console.error('שגיאה בעדכון היתרי נהיגה:', error);
      alert('שגיאה בעדכון היתרי נהיגה');
    }
  };

  // פונקציות לשינוי סטטוס נסיעה
  const handleStartTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setStatusAction('start');
    // שימוש בשעת יציאה מהכרטיס עם המרה לזמן ישראל
    const formattedTime = formatDateTimeForInput(trip.departureTime);
    setStatusFormData({ 
      actualTime: formattedTime,
      actualDepartureTime: ''
    });
    setOpenStatusDialog(true);
  };

  const handleEndTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setStatusAction('end');
    // שימוש בשעת חזרה מהכרטיס עם המרה לזמן ישראל
    const formattedTime = formatDateTimeForInput(trip.returnTime);
    setStatusFormData({ 
      actualTime: formattedTime,
      actualDepartureTime: trip.actualDepartureTime || trip.departureTime
    });
    setOpenStatusDialog(true);
  };

  const handleCloseStatusDialog = () => {
    setOpenStatusDialog(false);
    setSelectedTrip(null);
    setStatusFormData({ 
      actualTime: '',
      actualDepartureTime: ''
    });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusFormData(prev => ({ 
      ...prev,
      actualTime: e.target.value 
    }));
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTrip || !statusFormData.actualTime) return;
    
    try {
      let updatedTrip: any = { ...selectedTrip };
      
      if (statusAction === 'start') {
        // התחלת נסיעה
        updatedTrip.departureTime = statusFormData.actualTime;
        updatedTrip.status = 'בביצוע';
      } else if (statusAction === 'end') {
        // סיום נסיעה
        updatedTrip.returnTime = statusFormData.actualTime;
        updatedTrip.status = 'הסתיימה';
        
        // עדכון זמן התחלה בפועל אם הוזן
        if (statusFormData.actualDepartureTime) {
          updatedTrip.actualDepartureTime = statusFormData.actualDepartureTime;
        }
        
        // בדיקת התנגשויות שעות מנוחה
        if (selectedTrip.driverId) {
          const restEndTime = new Date(statusFormData.actualTime);
          restEndTime.setHours(restEndTime.getHours() + 7);
          
          const conflicts = trips.filter(trip => 
            trip.driverId === selectedTrip.driverId && 
            trip.status === 'מתוכננת' &&
            new Date(trip.departureTime) < restEndTime
          );

          if (conflicts.length > 0) {
            const conflictDetails = conflicts.map(trip => ({
              tripId: trip.id,
              tripPurpose: trip.purpose,
              departureTime: trip.departureTime,
              returnTime: trip.returnTime
            }));

            const message = `הנהג נכנס למנוחה עד ${restEndTime.toLocaleString('he-IL')}. 
            יש ${conflicts.length} נסיעות מתוכננות שמתנגשות עם שעות המנוחה:`;

            setRestConflictAlert({
              show: true,
              message,
              conflicts: conflictDetails
            });
          }
        }
      }

      // עדכון הנסיעה
      await updateTrip(selectedTrip.id, updatedTrip);

      // עדכון סטטוס נהג ורכב
      if (selectedTrip.driverId) {
        if (statusAction === 'start') {
          // נהג מתחיל נסיעה
          await updateSoldier(selectedTrip.driverId, { status: 'on_trip' });
        } else if (statusAction === 'end') {
          // נהג מסיים נסיעה - מנוחה של 7 שעות
          await setDriverRest(selectedTrip.driverId, statusFormData.actualTime);
        }
      }

      // עדכון סטטוס רכב
      if (selectedTrip.vehicleId) {
        const vehicle = vehicles.find(v => v.id === selectedTrip.vehicleId);
        if (vehicle) {
          if (statusAction === 'start') {
            await updateVehicle(selectedTrip.vehicleId, { status: 'on_mission' });
          } else if (statusAction === 'end') {
            await updateVehicle(selectedTrip.vehicleId, { status: 'available' });
          }
        }
      }

      handleCloseStatusDialog();
      loadData();
      
      const actionText = statusAction === 'start' ? 'החלה' : 'הסתיימה';
      alert(`הנסיעה ${actionText} בהצלחה!`);
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס נסיעה:', error);
      alert('שגיאה בעדכון סטטוס הנסיעה');
    }
  };

  // פונקציה לעדכון פעילויות שמקושרות לנסיעה
  const updateLinkedActivities = async (tripId: string, oldTrip?: Trip, newTrip?: Trip) => {
    try {
      // מציאת כל הפעילויות שמקושרות לנסיעה זו
      const linkedActivities = activities.filter(activity => 
        activity.mobility && activity.mobility.includes(`TRIP_ID:${tripId}`)
      );

      for (const activity of linkedActivities) {
        let updatedParticipants = [...activity.participants];
        let updatedMobility = activity.mobility;

        // אם הנסיעה נמחקה
        if (!newTrip && oldTrip) {
          // הסרת הנסיעה מהניוד
          updatedMobility = (activity.mobility || '')
            .split(';')
            .map(mobilityItem => mobilityItem.trim())
            .filter(mobilityItem => !mobilityItem.includes(`TRIP_ID:${tripId}`))
            .join('; ');

          // הסרת הנהג ומפקד הנסיעה מהמשתתפים
          if (oldTrip.driverId) {
            updatedParticipants = updatedParticipants.filter(p => p.soldierId !== oldTrip.driverId);
          }
          if (oldTrip.commanderId) {
            updatedParticipants = updatedParticipants.filter(p => p.soldierId !== oldTrip.commanderId);
          }
        }
        // אם הנסיעה עודכנה
        else if (newTrip && oldTrip) {
          // עדכון הנהג
          if (oldTrip.driverId !== newTrip.driverId) {
            // טיפול בנהג הישן
            if (oldTrip.driverId) {
              const oldDriverParticipant = updatedParticipants.find(p => p.soldierId === oldTrip.driverId);
              if (oldDriverParticipant) {
                // בדיקה אם יש לו תפקיד נוסף (נהג נוסף)
                if (oldDriverParticipant.role.includes('נהג') && oldDriverParticipant.role !== 'נהג') {
                  // החזרת התפקיד המקורי
                  const originalRole = oldDriverParticipant.role.replace(/נהג [^,]+/, '').trim();
                  oldDriverParticipant.role = originalRole || 'משתתף';
                  // הסרת השיבוץ לרכב
                  oldDriverParticipant.vehicleId = '';
                } else if (oldDriverParticipant.role === 'נהג' || oldDriverParticipant.role.startsWith('נהג ')) {
                  // אם הוא רק נהג, להסיר אותו לגמרי
                  updatedParticipants = updatedParticipants.filter(p => p.soldierId !== oldTrip.driverId);
                }
              }
            }
            
            // הוספת הנהג החדש
            if (newTrip.driverId && newTrip.driverName) {
              const driver = soldiers.find(s => s.id === newTrip.driverId);
              if (driver) {
                const vehicle = vehicles.find(v => v.id === newTrip.vehicleId);
                const vehicleType = vehicle ? vehicle.type : '';
                const roleText = vehicleType ? `נהג ${vehicleType}` : 'נהג';
                
                // בדיקה אם הנהג כבר משתתף
                const existingParticipant = updatedParticipants.find(p => p.soldierId === newTrip.driverId);
                if (existingParticipant) {
                  // עדכון התפקיד הקיים
                  existingParticipant.role = roleText;
                  // שיבוץ אוטומטי לרכב
                  existingParticipant.vehicleId = newTrip.vehicleId || '';
                } else {
                  // הוספת נהג חדש
                  updatedParticipants.push({
                    soldierId: newTrip.driverId,
                    soldierName: newTrip.driverName,
                    personalNumber: driver.personalNumber,
                    role: roleText,
                    vehicleId: newTrip.vehicleId || ''
                  });
                }
              }
            }
          }

          // עדכון מפקד הנסיעה
          if (oldTrip.commanderId !== newTrip.commanderId) {
            // טיפול במפקד הנסיעה הישן
            if (oldTrip.commanderId) {
              const oldCommanderParticipant = updatedParticipants.find(p => p.soldierId === oldTrip.commanderId);
              if (oldCommanderParticipant) {
                // בדיקה אם יש לו תפקיד נוסף (מפקד נסיעה נוסף)
                if (oldCommanderParticipant.role.includes(' - מפקד נסיעה')) {
                  // החזרת התפקיד המקורי
                  const originalRole = oldCommanderParticipant.role.split(' - מפקד נסיעה')[0];
                  oldCommanderParticipant.role = originalRole;
                  // הסרת השיבוץ לרכב
                  oldCommanderParticipant.vehicleId = '';
                } else if (oldCommanderParticipant.role === 'מפקד נסיעה') {
                  // אם הוא רק מפקד נסיעה, להסיר אותו לגמרי
                  updatedParticipants = updatedParticipants.filter(p => p.soldierId !== oldTrip.commanderId);
                }
              }
            }
            
            // הוספת מפקד הנסיעה החדש
            if (newTrip.commanderId && newTrip.commanderName) {
              const commander = soldiers.find(s => s.id === newTrip.commanderId);
              if (commander) {
                // בדיקה אם מפקד הנסיעה כבר משתתף
                const existingParticipant = updatedParticipants.find(p => p.soldierId === newTrip.commanderId);
                if (existingParticipant) {
                  // עדכון התפקיד הקיים עם תגית מפקד נסיעה
                  const vehicle = vehicles.find(v => v.id === newTrip.vehicleId);
                  const vehicleType = vehicle ? vehicle.type : '';
                  existingParticipant.role = `${existingParticipant.role} - מפקד נסיעה ${vehicleType}`.trim();
                  // שיבוץ אוטומטי לרכב
                  existingParticipant.vehicleId = newTrip.vehicleId || '';
                } else {
                  // הוספת מפקד נסיעה חדש
                  updatedParticipants.push({
                    soldierId: newTrip.commanderId,
                    soldierName: newTrip.commanderName,
                    personalNumber: commander.personalNumber,
                    role: 'מפקד נסיעה',
                    vehicleId: newTrip.vehicleId || ''
                  });
                }
              }
            }
          }
        }

        // עדכון הפעילות
        await updateActivity(activity.id, {
          participants: updatedParticipants,
          mobility: updatedMobility
        });
        
        // עדכון סטטוס נהגים
        if (oldTrip?.driverId && oldTrip.driverId !== newTrip?.driverId) {
          await updateSoldier(oldTrip.driverId, {
            status: 'available'
          });
        }
        
        if (newTrip?.driverId) {
          await updateDriverStatusByTrip(newTrip);
        }

        // עדכון עמוד האישי של המשתתפים
        const allParticipantIds = Array.from(new Set([
          ...updatedParticipants.map(p => p.soldierId),
          ...activity.participants.map(p => p.soldierId)
        ]));

        for (const participantId of allParticipantIds) {
          const soldier = soldiers.find(s => s.id === participantId);
          if (soldier) {
            const currentActivities = soldier.activities || [];
            const isStillParticipant = updatedParticipants.some(p => p.soldierId === participantId);
            const wasParticipant = activity.participants.some(p => p.soldierId === participantId);

            if (isStillParticipant && !wasParticipant) {
              // הוספת הפעילות לעמוד האישי
              if (!currentActivities.includes(activity.id)) {
                await updateSoldier(participantId, {
                  activities: [...currentActivities, activity.id]
                });
              }
            } else if (!isStillParticipant && wasParticipant) {
              // הסרת הפעילות מעמוד האישי
              const updatedActivities = currentActivities.filter(id => id !== activity.id);
              await updateSoldier(participantId, {
                activities: updatedActivities
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('שגיאה בעדכון פעילויות מקושרות:', error);
    }
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editVehicleId) {
        // עדכון רכב קיים
        await updateVehicle(editVehicleId, vehicleFormData);
      } else {
        // הוספת רכב חדש
        await addVehicle(vehicleFormData);
      }
      
      handleCloseVehicleForm();
      loadData();
    } catch (error) {
      console.error('שגיאה בשמירת רכב:', error);
      setError('שגיאה בשמירת הרכב');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'מתוכננת': return 'primary';
      case 'בביצוע': return 'warning';
      case 'הסתיימה': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'מתוכננת': return 'מתוכננת';
      case 'בביצוע': return 'בביצוע';
      case 'הסתיימה': return 'הסתיימה';
      default: return status;
    }
  };

  // בדיקת הרשאות למשתמש
  const canEdit = permissions.canEdit;
  const canDelete = permissions.canDelete;
  const canCreate = permissions.canCreate;

  const isTripComplete = (trip: Trip) => {
    const missingFields: string[] = [];
    
    if (!trip.vehicleId) missingFields.push('רכב');
    if (!trip.driverId) missingFields.push('נהג');
    if (!trip.commanderId) missingFields.push('מפקד נסיעה');
    if (!trip.departureTime) missingFields.push('זמן יציאה');
    if (!trip.returnTime) missingFields.push('זמן חזרה');
    if (!trip.location) missingFields.push('מיקום');
    if (!trip.purpose) missingFields.push('מטרת הנסיעה');
    
    return {
      isComplete: missingFields.length === 0,
      missingFields
    };
  };

  const renderTripCard = (trip: Trip) => (
    <Card 
      key={trip.id} 
      sx={{ 
        mb: 2, 
        border: trip.autoStatusChanged ? '2px solid #ff9800' : 
                isTripComplete(trip).isComplete ? '1px solid #e0e0e0' : '2px solid #f44336',
        backgroundColor: trip.autoStatusChanged ? '#fff3e0' :
                        isTripComplete(trip).isComplete ? 'white' : '#ffebee'
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" gutterBottom>
              {trip.purpose}
              {/* סימון נסיעה ששינתה סטטוס אוטומטית */}
              {trip.autoStatusChanged && (
                <Chip 
                  label="אוטומטי" 
                  color="warning" 
                  size="small" 
                  sx={{ ml: 1, fontSize: '0.6rem' }}
                />
              )}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              מיקום: {trip.location}
            </Typography>
            {trip.vehicleNumber && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                רכב: {trip.vehicleNumber}
                {trip.vehicleType && ` (${trip.vehicleType})`}
              </Typography>
            )}
            {trip.driverName && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                נהג: {trip.driverName}
                {(() => {
                  const driver = drivers.find(d => d.id === trip.driverId);
                  if (driver) {
                    const statusColor = driver.status === 'available' ? 'success' : 
                                       driver.status === 'on_trip' ? 'warning' : 'info';
                    const statusText = driver.status === 'available' ? 'זמין' : 
                                     driver.status === 'on_trip' ? 'בנסיעה' : 'במנוחה';
                    return (
                      <Chip 
                        label={statusText} 
                        color={statusColor as any} 
                        size="small" 
                        sx={{ ml: 1 }}
                      />
                    );
                  }
                  return null;
                })()}
              </Typography>
            )}
            {trip.commanderName && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                מפקד נסיעה: {trip.commanderName}
              </Typography>
            )}
            {trip.departureTime && trip.returnTime && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {new Date(trip.returnTime).toLocaleString('he-IL')} - {new Date(trip.departureTime).toLocaleString('he-IL')}
              </Typography>
            )}
          </Box>
          <Box display="flex" flexDirection="column" alignItems="flex-end">
            <Chip 
              label={getStatusText(trip.status)} 
              color={getStatusColor(trip.status) as any}
              size="small"
              sx={{ mb: 1 }}
            />
            
            {/* כפתורי שינוי סטטוס */}
            {canEdit && (
              <Box sx={{ mb: 1 }}>
                {trip.status === 'מתוכננת' && (
                  <Button
                    variant="contained"
                    color="warning"
                    size="small"
                    onClick={() => handleStartTrip(trip)}
                    sx={{ mb: 0.5, fontSize: '0.7rem' }}
                  >
                    התחל נסיעה
                  </Button>
                )}
                {trip.status === 'בביצוע' && (
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    onClick={() => handleEndTrip(trip)}
                    sx={{ mb: 0.5, fontSize: '0.7rem' }}
                  >
                    סיים נסיעה
                  </Button>
                )}
              </Box>
            )}
            
            {(canEdit || canDelete) && (
              <Box>
                {canEdit && (
                  <>
                    <IconButton size="small" onClick={() => handleEditTrip(trip)}>
                      <EditIcon />
                    </IconButton>
                    {/* כפתור עדכון זמנים בפועל */}
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenActualTimesDialog(trip)}
                      title="עדכון זמנים בפועל"
                      sx={{ color: trip.autoStatusChanged ? 'warning.main' : 'action.active' }}
                    >
                      <ScheduleIcon />
                    </IconButton>
                  </>
                )}
                {canDelete && (
                  <IconButton size="small" onClick={() => handleDeleteTrip(trip.id)}>
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            )}
          </Box>
        </Box>
        {!isTripComplete(trip).isComplete && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              נסיעה לא מלאה - שדות חסרים:
            </Typography>
            <Typography variant="body2">
              {isTripComplete(trip).missingFields.join(', ')}
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderTripTable = () => (
    <TableContainer component={Paper} sx={{ 
      overflowX: 'auto',
      '& .MuiTable-root': {
        minWidth: { xs: 800, sm: 1000 }
      }
    }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>מטרה</TableCell>
            <TableCell>מיקום</TableCell>
            <TableCell>רכב</TableCell>
            <TableCell>נהג</TableCell>
            <TableCell>מפקד נסיעה</TableCell>
            <TableCell>זמן יציאה</TableCell>
            <TableCell>זמן חזרה</TableCell>
            <TableCell>סטטוס</TableCell>
            <TableCell>פעולות</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {trips
            .filter(trip => showCompletedTrips || trip.status !== 'הסתיימה')
            .map((trip) => (
              <TableRow 
               key={trip.id}
               sx={{ 
                 backgroundColor: trip.autoStatusChanged ? '#fff3e0' :
                                 isTripComplete(trip).isComplete ? 'white' : '#ffebee',
                 border: trip.autoStatusChanged ? '2px solid #ff9800' :
                         isTripComplete(trip).isComplete ? '1px solid #e0e0e0' : '2px solid #f44336'
               }}
             >
              <TableCell>
                {trip.purpose}
                {trip.autoStatusChanged && (
                  <Chip 
                    label="אוטומטי" 
                    color="warning" 
                    size="small" 
                    sx={{ ml: 1, fontSize: '0.6rem' }}
                  />
                )}
              </TableCell>
              <TableCell>{trip.location}</TableCell>
              <TableCell>{trip.vehicleNumber || '-'}</TableCell>
              <TableCell>
                {trip.driverName || '-'}
                {trip.driverId && (() => {
                  const driver = drivers.find(d => d.id === trip.driverId);
                  if (driver) {
                    const statusColor = driver.status === 'available' ? 'success' : 
                                       driver.status === 'on_trip' ? 'warning' : 'info';
                    const statusText = driver.status === 'available' ? 'זמין' : 
                                     driver.status === 'on_trip' ? 'בנסיעה' : 'במנוחה';
                    return (
                      <Chip 
                        label={statusText} 
                        color={statusColor as any} 
                        size="small" 
                        sx={{ ml: 1 }}
                      />
                    );
                  }
                  return null;
                })()}
              </TableCell>
              <TableCell>{trip.commanderName || '-'}</TableCell>
              <TableCell>
                {trip.departureTime ? new Date(trip.departureTime).toLocaleString('he-IL') : '-'}
              </TableCell>
              <TableCell>
                {trip.returnTime ? new Date(trip.returnTime).toLocaleString('he-IL') : '-'}
              </TableCell>
              <TableCell>
                <Chip 
                  label={getStatusText(trip.status)} 
                  color={getStatusColor(trip.status) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {(canEdit || canDelete) && (
                  <>
                    {canEdit && (
                      <>
                        <IconButton size="small" onClick={() => handleEditTrip(trip)}>
                          <EditIcon />
                        </IconButton>
                        {/* כפתור עדכון זמנים בפועל */}
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenActualTimesDialog(trip)}
                          title="עדכון זמנים בפועל"
                          sx={{ color: trip.autoStatusChanged ? 'warning.main' : 'action.active' }}
                        >
                          <ScheduleIcon />
                        </IconButton>
                      </>
                    )}
                    {canDelete && (
                      <IconButton size="small" onClick={() => handleDeleteTrip(trip.id)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) {
    return (
      <Container>
        <Typography>טוען...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 } }}>
      {/* התראה על התנגשות שעות מנוחה */}
      {restConflictAlert.show && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          onClose={() => setRestConflictAlert({ show: false, message: '', conflicts: [] })}
        >
          <Typography variant="h6" gutterBottom>
            ⚠️ התנגשות שעות מנוחה
          </Typography>
          <Typography variant="body2" gutterBottom>
            {restConflictAlert.message}
          </Typography>
          <Box sx={{ mt: 2 }}>
            {restConflictAlert.conflicts.map((conflict, index) => (
              <Box key={index} sx={{ mb: 1, p: 1, backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  נסיעה: {conflict.tripPurpose}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  יציאה: {new Date(conflict.departureTime).toLocaleString('he-IL')} | 
                  חזרה: {new Date(conflict.returnTime).toLocaleString('he-IL')}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => setRestConflictAlert({ show: false, message: '', conflicts: [] })}
            >
              הבנתי
            </Button>
          </Box>
        </Alert>
      )}

      {/* הודעת שגיאה אם אין הרשאות */}
      {!permissions.canView && (
        <Alert severity="error" sx={{ mb: 3 }}>
          אין לך הרשאה לצפות בנסיעות
        </Alert>
      )}

      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          ניהול נסיעות
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              minWidth: { xs: '80px', sm: '120px' }
            },
            '& .MuiTabs-scrollButtons': {
              '&.Mui-disabled': { opacity: 0.3 },
            },
          }}
        >
          <Tab label="דאשבורד" />
          <Tab label="נסיעות" />
          <Tab label="רכבים" />
          <Tab label="נהגים" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <TripsDashboard
          trips={trips}
          vehicles={vehicles}
          drivers={drivers}
          onRefresh={loadData}
          onAddTripFromTimeline={handleCreateTripFromTimeline}
        />
      )}

      {activeTab === 1 && (
        <>
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={2} gap={{ xs: 2, sm: 0 }}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems="center" gap={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Button
                  variant={viewMode === 'cards' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('cards')}
                  size="small"
                  sx={{ 
                    minWidth: { xs: '80px', sm: '100px' },
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }}
                >
                  כרטיסים
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('table')}
                  size="small"
                  sx={{ 
                    minWidth: { xs: '80px', sm: '100px' },
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }}
                >
                  טבלה
                </Button>
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showCompletedTrips}
                    onChange={(e) => setShowCompletedTrips(e.target.checked)}
                    size="small"
                  />
                }
                label="הצג נסיעות שהסתיימו"
                sx={{ 
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  '& .MuiFormControlLabel-label': {
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }
                }}
              />
            </Box>
            {canCreate && (
              <Fab 
                color="primary" 
                onClick={handleAddTrip}
                size="small"
                sx={{ 
                  alignSelf: { xs: 'flex-end', sm: 'center' }
                }}
              >
                <AddIcon />
              </Fab>
            )}
          </Box>

          {viewMode === 'cards' ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2 } }}>
              {trips
                .filter(trip => showCompletedTrips || trip.status !== 'הסתיימה')
                .map(trip => (
                  <Box key={trip.id} sx={{ 
                    flex: { xs: '1 1 100%', sm: '1 1 300px' }, 
                    maxWidth: { xs: '100%', sm: '400px' },
                    minWidth: { xs: '280px', sm: '300px' }
                  }}>
                    {renderTripCard(trip)}
                  </Box>
                ))}
            </Box>
          ) : (
            renderTripTable()
          )}
        </>
      )}

      {activeTab === 2 && (
        <Box>
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={2} gap={{ xs: 2, sm: 0 }}>
            <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>רכבים</Typography>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems="center" gap={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Button
                  variant={vehiclesViewMode === 'cards' ? 'contained' : 'outlined'}
                  onClick={() => setVehiclesViewMode('cards')}
                  size="small"
                  sx={{ 
                    minWidth: { xs: '80px', sm: '100px' },
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }}
                >
                  כרטיסים
                </Button>
                <Button
                  variant={vehiclesViewMode === 'table' ? 'contained' : 'outlined'}
                  onClick={() => setVehiclesViewMode('table')}
                  size="small"
                  sx={{ 
                    minWidth: { xs: '80px', sm: '100px' },
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }}
                >
                  טבלה
                </Button>
              </Box>
              <Fab 
                color="primary" 
                onClick={handleAddVehicle}
                size="small"
                sx={{ 
                  alignSelf: { xs: 'flex-end', sm: 'center' }
                }}
              >
                <AddIcon />
              </Fab>
            </Box>
          </Box>

          {vehiclesViewMode === 'cards' ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2 } }}>
              {vehicles.map(vehicle => (
                <Box key={vehicle.id} sx={{ 
                  flex: { xs: '1 1 100%', sm: '1 1 300px' }, 
                  maxWidth: { xs: '100%', sm: '400px' },
                  minWidth: { xs: '280px', sm: '300px' }
                }}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="h6">{vehicle.number}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            סוג: {vehicle.type}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            קילומטרז: {vehicle.mileage ? vehicle.mileage.toLocaleString() : 'לא מוגדר'}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            מקומות: {vehicle.seats || 'לא מוגדר'}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            טיפול אחרון: {new Date(vehicle.lastMaintenance).toLocaleDateString('he-IL')}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            טיפול הבא: {new Date(vehicle.nextMaintenance).toLocaleDateString('he-IL')}
                          </Typography>
                          {vehicle.requiredLicense && (
                            <Typography variant="body2" color="textSecondary">
                              היתר נדרש: {vehicle.requiredLicense}
                            </Typography>
                          )}
                        </Box>
                        <Box>
                          <IconButton size="small" onClick={() => handleEditVehicle(vehicle)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteVehicle(vehicle.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Chip 
                        label={vehicle.status === 'available' ? 'זמין' : vehicle.status === 'on_mission' ? 'במשימה' : 'בטיפול'} 
                        color={vehicle.status === 'available' ? 'success' : vehicle.status === 'on_mission' ? 'warning' : 'error'}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ 
              overflowX: 'auto',
              '& .MuiTable-root': {
                minWidth: { xs: 600, sm: 800 }
              }
            }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>מספר רכב</TableCell>
                    <TableCell>סוג</TableCell>
                    <TableCell>קילומטרז</TableCell>
                    <TableCell>מקומות</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>טיפול הבא</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vehicles.map(vehicle => (
                    <TableRow key={vehicle.id}>
                      <TableCell>{vehicle.number}</TableCell>
                      <TableCell>{vehicle.type}</TableCell>
                      <TableCell>{vehicle.mileage?.toLocaleString() || '-'}</TableCell>
                      <TableCell>{vehicle.seats || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={vehicle.status === 'available' ? 'זמין' : vehicle.status === 'on_mission' ? 'במשימה' : 'בטיפול'}
                          color={vehicle.status === 'available' ? 'success' : vehicle.status === 'on_mission' ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {vehicle.nextMaintenance ? new Date(vehicle.nextMaintenance).toLocaleDateString('he-IL') : '-'}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEditVehicle(vehicle)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteVehicle(vehicle.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {activeTab === 3 && (
        <Box>
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={2} gap={{ xs: 2, sm: 0 }}>
            <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>נהגים</Typography>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems="center" gap={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Button
                  variant={driversViewMode === 'cards' ? 'contained' : 'outlined'}
                  onClick={() => setDriversViewMode('cards')}
                  size="small"
                  sx={{ 
                    minWidth: { xs: '80px', sm: '100px' },
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }}
                >
                  כרטיסים
                </Button>
                <Button
                  variant={driversViewMode === 'table' ? 'contained' : 'outlined'}
                  onClick={() => setDriversViewMode('table')}
                  size="small"
                  sx={{ 
                    minWidth: { xs: '80px', sm: '100px' },
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }}
                >
                  טבלה
                </Button>
              </Box>
            </Box>
          </Box>

          {driversViewMode === 'cards' ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2 } }}>
              {drivers.map(driver => (
                <Box key={driver.id} sx={{ 
                  flex: { xs: '1 1 100%', sm: '1 1 300px' }, 
                  maxWidth: { xs: '100%', sm: '400px' },
                  minWidth: { xs: '280px', sm: '300px' }
                }}>
                  <Card
                    sx={{
                      border: 2,
                      borderColor: driver.status === 'available' ? 'success.main' : 
                                   driver.status === 'on_trip' ? 'warning.main' : 'info.main',
                      '&:hover': {
                        borderColor: driver.status === 'available' ? 'success.dark' : 
                                    driver.status === 'on_trip' ? 'warning.dark' : 'info.dark',
                      }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" sx={{ cursor: 'pointer' }} onClick={() => navigate(`/soldiers/${driver.id}`)}>
                          {driver.name}
                        </Typography>
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenLicenseDialog(driver);
                          }}
                          sx={{ color: 'primary.main' }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        מספר אישי: {driver.personalNumber}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        תפקיד: {driver.role}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        מסגרת: {driver.frameworkId ? frameworks.find(f => f.id === driver.frameworkId)?.name || driver.frameworkId : 'לא מוגדר'}
                      </Typography>
                      <Box sx={{ mt: 1, mb: 1 }}>
                        <Chip
                          label={driver.status === 'available' ? 'זמין' : driver.status === 'on_trip' ? 'בנסיעה' : 'במנוחה'}
                          color={driver.status === 'available' ? 'success' : driver.status === 'on_trip' ? 'warning' : 'info'}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        {driver.restUntil && (
                          <Typography variant="caption" color="textSecondary">
                            מנוחה עד: {new Date(driver.restUntil).toLocaleString('he-IL')}
                          </Typography>
                        )}
                      </Box>

                      {driver.drivingLicenses && driver.drivingLicenses.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                            היתרים לנהיגה:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {driver.drivingLicenses.map((license, index) => (
                              <Chip
                                key={index}
                                label={license}
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ 
              overflowX: 'auto',
              '& .MuiTable-root': {
                minWidth: { xs: 700, sm: 900 }
              }
            }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>שם</TableCell>
                    <TableCell>מספר אישי</TableCell>
                    <TableCell>תפקיד</TableCell>
                    <TableCell>מסגרת</TableCell>
                    <TableCell>היתרים</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>מנוחה עד</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drivers.map(driver => (
                    <TableRow key={driver.id}>
                      <TableCell>
                        <Typography 
                          sx={{ cursor: 'pointer', color: 'primary.main' }}
                          onClick={() => navigate(`/soldiers/${driver.id}`)}
                        >
                          {driver.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{driver.personalNumber}</TableCell>
                      <TableCell>{driver.role}</TableCell>
                      <TableCell>
                        {driver.frameworkId ? frameworks.find(f => f.id === driver.frameworkId)?.name || driver.frameworkId : '-'}
                      </TableCell>
                      <TableCell>
                        {driver.drivingLicenses?.map((license, index) => (
                          <Chip
                            key={index}
                            label={license}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={driver.status === 'available' ? 'זמין' : driver.status === 'on_trip' ? 'בנסיעה' : 'במנוחה'}
                          color={driver.status === 'available' ? 'success' : driver.status === 'on_trip' ? 'warning' : 'info'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {driver.restUntil ? new Date(driver.restUntil).toLocaleString('he-IL') : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenLicenseDialog(driver)}
                          sx={{ fontSize: '0.75rem' }}
                        >
                          ערוך היתרים
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* דיאלוג הוספת/עריכת נסיעה */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>
          {editId ? 'עריכת נסיעה' : 'הוספת נסיעה חדשה'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>רכב</InputLabel>
                  <Select
                    name="vehicleId"
                    value={formData.vehicleId}
                    onChange={(e) => handleSelectChange('vehicleId', e.target.value)}
                    label="רכב"
                  >
                    <MenuItem value="">ללא רכב</MenuItem>
                    {filteredVehicles.map(vehicle => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.number} - {vehicle.type}
                        {vehicle.requiredLicense && ` (היתר: ${vehicle.requiredLicense})`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>נהג</InputLabel>
                  <Select
                    name="driverId"
                    value={formData.driverId}
                    onChange={(e) => handleSelectChange('driverId', e.target.value)}
                    label="נהג"
                  >
                    <MenuItem value="">ללא נהג</MenuItem>
                    {filteredDrivers.map(driver => (
                      <MenuItem key={driver.id} value={driver.id}>
                        {driver.name} - {driver.role}
                        {driver.drivingLicenses && driver.drivingLicenses.length > 0 && 
                          ` (היתרים: ${driver.drivingLicenses.join(', ')})`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <FormControl fullWidth>
                <InputLabel>מפקד נסיעה</InputLabel>
                <Select
                  name="commanderId"
                  value={formData.commanderId}
                  onChange={(e) => handleSelectChange('commanderId', e.target.value)}
                  label="מפקד נסיעה"
                >
                  <MenuItem value="">בחר מפקד נסיעה</MenuItem>
                  {soldiers
                    .filter(soldier => soldier.id !== formData.driverId) // לא להציג את הנהג
                    .map(soldier => (
                      <MenuItem key={soldier.id} value={soldier.id}>
                        {soldier.name} - {soldier.role}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="מיקום"
                name="location"
                value={formData.location}
                onChange={handleChange}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="זמן יציאה *"
                  name="departureTime"
                  type="datetime-local"
                  value={formData.departureTime}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                  error={!formData.departureTime}
                  helperText={!formData.departureTime ? 'שדה חובה' : ''}
                />
                <TextField
                  fullWidth
                  label="זמן חזרה *"
                  name="returnTime"
                  type="datetime-local"
                  value={formData.returnTime}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                  error={!formData.returnTime}
                  helperText={!formData.returnTime ? 'שדה חובה' : ''}
                />
              </Box>
              <TextField
                fullWidth
                label="מטרת הנסיעה"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                multiline
                rows={3}
              />
              <FormControl fullWidth>
                <InputLabel>סטטוס</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={(e) => handleSelectChange('status', e.target.value)}
                  label="סטטוס"
                >
                  <MenuItem value="מתוכננת">מתוכננת</MenuItem>
                  <MenuItem value="בביצוע">בביצוע</MenuItem>
                  <MenuItem value="הסתיימה">הסתיימה</MenuItem>
                </Select>
              </FormControl>

            </Box>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForm}>ביטול</Button>
            <Button type="submit" variant="contained">
              {editId ? 'עדכן' : 'הוסף'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* דיאלוג הוספת/עריכת רכב */}
      <Dialog open={openVehicleForm} onClose={handleCloseVehicleForm} maxWidth="md" fullWidth>
        <DialogTitle>
          {editVehicleId ? 'עריכת רכב' : 'הוספת רכב חדש'}
        </DialogTitle>
        <form onSubmit={handleVehicleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="מספר רכב"
                  name="number"
                  value={vehicleFormData.number}
                  onChange={handleVehicleChange}
                  required
                />
                <TextField
                  fullWidth
                  label="סוג רכב"
                  name="type"
                  value={vehicleFormData.type}
                  onChange={handleVehicleChange}
                  required
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="קילומטרז"
                  name="mileage"
                  type="number"
                  value={vehicleFormData.mileage}
                  onChange={handleVehicleChange}
                  required
                />
                <TextField
                  fullWidth
                  label="מספר מקומות"
                  name="seats"
                  type="number"
                  value={vehicleFormData.seats}
                  onChange={handleVehicleChange}
                  required
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="טיפול אחרון"
                  name="lastMaintenance"
                  type="date"
                  value={vehicleFormData.lastMaintenance}
                  onChange={handleVehicleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <TextField
                  fullWidth
                  label="טיפול הבא"
                  name="nextMaintenance"
                  type="date"
                  value={vehicleFormData.nextMaintenance}
                  onChange={handleVehicleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>סטטוס</InputLabel>
                  <Select
                    name="status"
                    value={vehicleFormData.status}
                    onChange={(e) => handleVehicleSelectChange('status', e.target.value)}
                    label="סטטוס"
                  >
                    <MenuItem value="available">זמין</MenuItem>
                    <MenuItem value="on_mission">במשימה</MenuItem>
                    <MenuItem value="maintenance">בטיפול</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="היתר נדרש"
                  name="requiredLicense"
                  value={vehicleFormData.requiredLicense}
                  onChange={handleVehicleChange}
                  placeholder="למשל: C, D, E"
                  helperText="השאר ריק אם אין דרישה מיוחדת"
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseVehicleForm}>ביטול</Button>
            <Button type="submit" variant="contained">
              {editVehicleId ? 'עדכן' : 'הוסף'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* דיאלוג עריכת היתרי נהיגה */}
      <Dialog open={openLicenseDialog} onClose={handleCloseLicenseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          עריכת היתרי נהיגה - {selectedDriver?.name}
        </DialogTitle>
        <form onSubmit={handleLicenseSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="היתרים לנהיגה (מופרד בפסיקים)"
                name="drivingLicenses"
                value={licenseFormData.drivingLicenses}
                onChange={handleLicenseChange}
                multiline
                rows={3}
                helperText="לדוגמה: B, C, D, E"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseLicenseDialog}>ביטול</Button>
            <Button type="submit" variant="contained">
              עדכן היתרים
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* דיאלוג שינוי סטטוס נסיעה */}
      <Dialog open={openStatusDialog} onClose={handleCloseStatusDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {statusAction === 'start' ? 'התחלת נסיעה' : 'סיום נסיעה'} - {selectedTrip?.purpose}
        </DialogTitle>
        <form onSubmit={handleStatusSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* שדה זמן התחלה בפועל - רק בסיום נסיעה */}
              {statusAction === 'end' && (
                <TextField
                  fullWidth
                  label="זמן התחלה בפועל"
                  type="datetime-local"
                  value={statusFormData.actualDepartureTime}
                  onChange={(e) => setStatusFormData(prev => ({ 
                    ...prev,
                    actualDepartureTime: e.target.value 
                  }))}
                  InputLabelProps={{ shrink: true }}
                  helperText="הזמן בפועל שבו התחילה הנסיעה"
                />
              )}
              
              <TextField
                fullWidth
                label={statusAction === 'start' ? 'שעת יציאה (מתוך הכרטיס)' : 'שעת חזרה (מתוך הכרטיס)'}
                type="datetime-local"
                value={statusFormData.actualTime}
                onChange={handleStatusChange}
                InputLabelProps={{ shrink: true }}
                required
                helperText={statusAction === 'start' ? 
                  'הזמן מתוך כרטיס הנסיעה - ניתן לערוך אם נדרש' : 
                  'הזמן מתוך כרטיס הנסיעה - ניתן לערוך אם נדרש'
                }
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseStatusDialog}>ביטול</Button>
            <Button type="submit" variant="contained">
              {statusAction === 'start' ? 'התחל נסיעה' : 'סיים נסיעה'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* דיאלוג עדכון זמנים בפועל */}
      <Dialog open={actualTimesDialog.open} onClose={handleCloseActualTimesDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          עדכון זמנים בפועל - {actualTimesDialog.trip?.purpose}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            {/* התראה על שינוי אוטומטי */}
            {actualTimesDialog.trip?.autoStatusChanged && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  ⚠️ נסיעה זו שינתה סטטוס אוטומטית
                </Typography>
                <Typography variant="body2">
                  הסטטוס השתנה אוטומטית מ-{actualTimesDialog.trip.status === 'בביצוע' ? 'מתוכננת' : 'בביצוע'} ל-{actualTimesDialog.trip.status}
                </Typography>
                <Typography variant="body2">
                  עדכן את הזמנים בפועל כדי לבטל את הסימון האוטומטי
                </Typography>
              </Alert>
            )}

            {/* זמנים מתוכננים */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                זמנים מתוכננים:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="זמן יציאה מתוכנן"
                  value={actualTimesDialog.trip?.departureTime ? 
                    new Date(actualTimesDialog.trip.departureTime).toLocaleString('he-IL') : 
                    'לא מוגדר'
                  }
                  InputProps={{ readOnly: true }}
                  sx={{ flex: 1, minWidth: 200 }}
                />
                <TextField
                  label="זמן חזרה מתוכנן"
                  value={actualTimesDialog.trip?.returnTime ? 
                    new Date(actualTimesDialog.trip.returnTime).toLocaleString('he-IL') : 
                    'לא מוגדר'
                  }
                  InputProps={{ readOnly: true }}
                  sx={{ flex: 1, minWidth: 200 }}
                />
              </Box>
            </Box>

            {/* זמנים בפועל */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                זמנים בפועל:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="זמן יציאה בפועל"
                  type="datetime-local"
                  value={actualTimesDialog.actualDepartureTime}
                  onChange={(e) => setActualTimesDialog(prev => ({
                    ...prev,
                    actualDepartureTime: e.target.value
                  }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1, minWidth: 200 }}
                  helperText="הזמן בפועל שבו יצאה הנסיעה"
                />
                <TextField
                  label="זמן חזרה בפועל"
                  type="datetime-local"
                  value={actualTimesDialog.actualReturnTime}
                  onChange={(e) => setActualTimesDialog(prev => ({
                    ...prev,
                    actualReturnTime: e.target.value
                  }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1, minWidth: 200 }}
                  helperText="הזמן בפועל שבו חזרה הנסיעה"
                />
              </Box>
            </Box>

            {/* מידע נוסף */}
            {actualTimesDialog.trip && (
              <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>רכב:</strong> {vehicles.find(v => v.id === actualTimesDialog.trip?.vehicleId)?.number || 'לא מוגדר'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>נהג:</strong> {soldiers.find(s => s.id === actualTimesDialog.trip?.driverId)?.name || 'לא מוגדר'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>סטטוס נוכחי:</strong> {actualTimesDialog.trip.status}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActualTimesDialog}>ביטול</Button>
          <Button onClick={handleSaveActualTimes} variant="contained">
            שמור זמנים בפועל
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Trips; 