import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSoldiersWithAvailability } from '../utils/soldierUtils';
import mermaid from 'mermaid';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Avatar,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import {
  AccountTree as TreeIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as ExitFullscreenIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  VisibilityOff as ViewOffIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { getAllFrameworks } from '../services/frameworkService';
import { getAllSoldiers, getAllSoldiersWithFrameworkNames } from '../services/soldierService';
import { getAllActivities } from '../services/activityService';
import { getAllDuties } from '../services/dutyService';
import { getAllReferrals } from '../services/referralService';
import { getAllTrips } from '../services/tripService';
import { Framework } from '../models/Framework';
import { Soldier } from '../models/Soldier';
import { Activity } from '../models/Activity';
import { Duty } from '../models/Duty';
import { Referral } from '../models/Referral';
import { Trip } from '../models/Trip';
import { getPresenceColor } from '../utils/colors';
import { formatToIsraelString } from '../utils/dateUtils';
import { canUserAccessPath, getUserPermissions } from '../services/permissionService';
import { SystemPath, PermissionLevel, DataScope } from '../models/UserRole';
import TripsTimeline from '../components/TripsTimeline';
import SoldiersTimeline from '../components/SoldiersTimeline';
import { getStatusColor, PresenceStatus, isAbsenceActive, parseAbsenceUntilTime } from '../utils/presenceStatus';

interface OrganizationalStructure {
  frameworks: Framework[];
  soldiers: (Soldier & { frameworkName?: string })[];
  activities: Activity[];
  duties: Duty[];
  referrals: Referral[];
  trips: Trip[];
  loading: boolean;
  lastUpdated: Date;
}

const Hamal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [data, setData] = useState<OrganizationalStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [zoom, setZoom] = useState(1);
  const [showSoldiers, setShowSoldiers] = useState(true);
  const [showPresence, setShowPresence] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [permissions, setPermissions] = useState({
    canView: false,
    canViewFrameworks: false,
    canViewSoldiers: false
  });
  const mermaidRef = useRef<HTMLDivElement>(null);

  // אתחול Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'linear'
      },
      securityLevel: 'loose'
    } as any);
  }, []);

  // טעינת נתוני המבנה הארגוני
  const loadOrganizationalData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // בדיקת הרשאות המשתמש
      const canViewFrameworks = await canUserAccessPath(user.uid, SystemPath.FRAMEWORKS, PermissionLevel.VIEW);
      const canViewSoldiers = await canUserAccessPath(user.uid, SystemPath.SOLDIERS, PermissionLevel.VIEW);
      const canViewHamal = await canUserAccessPath(user.uid, SystemPath.HAMAL, PermissionLevel.VIEW);
      
      setPermissions({ 
        canView: canViewHamal || (canViewFrameworks && canViewSoldiers),
        canViewFrameworks,
        canViewSoldiers
      });
      
      if (!canViewHamal && !(canViewFrameworks && canViewSoldiers)) {
        setLoading(false);
        return;
      }
      
      // קבלת הרשאות המשתמש לסינון נתונים
      const userPermissions = await getUserPermissions(user.uid);
      const frameworksPolicy = userPermissions.policies.find(policy => 
        policy.paths.includes(SystemPath.FRAMEWORKS)
      );
      const soldiersPolicy = userPermissions.policies.find(policy => 
        policy.paths.includes(SystemPath.SOLDIERS)
      );
      
      // טעינת כל הנתונים
      const [allFrameworks, allSoldiers, allSoldiersWithNames, allActivities, allDuties, allReferrals, allTrips] = await Promise.all([
        getAllFrameworks(),
        getAllSoldiers(),
        getAllSoldiersWithFrameworkNames(),
        getAllActivities(),
        getAllDuties(),
        getAllReferrals(),
        getAllTrips()
      ]);
      
      let frameworksData = allFrameworks;
      let soldiersData: (Soldier & { frameworkName?: string })[] = [];
      
      // סינון נתונים לפי מדיניות ההרשאות
      if (soldiersPolicy) {
        switch (soldiersPolicy.dataScope) {
          case DataScope.USER_ONLY:
            const userSoldier = allSoldiers.find(s => s.email === user.email);
            if (userSoldier) {
              soldiersData = [userSoldier as any];
            }
            break;
            
          case DataScope.FRAMEWORK_ONLY:
            const userSoldierForFramework = allSoldiers.find(s => s.email === user.email);
            if (userSoldierForFramework?.frameworkId) {
              const getAllSoldiersInHierarchy = (frameworkId: string): string[] => {
                const directSoldiers = allSoldiers.filter(s => s.frameworkId === frameworkId).map(s => s.id);
                const childFrameworks = frameworksData.filter(f => f.parentFrameworkId === frameworkId);
                const childSoldiers = childFrameworks.flatMap(child => getAllSoldiersInHierarchy(child.id));
                return [...directSoldiers, ...childSoldiers];
              };
              
              const allSoldiersInHierarchy = getAllSoldiersInHierarchy(userSoldierForFramework.frameworkId);
              soldiersData = allSoldiersWithNames.filter(s => allSoldiersInHierarchy.includes(s.id));
            }
            break;
            
          case DataScope.ALL_DATA:
          default:
            soldiersData = allSoldiersWithNames;
            break;
        }
      } else {
        soldiersData = allSoldiersWithNames;
      }

      setData({
        frameworks: frameworksData,
        soldiers: soldiersData,
        activities: allActivities,
        duties: allDuties,
        referrals: allReferrals,
        trips: allTrips,
        loading: false,
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('שגיאה בטעינת נתוני מבנה ארגוני:', error);
      setData({
        frameworks: [],
        soldiers: [],
        activities: [],
        duties: [],
        referrals: [],
        trips: [],
        loading: false,
        lastUpdated: new Date()
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // יצירת פריטי טיימליין לחיילים
  const generateSoldiersTimelineItems = useCallback(() => {
    if (!data) return [];
    
    const { soldiers, activities, duties, referrals, trips } = data;
    const items: any[] = [];
    
    soldiers.forEach(soldier => {
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
            activity
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
            duty
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
            referral
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
            trip
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
            soldier
          });
        }
      }
      
      // מנוחה (רק לנהגים)
      if (soldier.qualifications?.includes('נהג') && soldier.restUntil) {
        const restEndTime = new Date(soldier.restUntil);
        const restStartTime = new Date(restEndTime.getTime() - (7 * 60 * 60 * 1000));
        
        items.push({
          id: `rest-${soldier.id}`,
          title: 'מנוחה',
          start: restStartTime,
          end: restEndTime,
          type: 'rest',
          soldier
        });
      }
    });
    
    return items.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [data]);

  // יצירת תבנית Mermaid
  const generateMermaidDiagram = useCallback(() => {
    if (!data) return '';
    
    const { frameworks, soldiers } = data;

    const getFrameworkLevelLabel = (level: Framework['level']) => {
      switch (level) {
        case 'company': return 'פלוגה';
        case 'platoon': return 'מחלקה';
        case 'squad': return 'כיתה';
        case 'team': return 'צוות';
        default: return 'מסגרת';
      }
    };

    // פונקציה לניקוי טקסט עבור Mermaid
    const cleanTextForMermaid = (text: string) => {
      if (!text) return 'לא מוגדר';
      
      // במקום לנקות תווים, נשתמש בפורמט פשוט יותר
      return text
        .replace(/["']/g, '') // הסרת גרשיים בלבד
        .replace(/\s+/g, ' ') // החלפת רווחים מרובים ברווח אחד
        .trim() || 'לא מוגדר';
    };
    
    let mermaidCode = 'graph TD\n';
    mermaidCode += '    classDef frameworkClass fill:#e3f2fd,stroke:#1976d2,stroke-width:2px\n';
    mermaidCode += '    classDef soldierClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px\n';
    mermaidCode += '    classDef presenceBase fill:#4caf50,stroke:#2e7d32,stroke-width:1px,color:#fff\n';
    mermaidCode += '    classDef presenceActivity fill:#f44336,stroke:#c62828,stroke-width:1px,color:#fff\n';
    mermaidCode += '    classDef presenceTrip fill:#ff9800,stroke:#e65100,stroke-width:1px,color:#fff\n';
    mermaidCode += '    classDef presenceDuty fill:#9c27b0,stroke:#6a1b9a,stroke-width:1px,color:#fff\n';
    mermaidCode += '    classDef presenceRest fill:#2196f3,stroke:#1565c0,stroke-width:1px,color:#fff\n';
    mermaidCode += '    classDef presenceCourse fill:#e91e63,stroke:#ad1457,stroke-width:1px,color:#fff\n';
    mermaidCode += '    classDef presenceLeave fill:#00bcd4,stroke:#008ba3,stroke-width:1px,color:#fff\n';
    mermaidCode += '    classDef presenceGimel fill:#ffd600,stroke:#f57f17,stroke-width:1px,color:#000\n';
    mermaidCode += '    classDef presenceOther fill:#9c27b0,stroke:#6a1b9a,stroke-width:1px,color:#fff\n';
    mermaidCode += '    classDef presenceUnknown fill:#9e9e9e,stroke:#616161,stroke-width:1px,color:#fff\n';
    
    // יצירת מפה של מסגרות לפי ID
    const frameworkMap = new Map<string, Framework>();
    frameworks.forEach(framework => {
      frameworkMap.set(framework.id, framework);
    });
    
    // יצירת מפה של חיילים לפי מסגרת
    const soldiersByFramework = new Map<string, (Soldier & { frameworkName?: string })[]>();
    soldiers.forEach(soldier => {
      if (soldier.frameworkId) {
        if (!soldiersByFramework.has(soldier.frameworkId)) {
          soldiersByFramework.set(soldier.frameworkId, []);
        }
        soldiersByFramework.get(soldier.frameworkId)!.push(soldier);
      }
    });
    
    // פונקציה לקבלת צבע נוכחות
    const getPresenceClass = (presence: string) => {
      // המרת צבע מ-presenceStatus.ts לשם class ב-Mermaid
      const color = getStatusColor(presence as PresenceStatus);
      
      // מיפוי צבעים לשמות classes
      switch (color) {
        case '#4CAF50': return 'presenceBase'; // בבסיס
        case '#2196F3': return 'presenceActivity'; // בפעילות
        case '#FF9800': return 'presenceTrip'; // בנסיעה
        case '#9C27B0': return 'presenceDuty'; // בתורנות
        case '#607D8B': return 'presenceRest'; // במנוחה
        case '#E91E63': return 'presenceCourse'; // קורס
        case '#00BCD4': return 'presenceLeave'; // חופש
        case '#FF5722': return 'presenceGimel'; // גימלים
        case '#795548': return 'presenceOther'; // אחר
        default: return 'presenceUnknown';
      }
    };
    
    // יצירת הקשרים בין מסגרות
    frameworks.forEach(framework => {
      const frameworkId = `framework_${framework.id}`;
      const frameworkLabel = cleanTextForMermaid(framework.name);
      
      mermaidCode += `    ${frameworkId}("${frameworkLabel}"):::frameworkClass\n`;
      
      if (framework.parentFrameworkId) {
        const parentId = `framework_${framework.parentFrameworkId}`;
        mermaidCode += `    ${parentId} --> ${frameworkId}\n`;
      }
    });
    
    // הוספת חיילים למסגרות
    if (showSoldiers) {
      const soldiersWithAvailability = getAllSoldiersWithAvailability(soldiers, '');
      soldiersWithAvailability.forEach(soldier => {
        if (soldier.frameworkId) {
          const soldierId = `soldier_${soldier.id}`;
          const presenceClass = showPresence ? getPresenceClass(soldier.presence || '') : 'soldierClass';
          
          // הוספת תאריך סיום להיעדרות
          let soldierLabel = cleanTextForMermaid(soldier.name);
          if (soldier.isUnavailable && soldier.unavailabilityUntil && soldier.unavailabilityUntil.trim() !== '') {
            // שימוש ב-HTML line break במקום \n
            soldierLabel += `<br/><small>עד ${cleanTextForMermaid(soldier.unavailabilityUntil)}</small>`;
          }
          
          mermaidCode += `    ${soldierId}("${soldierLabel}"):::${presenceClass}\n`;
          
          const frameworkId = `framework_${soldier.frameworkId}`;
          mermaidCode += `    ${frameworkId} --> ${soldierId}\n`;
        }
      });
    }
    
    return mermaidCode;
  }, [data, showSoldiers, showPresence]);

  // רנדור התרשים
  const renderMermaidDiagram = useCallback(async () => {
    if (!mermaidRef.current || !data) return;
    
    try {
      const mermaidCode = generateMermaidDiagram();
      mermaidRef.current.innerHTML = '';
      
      const { svg } = await mermaid.render('mermaid-diagram', mermaidCode);
      mermaidRef.current.innerHTML = svg;
      
      // הוספת אירועי לחיצה
      const frameworkNodes = mermaidRef.current.querySelectorAll('.frameworkClass');
      const soldierNodes = mermaidRef.current.querySelectorAll('.soldierClass, .presenceBase, .presenceActivity, .presenceTrip, .presenceDuty, .presenceRest, .presenceCourse, .presenceLeave, .presenceGimel, .presenceOther, .presenceUnknown');
      
      frameworkNodes.forEach((node) => {
        (node as HTMLElement).style.cursor = 'pointer';
        node.addEventListener('click', (e) => {
          e.preventDefault();
          const nodeId = node.getAttribute('id');
          if (nodeId && nodeId.startsWith('framework_')) {
            const frameworkId = nodeId.replace('framework_', '');
            navigate(`/frameworks/${frameworkId}`);
          }
        });
      });
      
      soldierNodes.forEach((node) => {
        (node as HTMLElement).style.cursor = 'pointer';
        node.addEventListener('click', (e) => {
          e.preventDefault();
          const nodeId = node.getAttribute('id');
          if (nodeId && nodeId.startsWith('soldier_')) {
            const soldierId = nodeId.replace('soldier_', '');
            navigate(`/soldiers/${soldierId}`);
          }
        });
      });
      
    } catch (error) {
      console.error('שגיאה ברנדור התרשים:', error);
    }
  }, [data, generateMermaidDiagram, navigate]);

  // רנדור התרשים כאשר הנתונים משתנים
  useEffect(() => {
    renderMermaidDiagram();
  }, [renderMermaidDiagram]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    loadOrganizationalData();
    
    if (autoRefresh) {
      const interval = setInterval(loadOrganizationalData, 60000);
      return () => clearInterval(interval);
    }
  }, [loadOrganizationalData, autoRefresh]);

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

  const formatTime = (date: Date) => {
    return formatToIsraelString(date, { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return formatToIsraelString(date, { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // סטטיסטיקות
  const getStatistics = () => {
    if (!data) return null;
    
    const { frameworks, soldiers } = data;
    const presenceStats = soldiers.reduce((acc, soldier) => {
      const presence = soldier.presence || 'לא מוגדר';
      acc[presence] = (acc[presence] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalFrameworks: frameworks.length,
      totalSoldiers: soldiers.length,
      presenceStats
    };
  };

  if (loading && !data) {
    return (
      <Container maxWidth="xl" sx={{ py: 3, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          טוען מבנה ארגוני...
        </Typography>
      </Container>
    );
  }

  // בדיקה אם למשתמש יש הרשאת צפייה
  if (!permissions.canView) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="warning">
          אין לך הרשאה לצפות במבנה הארגוני
        </Alert>
      </Container>
    );
  }

  const mermaidCode = generateMermaidDiagram();
  const stats = getStatistics();

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
              <TreeIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant={fullscreen ? "h3" : "h4"} component="h1" sx={{ fontWeight: 700 }}>
                מבנה ארגוני - חמ"ל
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
              <IconButton onClick={loadOrganizationalData} size={fullscreen ? "large" : "medium"}>
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

        {/* Tabs */}
        <Card sx={{ mb: 3, bgcolor: fullscreen ? '#1a1a1a' : 'inherit' }}>
          <CardContent>
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{ mb: 2 }}
            >
              <Tab label="תצוגה גראפית" />
              <Tab label="ציר זמן נסיעות" />
              <Tab label="ציר זמן חיילים" />
            </Tabs>
            
            {activeTab === 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showSoldiers}
                        onChange={(e) => setShowSoldiers(e.target.checked)}
                      />
                    }
                    label="הצג חיילים"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showPresence}
                        onChange={(e) => setShowPresence(e.target.checked)}
                        disabled={!showSoldiers}
                      />
                    }
                    label="צבע לפי נוכחות"
                  />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title="הקטן">
                    <IconButton 
                      onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                      disabled={zoom <= 0.5}
                    >
                      <ZoomOutIcon />
                    </IconButton>
                  </Tooltip>
                  <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'center' }}>
                    {Math.round(zoom * 100)}%
                  </Typography>
                  <Tooltip title="הגדל">
                    <IconButton 
                      onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                      disabled={zoom >= 2}
                    >
                      <ZoomInIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        {stats && (
          <Card sx={{ mb: 3, bgcolor: fullscreen ? '#1a1a1a' : 'inherit' }}>
                  <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                סטטיסטיקות
                      </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Chip label={`מסגרות: ${stats.totalFrameworks}`} color="primary" />
                <Chip label={`חיילים: ${stats.totalSoldiers}`} color="secondary" />
                {Object.entries(stats.presenceStats).map(([presence, count]) => (
                      <Chip 
                    key={presence}
                    label={`${presence}: ${count}`}
                        sx={{
                      bgcolor: getPresenceColor(presence),
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Content based on active tab */}
        {activeTab === 0 ? (
          /* Mermaid Diagram */
          <Card sx={{ bgcolor: fullscreen ? '#1a1a1a' : 'inherit' }}>
            <CardContent sx={{ p: 0, overflow: 'auto' }}>
              <Box 
                sx={{
                  width: '100%',
                  minHeight: '600px',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  transition: 'transform 0.3s ease'
                }}
              >
                <div 
                  ref={mermaidRef}
                  style={{ 
                    direction: 'ltr',
                    textAlign: 'left',
                    fontSize: fullscreen ? '16px' : '14px'
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        ) : activeTab === 1 ? (
          /* Trips Timeline */
          <TripsTimeline
            trips={data?.trips || []}
            vehicles={[]}
            drivers={data?.soldiers || []}
            activities={data?.activities || []}
            frameworks={data?.frameworks || []}
          />
        ) : (
          /* Soldiers Timeline */
          <SoldiersTimeline
            soldiers={data?.soldiers || []}
            activities={data?.activities || []}
            duties={data?.duties || []}
            referrals={data?.referrals || []}
            trips={data?.trips || []}
            frameworks={data?.frameworks || []}
          />
        )}

        {/* Legend */}
        <Card sx={{ mt: 3, bgcolor: fullscreen ? '#1a1a1a' : 'inherit' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              מקרא
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#e3f2fd', border: '2px solid #1976d2', borderRadius: 1 }} />
                <Typography variant="body2">מסגרות</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#4caf50', border: '1px solid #2e7d32', borderRadius: 1 }} />
                <Typography variant="body2">בבסיס</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#f44336', border: '1px solid #c62828', borderRadius: 1 }} />
                <Typography variant="body2">בפעילות</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#ff9800', border: '1px solid #e65100', borderRadius: 1 }} />
                <Typography variant="body2">בנסיעה</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#9c27b0', border: '1px solid #6a1b9a', borderRadius: 1 }} />
                <Typography variant="body2">בתורנות</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#2196f3', border: '1px solid #1565c0', borderRadius: 1 }} />
                <Typography variant="body2">במנוחה</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#e91e63', border: '1px solid #ad1457', borderRadius: 1 }} />
                <Typography variant="body2">קורס</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#00bcd4', border: '1px solid #008ba3', borderRadius: 1 }} />
                <Typography variant="body2">חופש</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#ffd600', border: '1px solid #f57f17', borderRadius: 1 }} />
                <Typography variant="body2">גימלים</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#9c27b0', border: '1px solid #6a1b9a', borderRadius: 1 }} />
                <Typography variant="body2">אחר</Typography>
              </Box>
            </Box>
            <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary' }}>
              הצבעים מייצגים את מיקום החייל - לחיצה על מסגרת או חייל תנווט לעמוד המתאים
            </Typography>
          </CardContent>
        </Card>

            {/* Footer */}
            <Box sx={{ 
              mt: 3, 
              pt: 2, 
              borderTop: fullscreen ? '1px solid #333' : '1px solid #ddd',
              textAlign: 'center'
            }}>
              <Typography variant="caption" color="text.secondary">
            מערכת ניהול פלוגה | מבנה ארגוני דינמי | 
            {stats && ` סה"כ: ${stats.totalFrameworks} מסגרות, ${stats.totalSoldiers} חיילים`}
              </Typography>
            </Box>
      </Container>
    </Box>
  );
};

export default Hamal; 