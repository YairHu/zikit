import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Duty, DutyParticipant } from '../models/Duty';
import { Soldier } from '../models/Soldier';
import { getAllDuties, addDuty, updateDuty, deleteDuty, getDutiesBySoldier } from '../services/dutyService';
import { getAllSoldiers } from '../services/soldierService';
import { getAllFrameworks } from '../services/frameworkService';
import { useUser } from '../contexts/UserContext';
import { UserRole, isAdmin } from '../models/UserRole';
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
  Paper
} from '@mui/material';
import {
  Delete as DeleteIcon,
  BarChart as BarChartIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Today as TodayIcon,
  Restaurant as RestaurantIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

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

  // יצירת שבוע התורנויות
  const generateWeeklySlots = useMemo(() => {
    const slots: WeeklyDutySlot[] = [];
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // ראשון

    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    
    days.forEach((day, index) => {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + index);
      const dateStr = currentDate.toISOString().split('T')[0];

      if (day === 'שבת') {
        // תורנות מטבח סופש
        const weekendShifts = ['בוקר', 'צהריים', 'ערב'];
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
      const slot = slots.find(s => {
        const slotDate = new Date(s.date);
        return slotDate.toDateString() === dutyDate.toDateString() && 
               s.type === duty.type;
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
      const [soldiersData, frameworksData] = await Promise.all([
        getAllSoldiers(),
        getAllFrameworks()
      ]);

      // טעינת תורנויות לפי הרשאות המשתמש
      let dutiesData: Duty[] = [];
      if (user) {
        // אם המשתמש הוא חייל - רואה רק את התורנויות שלו
        if (user.role === UserRole.CHAYAL) {
          dutiesData = await getDutiesBySoldier(user.uid);
        } else {
          // משתמשים אחרים - רואים את כל התורנויות
          dutiesData = await getAllDuties();
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
    setSelectedSlot(slot);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedSlot(null);
  };

  const handleSubmit = async (participants: DutyParticipant[]) => {
    if (!selectedSlot) return;

    try {
      const dutyData = {
        type: selectedSlot.type,
        location: selectedSlot.type === 'מטבח' ? 'מטבח' : 'רסר',
        startDate: selectedSlot.date,
        startTime: selectedSlot.shift === 'בוקר' ? '06:00' : 
                   selectedSlot.shift === 'צהריים' ? '12:00' : '18:00',
        endTime: selectedSlot.shift === 'בוקר' ? '12:00' : 
                 selectedSlot.shift === 'צהריים' ? '18:00' : '22:00',
        participants,
        status: 'פעילה' as const
      };

      if (selectedSlot.dutyId) {
        await updateDuty(selectedSlot.dutyId, dutyData);
      } else {
        await addDuty(dutyData);
      }

      await refresh();
      handleCloseForm();
    } catch (error) {
      console.error('Error saving duty:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedSlot?.dutyId) return;

    try {
      await deleteDuty(selectedSlot.dutyId);
      await refresh();
      handleCloseForm();
    } catch (error) {
      console.error('Error deleting duty:', error);
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

  const getWeekRange = () => {
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1);
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1">
          תורנויות שבועיות
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<BarChartIcon />}
            onClick={() => setShowStatistics(!showStatistics)}
            size="small"
          >
            סטטיסטיקות
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/duties')}
            size="small"
          >
            חזרה לתורנויות
          </Button>
        </Box>
      </Box>

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

             {/* סטטיסטיקות */}
       {showStatistics && (
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
                           cursor: 'pointer',
                           bgcolor: slot ? getSlotColor(slot) : '#f5f5f5',
                           color: slot ? getSlotTextColor(slot) : 'black',
                           minWidth: 80,
                           px: 1,
                           '&:hover': {
                             bgcolor: slot ? 'rgba(76, 175, 80, 0.8)' : '#e0e0e0'
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
              
                             {/* תורנות סופש מיוחדות */}
               <Box sx={{ 
                 display: 'flex', 
                 mb: 1,
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
                   צהריים
                 </Box>
                 {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map(day => {
                   const slot = filledSlots.find(s => s.type === 'מטבח' && s.day === day && s.shift === 'צהריים');
                   return (
                     <Box
                       key={`${day}-צהריים`}
                       sx={{
                         flex: 1,
                         height: 60,
                         border: '1px solid #ddd',
                         display: 'flex',
                         flexDirection: 'column',
                         justifyContent: 'center',
                         alignItems: 'center',
                         cursor: slot ? 'pointer' : 'default',
                         bgcolor: slot ? getSlotColor(slot) : 'transparent',
                         color: slot ? getSlotTextColor(slot) : 'transparent',
                         minWidth: 80,
                         px: 1,
                         '&:hover': {
                           bgcolor: slot ? 'rgba(76, 175, 80, 0.8)' : 'transparent'
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
                       ) : null}
                     </Box>
                   );
                 })}
               </Box>
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
                         cursor: 'pointer',
                         bgcolor: slot ? getSlotColor(slot) : '#f5f5f5',
                         color: slot ? getSlotTextColor(slot) : 'black',
                         minWidth: 80,
                         px: 1,
                         '&:hover': {
                           bgcolor: slot ? 'rgba(33, 150, 243, 0.8)' : '#e0e0e0'
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

      {/* דיאלוג עריכת תורנות */}
      <DutyFormDialog
        open={showForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        slot={selectedSlot}
        soldiers={soldiers}
        frameworks={frameworks}
        canDelete={!!selectedSlot?.dutyId}
      />
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
             options={soldiers}
             getOptionLabel={(option) => {
               const framework = frameworks.find(f => f.id === option.frameworkId);
               return `${option.name} (${framework?.name || 'ללא צוות'})`;
             }}
             onChange={(_, value) => handleAddParticipant(value)}
             renderInput={(params) => (
               <TextField
                 {...params}
                 label="הוסף משתתף"
                 variant="outlined"
                 fullWidth
               />
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