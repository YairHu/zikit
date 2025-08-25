import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Duty, DutyParticipant } from '../models/Duty';
import { Soldier } from '../models/Soldier';
import { getAllDuties, addDuty, updateDuty, deleteDuty, getDutiesBySoldier, updateDutyStatusesAutomatically } from '../services/dutyService';
import { getAllSoldiers } from '../services/soldierService';
import { getAllFrameworks } from '../services/frameworkService';
import { useUser } from '../contexts/UserContext';
import { SystemPath, PermissionLevel, DataScope } from '../models/UserRole';
import { canUserAccessPath, getUserPermissions } from '../services/permissionService';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  CircularProgress,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  BarChart as BarChartIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Today as TodayIcon,
  Restaurant as RestaurantIcon,
  Security as SecurityIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,

  Schedule as ScheduleIcon,
  LocationOn as LocationOnIcon,
  Group as GroupIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAllSoldiersWithAvailability, getUnavailableSoldierLabel } from '../utils/soldierUtils';

interface WeeklyDutySlot {
  id: string;
  type: 'מטבח' | 'רסר';
  day: string;
  shift: string;
  date: string;
  participants: DutyParticipant[];
  dutyId?: string;
}

interface DutyStatistics {
  totalDuties: number;
  dutiesByType: { [key: string]: number };
  dutiesByTeam: { [key: string]: number };
  dutiesByPerson: { [key: string]: number };
  dutiesByDay: { [key: string]: number };
  averageDutiesPerPerson: number;
  mostActivePerson: string;
  mostActiveTeam: string;
}

