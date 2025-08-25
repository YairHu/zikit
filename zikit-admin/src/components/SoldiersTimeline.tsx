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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import {
  Person as SoldierIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { Trip } from '../models/Trip';
import { Soldier } from '../models/Soldier';
import { Activity } from '../models/Activity';
import { Duty } from '../models/Duty';
import { Referral } from '../models/Referral';
import { isAbsenceStatus, getStatusColor, PresenceStatus, isAbsenceActive, parseAbsenceUntilTime } from '../utils/presenceStatus';
import { formatToIsraelString } from '../utils/dateUtils';

interface SoldiersTimelineProps {
  soldiers: Soldier[];
  activities: Activity[];
  duties: Duty[];
  referrals: Referral[];
  trips: Trip[];
  frameworks?: any[]; // הוספת frameworks לפילטרים
}

interface TimelineItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'activity' | 'duty' | 'referral' | 'trip' | 'absence' | 'rest';
  soldier: Soldier;
  activity?: Activity;
  duty?: Duty;
  referral?: Referral;
  trip?: Trip;
  status: PresenceStatus;
}

const SoldiersTimeline: React.FC<SoldiersTimelineProps> = ({
  soldiers,
  activities,
  duties,
  referrals,
  trips,
  frameworks = []
}) => {
  const [selectionMode, setSelectionMode] = useState<'none' | 'selecting'>('none');
  
  // פילטרים לחיילים
  const [soldierFilters, setSoldierFilters] = useState({
    frameworkIds: [] as string[],
    statuses: [] as string[],
    qualifications: [] as string[],
    searchTerm: ''
  });
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    yItem: Soldier;
    time: Date;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    x: number;
    time: Date;
  } | null>(null);

  // דיאלוג לפרטי פעילות
  const [activityDetailsDialog, setActivityDetailsDialog] = useState<{
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
  const [refreshKey, setRefreshKey] = useState(0);

  // עדכון רוחב המסך
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // עדכון אוטומטי של הטיימליין כאשר הנתונים משתנים
  useEffect(() => {
    // עדכון מפתח רענון כדי לאלץ בנייה מחדש של הטיימליין
    setRefreshKey(prev => prev + 1);
  }, [trips, soldiers, activities, duties, referrals]);

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
  }, []);

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

  // יצירת פריטי ציר זמן לכל החיילים
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];
    
    soldiers.forEach(soldier => {
      // בדיקה אם יש לחייל פעילויות, תורנויות, הפניות או נסיעות
      const hasActivities = activities.some(activity => 
        activity.participants.some(p => p.soldierId === soldier.id)
      );
      const hasDuties = duties.some(duty => 
        duty.participants.some(p => p.soldierId === soldier.id)
      );
      const hasReferrals = referrals.some(referral => 
        referral.soldierId === soldier.id
      );
      const hasTrips = trips.some(trip => 
        trip.driverId === soldier.id
      );
      const hasAbsence = soldier.presence && ['קורס', 'גימלים', 'חופש'].includes(soldier.presence);
      const hasRest = soldier.qualifications?.includes('נהג') && (soldier.restUntil || trips.some(trip => trip.driverId === soldier.id));
      
      // הצג חייל רק אם יש לו פעילויות או שהוא לא בבסיס
      if (soldier.presence === 'בבסיס' && !hasActivities && !hasDuties && !hasReferrals && !hasTrips && !hasAbsence && !hasRest) {
        return;
      }
      
      // הוספת חיילים בבסיס שיש להם פעילויות
      if (soldier.presence === 'בבסיס' && (hasActivities || hasDuties || hasReferrals || hasTrips)) {
        // הוספת פעילויות לחייל בבסיס
        if (hasActivities) {
          const soldierActivities = activities.filter(activity => 
            activity.participants.some(p => p.soldierId === soldier.id)
          );
          
          soldierActivities.forEach(activity => {
            if (activity.plannedDate && activity.plannedTime && activity.duration) {
              const startTime = new Date(`${activity.plannedDate}T${activity.plannedTime}`);
              const endTime = new Date(startTime.getTime() + (activity.duration * 60 * 60 * 1000));
              
              items.push({
                id: `activity-${activity.id}-${soldier.id}`,
                title: `פעילות: ${activity.name}`,
                start: startTime,
                end: endTime,
                type: 'activity',
                soldier,
                activity,
                status: 'בפעילות'
              });
            }
          });
        }
        
        // הוספת תורנויות לחייל בבסיס
        if (hasDuties) {
          const soldierDuties = duties.filter(duty => 
            duty.participants.some(p => p.soldierId === soldier.id)
          );
          
          soldierDuties.forEach(duty => {
            if (duty.startDate && duty.startTime && duty.endTime) {
              const startTime = new Date(`${duty.startDate}T${duty.startTime}`);
              const endTime = new Date(`${duty.startDate}T${duty.endTime}`);
              
              items.push({
                id: `duty-${duty.id}-${soldier.id}`,
                title: `תורנות: ${duty.type}`,
                start: startTime,
                end: endTime,
                type: 'duty',
                soldier,
                duty,
                status: 'בתורנות'
              });
            }
          });
        }
        
        // הוספת הפניות לחייל בבסיס
        if (hasReferrals) {
          const soldierReferrals = referrals.filter(referral => 
            referral.soldierId === soldier.id
          );
          
          soldierReferrals.forEach(referral => {
            if (referral.date && referral.departureTime && referral.returnTime) {
              const startTime = new Date(`${referral.date}T${referral.departureTime}`);
              const endTime = new Date(`${referral.date}T${referral.returnTime}`);
              
              items.push({
                id: `referral-${referral.id}-${soldier.id}`,
                title: `הפניה: ${referral.reason}`,
                start: startTime,
                end: endTime,
                type: 'referral',
                soldier,
                referral,
                status: 'בהפניה'
              });
            }
          });
        }
        
        // הוספת נסיעות לחייל בבסיס
        if (hasTrips) {
          const soldierTrips = trips.filter(trip => 
            trip.driverId === soldier.id
          );
          
          soldierTrips.forEach(trip => {
            if (trip.departureTime && trip.returnTime) {
              const startTime = new Date(trip.departureTime);
              const endTime = new Date(trip.returnTime);
              
              items.push({
                id: `trip-${trip.id}-${soldier.id}`,
                title: `נסיעה: ${trip.purpose}`,
                start: startTime,
                end: endTime,
                type: 'trip',
                soldier,
                trip,
                status: 'בנסיעה'
              });
            }
          });
        }
        
        return; // דלג על שאר הפעילויות לחייל בבסיס
      }
      // פעילויות
      const soldierActivities = activities.filter(activity => 
        activity.participants.some(p => p.soldierId === soldier.id)
      );
      
      soldierActivities.forEach(activity => {
        if (activity.plannedDate && activity.plannedTime && activity.duration) {
          const startTime = new Date(`${activity.plannedDate}T${activity.plannedTime}`);
          const endTime = new Date(startTime.getTime() + (activity.duration * 60 * 60 * 1000));
          
          items.push({
            id: `activity-${activity.id}-${soldier.id}`,
            title: `פעילות: ${activity.name}`,
            start: startTime,
            end: endTime,
            type: 'activity',
            soldier,
            activity,
            status: 'בפעילות'
          });
        }
      });
      
      // תורנויות
      const soldierDuties = duties.filter(duty => 
        duty.participants.some(p => p.soldierId === soldier.id)
      );
      
      soldierDuties.forEach(duty => {
        if (duty.startDate && duty.startTime && duty.endTime) {
          const startTime = new Date(`${duty.startDate}T${duty.startTime}`);
          const endTime = new Date(`${duty.startDate}T${duty.endTime}`);
          
          items.push({
            id: `duty-${duty.id}-${soldier.id}`,
            title: `תורנות: ${duty.type}`,
            start: startTime,
            end: endTime,
            type: 'duty',
            soldier,
            duty,
            status: 'בתורנות'
          });
        }
      });
      
      // הפניות
      const soldierReferrals = referrals.filter(referral => 
        referral.soldierId === soldier.id
      );
      
      soldierReferrals.forEach(referral => {
        if (referral.date && referral.departureTime && referral.returnTime) {
          const startTime = new Date(`${referral.date}T${referral.departureTime}`);
          const endTime = new Date(`${referral.date}T${referral.returnTime}`);
          
          items.push({
            id: `referral-${referral.id}-${soldier.id}`,
            title: `הפניה: ${referral.reason}`,
            start: startTime,
            end: endTime,
            type: 'referral',
            soldier,
            referral,
            status: 'בהפניה'
          });
        }
      });
      
      // נסיעות (רק אם החייל הוא הנהג)
      const soldierTrips = trips.filter(trip => 
        trip.driverId === soldier.id
      );
      
      soldierTrips.forEach(trip => {
        if (trip.departureTime && trip.returnTime) {
          const startTime = new Date(trip.departureTime);
          const endTime = new Date(trip.returnTime);
          
          items.push({
            id: `trip-${trip.id}-${soldier.id}`,
            title: `נסיעה: ${trip.purpose}`,
            start: startTime,
            end: endTime,
            type: 'trip',
            soldier,
            trip,
            status: 'בנסיעה'
          });
        }
      });
      
      // היעדרויות (קורס, גימלים, חופש)
      if (soldier.presence && ['קורס', 'גימלים', 'חופש'].includes(soldier.presence)) {
        if (soldier.absenceUntil) {
          const endTime = parseAbsenceUntilTime(soldier.absenceUntil);
          const startTime = new Date(); // התחלה מהיום
          
          items.push({
            id: `absence-${soldier.id}`,
            title: soldier.presence,
            start: startTime,
            end: endTime,
            type: 'absence',
            soldier,
            status: soldier.presence as PresenceStatus
          });
        }
      }
    });
    
    // הוספת מנוחה לכל הנהגים (ללא קשר לסטטוס)
    soldiers.forEach(soldier => {
      if (soldier.qualifications?.includes('נהג')) {
        // בדיקה אם הנהג במנוחה לפי שדה restUntil
        if (soldier.restUntil) {
          try {
            const restEndTime = new Date(soldier.restUntil);
            
            // בדיקה שהתאריך תקין
            if (!isNaN(restEndTime.getTime())) {
              // מציאת זמן התחלת המנוחה (7 שעות לפני סיום המנוחה)
              const restStartTime = new Date(restEndTime.getTime() - (7 * 60 * 60 * 1000));
              
              items.push({
                id: `rest-${soldier.id}`,
                title: 'מנוחה',
                start: restStartTime,
                end: restEndTime,
                type: 'rest',
                soldier,
                status: 'במנוחה'
              });
            }
          } catch (error) {
            console.warn('תאריך לא תקין למנוחה:', soldier.restUntil);
          }
        } else {
          // אם אין restUntil, נסה למצוא לפי נסיעות שהסתיימו
          const soldierTrips = trips.filter(t => t.driverId === soldier.id);
          
          if (soldierTrips.length > 0) {
            const lastTrip = soldierTrips.sort((a, b) => 
              new Date(b.returnTime).getTime() - new Date(a.returnTime).getTime()
            )[0];
            
            if (lastTrip && lastTrip.returnTime) {
              try {
                const lastReturnTime = new Date(lastTrip.returnTime);
                
                // בדיקה שהתאריך תקין
                if (!isNaN(lastReturnTime.getTime())) {
                  const calculatedRestEnd = new Date(lastReturnTime.getTime() + (7 * 60 * 60 * 1000));
                  
                  // הצג שעות מנוחה
                  items.push({
                    id: `rest-${soldier.id}`,
                    title: 'מנוחה',
                    start: lastReturnTime,
                    end: calculatedRestEnd,
                    type: 'rest',
                    soldier,
                    status: 'במנוחה'
                  });
                }
              } catch (error) {
                console.warn('תאריך לא תקין לנסיעה:', lastTrip.returnTime);
              }
            }
          }
        }
      }
    });
    
    return items.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [soldiers, activities, duties, referrals, trips, refreshKey]);

  // פונקציה למציאת כל המסגרות בהיררכיה כולל מסגרות-בנות
  const getAllFrameworksInHierarchy = (frameworkId: string): string[] => {
    const direct = [frameworkId];
    const children = frameworks.filter(f => f.parentFrameworkId === frameworkId);
    const childIds = children.flatMap(child => getAllFrameworksInHierarchy(child.id));
    return [...direct, ...childIds];
  };

  // פונקציה למציאת כל המסגרות-ההורים של מסגרת נתונה
  const getAllParentFrameworks = (frameworkId: string): string[] => {
    const result = [frameworkId];
    let currentFramework = frameworks.find(f => f.id === frameworkId);
    
    while (currentFramework?.parentFrameworkId) {
      result.push(currentFramework.parentFrameworkId);
      currentFramework = frameworks.find(f => f.id === currentFramework.parentFrameworkId);
    }
    
    return result;
  };

  // פונקציה לסינון חיילים לפי פילטרים
  const getFilteredSoldiers = () => {
    return soldiers.filter(soldier => {
      // בדיקה אם יש לחייל פעילויות, תורנויות, הפניות או נסיעות
      const hasActivities = activities.some(activity => 
        activity.participants.some(p => p.soldierId === soldier.id)
      );
      const hasDuties = duties.some(duty => 
        duty.participants.some(p => p.soldierId === soldier.id)
      );
      const hasReferrals = referrals.some(referral => 
        referral.soldierId === soldier.id
      );
      const hasTrips = trips.some(trip => 
        trip.driverId === soldier.id
      );
      const hasAbsence = soldier.presence && ['קורס', 'גימלים', 'חופש'].includes(soldier.presence);
      const hasRest = soldier.qualifications?.includes('נהג') && (soldier.restUntil || trips.some(trip => trip.driverId === soldier.id));
      
      // הצג חייל רק אם יש לו פעילויות או שהוא לא בבסיס
      if (soldier.presence === 'בבסיס' && !hasActivities && !hasDuties && !hasReferrals && !hasTrips && !hasAbsence && !hasRest) {
        return false;
      }
      
      // פילטר מסגרת - כולל היררכיה
      if (soldierFilters.frameworkIds.length > 0) {
        if (!soldier.frameworkId) {
          return false; // אם אין מסגרת לחייל, לא להציג
        }
        
        // מציאת כל המסגרות-ההורים של החייל
        const soldierParentFrameworks = getAllParentFrameworks(soldier.frameworkId);
        
        // בדיקה אם אחת מהמסגרות הנבחרות היא הורה של המסגרת של החייל
        const hasMatchingFramework = soldierFilters.frameworkIds.some(selectedFrameworkId => 
          soldierParentFrameworks.includes(selectedFrameworkId)
        );
        
        if (!hasMatchingFramework) {
          return false;
        }
      }
      
      // פילטר סטטוס - בחירה מרובה
      if (soldierFilters.statuses.length > 0) {
        const hasMatchingStatus = soldierFilters.statuses.some(selectedStatus => 
          soldier.presence === selectedStatus
        );
        if (!hasMatchingStatus) {
          return false;
        }
      }
      
      // פילטר כשירויות - בחירה מרובה
      if (soldierFilters.qualifications.length > 0) {
        const hasMatchingQualification = soldierFilters.qualifications.some(selectedQualification => 
          soldier.qualifications?.includes(selectedQualification)
        );
        if (!hasMatchingQualification) {
          return false;
        }
      }
      
      // פילטר חיפוש - חיפוש בשם
      if (soldierFilters.searchTerm.trim() !== '') {
        const searchTerm = soldierFilters.searchTerm.toLowerCase();
        const soldierName = soldier.name?.toLowerCase() || '';
        const soldierId = soldier.id?.toLowerCase() || '';
        
        if (!soldierName.includes(searchTerm) && !soldierId.includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    });
  };

  // קבלת רשימת חיילים לציר Y - עם פילטרים
  const yAxisItems = useMemo(() => {
    return getFilteredSoldiers();
  }, [soldiers, soldierFilters, frameworks, refreshKey]);

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
  }, [zoomLevel, panOffset, refreshKey]);

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

  // פונקציה לקבלת צבע לפי פריט טיימליין
  const getTimelineItemColor = (item: TimelineItem) => {
    return getStatusColor(item.status);
  };





  // קבלת פריטים לשורה ספציפית
  const getItemsForRow = (yItem: Soldier) => {
    return timelineItems.filter(item => {
      return item.soldier.id === yItem.id;
    });
  };

  // בדיקה אם טווח זמן פנוי
  const isTimeRangeAvailable = (yItem: Soldier, startTime: Date, endTime: Date) => {
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



  // המרת מיקום X לזמן (RTL - מימין לשמאל)
  // חישוב רוחב דינמי בהתאם לגודל המסך
  const getDynamicWidths = () => {
    const containerWidth = containerRef.current?.offsetWidth || windowWidth || 1200;
    const timeSlots = generateTimeSlots();
    
    // רוחב מינימלי לעמודת חיילים
    const minSoldierColumnWidth = 120;
    
    // רוחב זמין לעמודות שעות
    const availableWidth = Math.max(containerWidth - minSoldierColumnWidth, timeSlots.length * 30);
    const hourColumnWidth = Math.max(30, availableWidth / timeSlots.length);
    
    return {
      soldierColumnWidth: minSoldierColumnWidth,
      hourColumnWidth,
      totalWidth: minSoldierColumnWidth + (timeSlots.length * hourColumnWidth)
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
  const handleTimelineClick = (event: React.MouseEvent, yItem: Soldier) => {
    // לא נציג בחירה לטיימליין חיילים - רק צפייה
  };

  // טיפול בלחיצה על פעילות
  const handleActivityClick = (event: React.MouseEvent, item: TimelineItem) => {
    event.stopPropagation(); // מניעת הפעלת handleTimelineClick
    setActivityDetailsDialog({
      open: true,
      item: item
    });
  };

  // סגירת דיאלוג פרטי פעילות
  const handleCloseActivityDetails = () => {
    setActivityDetailsDialog({
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
    const timeSpan = zoomLevel >= 2 ? 24 * 60 * 60 * 1000 : 
                    zoomLevel >= 1 ? 7 * 24 * 60 * 60 * 1000 : 
                    30 * 24 * 60 * 60 * 1000;
    setPanOffset(panOffset + timeSpan); // הפיכה: + במקום -
  };

  const handleNext = () => {
    const timeSpan = zoomLevel >= 2 ? 24 * 60 * 60 * 1000 : 
                    zoomLevel >= 1 ? 7 * 24 * 60 * 60 * 1000 : 
                    30 * 24 * 60 * 60 * 1000;
    setPanOffset(panOffset - timeSpan); // הפיכה: - במקום +
  };

  const handleToday = () => {
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
              ציר זמן חיילים
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.75rem' } }}>
              תצוגת ציר זמן פעילויות חיילים • גלילה אופקית לתזוזה
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.8rem', sm: '0.75rem' } }}>
              לחץ על פעילות לצפייה בפרטים
            </Typography>
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


          </Box>
        </Box>

        {/* פילטרים לחיילים */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              פילטרים לחיילים
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>מסגרות</InputLabel>
                <Select
                  multiple
                  value={soldierFilters.frameworkIds}
                  onChange={(e) => setSoldierFilters(prev => ({ 
                    ...prev, 
                    frameworkIds: typeof e.target.value === 'string' ? [e.target.value] : e.target.value 
                  }))}
                  label="מסגרות"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const framework = frameworks.find(f => f.id === value);
                        return (
                          <Chip key={value} label={framework?.name || value} size="small" />
                        );
                      })}
                    </Box>
                  )}
                >
                  {frameworks.map(framework => (
                    <MenuItem key={framework.id} value={framework.id}>
                      {framework.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>סטטוס נוכחות</InputLabel>
                <Select
                  multiple
                  value={soldierFilters.statuses}
                  onChange={(e) => setSoldierFilters(prev => ({ 
                    ...prev, 
                    statuses: typeof e.target.value === 'string' ? [e.target.value] : e.target.value 
                  }))}
                  label="סטטוס נוכחות"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {/* איסוף כל הסטטוסים מכל החיילים */}
                  {Array.from(new Set(
                    soldiers.map(soldier => {
                      // כלול "בבסיס" רק אם יש לחייל פעילויות
                      if (soldier.presence === 'בבסיס') {
                        const hasActivities = activities.some(activity => 
                          activity.participants.some(p => p.soldierId === soldier.id)
                        );
                        const hasDuties = duties.some(duty => 
                          duty.participants.some(p => p.soldierId === soldier.id)
                        );
                        const hasReferrals = referrals.some(referral => 
                          referral.soldierId === soldier.id
                        );
                        const hasTrips = trips.some(trip => 
                          trip.driverId === soldier.id
                        );
                        return (hasActivities || hasDuties || hasReferrals || hasTrips) ? soldier.presence : null;
                      }
                      return soldier.presence;
                    }).filter((status): status is string => status !== null)
                  )).sort().map(status => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>כשירויות</InputLabel>
                <Select
                  multiple
                  value={soldierFilters.qualifications}
                  onChange={(e) => setSoldierFilters(prev => ({ 
                    ...prev, 
                    qualifications: typeof e.target.value === 'string' ? [e.target.value] : e.target.value 
                  }))}
                  label="כשירויות"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {/* איסוף כל הכשירויות מכל החיילים */}
                  {Array.from(new Set(
                    soldiers.flatMap(soldier => soldier.qualifications || [])
                  )).sort().map(qualification => (
                    <MenuItem key={qualification} value={qualification}>
                      {qualification}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                size="small"
                label="חיפוש"
                value={soldierFilters.searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSoldierFilters(prev => ({ 
                  ...prev, 
                  searchTerm: e.target.value 
                }))}
                placeholder="חיפוש בשם חייל..."
                sx={{ minWidth: 200 }}
              />
              
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSoldierFilters({ frameworkIds: [], statuses: [], qualifications: [], searchTerm: '' })}
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                נקה פילטרים
              </Button>
            </Box>
          </CardContent>
        </Card>

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
              width: `${getDynamicWidths().soldierColumnWidth}px`, 
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
              חיילים
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
              width: `${getDynamicWidths().soldierColumnWidth}px`, 
              borderRight: 1, 
              borderColor: 'divider',
              backgroundColor: 'grey.100',
              flexShrink: 0,
              position: 'sticky',
              left: 0,
              zIndex: 60
            }} />
            
            {generateTimeSlots().map((slot, i) => {
              const now = new Date();
              const isCurrentHour = now.getHours() === slot.time.getHours() && 
                                  now.getDate() === slot.time.getDate() &&
                                  now.getMonth() === slot.time.getMonth() &&
                                  now.getFullYear() === slot.time.getFullYear();
              
              return (
                <Box
                  key={i}
                  sx={{
                    width: `${getDynamicWidths().hourColumnWidth}px`,
                    textAlign: 'center',
                    p: 0.5,
                    borderRight: 1,
                    borderColor: 'divider',
                    flexShrink: 0,
                    backgroundColor: isCurrentHour ? '#e3f2fd' : 'transparent',
                    borderLeft: isCurrentHour ? '3px solid #1976d2' : 'none'
                  }}
                >
                  <Typography 
                    variant="body2" 
                    fontWeight="bold" 
                    sx={{ 
                      fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.8rem' },
                      color: isCurrentHour ? '#1976d2' : 'inherit'
                    }}
                  >
                    {slot.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* שורות חיילים */}
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
                       width: `${getDynamicWidths().soldierColumnWidth}px`,
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
                       <SoldierIcon sx={{ mr: { xs: 0.5, sm: 1 }, fontSize: { xs: 18, sm: 16 } }} />
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
                         {yItem.name}
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
                       {generateTimeSlots().map((slot, i) => {
                         const now = new Date();
                         const isCurrentHour = now.getHours() === slot.time.getHours() && 
                                             now.getDate() === slot.time.getDate() &&
                                             now.getMonth() === slot.time.getMonth() &&
                                             now.getFullYear() === slot.time.getFullYear();
                         
                         return (
                           <Box
                             key={i}
                             sx={{
                               width: `${getDynamicWidths().hourColumnWidth}px`,
                               borderRight: 1,
                               borderColor: 'rgba(0,0,0,0.08)',
                               backgroundColor: isCurrentHour ? '#e3f2fd' : (i % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'transparent'),
                               borderLeft: isCurrentHour ? '3px solid #1976d2' : 'none',
                               flexShrink: 0
                             }}
                           />
                         );
                       })}
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
                                 <strong>התחלה:</strong> {formatToIsraelString(item.start, {
                                   hour: '2-digit',
                                   minute: '2-digit',
                                   day: '2-digit',
                                   month: '2-digit'
                                 })}
                               </Typography>
                               <Typography variant="caption" sx={{ display: 'block' }}>
                                 <strong>סיום:</strong> {formatToIsraelString(item.end, {
                                   hour: '2-digit',
                                   minute: '2-digit',
                                   day: '2-digit',
                                   month: '2-digit'
                                 })}
                               </Typography>
                               <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                 <strong>משך:</strong> {Math.round((item.end.getTime() - item.start.getTime()) / (1000 * 60))} דקות
                               </Typography>
                               <Typography variant="caption" display="block">
                                 <strong>חייל:</strong> {item.soldier.name}
                               </Typography>
                               <Typography variant="caption" display="block">
                                 <strong>סטטוס:</strong> {item.status}
                               </Typography>
                             </Box>
                           }
                         >
                           <Box
                             onClick={(e) => handleActivityClick(e, item)}
                             sx={{
                               position: 'absolute',
                               left: position.left,
                               width: position.width,
                               top: 10,
                               height: 35,
                               backgroundColor: getTimelineItemColor(item),
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
                             <Chip
                               label={item.status}
                               size="small"
                               sx={{
                                 height: 14,
                                 fontSize: '0.6rem',
                                 backgroundColor: 'rgba(255,255,255,0.2)',
                                 color: 'white'
                               }}
                             />
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
            <Box sx={{ width: { xs: 12, sm: 16 }, height: { xs: 12, sm: 16 }, backgroundColor: '#4CAF50', borderRadius: 1, mr: 1 }} />
            <Typography variant="caption" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>בבסיס</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: { xs: 12, sm: 16 }, height: { xs: 12, sm: 16 }, backgroundColor: '#2196F3', borderRadius: 1, mr: 1 }} />
            <Typography variant="caption" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>בפעילות</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: { xs: 12, sm: 16 }, height: { xs: 12, sm: 16 }, backgroundColor: '#FF9800', borderRadius: 1, mr: 1 }} />
            <Typography variant="caption" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>בנסיעה</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: { xs: 12, sm: 16 }, height: { xs: 12, sm: 16 }, backgroundColor: '#9C27B0', borderRadius: 1, mr: 1 }} />
            <Typography variant="caption" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>בתורנות</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: { xs: 12, sm: 16 }, height: { xs: 12, sm: 16 }, backgroundColor: '#FF6B35', borderRadius: 1, mr: 1 }} />
            <Typography variant="caption" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>בהפניה</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: { xs: 12, sm: 16 }, height: { xs: 12, sm: 16 }, backgroundColor: '#607D8B', borderRadius: 1, mr: 1 }} />
            <Typography variant="caption" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>במנוחה</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: { xs: 12, sm: 16 }, height: { xs: 12, sm: 16 }, backgroundColor: '#E91E63', borderRadius: 1, mr: 1 }} />
            <Typography variant="caption" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>קורס</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: { xs: 12, sm: 16 }, height: { xs: 12, sm: 16 }, backgroundColor: '#00BCD4', borderRadius: 1, mr: 1 }} />
            <Typography variant="caption" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>חופש</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: { xs: 12, sm: 16 }, height: { xs: 12, sm: 16 }, backgroundColor: '#FFD600', borderRadius: 1, mr: 1 }} />
            <Typography variant="caption" fontSize={{ xs: '0.7rem', sm: '0.75rem' }}>גימלים</Typography>
          </Box>
        </Box>
      </CardContent>

      {/* דיאלוג פרטי פעילות */}
      <Dialog
        open={activityDetailsDialog.open}
        onClose={handleCloseActivityDetails}
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
            פרטי פעילות
          </Typography>
          <IconButton
            onClick={handleCloseActivityDetails}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 1 }}>
          {activityDetailsDialog.item && (
            <Box>
              {/* כותרת */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                p: 2,
                backgroundColor: getTimelineItemColor(activityDetailsDialog.item),
                borderRadius: 1,
                color: 'white'
              }}>
                <SoldierIcon sx={{ mr: 1, fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                  {activityDetailsDialog.item.title}
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
                      {formatToIsraelString(activityDetailsDialog.item.start, {
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
                      {formatToIsraelString(activityDetailsDialog.item.end, {
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
                      {Math.round((activityDetailsDialog.item.end.getTime() - activityDetailsDialog.item.start.getTime()) / (1000 * 60))} דקות
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* פרטי חייל */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                  פרטי חייל:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      חייל:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {activityDetailsDialog.item.soldier.name}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* סטטוס */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                  סטטוס:
                </Typography>
                <Chip
                  label={activityDetailsDialog.item.status}
                  size="medium"
                  sx={{
                    backgroundColor: getTimelineItemColor(activityDetailsDialog.item),
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={handleCloseActivityDetails}
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

export default SoldiersTimeline;
