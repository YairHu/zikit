import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Avatar,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert
} from '@mui/material';
import {
  Groups as GroupsIcon,
  DirectionsCar as DirectionsCarIcon,
  Assignment as AssignmentIcon,
  EventNote as EventNoteIcon,
  DriveEta as DriveEtaIcon,
  People as PeopleIcon,
  Description as DescriptionIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  LocalHospital as LocalHospitalIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { UserRole, SystemPath, PermissionLevel } from '../models/UserRole';
import { canUserAccessPath } from '../services/permissionService';
import { getAllSoldiers, getSoldierById } from '../services/soldierService';
import { getAllVehicles } from '../services/vehicleService';
import { getAllActivities } from '../services/activityService';
import { getAllDuties, getDutiesBySoldier } from '../services/dutyService';
import { getAllMissions, getMissionsBySoldier } from '../services/missionService';
import { getAllReferrals } from '../services/referralService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [stats, setStats] = useState({
    soldiers: 0,
    teams: 0,
    vehicles: 0,
    drivers: 0,
    activities: 0,
    duties: 0,
    missions: 0,
    referrals: 0
  });
  const [loading, setLoading] = useState(true);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showPendingAssignmentDialog, setShowPendingAssignmentDialog] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // טעינת סטטיסטיקות מותאמות למשתמש
  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;
      
      // בדיקת הרשאות לעמוד הראשי
      const canViewHome = await canUserAccessPath(user.uid, SystemPath.HOME, PermissionLevel.VIEW);
      setHasPermission(canViewHome);
      
      if (!canViewHome) {
        setLoading(false);
        return;
      }
      
      // בדיקה אם המשתמש חדש (אין לו soldierDocId)
      if (!user.soldierDocId) {
        setShowNewUserDialog(true);
      } else {
        // בדיקה אם המשתמש קושר אבל עדיין ממתין לשיבוץ
        try {
          const soldiersQuery = query(
            collection(db, 'soldiers'),
            where('userUid', '==', user.uid),
            where('status', '==', 'pending_assignment')
          );
          const soldiersSnapshot = await getDocs(soldiersQuery);
          if (!soldiersSnapshot.empty) {
            // המשתמש קושר אבל ממתין לשיבוץ
            setShowPendingAssignmentDialog(true);
          }
        } catch (error) {
          console.warn('לא ניתן לבדוק סטטוס שיבוץ:', error);
          // נמשיך בלי להציג דיאלוג
        }
      }
      
      try {
        console.log('מתחיל טעינת סטטיסטיקות...');
        
        // קבלת הרשאות המשתמש
        const userRole = user.role as UserRole;
        const canViewAll = false; // נפשט את החישוב
        const isUserCommander = false;
        
        // טעינת נתונים בהתאם להרשאות - עכשיו מהמטמון המקומי
        const [allSoldiers, allVehicles, allActivities, allDuties, allMissions, allReferrals] = await Promise.all([
          getAllSoldiers(), // כבר משתמש במטמון
          getAllVehicles(), // כבר משתמש במטמון
          getAllActivities(), // כבר משתמש במטמון
          getAllDuties(), // כבר משתמש במטמון
          getAllMissions(), // כבר משתמש במטמון
          getAllReferrals() // כבר משתמש במטמון
        ]);

        // חישוב סטטיסטיקות
        const drivers = 0; // נפשט את החישוב
        const vehicleCount = allVehicles.length;

        setStats({
          soldiers: allSoldiers.length,
          teams: 0, // נחשב בנפרד
          vehicles: vehicleCount,
          drivers: drivers,
          activities: allActivities.length,
          duties: allDuties.length,
          missions: allMissions.length,
          referrals: allReferrals.length
        });

        setLoading(false);
      } catch (error) {
        console.error('שגיאה בטעינת סטטיסטיקות:', error);
        setLoading(false);
      }
    };

      loadStats();
  }, [user]);

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, textAlign: 'center' }}>
        <Typography>טוען...</Typography>
      </Container>
    );
  }

  // בדיקת הרשאות
  if (!hasPermission) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          אין לך הרשאה לגשת לעמוד הראשי
        </Alert>
      </Container>
    );
  }

  // קבלת הרשאות המשתמש - עם נקודת מבט פעילה אם יש
  const effectiveUser = user;
  
  const userRole = user.role as UserRole;
  const canViewAll = false; // נפשט את החישוב
  const isUserCommander = false;

  // מערכות עם סטטיסטיקות
  const systemItems = [
    {
      title: 'חיילים',
      subtitle: `${stats.soldiers} חיילים פעילים`,
      icon: <GroupsIcon sx={{ fontSize: 32 }} />,
      color: '#3f51b5',
      path: '/soldiers'
    },
    {
      title: 'צוותים',
      subtitle: `${stats.teams} צוותים פעילים`,
      icon: <PeopleIcon sx={{ fontSize: 32 }} />,
      color: '#4caf50',
              path: '/frameworks'
    },
    {
      title: 'נסיעות ורכבים',
      subtitle: `${stats.vehicles} רכבים, ${stats.drivers} נהגים`,
      icon: <DirectionsCarIcon sx={{ fontSize: 32 }} />,
      color: '#ff9800',
      path: '/trips'
    },
    {
      title: 'פעילויות',
      subtitle: `${stats.activities} פעילויות מתוכננות`,
      icon: <AssignmentIcon sx={{ fontSize: 32 }} />,
      color: '#f44336',
      path: '/activities'
    },
    {
      title: 'תורנויות',
      subtitle: `${stats.duties} תורנויות פעילות`,
      icon: <EventNoteIcon sx={{ fontSize: 32 }} />,
      color: '#607d8b',
      path: '/duties'
    },
    {
      title: 'משימות',
      subtitle: `${stats.missions} משימות פעילות`,
      icon: <AssignmentIcon sx={{ fontSize: 32 }} />,
      color: '#9c27b0',
      path: '/missions'
    },
    {
      title: 'הפניות',
      subtitle: `${stats.referrals} הפניות פעילות`,
      icon: <LocalHospitalIcon sx={{ fontSize: 32 }} />,
      color: '#795548',
      path: '/referrals'
    },
    {
      title: 'טפסים',
      subtitle: 'מסמכים ודוחות',
      icon: <DescriptionIcon sx={{ fontSize: 32 }} />,
      color: '#795548',
      path: '/forms'
    },
    {
      title: 'חמ"ל',
      subtitle: 'תצוגת מסכי בקרה',
      icon: <DashboardIcon sx={{ fontSize: 32 }} />,
      color: '#795548',
      path: '/hamal'
    }
  ];

  // הוסף ניהול משתמשים למפקדים עליונים
  if (false) { // נפשט את החישוב
    systemItems.push({
      title: 'ניהול משתמשים',
      subtitle: 'ניהול תפקידים והרשאות',
      icon: <SettingsIcon sx={{ fontSize: 32 }} />,
      color: '#e91e63',
      path: '/users'
    });
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, textAlign: 'center' }}>
        <Typography>טוען סטטיסטיקות...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
          ברוך הבא, {user.displayName}
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          מערכת ניהול כוח אדם - פלוגה לוחמת
        </Typography>
        {(typeof user.role === 'string' && user.role === 'chayal') && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            תצוגה מותאמת אישית - נקודת מבט של חייל
          </Typography>
        )}
      </Box>

      {/* מידע על הרשאות */}
      {/* PermissionInfo component removed */}

      {/* הודעה למשתמשים חדשים */}
      {showNewUserDialog && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>משתמש חדש:</strong> ברוך הבא למערכת! כדי להשלים את הקליטה שלך, 
            יש צורך בנתונים נוספים. אם מילאת טופס גוגל, הנתונים יקושרו אוטומטית.
          </Typography>
        </Alert>
      )}

      {/* הודעה למשתמשים ממתינים לשיבוץ */}
      {showPendingAssignmentDialog && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>ממתין לשיבוץ:</strong> הנתונים שלך קושרו בהצלחה למערכת. 
            מנהל המערכת יבדוק את הנתונים וישובץ אותך לתפקיד וצוות מתאים.
          </Typography>
        </Alert>
      )}

      {/* מערכות */}
      <Box>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          מערכות
        </Typography>
        {systemItems.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            אין לך גישה למערכות נוספות
          </Typography>
        ) : (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
              lg: 'repeat(5, 1fr)'
            },
            gap: 2
          }}>
            {systemItems.map((item, index) => (
              <Card
                key={index}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => navigate(item.path)}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Avatar
                    sx={{
                      bgcolor: alpha(item.color, 0.1),
                      color: item.color,
                      width: 56,
                      height: 56,
                      margin: '0 auto 16px auto'
                    }}
                  >
                    {item.icon}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {item.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
      
      {/* הודעה על נקודת מבט פעילה */}
      {/* ViewMode context removed */}

      {/* דיאלוג למשתמשים חדשים */}
      <Dialog open={showNewUserDialog} onClose={() => setShowNewUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          ברוך הבא למערכת!
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            נראה שאתה משתמש חדש במערכת. כדי להשלים את הקליטה שלך, יש צורך בנתונים נוספים.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>אפשרויות:</strong>
          </Typography>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • אם מילאת טופס גוגל - הנתונים יקושרו אוטומטית
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • אם לא מילאת טופס - פנה למנהל המערכת
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • לאחר הקישור, תועבר ל"חיילים ממתינים לשיבוץ"
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewUserDialog(false)} variant="contained">
            הבנתי
          </Button>
        </DialogActions>
      </Dialog>

      {/* דיאלוג למשתמשים ממתינים לשיבוץ */}
      <Dialog open={showPendingAssignmentDialog} onClose={() => setShowPendingAssignmentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          ממתין לשיבוץ
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            הנתונים שלך קושרו בהצלחה למערכת! כעת אתה ממתין לשיבוץ לתפקיד וצוות.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>מה קורה עכשיו:</strong>
          </Typography>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • מנהל המערכת יבדוק את הנתונים שלך
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • תישובץ לתפקיד וצוות מתאים
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • לאחר השיבוץ, תוכל לגשת לכל הפונקציות במערכת
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPendingAssignmentDialog(false)} variant="contained">
            הבנתי
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Home; 