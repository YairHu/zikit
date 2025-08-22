import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  DirectionsCar as VehicleIcon,
  Person as DriverIcon,
  Hotel as RestIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { Trip } from '../models/Trip';
import { Vehicle } from '../models/Vehicle';
import { Soldier } from '../models/Soldier';

interface TripsTimelineProps {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Soldier[];
  onAddTripFromTimeline?: (tripData: {
    departureTime: string;
    returnTime: string;
    vehicleId?: string;
    driverId?: string;
  }) => void;
}

interface TimelineItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'trip' | 'rest';
  trip?: Trip;
  vehicle?: Vehicle;
  driver?: Soldier;
  isRest?: boolean;
}

const TripsTimeline: React.FC<TripsTimelineProps> = ({
  trips,
  vehicles,
  drivers,
  onAddTripFromTimeline
}) => {
  const [yAxisType, setYAxisType] = useState<'vehicles' | 'drivers'>('vehicles');
  const [selectionMode, setSelectionMode] = useState<'none' | 'selecting'>('none');
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    yItem: Vehicle | Soldier;
    time: Date;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    x: number;
    time: Date;
  } | null>(null);

  // דיאלוג לפרטי נסיעה
  const [tripDetailsDialog, setTripDetailsDialog] = useState<{
    open: boolean;
    item: TimelineItem | null;
  }>({
    open: false,
    item: null
  });

  
  // זום דינמי
  const [zoomLevel] = useState(2); // 2 = יום (ברירת מחדל), 1 = שבוע, 0.5 = חודש
  const [panOffset, setPanOffset] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // עדכון רוחב המסך
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // עדכון רוחב אחרי טעינת הקומפוננטה
  useEffect(() => {
    const timer = setTimeout(() => {
      setWindowWidth(window.innerWidth);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // עדכון רוחב כאשר הקומפוננטה נטענת
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current) {
        setWindowWidth(containerRef.current.offsetWidth);
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [yAxisType]);

  // עדכון רוחב בהתחלה
  useEffect(() => {
    const timer = setTimeout(() => {
      setWindowWidth(window.innerWidth);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  // ביטול בחירה כאשר נלחץ מחוץ לטבלה
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectionMode === 'selecting' && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const isInside = event.clientX >= rect.left && 
                        event.clientX <= rect.right && 
                        event.clientY >= rect.top && 
                        event.clientY <= rect.bottom;
        
        if (!isInside) {
          setSelectionMode('none');
          setSelectionStart(null);
          setSelectionEnd(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectionMode]);

  // יצירת פריטי ציר זמן כולל שעות מנוחה
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];
    
    // הוספת נסיעות
    trips.forEach(trip => {
      if (trip.departureTime && trip.returnTime) {
        const vehicle = vehicles.find(v => v.id === trip.vehicleId);
        const driver = drivers.find(d => d.id === trip.driverId);
        
        items.push({
          id: `trip-${trip.id}`,
          title: trip.purpose,
          start: new Date(trip.departureTime),
          end: new Date(trip.returnTime),
          type: 'trip',
          trip,
          vehicle,
          driver
        });
      }
    });

    // הוספת שעות מנוחה לנהגים - כולל כאלה שהסתיימו
    drivers.forEach(driver => {
      if (driver.qualifications?.includes('נהג')) {
        const driverTrips = trips.filter(t => t.driverId === driver.id);
        
        if (driverTrips.length > 0) {
          const lastTrip = driverTrips.sort((a, b) => 
            new Date(b.returnTime).getTime() - new Date(a.returnTime).getTime()
          )[0];
          
          if (lastTrip) {
            const lastReturnTime = new Date(lastTrip.returnTime);
            const calculatedRestEnd = new Date(lastReturnTime.getTime() + (7 * 60 * 60 * 1000));
            
            // הצג שעות מנוחה גם אם הן הסתיימו
            items.push({
              id: `rest-${driver.id}`,
              title: 'מנוחה',
              start: lastReturnTime,
              end: calculatedRestEnd,
              type: 'rest',
              driver,
              isRest: true
            });
          }
        }
      }
    });
    
    return items.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [trips, vehicles, drivers]);

  // קבלת רשימת רכבים או נהגים לציר Y - כולל כולם
  const yAxisItems = useMemo(() => {
    if (yAxisType === 'vehicles') {
      // הצגת כל הרכבים, גם אם אין להם נסיעות
      return vehicles;
    } else {
      // הצגת כל הנהגים, גם אם אין להם נסיעות
      return drivers.filter(driver => driver.qualifications?.includes('נהג'));
    }
  }, [yAxisType, vehicles, drivers]);

  // חישוב טווח התאריכים דינמי
  const dateRange = useMemo(() => {
    const now = new Date();
    
    if (zoomLevel >= 2) {
      // תצוגת יום - שעות עגולות
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const start = new Date(today.getTime() + panOffset);
      const end = new Date(today.getTime() + (24 * 60 * 60 * 1000) + panOffset);
      return { start, end };
    } else if (zoomLevel >= 1) {
      // תצוגת שבוע - 7 ימים
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3);
      const start = new Date(weekStart.getTime() + panOffset);
      const end = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000) + panOffset);
      return { start, end };
    } else {
      // תצוגת חודש - 30 ימים
      const monthStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15);
      const start = new Date(monthStart.getTime() + panOffset);
      const end = new Date(monthStart.getTime() + (30 * 24 * 60 * 60 * 1000) + panOffset);
      return { start, end };
    }
  }, [zoomLevel, panOffset]);

  // חישוב מיקום אופקי מדויק של פריט (מימין לשמאל - עברית)
  const getItemPosition = (item: TimelineItem) => {
    const totalDuration = dateRange.end.getTime() - dateRange.start.getTime();
    
    // הגבלת הפריט לטווח הנראה
    const itemStart = Math.max(item.start.getTime(), dateRange.start.getTime());
    const itemEnd = Math.min(item.end.getTime(), dateRange.end.getTime());
    
    // אם הפריט לא בטווח הנראה - לא להציג
    if (itemStart >= dateRange.end.getTime() || itemEnd <= dateRange.start.getTime()) {
      return { left: '0%', width: '0%', visible: false };
    }
    
    // בדיקה אם הפריט נחתך מהצדדים
    const isStartCut = item.start.getTime() < dateRange.start.getTime();
    const isEndCut = item.end.getTime() > dateRange.end.getTime();
    
    const itemStartOffset = itemStart - dateRange.start.getTime();
    const itemDuration = itemEnd - itemStart;
    
    // חישוב מיקום מדויק עם דיוק של מילישניות
    const left = Math.round((itemStartOffset / totalDuration) * 10000) / 100; // דיוק של 0.01%
    const width = Math.max(0.1, Math.round((itemDuration / totalDuration) * 10000) / 100); // מינימום 0.1% רוחב
    
    return { 
      left: `${left}%`, 
      width: `${width}%`, 
      visible: true,
      roundedLeft: !isStartCut,  // עיגול רק אם לא נחתך משמאל
      roundedRight: !isEndCut,   // עיגול רק אם לא נחתך מימין
      startTime: item.start,     // הוספת זמן התחלה למידע
      endTime: item.end          // הוספת זמן סיום למידע
    };
  };

  // קבלת צבע לפי סטטוס
  const getStatusColor = (status: string, isRest: boolean = false) => {
    if (isRest) return '#9c27b0';
    
    switch (status) {
      case 'מתוכננת': return '#1976d2';
      case 'בביצוע': return '#ed6c02';
      case 'הסתיימה': return '#2e7d32';
      default: return '#757575';
    }
  };





  // קבלת פריטים לשורה ספציפית
  const getItemsForRow = (yItem: Vehicle | Soldier) => {
    return timelineItems.filter(item => {
      if (yAxisType === 'vehicles') {
        return item.vehicle?.id === yItem.id;
      } else {
        return item.driver?.id === yItem.id;
      }
    });
  };

  // בדיקה אם טווח זמן פנוי
  const isTimeRangeAvailable = (yItem: Vehicle | Soldier, startTime: Date, endTime: Date) => {
    const itemsInRow = getItemsForRow(yItem);
    
    // בדיקה אם יש התנגשות עם פריטים קיימים
    return !itemsInRow.some(item => {
      const itemStart = item.start.getTime();
      const itemEnd = item.end.getTime();
      const rangeStart = startTime.getTime();
      const rangeEnd = endTime.getTime();
      
      // התנגשות אם יש חפיפה בזמן
      return (rangeStart < itemEnd && rangeEnd > itemStart);
    });
  };

  // יצירת שעות מפורטות דינמיות (מימין לשמאל - עברית)
  const generateTimeSlots = () => {
    const slots: { time: Date; label: string }[] = [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const duration = end.getTime() - start.getTime();
    
    if (zoomLevel >= 2) {
      // רמת יום - שעות עגולות מדויקות (מימין לשמאל)
      const startHour = start.getHours();
      const endHour = end.getHours() + (end.getMinutes() > 0 ? 1 : 0); // עיגול כלפי מעלה אם יש דקות
      
      // יצירת שעות מדויקות
      for (let hour = Math.max(23, endHour); hour >= Math.min(0, startHour); hour--) {
        const time = new Date(start);
        time.setHours(hour, 0, 0, 0); // שעה עגולה בדיוק
        
                  // בדיקה שהשעה בטווח הנכון
          if (time >= start && time <= end) {
            const label = time.getHours().toString();
            slots.push({ time: new Date(time), label });
          }
      }
    } else if (zoomLevel >= 1) {
      // רמת שבוע - ימים (מימין לשמאל)
      const daysInWeek = 7;
      const slotDuration = duration / daysInWeek;
      
      for (let i = daysInWeek; i >= 0; i--) {
        const time = new Date(start.getTime() + (i * slotDuration));
        const label = time.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric' });
        slots.push({ time: new Date(time), label });
      }
    } else {
      // רמת חודש - שבועות (מימין לשמאל)
      const weeksInMonth = 4;
      const slotDuration = duration / weeksInMonth;
      
      for (let i = weeksInMonth; i >= 0; i--) {
        const time = new Date(start.getTime() + (i * slotDuration));
        const weekStart = new Date(time);
        const weekEnd = new Date(time.getTime() + 6 * 24 * 60 * 60 * 1000);
        const label = `${weekStart.getDate()}-${weekEnd.getDate()}`;
        slots.push({ time: new Date(time), label });
      }
    }
    
    return slots;
  };

  // שינוי ציר Y
  const handleYAxisChange = (value: 'vehicles' | 'drivers') => {
    // ביטול בחירה אם יש בחירה פעילה
    if (selectionMode === 'selecting') {
      setSelectionMode('none');
      setSelectionStart(null);
      setSelectionEnd(null);
    }
    setYAxisType(value);
  };

  // המרת מיקום X לזמן (RTL - מימין לשמאל)
  // חישוב רוחב דינמי בהתאם לגודל המסך
  const getDynamicWidths = () => {
    const containerWidth = containerRef.current?.offsetWidth || windowWidth || 1200;
    const timeSlots = generateTimeSlots();
    
    // רוחב מינימלי לעמודת רכבים/נהגים
    const minVehicleColumnWidth = 120;
    
    // רוחב זמין לעמודות שעות
    const availableWidth = Math.max(containerWidth - minVehicleColumnWidth, timeSlots.length * 30);
    const hourColumnWidth = Math.max(30, availableWidth / timeSlots.length);
    
    return {
      vehicleColumnWidth: minVehicleColumnWidth,
      hourColumnWidth,
      totalWidth: minVehicleColumnWidth + (timeSlots.length * hourColumnWidth)
    };
  };

  const getTimeFromX = (x: number, containerWidth: number): Date => {
    const timeSlots = generateTimeSlots();
    const { hourColumnWidth } = getDynamicWidths();
    
    // חישוב המיקום המדויק בתוך התא
    const slotIndex = Math.floor(x / hourColumnWidth);
    const positionInSlot = (x % hourColumnWidth) / hourColumnWidth; // 0-1
    
    // הפיכת האינדקס כי השעות מימין לשמאל
    const reversedIndex = timeSlots.length - 1 - slotIndex;
    const clampedIndex = Math.max(0, Math.min(reversedIndex, timeSlots.length - 1));
    
    const baseTime = timeSlots[clampedIndex].time;
    const resultTime = new Date(baseTime);
    
    // עיגול לרבעי שעה (15 דקות)
    const minutes = Math.round(positionInSlot * 60 / 15) * 15;
    resultTime.setMinutes(minutes);
    
    return resultTime;
  };

  // טיפול בלחיצה על אזור הטיימליין
  const handleTimelineClick = (event: React.MouseEvent, yItem: Vehicle | Soldier) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = getTimeFromX(x, rect.width);
    
    if (selectionMode === 'none') {
      // התחלת בחירה
      setSelectionMode('selecting');
      setSelectionStart({ x, yItem, time });
      setSelectionEnd(null);
    } else {
      // בדיקה שהלחיצה השנייה היא באותה שורה
      if (selectionStart && selectionStart.yItem.id !== yItem.id) {
        // ביטול הבחירה הקיימת והתחלת בחירה חדשה
        setSelectionMode('selecting');
        setSelectionStart({ x, yItem, time });
        setSelectionEnd(null);
        return;
      }
      
      // סיום בחירה
      setSelectionEnd({ x, time });
      
      // בדיקה שהבחירה תקינה - זמן יציאה לפני זמן חזרה
      if (selectionStart && time !== selectionStart.time) {
        // קביעת זמן יציאה וחזרה לפי הכרונולוגיה (לא לפי מיקום הלחיצה)
        const departureTime = time < selectionStart.time ? time : selectionStart.time;
        const returnTime = time > selectionStart.time ? time : selectionStart.time;
        
        // בדיקה שהטווח פנוי
        if (isTimeRangeAvailable(yItem, departureTime, returnTime)) {
          const vehicleId = yAxisType === 'vehicles' ? yItem.id : undefined;
          const driverId = yAxisType === 'drivers' ? yItem.id : undefined;
          
          if (onAddTripFromTimeline) {
            onAddTripFromTimeline({
              departureTime: departureTime.toISOString(),
              returnTime: returnTime.toISOString(),
              vehicleId,
              driverId
            });
          }
        } else {
          // הצגת הודעת שגיאה
          alert('הטווח הנבחר לא פנוי. יש נסיעה קיימת בטווח הזמן הזה.');
        }
      } else if (selectionStart && time === selectionStart.time) {
        // אם נלחץ על אותה נקודה - איפוס הבחירה
        alert('בחר נקודת סיום שונה מנקודת ההתחלה.');
      }
      
      // איפוס הבחירה
      setSelectionMode('none');
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  // בדיקה אם נקודה נמצאת בטווח הבחירה
  const isInSelectionRange = (x: number, yItem: Vehicle | Soldier) => {
    if (!selectionStart || selectionEnd || selectionStart.yItem.id !== yItem.id) return false;
    
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return false;
    
    const startX = Math.min(selectionStart.x, x);
    const endX = Math.max(selectionStart.x, x);
    
    return x >= startX && x <= endX;
  };

  // טיפול בלחיצה על נסיעה
  const handleTripClick = (event: React.MouseEvent, item: TimelineItem) => {
    event.stopPropagation(); // מניעת הפעלת handleTimelineClick
    setTripDetailsDialog({
      open: true,
      item: item
    });
  };

  // סגירת דיאלוג פרטי נסיעה
  const handleCloseTripDetails = () => {
    setTripDetailsDialog({
      open: false,
      item: null
    });
  };

  // הוספת event listener לגלילה חכמה
  useEffect(() => {
    const timelineElement = timelineRef.current;
    if (!timelineElement) return;

    const handleWheel = (e: WheelEvent) => {
      // בדיקה אם זה גלילה אופקית (Shift + גלגל או touchpad אופקי)
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // גלילה אופקית - הזזת השעות
        e.preventDefault();
        timelineElement.scrollLeft += (e.deltaX || e.deltaY);
      }
      // אחרת, תן לגלילה האנכית לעבוד באופן טבעי (לא נעצור אותה)
    };

    // טיפול במגע לגלילה חכמה
    let touchStartY = 0;
    let touchStartX = 0;
    let isScrolling = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      isScrolling = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isScrolling) return;

      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      const deltaY = touchStartY - touchY;
      const deltaX = touchStartX - touchX;

      // קביעת כיוון הגלילה הראשון
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // גלילה אופקית
        isScrolling = true;
      } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // גלילה אנכית
        isScrolling = true;
      }
    };

    // הוספת event listeners
    timelineElement.addEventListener('wheel', handleWheel, { passive: false });
    timelineElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    timelineElement.addEventListener('touchmove', handleTouchMove, { passive: true });

    // ניקוי
    return () => {
      timelineElement.removeEventListener('wheel', handleWheel);
      timelineElement.removeEventListener('touchstart', handleTouchStart);
      timelineElement.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // פונקציות ניווט (מימין לשמאל - עברית)
  const handlePrevious = () => {
    // ביטול בחירה אם יש בחירה פעילה
    if (selectionMode === 'selecting') {
      setSelectionMode('none');
      setSelectionStart(null);
      setSelectionEnd(null);
    }
    
    const timeSpan = zoomLevel >= 2 ? 24 * 60 * 60 * 1000 : 
                    zoomLevel >= 1 ? 7 * 24 * 60 * 60 * 1000 : 
                    30 * 24 * 60 * 60 * 1000;
    setPanOffset(panOffset + timeSpan); // הפיכה: + במקום -
  };

  const handleNext = () => {
    // ביטול בחירה אם יש בחירה פעילה
    if (selectionMode === 'selecting') {
      setSelectionMode('none');
      setSelectionStart(null);
      setSelectionEnd(null);
    }
    
    const timeSpan = zoomLevel >= 2 ? 24 * 60 * 60 * 1000 : 
                    zoomLevel >= 1 ? 7 * 24 * 60 * 60 * 1000 : 
                    30 * 24 * 60 * 60 * 1000;
    setPanOffset(panOffset - timeSpan); // הפיכה: - במקום +
  };

  const handleToday = () => {
    // ביטול בחירה אם יש בחירה פעילה
    if (selectionMode === 'selecting') {
      setSelectionMode('none');
      setSelectionStart(null);
      setSelectionEnd(null);
    }
    
    setPanOffset(0);
  };

  return (
    <Card sx={{ 
      mb: 3, 
      width: '100%', 
      overflowX: 'hidden',
      // תמיכה בתצוגה אופקית בסלולר
      '@media (orientation: landscape) and (max-width: 900px)': {
        maxWidth: '100vw',
        margin: '0.5rem'
      }
    }}>
      <CardContent sx={{ 
        p: { xs: 1, sm: 2, md: 3 },
        // התאמה לתצוגה אופקית
        '@media (orientation: landscape) and (max-width: 900px)': {
          p: 1
        }
      }}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2} gap={{ xs: 2, sm: 0 }}>
          <Box>
            <Typography 
              variant="h6"
              sx={{ fontSize: { xs: '1.2rem', sm: '1.25rem' } }}
            >
              ציר זמן נסיעות
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.75rem' } }}>
              תצוגת ציר זמן נסיעות • גלילה אופקית לתזוזה
            </Typography>
            {selectionMode === 'selecting' && (
              <Typography variant="caption" color="primary" sx={{ display: 'block', fontSize: { xs: '0.8rem', sm: '0.75rem' } }}>
                לחץ על נקודת הסיום כדי לבחור טווח זמן (יכול להיות משני הצדדים)
              </Typography>
            )}
            {selectionMode === 'none' && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.8rem', sm: '0.75rem' } }}>
                לחץ על שורה כדי לבחור נקודת התחלה, ואז לחץ על נקודת סיום להוספת נסיעה
              </Typography>
            )}
          </Box>
          
          <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
            {/* כפתורי ניווט */}
            <Box display="flex" gap={0.5} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                onClick={handlePrevious}
                sx={{ 
                  minWidth: { xs: '32px', sm: '40px' },
                  padding: { xs: '4px', sm: '6px' }
                }}
              >
                ‹
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleToday}
                sx={{ 
                  minWidth: { xs: '50px', sm: '60px' },
                  padding: { xs: '4px 6px', sm: '6px 8px' },
                  fontSize: { xs: '0.7rem', sm: '0.8rem' }
                }}
              >
                היום
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleNext}
                sx={{ 
                  minWidth: { xs: '32px', sm: '40px' },
                  padding: { xs: '4px', sm: '6px' }
                }}
              >
                ›
              </Button>
            </Box>

            <ToggleButtonGroup
              value={yAxisType}
              exclusive
              onChange={(_, value) => value && handleYAxisChange(value)}
              size="small"
              sx={{ 
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                gap: 1,
                '& .MuiToggleButton-root': {
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  padding: { xs: '8px 12px', sm: '10px 16px' },
                  minWidth: { xs: '70px', sm: '80px' },
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark'
                    }
                  }
                }
              }}
            >
              <ToggleButton value="vehicles">
                <VehicleIcon sx={{ mr: { xs: 0.5, sm: 1 }, fontSize: { xs: 18, sm: 20 } }} />
                <Box sx={{ display: { xs: 'block', sm: 'block' }, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>רכבים</Box>
              </ToggleButton>
              <ToggleButton value="drivers">
                <DriverIcon sx={{ mr: { xs: 0.5, sm: 1 }, fontSize: { xs: 18, sm: 20 } }} />
                <Box sx={{ display: { xs: 'block', sm: 'block' }, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>נהגים</Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* ציר זמן */}
        <Box 
          ref={containerRef}
          sx={{ 
            position: 'relative', 
            height: { xs: 400, sm: 500, md: 600 }, 
            overflowX: 'auto',
            overflowY: 'auto',
            width: '100%',
            // תמיכה במגע - אפשר גלילה בשני הכיוונים
            touchAction: 'auto',
            WebkitOverflowScrolling: 'touch',
            // שיפור ביצועי גלילה במגע
            scrollBehavior: 'smooth',
            // עיצוב scrollbar
            '&::-webkit-scrollbar': {
              height: 8,
              width: 8
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderRadius: 5
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: 5,
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.4)'
              }
            },
            // Firefox
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0,0,0,0.2) rgba(0,0,0,0.05)',
          }}
        >
          {/* כותרת תאריך */}
          <Box sx={{ 
            display: 'flex', 
            mb: 1, 
            borderBottom: 1, 
            borderColor: 'divider',
            width: `${getDynamicWidths().totalWidth}px`,
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backgroundColor: 'white'
          }}>
            <Box sx={{ 
              width: `${getDynamicWidths().vehicleColumnWidth}px`, 
              borderRight: 1, 
              borderColor: 'divider',
              backgroundColor: 'grey.50',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              position: 'sticky',
              left: 0,
              zIndex: 60
            }}>
              
            </Box>
            
            <Box sx={{
              width: `${generateTimeSlots().length * 80}px`,
              textAlign: 'center',
              p: 1,
              borderRight: 1,
              borderColor: 'divider',
              backgroundColor: 'grey.50',
              fontWeight: 'bold'
            }}>
              <Typography variant="h6">
                {dateRange.start.toLocaleDateString('he-IL', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Typography>
            </Box>
          </Box>

          {/* כותרות שעות */}
          <Box sx={{ 
            display: 'flex', 
            mb: 2, 
            borderBottom: 1, 
            borderColor: 'divider',
            width: `${getDynamicWidths().totalWidth}px`,
            position: 'sticky',
            top: '60px',
            zIndex: 50,
            backgroundColor: 'white'
          }}>
            {/* רווח לכותרת השורה */}
            <Box sx={{ 
              width: `${getDynamicWidths().vehicleColumnWidth}px`, 
              borderRight: 1, 
              borderColor: 'divider',
              backgroundColor: 'grey.100',
              flexShrink: 0,
              position: 'sticky',
              left: 0,
              zIndex: 60
            }} />
            
            {generateTimeSlots().map((slot, i) => (
              <Box
                key={i}
                sx={{
                  width: `${getDynamicWidths().hourColumnWidth}px`,
                  textAlign: 'center',
                  p: 0.5,
                  borderRight: 1,
                  borderColor: 'divider',
                  flexShrink: 0
                }}
              >
                <Typography 
                  variant="body2" 
                  fontWeight="bold" 
                  sx={{ 
                    fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.8rem' }
                  }}
                >
                  {slot.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* שורות רכבים/נהגים */}
          <Box sx={{ position: 'relative' }}>
            {yAxisItems.map((yItem, yIndex) => {
              const items = getItemsForRow(yItem);
              const rowHeight = 55;
              
              return (
                <Box
                  key={yItem.id}
                  sx={{
                    display: 'flex',
                    height: rowHeight,
                    borderBottom: 1,
                    borderColor: 'divider',
                    position: 'relative',
                    width: `${getDynamicWidths().totalWidth}px`,
                    mb: 1
                  }}
                >
                                                        {/* כותרת שורה - קבועה */}
                   <Box
                     sx={{
                       width: `${getDynamicWidths().vehicleColumnWidth}px`,
                       p: { xs: 0.5, sm: 1 },
                       borderRight: 1,
                       borderColor: 'divider',
                       display: 'flex',
                       alignItems: 'center',
                       backgroundColor: 'grey.50',
                       zIndex: 40,
                       position: 'sticky',
                       left: 0,
                       flexShrink: 0
                     }}
                   >
                     <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                       {yAxisType === 'vehicles' ? (
                         <VehicleIcon sx={{ mr: { xs: 0.5, sm: 1 }, fontSize: { xs: 18, sm: 16 } }} />
                       ) : (
                         <DriverIcon sx={{ mr: { xs: 0.5, sm: 1 }, fontSize: { xs: 18, sm: 16 } }} />
                       )}
                       <Typography 
                         variant="body2" 
                         fontWeight="bold"
                         sx={{ 
                           fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
                           lineHeight: { xs: 1.0, sm: 1.1 },
                           overflow: 'hidden',
                           textOverflow: 'ellipsis',
                           whiteSpace: 'nowrap'
                         }}
                       >
                         {yAxisType === 'vehicles' 
                           ? `${(yItem as Vehicle).number} - ${(yItem as Vehicle).type}`
                           : (yItem as Soldier).name
                         }
                       </Typography>
                     </Box>
                   </Box>

                                                        {/* אזור ציר הזמן */}
                   <Box
                     sx={{
                       width: `${generateTimeSlots().length * getDynamicWidths().hourColumnWidth}px`,
                       position: 'relative'
                     }}
                   >
                     {/* רשת דינמית */}
                     <Box sx={{ 
                       position: 'absolute', 
                       top: 0, 
                       left: 0, 
                       right: 0, 
                       bottom: 0, 
                       pointerEvents: 'none',
                       display: 'flex',
                       width: `${generateTimeSlots().length * getDynamicWidths().hourColumnWidth}px`
                     }}>
                       {generateTimeSlots().map((_, i) => (
                         <Box
                           key={i}
                           sx={{
                             width: `${getDynamicWidths().hourColumnWidth}px`,
                             borderRight: 1,
                             borderColor: 'rgba(0,0,0,0.08)',
                             backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'transparent',
                             flexShrink: 0
                           }}
                         />
                       ))}
                     </Box>

                     {/* אזור בחירה אינטראקטיבי */}
                     <Box
                       sx={{
                         position: 'absolute',
                         top: 0,
                         left: 0,
                         right: 0,
                         bottom: 0,
                         cursor: selectionMode === 'selecting' ? 'crosshair' : 'pointer',
                         zIndex: 2
                       }}
                       onClick={(e) => handleTimelineClick(e, yItem)}
                     >
                                               {/* הדגשת אזור הבחירה הנוכחי */}
                        {selectionStart && selectionStart.yItem.id === yItem.id && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: `${(selectionStart.x / (generateTimeSlots().length * getDynamicWidths().hourColumnWidth)) * 100}%`,
                              width: '2px',
                              height: '100%',
                              backgroundColor: '#1976d2',
                              zIndex: 3,
                              pointerEvents: 'none'
                            }}
                          />
                        )}
                     </Box>

                     {/* פריטי ציר זמן */}
                     {items.map(item => {
                       const position = getItemPosition(item);
                       
                       // אם הפריט לא נראה - לא להציג
                       if (!position.visible) return null;
                       
                       return (
                         <Tooltip
                           key={item.id}
                           title={
                             <Box>
                               <Typography variant="body2" fontWeight="bold">
                                 {item.title}
                               </Typography>
                               <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                 <strong>התחלה:</strong> {item.start.toLocaleTimeString('he-IL', { 
                                   hour: '2-digit', 
                                   minute: '2-digit',
                                   day: '2-digit',
                                   month: '2-digit'
                                 })}
                               </Typography>
                               <Typography variant="caption" sx={{ display: 'block' }}>
                                 <strong>סיום:</strong> {item.end.toLocaleTimeString('he-IL', { 
                                   hour: '2-digit', 
                                   minute: '2-digit',
                                   day: '2-digit',
                                   month: '2-digit'
                                 })}
                               </Typography>
                               <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                 <strong>משך:</strong> {Math.round((item.end.getTime() - item.start.getTime()) / (1000 * 60))} דקות
                               </Typography>
                               {item.vehicle && (
                                 <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                   <strong>רכב:</strong> {item.vehicle.number}
                                 </Typography>
                               )}
                               {item.driver && (
                                 <Typography variant="caption" display="block">
                                   <strong>נהג:</strong> {item.driver.name}
                                 </Typography>
                               )}
                               {item.trip && (
                                 <Typography variant="caption" display="block">
                                   <strong>סטטוס:</strong> {item.trip.status}
                                 </Typography>
                               )}
                             </Box>
                           }
                         >
                           <Box
                             onClick={(e) => handleTripClick(e, item)}
                             sx={{
                               position: 'absolute',
                               left: position.left,
                               width: position.width,
                                                             top: 10,
                              height: 35,
                               backgroundColor: getStatusColor(item.trip?.status || '', item.isRest),
                               borderTopLeftRadius: position.roundedLeft ? 6 : 0,
                               borderBottomLeftRadius: position.roundedLeft ? 6 : 0,
                               borderTopRightRadius: position.roundedRight ? 6 : 0,
                               borderBottomRightRadius: position.roundedRight ? 6 : 0,
                                                               p: { xs: 0.5, sm: 0.5 },
                                cursor: 'pointer',
                                zIndex: 5,
                                minWidth: '30px',
                               boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                               display: 'flex',
                               flexDirection: 'column',
                               justifyContent: 'center',
                               alignItems: 'center',
                               textAlign: 'center',
                               '&:hover': {
                                 opacity: 0.9,
                                 transform: 'scale(1.02)',
                                 transition: 'all 0.2s ease'
                               }
                             }}
                           >
                             <Typography
                               variant="caption"
                               sx={{
                                 color: 'white',
                                 fontWeight: 'bold',
                                 overflow: 'hidden',
                                 textOverflow: 'ellipsis',
                                 whiteSpace: 'nowrap',
                                 fontSize: { xs: '0.6rem', sm: '0.65rem' },
                                 lineHeight: 1.1,
                                 width: '100%'
                               }}
                             >
                               {item.title}
                             </Typography>
                             <Box sx={{ 
                               display: 'flex', 
                               alignItems: 'center', 
                               justifyContent: 'center',
                               mt: 0.5,
                               width: '100%'
                             }}>
                              {item.isRest ? (
                                <RestIcon sx={{ fontSize: 10, color: 'white', mr: 0.5 }} />
                              ) : (
                                <>
                                  {item.vehicle && (
                                    <VehicleIcon sx={{ fontSize: 10, color: 'white', mr: 0.5 }} />
                                  )}
                                  {item.driver && (
                                    <DriverIcon sx={{ fontSize: 10, color: 'white', mr: 0.5 }} />
                                  )}
                                </>
                              )}
                              <Chip
                                label={item.isRest ? 'מנוחה' : (item.trip?.status || '')}
                                size="small"
                                sx={{
                                  height: 14,
                                  fontSize: '0.6rem',
                                  backgroundColor: 'rgba(255,255,255,0.2)',
                                  color: 'white'
                                }}
                              />
                            </Box>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* מקרא */}
        <Box sx={{ 
          mt: 2, 
          display: 'flex', 
          gap: { xs: 1, sm: 2 }, 
          flexWrap: 'wrap',
          justifyContent: { xs: 'center', sm: 'flex-start' }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: { xs: 12, sm: 16 }, height: { xs: 12, sm: 16 }, backgroundColor: '#1976d2', borderRadius: 1, mr: 1 }} />
            <Typography variant="caption" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>מתוכננת</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: { xs: 12, sm: 16 }, height: { xs: 12, sm: 16 }, backgroundColor: '#ed6c02', borderRadius: 1, mr: 1 }} />
            <Typography variant="caption" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>בביצוע</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: { xs: 12, sm: 16 }, height: { xs: 12, sm: 16 }, backgroundColor: '#2e7d32', borderRadius: 1, mr: 1 }} />
            <Typography variant="caption" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>הסתיימה</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: { xs: 12, sm: 16 }, height: { xs: 12, sm: 16 }, backgroundColor: '#9c27b0', borderRadius: 1, mr: 1 }} />
            <Typography variant="caption" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>מנוחה</Typography>
          </Box>
        </Box>
      </CardContent>

      {/* דיאלוג פרטי נסיעה */}
      <Dialog
        open={tripDetailsDialog.open}
        onClose={handleCloseTripDetails}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            m: { xs: 2, sm: 4 }
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            פרטי {tripDetailsDialog.item?.isRest ? 'מנוחה' : 'נסיעה'}
          </Typography>
          <IconButton
            onClick={handleCloseTripDetails}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 1 }}>
          {tripDetailsDialog.item && (
            <Box>
              {/* כותרת */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                p: 2,
                backgroundColor: getStatusColor(tripDetailsDialog.item.trip?.status || '', tripDetailsDialog.item.isRest),
                borderRadius: 1,
                color: 'white'
              }}>
                {tripDetailsDialog.item.isRest ? (
                  <RestIcon sx={{ mr: 1, fontSize: 24 }} />
                ) : (
                  <>
                    {tripDetailsDialog.item.vehicle && (
                      <VehicleIcon sx={{ mr: 1, fontSize: 24 }} />
                    )}
                    {tripDetailsDialog.item.driver && (
                      <DriverIcon sx={{ mr: 1, fontSize: 24 }} />
                    )}
                  </>
                )}
                <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                  {tripDetailsDialog.item.title}
                </Typography>
              </Box>

              {/* פרטי זמן */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                  זמנים:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      זמן התחלה:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {tripDetailsDialog.item.start.toLocaleString('he-IL', { 
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit', 
                        minute: '2-digit'
                      })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      זמן סיום:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {tripDetailsDialog.item.end.toLocaleString('he-IL', { 
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit', 
                        minute: '2-digit'
                      })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      משך:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {Math.round((tripDetailsDialog.item.end.getTime() - tripDetailsDialog.item.start.getTime()) / (1000 * 60))} דקות
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* פרטי רכב ונהג */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                  פרטי {tripDetailsDialog.item.isRest ? 'נהג' : 'משתתפים'}:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {tripDetailsDialog.item.vehicle && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        רכב:
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {tripDetailsDialog.item.vehicle.number} - {tripDetailsDialog.item.vehicle.type}
                      </Typography>
                    </Box>
                  )}
                  {tripDetailsDialog.item.driver && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        נהג:
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {tripDetailsDialog.item.driver.name}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* סטטוס */}
              {tripDetailsDialog.item.trip && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                    סטטוס:
                  </Typography>
                  <Chip
                    label={tripDetailsDialog.item.trip.status}
                    size="medium"
                    sx={{
                      backgroundColor: getStatusColor(tripDetailsDialog.item.trip.status),
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                </Box>
              )}

              {/* מטרה */}
              {tripDetailsDialog.item.trip?.purpose && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                    מטרה:
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    p: 2, 
                    backgroundColor: 'grey.50', 
                    borderRadius: 1,
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }}>
                    {tripDetailsDialog.item.trip.purpose}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={handleCloseTripDetails}
            variant="contained"
            fullWidth
            sx={{ 
              borderRadius: 2,
              fontSize: { xs: '0.9rem', sm: '1rem' }
            }}
          >
            סגור
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default TripsTimeline;