const WeeklyDuties: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [duties, setDuties] = useState<Duty[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<WeeklyDutySlot | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [filterTeam, setFilterTeam] = useState<string>('');
  const [filterPerson, setFilterPerson] = useState<string>('');
  const [filterDateRange, setFilterDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showStatistics, setShowStatistics] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showCardsForm, setShowCardsForm] = useState(false);
  const [formData, setFormData] = useState<Omit<Duty, 'id' | 'createdAt' | 'updatedAt'>>({
    type: '',
    location: '',
    startDate: '',
    startTime: '',
    endTime: '',
    participants: [],
    requiredEquipment: '',
    notes: '',
    frameworkId: '',
    status: 'פעילה'
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [showCompletedDuties, setShowCompletedDuties] = useState(false);
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

  // יצירת שבוע התורנויות
  const generateWeeklySlots = useMemo(() => {
    const slots: WeeklyDutySlot[] = [];
    const startOfWeek = new Date(currentWeek);
    // חישוב ראשון (0 = ראשון ב-JavaScript)
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());

    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    
    days.forEach((day, index) => {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + index);
      const dateStr = currentDate.toISOString().split('T')[0];

      if (day === 'שבת') {
        // תורנות מטבח סופש
        const weekendShifts = ['בוקר', 'ערב'];
        weekendShifts.forEach(shift => {
          slots.push({
            id: `kitchen-${day}-${shift}`,
            type: 'מטבח',
            day,
            shift,
            date: dateStr,
            participants: []
          });
        });
      } else if (['חמישי', 'שישי'].includes(day)) {
        // תורנות מטבח חמישי ושישי
        const shifts = day === 'חמישי' ? ['ערב'] : ['בוקר', 'ערב'];
        shifts.forEach(shift => {
          slots.push({
            id: `kitchen-${day}-${shift}`,
            type: 'מטבח',
            day,
            shift,
            date: dateStr,
            participants: []
          });
        });
      } else {
        // תורנות מטבח רגילות (א-ה)
        const shifts = ['בוקר', 'ערב'];
        shifts.forEach(shift => {
          slots.push({
            id: `kitchen-${day}-${shift}`,
            type: 'מטבח',
            day,
            shift,
            date: dateStr,
            participants: []
          });
        });
      }

      // תורנות רס"ר - כל יום
      slots.push({
        id: `rsar-${day}`,
        type: 'רסר',
        day,
        shift: 'יום',
        date: dateStr,
        participants: []
      });
    });

    return slots;
  }, [currentWeek]);

  // מילוי התורנויות הקיימות
  const filledSlots = useMemo(() => {
    const slots = [...generateWeeklySlots];
    
    duties.forEach(duty => {
      const dutyDate = new Date(duty.startDate);
      const dutyTime = duty.startTime;
      
      // קביעת השעה (בוקר/ערב) לפי זמן התורנויות
      let dutyShift = 'יום'; // ברירת מחדל לרס"ר
      if (duty.type === 'מטבח') {
        if (dutyTime === '08:00') {
          dutyShift = 'בוקר';
        } else if (dutyTime === '14:00') {
          dutyShift = 'ערב';
        }
      }
      
      const slot = slots.find(s => {
        const slotDate = new Date(s.date);
        return slotDate.toDateString() === dutyDate.toDateString() && 
               s.type === duty.type &&
               s.shift === dutyShift;
      });
      
      if (slot) {
        slot.participants = duty.participants;
        slot.dutyId = duty.id;
      }
    });

    return slots;
  }, [generateWeeklySlots, duties]);

  // חישוב סטטיסטיקות עם סינון
  const statistics = useMemo((): DutyStatistics => {
    // סינון התורנויות לפי הפילטרים
    let filteredDuties = duties;
    
    if (filterDateRange[0] && filterDateRange[1]) {
      filteredDuties = filteredDuties.filter(duty => {
        const dutyDate = new Date(duty.startDate);
        return dutyDate >= filterDateRange[0]! && dutyDate <= filterDateRange[1]!;
      });
    }
    
    if (filterTeam) {
      filteredDuties = filteredDuties.filter(duty => 
        duty.participants.some(participant => {
          const soldier = soldiers.find(s => s.id === participant.soldierId);
          const framework = frameworks.find(f => f.id === soldier?.frameworkId);
          return framework?.name === filterTeam;
        })
      );
    }
    
    if (filterPerson) {
      filteredDuties = filteredDuties.filter(duty => 
        duty.participants.some(participant => 
          participant.soldierName.includes(filterPerson)
        )
      );
    }

    const stats: DutyStatistics = {
      totalDuties: filteredDuties.length,
      dutiesByType: {},
      dutiesByTeam: {},
      dutiesByPerson: {},
      dutiesByDay: {},
      averageDutiesPerPerson: 0,
      mostActivePerson: '',
      mostActiveTeam: ''
    };

    const personCounts: { [key: string]: number } = {};
    const teamCounts: { [key: string]: number } = {};

    filteredDuties.forEach(duty => {
      // ספירה לפי סוג
      stats.dutiesByType[duty.type] = (stats.dutiesByType[duty.type] || 0) + 1;
      
      // ספירה לפי יום
      const day = new Date(duty.startDate).toLocaleDateString('he-IL', { weekday: 'long' });
      stats.dutiesByDay[day] = (stats.dutiesByDay[day] || 0) + 1;

      // ספירה לפי אנשים וצוותים
      duty.participants.forEach(participant => {
        personCounts[participant.soldierName] = (personCounts[participant.soldierName] || 0) + 1;
        
        const soldier = soldiers.find(s => s.id === participant.soldierId);
        if (soldier?.frameworkId) {
          const framework = frameworks.find(f => f.id === soldier.frameworkId);
          const teamName = framework?.name || 'ללא צוות';
          teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
        }
      });
    });

    stats.dutiesByPerson = personCounts;
    stats.dutiesByTeam = teamCounts;

    // חישוב ממוצע ואנשים פעילים ביותר
    const totalPeople = Object.keys(personCounts).length;
    stats.averageDutiesPerPerson = totalPeople > 0 ? stats.totalDuties / totalPeople : 0;
    
    const mostActivePerson = Object.entries(personCounts).sort(([,a], [,b]) => b - a)[0];
    stats.mostActivePerson = mostActivePerson ? mostActivePerson[0] : '';

    const mostActiveTeam = Object.entries(teamCounts).sort(([,a], [,b]) => b - a)[0];
    stats.mostActiveTeam = mostActiveTeam ? mostActiveTeam[0] : '';

    return stats;
  }, [duties, soldiers, frameworks, filterDateRange, filterTeam, filterPerson]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // עדכון סטטוס תורנויות אוטומטי
      await updateDutyStatusesAutomatically();

      const [soldiersData, frameworksData] = await Promise.all([
        getAllSoldiers(),
        getAllFrameworks()
      ]);

      // בדיקת הרשאות המשתמש
      if (user) {
        const canView = await canUserAccessPath(user.uid, SystemPath.DUTIES, PermissionLevel.VIEW);
        const canCreate = await canUserAccessPath(user.uid, SystemPath.DUTIES, PermissionLevel.CREATE);
        const canEdit = await canUserAccessPath(user.uid, SystemPath.DUTIES, PermissionLevel.EDIT);
        const canDelete = await canUserAccessPath(user.uid, SystemPath.DUTIES, PermissionLevel.DELETE);
        
        setPermissions({ canView, canCreate, canEdit, canDelete });
        
        // אם אין הרשאת צפייה - לא טוען נתונים
        if (!canView) {
          setDuties([]);
          setSoldiers(soldiersData);
          setFrameworks(frameworksData);
          return;
        }
      }

      // טעינת תורנויות לפי הרשאות המשתמש
      let dutiesData: Duty[] = [];
      if (user) {
        // קבלת הרשאות המשתמש עם פרטי המדיניות
        const userPermissions = await getUserPermissions(user.uid);
        
        // חיפוש מדיניות שמתאימה לתורנויות
        const dutiesPolicy = userPermissions.policies.find(policy => 
          policy.paths.includes(SystemPath.DUTIES)
        );
        
        if (dutiesPolicy) {
          // טעינת תורנויות לפי היקף הנתונים
          switch (dutiesPolicy.dataScope) {
            case DataScope.USER_ONLY:
              // נתוני משתמש בלבד - רק תורנויות שהמשתמש משתתף בהן
              const userSoldierForUserOnly = findUserSoldier(soldiersData, user);
              if (userSoldierForUserOnly) {
                dutiesData = await getDutiesBySoldier(userSoldierForUserOnly.id);
        } else {
                dutiesData = [];
              }
              break;
              
            case DataScope.FRAMEWORK_ONLY:
              // נתוני המסגרת שלו - תורנויות שבהן יש משתתף מהמסגרת (כולל מסגרות-בנות)
              // מציאת החייל של המשתמש
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
                
                // טעינת כל התורנויות וסינון לפי המסגרת
                const allDuties = await getAllDuties();
                dutiesData = allDuties.filter(duty => {
                  // בדיקה אם יש משתתף מהמסגרת או ממסגרות-בנות בתורנות
                  return duty.participants.some(participant => {
                    return allSoldiersInHierarchy.includes(participant.soldierId);
                  });
                });
              } else {
                // אם לא נמצאה מסגרת - רק התורנויות של המשתמש
                if (userSoldier) {
                  dutiesData = await getDutiesBySoldier(userSoldier.id);
                } else {
                  dutiesData = [];
                }
              }
              break;
              
            case DataScope.ALL_DATA:
            default:
              // כלל הנתונים - כל התורנויות
          dutiesData = await getAllDuties();
              break;
          }
        } else {
          // אם אין מדיניות מתאימה - רק התורנויות של המשתמש
          const userSoldierForDefault = findUserSoldier(soldiersData, user);
          if (userSoldierForDefault) {
            dutiesData = await getDutiesBySoldier(userSoldierForDefault.id);
          } else {
            dutiesData = [];
          }
        }
      }

      setDuties(dutiesData);
      setSoldiers(soldiersData);
      setFrameworks(frameworksData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSlotClick = (slot: WeeklyDutySlot) => {
    // בדיקת הרשאות
    if (slot.dutyId && !permissions.canEdit) {
      alert('אין לך הרשאה לערוך תורנויות');
      return;
    }
    if (!slot.dutyId && !permissions.canCreate) {
      alert('אין לך הרשאה ליצור תורנויות');
      return;
    }
    
    setSelectedSlot(slot);
    setShowForm(true);
  };

  const handleCloseWeeklyForm = () => {
    setShowForm(false);
    setSelectedSlot(null);
  };

  const handleSubmit = async (participants: DutyParticipant[]) => {
    if (!selectedSlot) return;

    // בדיקת הרשאות
    if (selectedSlot.dutyId && !permissions.canEdit) {
      alert('אין לך הרשאה לערוך תורנויות');
      return;
    }
    if (!selectedSlot.dutyId && !permissions.canCreate) {
      alert('אין לך הרשאה ליצור תורנויות');
      return;
    }

    try {
      const dutyData = {
        type: selectedSlot.type,
        location: selectedSlot.type === 'מטבח' ? 'מטבח' : 'רסר',
        startDate: selectedSlot.date,
        startTime: selectedSlot.shift === 'בוקר' ? '08:00' : '14:00',
        endTime: selectedSlot.shift === 'בוקר' ? '14:00' : '20:00',
        participants,
        status: 'פעילה' as const
      };

      if (selectedSlot.dutyId) {
        // עדכון תורנות קיימת
        const updatedDuty = await updateDuty(selectedSlot.dutyId, dutyData);
        setDuties(prev => prev.map(duty => 
          duty.id === selectedSlot.dutyId ? { ...duty, ...dutyData } : duty
        ));
      } else {
        // יצירת תורנות חדשה - בניית אובייקט Duty מלא
        const newDutyId = await addDuty(dutyData);
        const newDuty: Duty = {
          id: newDutyId,
          ...dutyData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setDuties(prev => [...prev, newDuty]);
      }

      handleCloseWeeklyForm();
    } catch (error) {
      console.error('Error saving duty:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedSlot?.dutyId) return;

    // בדיקת הרשאות
    if (!permissions.canDelete) {
      alert('אין לך הרשאה למחוק תורנויות');
      return;
    }

    try {
      await deleteDuty(selectedSlot.dutyId);
      
      // עדכון מיידי של ה-state המקומי
      setDuties(prev => prev.filter(duty => duty.id !== selectedSlot.dutyId));
      
      handleCloseWeeklyForm();
    } catch (error) {
      console.error('Error deleting duty:', error);
      alert('שגיאה במחיקת התורנות');
    }
  };

  const nextWeek = () => {
    const next = new Date(currentWeek);
    next.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(next);
  };

  const prevWeek = () => {
    const prev = new Date(currentWeek);
    prev.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(prev);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  // פונקציות לתצוגת כרטיסים
  const handleOpenForm = (duty?: Duty) => {
    if (duty) {
      setFormData({
        type: duty.type,
        location: duty.location,
        startDate: duty.startDate,
        startTime: duty.startTime,
        endTime: duty.endTime || '',
        participants: duty.participants,
        requiredEquipment: duty.requiredEquipment || '',
        notes: duty.notes || '',
        frameworkId: duty.frameworkId || '',
        status: duty.status
      });
      setEditId(duty.id);
    } else {
      setFormData({
        type: '',
        location: '',
        startDate: '',
        startTime: '',
        endTime: '',
        participants: [],
        requiredEquipment: '',
        notes: '',
        frameworkId: '',
        status: 'פעילה'
      });
      setEditId(null);
    }
    setShowCardsForm(true);
  };

  const handleCloseCardsForm = () => {
    setShowCardsForm(false);
    setFormData({
      type: '',
      location: '',
      startDate: '',
      startTime: '',
      endTime: '',
      participants: [],
      requiredEquipment: '',
      notes: '',
      frameworkId: '',
      status: 'פעילה'
    });
    setEditId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddParticipant = (soldier: Soldier | null) => {
    if (soldier) {
      const newParticipant: DutyParticipant = {
        soldierId: soldier.id,
        soldierName: soldier.name,
        personalNumber: soldier.personalNumber
      };
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, newParticipant]
      }));
    }
  };

  const handleRemoveParticipant = (soldierId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.soldierId !== soldierId)
    }));
  };

  const handleSubmitCards = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // בדיקת הרשאות
    if (editId && !permissions.canEdit) {
      alert('אין לך הרשאה לערוך תורנויות');
      return;
    }
    
    if (!editId && !permissions.canCreate) {
      alert('אין לך הרשאה ליצור תורנויות חדשות');
      return;
    }
    
    // ולידציה של זמנים
    if (formData.startTime && formData.endTime) {
      const startTime = new Date(`2000-01-01T${formData.startTime}`);
      const endTime = new Date(`2000-01-01T${formData.endTime}`);
      
      if (endTime <= startTime) {
        alert('שעת הסיום חייבת להיות אחרי שעת ההתחלה');
        return;
      }
    }
    
    // ולידציה של תאריך וסטטוס
    if (formData.startDate) {
      const dutyDate = new Date(formData.startDate);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dutyDate < today && formData.status !== 'הסתיימה' && formData.status !== 'בוטלה') {
        alert('לא ניתן להגדיר תורנות שעברה התאריך שלה כפעילה');
        return;
      }
    }
    
    try {
      if (editId) {
        await updateDuty(editId, formData);
        // עדכון מיידי של ה-state המקומי
        setDuties(prev => prev.map(duty => 
          duty.id === editId ? { ...duty, ...formData } : duty
        ));
      } else {
        const newDutyId = await addDuty(formData);
        const newDuty: Duty = {
          id: newDutyId,
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        // הוספה מיידית ל-state המקומי
        setDuties(prev => [...prev, newDuty]);
      }
      handleCloseCardsForm();
    } catch (error) {
      console.error('Error saving duty:', error);
      alert('שגיאה בשמירת תורנות');
    }
  };

  const handleDeleteCards = async () => {
    if (deleteId) {
      if (!permissions.canDelete) {
        alert('אין לך הרשאה למחוק תורנויות');
        return;
      }
      
      try {
        await deleteDuty(deleteId);
        // עדכון מיידי של ה-state המקומי
        setDuties(prev => prev.filter(duty => duty.id !== deleteId));
        setDeleteId(null);
      } catch (error) {
        console.error('Error deleting duty:', error);
        alert('שגיאה במחיקת תורנות');
      }
    }
  };

  const handleDutyClick = (dutyId: string) => {
    navigate(`/duties/${dutyId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'פעילה': return 'primary';
      case 'הסתיימה': return 'success';
      case 'בוטלה': return 'error';
      default: return 'default';
    }
  };

  const filteredDuties = duties.filter(duty => {
    const matchesSearch = duty.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         duty.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || duty.status === filterStatus;
    
    // סינון תורנויות שהסתיימו - רק אם הצ'קבוקס לא מסומן
    const matchesCompletionStatus = showCompletedDuties || duty.status !== 'הסתיימה';
    
    return matchesSearch && matchesStatus && matchesCompletionStatus;
  });

  const getWeekRange = () => {
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return {
      start: startOfWeek.toLocaleDateString('he-IL'),
      end: endOfWeek.toLocaleDateString('he-IL')
    };
  };

  const getSlotColor = (slot: WeeklyDutySlot) => {
    if (slot.participants && slot.participants.length > 0) {
      return slot.type === 'מטבח' ? '#4caf50' : '#2196f3';
    }
    return '#f5f5f5';
  };

  const getSlotTextColor = (slot: WeeklyDutySlot) => {
    return slot.participants && slot.participants.length > 0 ? 'white' : 'black';
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* הודעת שגיאה אם אין הרשאות */}
      {!permissions.canView && (
        <Alert severity="error" sx={{ mb: 3 }}>
          אין לך הרשאה לצפות בתורנויות שבועיות
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1">
          תורנויות
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {permissions.canView && activeTab === 0 && (
          <Button
            variant="outlined"
            startIcon={<BarChartIcon />}
            onClick={() => setShowStatistics(!showStatistics)}
            size="small"
          >
            סטטיסטיקות
          </Button>
          )}
          {activeTab === 1 && permissions.canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenForm()}
              size="small"
            >
              הוסף תורנות
            </Button>
          )}
        </Box>
      </Box>

      {/* טאבים */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="תצוגה שבועית" />
          <Tab label="תצוגת כרטיסים" />
        </Tabs>
      </Box>

      {/* תוכן לפי טאב */}
      {activeTab === 0 && (
        <>
          {/* ניווט שבועי */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IconButton onClick={prevWeek}>
                  <ArrowBackIcon />
                </IconButton>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">
                    {getWeekRange().start} - {getWeekRange().end}
                  </Typography>
                  <Button
                    startIcon={<TodayIcon />}
                    onClick={goToToday}
                    size="small"
                  >
                    היום
                  </Button>
                </Box>
                <IconButton onClick={nextWeek}>
                  <ArrowForwardIcon />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        </>
      )}

             {/* סטטיסטיקות */}
       {activeTab === 0 && showStatistics && (
         <Card sx={{ mb: 3 }}>
           <CardContent>
             <Typography variant="h6" sx={{ mb: 2 }}>
               סטטיסטיקות תורנויות
             </Typography>
             
             {/* פילטרים */}
             <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
               <TextField
                 label="חיפוש לפי שם"
                 value={filterPerson}
                 onChange={(e) => setFilterPerson(e.target.value)}
                 size="small"
                 sx={{ minWidth: 150 }}
               />
                               <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>צוות</InputLabel>
                  <Select
                    value={filterTeam}
                    onChange={(e) => setFilterTeam(e.target.value)}
                    label="צוות"
                  >
                    <MenuItem value="">כל הצוותים</MenuItem>
                    {Array.from(new Set(
                      soldiers
                        .map(s => {
                          const framework = frameworks.find(f => f.id === s.frameworkId);
                          return framework?.name;
                        })
                        .filter(Boolean)
                    )).map(teamName => (
                      <MenuItem key={teamName} value={teamName}>{teamName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
               <Button
                 variant="outlined"
                 size="small"
                 onClick={() => {
                   setFilterPerson('');
                   setFilterTeam('');
                   setFilterDateRange([null, null]);
                 }}
               >
                 נקה פילטרים
               </Button>
             </Box>
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
               <Card sx={{ bgcolor: 'primary.main', color: 'white', flex: '1 1 200px', minWidth: 200 }}>
                 <CardContent>
                   <Typography variant="h4">{statistics.totalDuties}</Typography>
                   <Typography variant="body2">סה"כ תורנויות</Typography>
                 </CardContent>
               </Card>
               <Card sx={{ bgcolor: 'success.main', color: 'white', flex: '1 1 200px', minWidth: 200 }}>
                 <CardContent>
                   <Typography variant="h4">{statistics.dutiesByType['מטבח'] || 0}</Typography>
                   <Typography variant="body2">תורנויות מטבח</Typography>
                 </CardContent>
               </Card>
               <Card sx={{ bgcolor: 'info.main', color: 'white', flex: '1 1 200px', minWidth: 200 }}>
                 <CardContent>
                   <Typography variant="h4">{statistics.dutiesByType['רסר'] || 0}</Typography>
                   <Typography variant="body2">תורנויות רס"ר</Typography>
                 </CardContent>
               </Card>
               <Card sx={{ bgcolor: 'warning.main', color: 'white', flex: '1 1 200px', minWidth: 200 }}>
                 <CardContent>
                   <Typography variant="h4">{statistics.averageDutiesPerPerson.toFixed(1)}</Typography>
                   <Typography variant="body2">ממוצע לאדם</Typography>
                 </CardContent>
               </Card>
             </Box>

                         <Box sx={{ mt: 3 }}>
               <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                 <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
                   <Typography variant="h6" sx={{ mb: 2 }}>תורנויות לפי צוותים</Typography>
                   <TableContainer component={Paper}>
                     <Table size="small">
                       <TableHead>
                         <TableRow>
                           <TableCell>צוות</TableCell>
                           <TableCell align="right">מספר תורנויות</TableCell>
                         </TableRow>
                       </TableHead>
                       <TableBody>
                         {Object.entries(statistics.dutiesByTeam)
                           .sort(([,a], [,b]) => b - a)
                           .map(([team, count]) => (
                             <TableRow key={team}>
                               <TableCell>{team}</TableCell>
                               <TableCell align="right">{count}</TableCell>
                             </TableRow>
                           ))}
                       </TableBody>
                     </Table>
                   </TableContainer>
                 </Box>
                 <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
                   <Typography variant="h6" sx={{ mb: 2 }}>תורנויות לפי אנשים</Typography>
                   <TableContainer component={Paper}>
                     <Table size="small">
                       <TableHead>
                         <TableRow>
                           <TableCell>אדם</TableCell>
                           <TableCell align="right">מספר תורנויות</TableCell>
                         </TableRow>
                       </TableHead>
                       <TableBody>
                         {Object.entries(statistics.dutiesByPerson)
                           .sort(([,a], [,b]) => b - a)
                           .slice(0, 10)
                           .map(([person, count]) => (
                             <TableRow key={person}>
                               <TableCell>{person}</TableCell>
                               <TableCell align="right">{count}</TableCell>
                             </TableRow>
                           ))}
                       </TableBody>
                     </Table>
                   </TableContainer>
                 </Box>
               </Box>
               
               {/* מידע נוסף */}
               <Box sx={{ mt: 3 }}>
                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                   <Card sx={{ bgcolor: 'grey.50', flex: '1 1 400px', minWidth: 400 }}>
                     <CardContent>
                       <Typography variant="h6" sx={{ mb: 1 }}>מידע נוסף</Typography>
                       <Typography variant="body2">
                         <strong>האדם הפעיל ביותר:</strong> {statistics.mostActivePerson || 'אין נתונים'}
                       </Typography>
                       <Typography variant="body2">
                         <strong>הצוות הפעיל ביותר:</strong> {statistics.mostActiveTeam || 'אין נתונים'}
                       </Typography>
                       <Typography variant="body2">
                         <strong>ממוצע תורנויות לאדם:</strong> {statistics.averageDutiesPerPerson.toFixed(1)}
                       </Typography>
                     </CardContent>
                   </Card>
                   <Card sx={{ bgcolor: 'grey.50', flex: '1 1 400px', minWidth: 400 }}>
                     <CardContent>
                       <Typography variant="h6" sx={{ mb: 1 }}>תורנויות לפי ימים</Typography>
                       <TableContainer>
                         <Table size="small">
                           <TableHead>
                             <TableRow>
                               <TableCell>יום</TableCell>
                               <TableCell align="right">מספר תורנויות</TableCell>
                             </TableRow>
                           </TableHead>
                           <TableBody>
                             {Object.entries(statistics.dutiesByDay)
                               .sort(([,a], [,b]) => b - a)
                               .map(([day, count]) => (
                                 <TableRow key={day}>
                                   <TableCell>{day}</TableCell>
                                   <TableCell align="right">{count}</TableCell>
                                 </TableRow>
                               ))}
                           </TableBody>
                         </Table>
                       </TableContainer>
                     </CardContent>
                   </Card>
                 </Box>
               </Box>
             </Box>
          </CardContent>
        </Card>
      )}

             {/* תצוגה שבועית */}
       {activeTab === 0 && (
         <Card>
         <CardContent>
           <Typography variant="h6" sx={{ mb: 2 }}>
             תצוגה שבועית - לחץ על תא לעריכת תורנות
           </Typography>
           
           {/* הודעה למובייל */}
           <Alert severity="info" sx={{ mb: 2, display: { xs: 'flex', md: 'none' } }}>
             <Typography variant="body2">
               💡 טיפ: סובב את המכשיר לרוחב לתצוגה טובה יותר
             </Typography>
           </Alert>
          
          {/* כותרות - מותאם למובייל */}
          <Box sx={{ 
            display: 'flex', 
            mb: 1,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { height: 8 },
            '&::-webkit-scrollbar-track': { bgcolor: '#f1f1f1' },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#888', borderRadius: 4 }
          }}>
            <Box sx={{ width: 120, flexShrink: 0 }} />
            {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map(day => (
              <Box key={day} sx={{ 
                flex: 1, 
                textAlign: 'center', 
                fontWeight: 'bold',
                minWidth: 80,
                px: 1
              }}>
                {day}
              </Box>
            ))}
          </Box>

                     {/* שורות התורנויות - מותאם למובייל */}
           <Box sx={{ overflowX: 'auto' }}>
             {/* תורנות מטבח */}
             <Box sx={{ mb: 2 }}>
               <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                 <RestaurantIcon sx={{ mr: 1 }} />
                 תורנות מטבח
               </Typography>
               {['בוקר', 'ערב'].map(shift => (
                 <Box key={shift} sx={{ 
                   display: 'flex', 
                   mb: 1,
                   minWidth: 700 // מינימום רוחב לתצוגה תקינה
                 }}>
                   <Box sx={{ 
                     width: 120, 
                     flexShrink: 0, 
                     display: 'flex', 
                     alignItems: 'center', 
                     fontWeight: 'bold',
                     px: 1
                   }}>
                     {shift}
                   </Box>
                   {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map(day => {
                     const slot = filledSlots.find(s => s.type === 'מטבח' && s.day === day && s.shift === shift);
                     return (
                       <Box
                         key={`${day}-${shift}`}
                         sx={{
                           flex: 1,
                           height: 60,
                           border: '1px solid #ddd',
                           display: 'flex',
                           flexDirection: 'column',
                           justifyContent: 'center',
                           alignItems: 'center',
                           cursor: (slot && ((slot.dutyId && permissions.canEdit) || (!slot.dutyId && permissions.canCreate))) ? 'pointer' : 'default',
                           bgcolor: slot ? getSlotColor(slot) : '#f5f5f5',
                           color: slot ? getSlotTextColor(slot) : 'black',
                           minWidth: 80,
                           px: 1,
                           '&:hover': {
                             bgcolor: (slot && ((slot.dutyId && permissions.canEdit) || (!slot.dutyId && permissions.canCreate))) ? 
                               (slot ? 'rgba(76, 175, 80, 0.8)' : '#e0e0e0') : 'inherit'
                           }
                         }}
                         onClick={() => slot && handleSlotClick(slot)}
                       >
                         {slot?.participants && slot.participants.length > 0 ? (
                           <>
                             <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                               {slot.participants.length} אנשים
                             </Typography>
                             <Typography variant="caption" sx={{ fontSize: '0.6rem', textAlign: 'center', lineHeight: 1.2 }}>
                               {slot.participants.map(participant => {
                                 const soldier = soldiers.find(s => s.id === participant.soldierId);
                                 const framework = frameworks.find(f => f.id === soldier?.frameworkId);
                                 return `${participant.soldierName} (${framework?.name || 'ללא צוות'})`;
                               }).join(', ')}
                             </Typography>
                           </>
                         ) : (
                           <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>ריק</Typography>
                         )}
                       </Box>
                     );
                   })}
                 </Box>
               ))}

            </Box>

                         {/* תורנות רס"ר */}
             <Box>
               <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                 <SecurityIcon sx={{ mr: 1 }} />
                 תורנות רס"ר
               </Typography>
               <Box sx={{ 
                 display: 'flex',
                 minWidth: 700
               }}>
                 <Box sx={{ 
                   width: 120, 
                   flexShrink: 0, 
                   display: 'flex', 
                   alignItems: 'center', 
                   fontWeight: 'bold',
                   px: 1
                 }}>
                   יום
                 </Box>
                 {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map(day => {
                   const slot = filledSlots.find(s => s.type === 'רסר' && s.day === day);
                   return (
                     <Box
                       key={`${day}-רסר`}
                       sx={{
                         flex: 1,
                         height: 60,
                         border: '1px solid #ddd',
                         display: 'flex',
                         flexDirection: 'column',
                         justifyContent: 'center',
                         alignItems: 'center',
                         cursor: (slot && ((slot.dutyId && permissions.canEdit) || (!slot.dutyId && permissions.canCreate))) ? 'pointer' : 'default',
                         bgcolor: slot ? getSlotColor(slot) : '#f5f5f5',
                         color: slot ? getSlotTextColor(slot) : 'black',
                         minWidth: 80,
                         px: 1,
                         '&:hover': {
                           bgcolor: (slot && ((slot.dutyId && permissions.canEdit) || (!slot.dutyId && permissions.canCreate))) ? 
                             (slot ? 'rgba(33, 150, 243, 0.8)' : '#e0e0e0') : 'inherit'
                         }
                       }}
                       onClick={() => slot && handleSlotClick(slot)}
                     >
                       {slot?.participants && slot.participants.length > 0 ? (
                         <>
                           <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                             {slot.participants.length} אנשים
                           </Typography>
                           <Typography variant="caption" sx={{ fontSize: '0.6rem', textAlign: 'center', lineHeight: 1.2 }}>
                             {slot.participants.map(participant => {
                               const soldier = soldiers.find(s => s.id === participant.soldierId);
                               const framework = frameworks.find(f => f.id === soldier?.frameworkId);
                               return `${participant.soldierName} (${framework?.name || 'ללא צוות'})`;
                             }).join(', ')}
                           </Typography>
                         </>
                       ) : (
                         <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>ריק</Typography>
                       )}
                     </Box>
                   );
                 })}
               </Box>
             </Box>
          </Box>
        </CardContent>
      </Card>
      )}

      {/* דיאלוג עריכת תורנות */}
      <DutyFormDialog
        open={showForm}
        onClose={handleCloseWeeklyForm}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        slot={selectedSlot}
        soldiers={soldiers}
        frameworks={frameworks}
        canDelete={!!selectedSlot?.dutyId && permissions.canDelete}
      />

      {/* תצוגת כרטיסים */}
      {activeTab === 1 && (
        <>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="חיפוש..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ minWidth: 200 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>סטטוס</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="סטטוס"
              >
                <MenuItem value="">כל הסטטוסים</MenuItem>
                {['פעילה', 'הסתיימה', 'בוטלה'].map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="showCompletedDuties"
                  checked={showCompletedDuties}
                  onChange={(e) => setShowCompletedDuties(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <label htmlFor="showCompletedDuties" style={{ fontSize: '14px', cursor: 'pointer' }}>
                  הצג תורנויות שהסתיימו
                </label>
              </Box>
            </FormControl>
          </Box>



          {/* Duties List */}
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
            {filteredDuties.map((duty) => (
              <Card key={duty.id} sx={{ height: 'fit-content', cursor: 'pointer' }} onClick={() => handleDutyClick(duty.id)}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {duty.type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {duty.team}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip 
                        label={duty.status} 
                        color={getStatusColor(duty.status) as any}
                        size="small"
                      />
                      {user && permissions.canEdit && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenForm(duty);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {user && permissions.canDelete && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(duty.id);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOnIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">{duty.location}</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ScheduleIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {duty.startDate} {duty.endTime && `${duty.endTime} - `}{duty.startTime}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <GroupIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">{duty.participants.length} משתתפים</Typography>
                  </Box>

                  {/* Participants List */}
                  {duty.participants.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        משתתפים:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {duty.participants.map((participant) => (
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
                  )}

                  {duty.requiredEquipment && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, mt: 1 }}>
                      <PersonIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">ציוד: {duty.requiredEquipment}</Typography>
                    </Box>
                  )}

                  {duty.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {duty.notes}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      )}

      {/* Add/Edit Form Dialog */}
      <Dialog open={showCardsForm} onClose={handleCloseCardsForm} maxWidth="md" fullWidth>
        <DialogTitle>
          {editId ? 'ערוך תורנות' : 'הוסף תורנות חדשה'}
        </DialogTitle>
        <form onSubmit={handleSubmitCards}>
          <DialogContent>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <TextField
                name="type"
                label="סוג תורנות"
                value={formData.type}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                name="location"
                label="מיקום"
                value={formData.location}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                name="startDate"
                label="תאריך התחלה"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                name="startTime"
                label="שעת התחלה"
                type="time"
                value={formData.startTime}
                onChange={handleChange}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                name="endTime"
                label="שעת סיום (לא חובה)"
                type="time"
                value={formData.endTime}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth>
                <InputLabel>סטטוס</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={(e) => handleSelectChange('status', e.target.value)}
                  label="סטטוס"
                >
                  <MenuItem value="פעילה">פעילה</MenuItem>
                  <MenuItem value="הסתיימה">הסתיימה</MenuItem>
                  <MenuItem value="בוטלה">בוטלה</MenuItem>
                </Select>
              </FormControl>

              <TextField
                name="requiredEquipment"
                label="ציוד נדרש (לא חובה)"
                value={formData.requiredEquipment}
                onChange={handleChange}
                fullWidth
              />
              <TextField
                name="notes"
                label="הערות (לא חובה)"
                value={formData.notes}
                onChange={handleChange}
                multiline
                rows={3}
                fullWidth
              />
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                משתתפים
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  options={getAllSoldiersWithAvailability(soldiers, formData.startDate || '').filter(s => 
                    !formData.participants.some(p => p.soldierId === s.id)
                  )}
                  getOptionLabel={(option) => {
                    if (option.isUnavailable) {
                      return getUnavailableSoldierLabel(option);
                    }
                    return `${option.name} (${option.personalNumber})`;
                  }}
                  onChange={(_, newValue) => {
                    if (newValue && !newValue.isUnavailable) {
                      handleAddParticipant(newValue);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="הוסף משתתף" />
                  )}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderOption={(props, option) => (
                    <li {...props} style={{ 
                      opacity: option.isUnavailable ? 0.6 : 1,
                      color: option.isUnavailable ? '#666' : 'inherit',
                      pointerEvents: option.isUnavailable ? 'none' : 'auto'
                    }}>
                      {option.isUnavailable 
                        ? getUnavailableSoldierLabel(option)
                        : `${option.name} (${option.personalNumber})`
                      }
                    </li>
                  )}
                />
              </Box>
              <List dense>
                {formData.participants.map((participant) => (
                  <ListItem key={participant.soldierId}>
                    <ListItemText
                      primary={participant.soldierName}
                      secondary={participant.personalNumber}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveParticipant(participant.soldierId)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCardsForm}>ביטול</Button>
            <Button type="submit" variant="contained">
              {editId ? 'עדכן' : 'הוסף'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>מחיקת תורנות</DialogTitle>
        <DialogContent>
          <Typography>האם אתה בטוח שברצונך למחוק תורנות זו?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>ביטול</Button>
          <Button onClick={handleDeleteCards} color="error" variant="contained">
            מחק
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// קומפוננט דיאלוג עריכת תורנות
interface DutyFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (participants: DutyParticipant[]) => void;
  onDelete: () => void;
  slot: WeeklyDutySlot | null;
  soldiers: Soldier[];
  frameworks: any[];
  canDelete: boolean;
}

const DutyFormDialog: React.FC<DutyFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  onDelete,
  slot,
  soldiers,
  frameworks,
  canDelete
}) => {
  const [selectedParticipants, setSelectedParticipants] = useState<DutyParticipant[]>([]);

  useEffect(() => {
    if (slot) {
      setSelectedParticipants(slot.participants);
    }
  }, [slot]);

  const handleAddParticipant = (soldier: Soldier | null) => {
    if (!soldier) return;
    
    const participant: DutyParticipant = {
      soldierId: soldier.id,
      soldierName: soldier.name,
      personalNumber: soldier.personalNumber
    };
    
    setSelectedParticipants(prev => [...prev, participant]);
  };

  const handleRemoveParticipant = (soldierId: string) => {
    setSelectedParticipants(prev => prev.filter(p => p.soldierId !== soldierId));
  };

  const handleSubmit = () => {
    onSubmit(selectedParticipants);
  };

  if (!slot) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        עריכת תורנות - {slot.type} {slot.day} {slot.shift}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            תאריך: {new Date(slot.date).toLocaleDateString('he-IL')}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            משתתפים ({selectedParticipants.length})
          </Typography>
          
                     <Autocomplete
             options={getAllSoldiersWithAvailability(soldiers, slot?.date || '')}
             getOptionLabel={(option) => {
               if (option.isUnavailable) {
                 return getUnavailableSoldierLabel(option);
               }
               const framework = frameworks.find(f => f.id === option.frameworkId);
               return `${option.name} (${framework?.name || 'ללא צוות'})`;
             }}
             onChange={(_, value) => {
               if (value && !value.isUnavailable) {
                 handleAddParticipant(value);
               }
             }}
             renderInput={(params) => (
               <TextField
                 {...params}
                 label="הוסף משתתף"
                 variant="outlined"
                 fullWidth
               />
             )}
             isOptionEqualToValue={(option, value) => option.id === value.id}
             renderOption={(props, option) => (
               <li {...props} style={{ 
                 opacity: option.isUnavailable ? 0.6 : 1,
                 color: option.isUnavailable ? '#666' : 'inherit',
                 pointerEvents: option.isUnavailable ? 'none' : 'auto'
               }}>
                 {option.isUnavailable 
                   ? getUnavailableSoldierLabel(option)
                   : (() => {
                       const framework = frameworks.find(f => f.id === option.frameworkId);
                       return `${option.name} (${framework?.name || 'ללא צוות'})`;
                     })()
                 }
               </li>
             )}
           />

          <List sx={{ mt: 2 }}>
            {selectedParticipants.map((participant) => (
              <ListItem key={participant.soldierId}>
                                 <ListItemText
                   primary={participant.soldierName}
                   secondary={`${participant.personalNumber} - ${(() => {
                     const soldier = soldiers.find(s => s.id === participant.soldierId);
                     const framework = frameworks.find(f => f.id === soldier?.frameworkId);
                     return framework?.name || 'ללא צוות';
                   })()}`}
                 />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveParticipant(participant.soldierId)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        {canDelete && (
          <Button onClick={onDelete} color="error">
            מחק תורנות
          </Button>
        )}
        <Button onClick={onClose}>ביטול</Button>
        <Button onClick={handleSubmit} variant="contained">
          שמור
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WeeklyDuties; 