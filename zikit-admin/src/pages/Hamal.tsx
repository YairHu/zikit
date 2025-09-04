import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SoldierWithStatusInfo } from '../utils/soldierUtils';
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
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  VisibilityOff as ViewOffIcon,
  CalendarViewWeek as CalendarViewWeekIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';
// (הוסרו אייקונים שאינם בשימוש)
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

import { formatToIsraelString } from '../utils/dateUtils';
import { canUserAccessPath, getUserPermissions } from '../services/permissionService';
import { SystemPath, PermissionLevel, DataScope } from '../models/UserRole';
import TripsTimeline from '../components/TripsTimeline';
import SoldiersTimeline from '../components/SoldiersTimeline';
import WeeklyActivitiesDashboard from '../components/WeeklyActivitiesDashboard';
import { getStatusColor, PresenceStatus, parseAbsenceUntilTime } from '../utils/presenceStatus';
import FrameworksTree from '../components/FrameworksTree';

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
  const [zoom, setZoom] = useState(0.5);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSoldiers, setShowSoldiers] = useState(true);
  const [showPresence, setShowPresence] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [permissions, setPermissions] = useState({
    canView: false,
    canViewFrameworks: false,
    canViewSoldiers: false
  });


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
          title: 'במנוחה',
          start: restStartTime,
          end: restEndTime,
          type: 'rest',
          soldier
        });
      }
    });
    
    return items.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [data]);



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

  // Zoom handling
  const handleZoomIn = () => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)));
  const handleZoomOut = () => setZoom(z => Math.max(0.1, +(z - 0.1).toFixed(2)));
  const handleZoomReset = () => setZoom(0.5);

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

  const stats = getStatistics();

  return (
    <Box sx={{ 
      minHeight: '100vh',
      overflow: 'hidden'
    }}>
      <Container maxWidth="xl" sx={{ py: 2 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 3,
          borderBottom: 'none',
          pb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
              <TreeIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant={"h4"} component="h1" sx={{ fontWeight: 700 }}>
                מבנה ארגוני - חמ"ל
              </Typography>
              <Typography variant={"body1"} sx={{ color: 'text.secondary' }}>
                {formatDate(currentTime)} | {formatTime(currentTime)}
                {data && ` | עודכן לאחרונה: ${formatTime(data.lastUpdated)}`}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="small"
                />
              }
              label="רענון אוטומטי"
              sx={{ 
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                '& .MuiFormControlLabel-label': {
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }
              }}
            />
            <Tooltip title="רענן נתונים">
              <IconButton onClick={loadOrganizationalData} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            {/* Zoom controls - מסודרים בשורה אחת עם מרווחים קטנים */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              border: '1px solid #ddd',
              borderRadius: 1,
              px: 0.5,
              py: 0.25
            }}>
              <Tooltip title="הקטן">
                <IconButton 
                  onClick={handleZoomOut} 
                  disabled={zoom <= 0.1}
                  size="small"
                  sx={{ minWidth: 32, height: 32 }}
                >
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Typography 
                variant="body2" 
                sx={{ 
                  minWidth: 40, 
                  textAlign: 'center',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                {Math.round(zoom * 100)}%
              </Typography>
              <Tooltip title="הגדל">
                <IconButton 
                  onClick={handleZoomIn} 
                  disabled={zoom >= 2}
                  size="small"
                  sx={{ minWidth: 32, height: 32 }}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Button 
              size="small" 
              onClick={handleZoomReset}
              variant="outlined"
              sx={{ 
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                minWidth: { xs: 50, sm: 60 }
              }}
            >
              50%
            </Button>
          </Box>
        </Box>

        {/* Tabs */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{ 
                mb: 2,
                '& .MuiTab-root': {
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  minWidth: { xs: '120px', sm: '160px' }
                },
                '& .MuiTabs-scrollButtons': {
                  '&.Mui-disabled': { opacity: 0.3 },
                },
              }}
            >
              <Tab icon={<TreeIcon />} label="תצוגה גראפית" />
              <Tab icon={<CalendarViewWeekIcon />} label="דאשבורד פעילויות" />
              <Tab icon={<ViewIcon />} label="ציר זמן נסיעות" />
              <Tab icon={<ViewIcon />} label="ציר זמן חיילים" />
            </Tabs>
            
            {activeTab === 0 && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                flexWrap: 'wrap', 
                gap: 1,
                '& .MuiFormControlLabel-root': {
                  margin: 0,
                  marginRight: 0
                }
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  flexWrap: 'wrap'
                }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showSoldiers}
                        onChange={(e) => setShowSoldiers(e.target.checked)}
                        size="small"
                      />
                    }
                    label="הצג חיילים"
                    sx={{ 
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      '& .MuiFormControlLabel-label': {
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showPresence}
                        onChange={(e) => setShowPresence(e.target.checked)}
                        disabled={!showSoldiers}
                        size="small"
                      />
                    }
                    label="צבע לפי נוכחות"
                    sx={{ 
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      '& .MuiFormControlLabel-label': {
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }
                    }}
                  />
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        {stats && (
          <Card sx={{ mb: 3 }}>
                  <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                נתונים
                      </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Chip label={`מסגרות: ${stats.totalFrameworks}`} color="primary" />
                <Chip label={`חיילים: ${stats.totalSoldiers}`} color="secondary" />
                {Object.entries(stats.presenceStats).map(([presence, count]) => (
                      <Chip 
                    key={presence}
                    label={`${presence}: ${count}`}
                        sx={{
                      bgcolor: getStatusColor(presence as PresenceStatus),
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
          /* Card-based Hierarchical View */
          <FrameworksTree
            frameworks={data?.frameworks || []}
            soldiers={data?.soldiers || []}
            zoom={zoom}
            showSoldiers={showSoldiers}
            showPresence={showPresence}
          />
        ) : activeTab === 1 ? (
          /* Weekly Activities Dashboard */
          <Box>
                          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                דאשבורד מסגרות
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                תצוגת שבוע עם פעילויות לפי מסגרות. לחיצה על פעילות תנווט למסך הפעילויות לעריכה.
              </Typography>
            <WeeklyActivitiesDashboard
              activities={data?.activities || []}
              frameworks={data?.frameworks || []}
              soldiers={data?.soldiers || []}
              permissions={{ canEdit: permissions.canViewSoldiers }}
              showCompletedActivities={true}
              onActivityClick={(activityId) => {
                // ניווט למסך הפעילויות עם עריכת הפעילות
                navigate(`/activities?edit=${activityId}`);
              }}
            />
          </Box>
        ) : activeTab === 2 ? (
          /* Trips Dashboard and Timeline */
          <Box>
            {/* דאשבורד נסיעות */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  דאשבורד נסיעות
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Chip 
                    label={`נסיעות בביצוע: ${data?.trips.filter(t => t.status === 'בביצוע').length || 0}`} 
                    color="warning" 
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip 
                    label={`נסיעות מתוכננות: ${data?.trips.filter(t => t.status === 'מתוכננת').length || 0}`} 
                    color="info" 
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip 
                    label={`נהגים זמינים: ${data?.soldiers.filter(s => s.presence === 'בבסיס' && s.qualifications?.includes('נהג')).length || 0}`} 
                    color="success" 
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip 
                    label={`נהגים בנסיעה: ${data?.soldiers.filter(s => s.presence === 'בנסיעה').length || 0}`} 
                    color="warning" 
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip 
                    label={`נהגים במנוחה: ${data?.soldiers.filter(s => s.presence === 'במנוחה').length || 0}`} 
                    color="secondary" 
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </CardContent>
            </Card>
            
            {/* ציר זמן נסיעות */}
            <TripsTimeline
              trips={data?.trips || []}
              vehicles={[]}
              drivers={data?.soldiers || []}
              activities={data?.activities || []}
              frameworks={data?.frameworks || []}
            />
          </Box>
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
        <Card sx={{ mt: 3 }}>
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
                <Box sx={{ width: 20, height: 20, bgcolor: getStatusColor('בבסיס' as PresenceStatus), border: '1px solid rgba(0,0,0,0.2)', borderRadius: 1 }} />
                <Typography variant="body2">בבסיס</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: getStatusColor('בפעילות' as PresenceStatus), border: '1px solid rgba(0,0,0,0.2)', borderRadius: 1 }} />
                <Typography variant="body2">בפעילות</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: getStatusColor('בנסיעה' as PresenceStatus), border: '1px solid rgba(0,0,0,0.2)', borderRadius: 1 }} />
                <Typography variant="body2">בנסיעה</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: getStatusColor('בתורנות' as PresenceStatus), border: '1px solid rgba(0,0,0,0.2)', borderRadius: 1 }} />
                <Typography variant="body2">בתורנות</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: getStatusColor('במנוחה' as PresenceStatus), border: '1px solid rgba(0,0,0,0.2)', borderRadius: 1 }} />
                <Typography variant="body2">במנוחה</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: getStatusColor('קורס' as PresenceStatus), border: '1px solid rgba(0,0,0,0.2)', borderRadius: 1 }} />
                <Typography variant="body2">קורס</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: getStatusColor('חופש' as PresenceStatus), border: '1px solid rgba(0,0,0,0.2)', borderRadius: 1 }} />
                <Typography variant="body2">חופש</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: getStatusColor('גימלים' as PresenceStatus), border: '1px solid rgba(0,0,0,0.2)', borderRadius: 1 }} />
                <Typography variant="body2">גימלים</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: getStatusColor('אחר' as PresenceStatus), border: '1px solid rgba(0,0,0,0.2)', borderRadius: 1 }} />
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
              borderTop: '1px solid #ddd',
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