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
import { getUserPermissions, hasPermission, UserRole } from '../models/UserRole';
import { filterByPermissions, canViewActivity, canViewMission, canViewTrip, canViewDuty, canViewReferral } from '../utils/permissions';
import PermissionInfo from '../components/PermissionInfo';

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

  // טעינת סטטיסטיקות מותאמות למשתמש
  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;
      
      // אם זה חייל, העבר אותו ישירות לעמוד האישי שלו
      if ((user.role as UserRole) === UserRole.CHAYAL && user.soldierDocId) {
        navigate(`/soldiers/${user.soldierDocId}`);
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
      
      const currentUser = user;
      
      try {
        console.log('מתחיל טעינת סטטיסטיקות...');
        
        // קבלת הרשאות המשתמש
        const userPermissions = getUserPermissions(currentUser.role as UserRole);
        
        // טעינת נתונים לפי הרשאות
        let allSoldiers: any[] = [];
        let allVehicles: any[] = [];
        let allActivities: any[] = [];
        let allDuties: any[] = [];
        let allMissions: any[] = [];
        let allReferrals: any[] = [];
        
        // טעינת חיילים - רק אם יש הרשאה
        if (userPermissions.navigation.soldiers) {
          try {
            allSoldiers = await getAllSoldiers();
          } catch (error) {
            console.warn('לא ניתן לטעון נתוני חיילים:', error);
            allSoldiers = [];
          }
        }
        
        // טעינת רכבים - תמיד ננסה (לא רגיש)
        try {
          allVehicles = await getAllVehicles();
        } catch (error) {
          console.warn('לא ניתן לטעון נתוני רכבים:', error);
          allVehicles = [];
        }
        
        // טעינת פעילויות - רק אם יש הרשאה
        if (userPermissions.navigation.activities) {
          try {
            if (userPermissions.content.viewOwnDataOnly) {
              // עבור חייל - נטען רק את הפעילויות שהוא משתתף בהן
              if (currentUser.soldierDocId) {
                const soldierData = await getSoldierById(currentUser.soldierDocId);
                if (soldierData?.activities && soldierData.activities.length > 0) {
                  // נטען רק את הפעילויות הספציפיות
                  const activityPromises = soldierData.activities.map(activityId => 
                    import('../services/activityService').then(({ getActivityById }) => getActivityById(activityId))
                  );
                  const activitiesResults = await Promise.all(activityPromises);
                  allActivities = activitiesResults.filter((activity): activity is any => activity !== null);
                } else {
                  allActivities = [];
                }
              } else {
                allActivities = [];
              }
            } else {
              // עבור מפקדים - נטען את כל הפעילויות
              allActivities = await getAllActivities();
            }
          } catch (error) {
            console.warn('לא ניתן לטעון נתוני פעילויות:', error);
            allActivities = [];
          }
        }
        
        // טעינת תורנויות - רק אם יש הרשאה
        if (userPermissions.navigation.duties) {
          try {
            if (userPermissions.content.viewOwnDataOnly) {
              // עבור חייל - נטען רק את התורנויות שהוא משתתף בהן
              if (currentUser.soldierDocId) {
                allDuties = await getDutiesBySoldier(currentUser.soldierDocId);
              } else {
                allDuties = [];
              }
            } else {
              // עבור מפקדים - נטען את כל התורנויות
              allDuties = await getAllDuties();
            }
          } catch (error) {
            console.warn('לא ניתן לטעון נתוני תורנויות:', error);
            allDuties = [];
          }
        }
        
        // טעינת משימות - רק אם יש הרשאה
        if (userPermissions.navigation.missions) {
          try {
            if (userPermissions.content.viewOwnDataOnly) {
              // עבור חייל - נטען רק את המשימות שהוא מוקצה אליהן
              if (currentUser.soldierDocId) {
                allMissions = await getMissionsBySoldier(currentUser.soldierDocId);
              } else {
                allMissions = [];
              }
            } else {
              // עבור מפקדים - נטען את כל המשימות
              allMissions = await getAllMissions();
            }
          } catch (error) {
            console.warn('לא ניתן לטעון נתוני משימות:', error);
            allMissions = [];
          }
        }
        
        // טעינת הפניות - רק אם יש הרשאה
        if (userPermissions.navigation.referrals) {
          try {
            if (userPermissions.content.viewOwnDataOnly) {
              // עבור חייל - נטען רק את ההפניות שלו
              if (currentUser.soldierDocId) {
                // נטען את כל ההפניות ונסנן לפי soldierId
                const allReferralsData = await getAllReferrals();
                allReferrals = allReferralsData.filter(referral => 
                  referral.soldierId === currentUser.soldierDocId
                );
              } else {
                allReferrals = [];
              }
            } else {
              // עבור מפקדים - נטען את כל ההפניות
              allReferrals = await getAllReferrals();
            }
          } catch (error) {
            console.warn('לא ניתן לטעון נתוני הפניות:', error);
            allReferrals = [];
          }
        }
        
        // סינון נתונים לפי הרשאות המשתמש
        let visibleSoldiers = allSoldiers;
        if (userPermissions.content.viewOwnDataOnly) {
          // חייל רואה רק את עצמו
          visibleSoldiers = allSoldiers.filter(s => s.id === currentUser.uid || s.personalNumber === currentUser.personalNumber);
        } else if (userPermissions.content.viewTeamData) {
          // נשתמש ב-frameworkId כדי לזהות צוותים
          visibleSoldiers = allSoldiers.filter(s => s.frameworkId === currentUser.team);
        } else if (userPermissions.content.viewPlagaData) {
          // נשתמש בשם המסגרת כדי לזהות פלגות
          visibleSoldiers = allSoldiers.filter(s => {
            // נניח שהשם מכיל את הפלגה
            const frameworkName = s.frameworkId?.toLowerCase() || '';
            const userPelaga = currentUser.pelaga?.toLowerCase();
            return frameworkName.includes(userPelaga || '');
          });
        }
        // אם רואה כל הנתונים - לא מסנן

        // עבור חייל - הנתונים כבר מסוננים, עבור מפקדים - נסנן לפי הרשאות
        const visibleActivities = userPermissions.content.viewOwnDataOnly ? allActivities : filterByPermissions(currentUser, allActivities, canViewActivity);
        const visibleMissions = userPermissions.content.viewOwnDataOnly ? allMissions : filterByPermissions(currentUser, allMissions, canViewMission);
        const visibleDuties = userPermissions.content.viewOwnDataOnly ? allDuties : filterByPermissions(currentUser, allDuties, canViewDuty);
        const visibleReferrals = userPermissions.content.viewOwnDataOnly ? allReferrals : filterByPermissions(currentUser, allReferrals, canViewReferral);
        
        // לוגים לבדיקת סינון
        if (currentUser.role === UserRole.CHAYAL) {
          console.log('נתונים עבור חייל:', {
            userUid: currentUser.uid,
            userTeam: currentUser.team,
            soldierDocId: currentUser.soldierDocId,
            activitiesCount: allActivities.length,
            missionsCount: allMissions.length,
            dutiesCount: allDuties.length,
            referralsCount: allReferrals.length
          });
        }

        // חישוב נהגים (חיילים עם כשירות נהג) - רק מהחיילים הנראים
        // חייל לא צריך לראות מידע על נהגים
        const drivers = userPermissions.content.viewAllData || userPermissions.content.viewTeamData || userPermissions.content.viewPlagaData 
          ? visibleSoldiers.filter(s => s.qualifications?.includes('נהג')).length 
          : 0;

        // חישוב צוותים - לפי הרשאות
        let teamsCount = 0;
        if (userPermissions.content.viewAllData) {
          teamsCount = 5; // קבוע - מספר הצוותים
        } else if (userPermissions.content.viewTeamData) {
          teamsCount = 1; // רק הצוות שלו
        } else if (userPermissions.content.viewPlagaData) {
          teamsCount = 2; // צוותים בפלגה
        }

        console.log('נתונים שנטענו:', {
          soldiers: visibleSoldiers.length,
          teams: teamsCount,
          vehicles: allVehicles.length,
          drivers,
          activities: visibleActivities.length,
          duties: visibleDuties.length,
          missions: visibleMissions.length,
          referrals: visibleReferrals.length
        });
        
        console.log('פירוט סינון עבור חייל:', {
          userRole: currentUser.role,
          userUid: currentUser.uid,
          userTeam: currentUser.team,
          totalActivities: allActivities.length,
          totalDuties: allDuties.length,
          totalMissions: allMissions.length,
          totalReferrals: allReferrals.length,
          visibleActivities: visibleActivities.length,
          visibleDuties: visibleDuties.length,
          visibleMissions: visibleMissions.length,
          visibleReferrals: visibleReferrals.length
        });

        setStats({
          soldiers: visibleSoldiers.length,
          teams: teamsCount,
          vehicles: userPermissions.content.viewAllData || userPermissions.content.viewTeamData || userPermissions.content.viewPlagaData ? allVehicles.length : 0,
          drivers,
          activities: visibleActivities.length,
          duties: visibleDuties.length,
          missions: visibleMissions.length,
          referrals: visibleReferrals.length
        });
      } catch (error) {
        console.error('שגיאה בטעינת סטטיסטיקות:', error);
        // במקרה של שגיאה, נציג נתונים בסיסיים
        setStats({
          soldiers: 0,
          teams: 0,
          vehicles: 0,
          drivers: 0,
          activities: 0,
          duties: 0,
          missions: 0,
          referrals: 0
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadStats();
    }
  }, [user]);

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, textAlign: 'center' }}>
        <Typography>טוען...</Typography>
      </Container>
    );
  }

  const userPermissions = getUserPermissions(user.role as UserRole);

  // מערכות עם סטטיסטיקות - רק מה שהמשתמש יכול לראות
  const systemItems = [
    ...(userPermissions.navigation.soldiers ? [{
      title: 'חיילים',
      subtitle: `${stats.soldiers} חיילים פעילים`,
      icon: <GroupsIcon sx={{ fontSize: 32 }} />,
      color: '#3f51b5',
      path: '/soldiers'
    }] : []),
    ...(userPermissions.navigation.teams ? [{
      title: 'מסגרות',
      subtitle: `${stats.teams} מסגרות פעילות`,
      icon: <PeopleIcon sx={{ fontSize: 32 }} />,
      color: '#4caf50',
      path: '/frameworks'
    }] : []),
    ...(userPermissions.navigation.trips && (userPermissions.content.viewAllData || userPermissions.content.viewTeamData || userPermissions.content.viewPlagaData) ? [{
      title: 'נסיעות ורכבים',
      subtitle: `${stats.vehicles} רכבים, ${stats.drivers} נהגים`,
      icon: <DirectionsCarIcon sx={{ fontSize: 32 }} />,
      color: '#ff9800',
      path: '/trips'
    }] : []),
    ...(userPermissions.navigation.activities ? [{
      title: 'פעילויות',
      subtitle: `${stats.activities} פעילויות מתוכננות`,
      icon: <AssignmentIcon sx={{ fontSize: 32 }} />,
      color: '#f44336',
      path: '/activities'
    }] : []),
    ...(userPermissions.navigation.duties ? [{
      title: 'תורנויות',
      subtitle: `${stats.duties} תורנויות פעילות`,
      icon: <EventNoteIcon sx={{ fontSize: 32 }} />,
      color: '#607d8b',
      path: '/duties'
    }] : []),
    ...(userPermissions.navigation.missions ? [{
      title: 'משימות',
      subtitle: `${stats.missions} משימות פעילות`,
      icon: <AssignmentIcon sx={{ fontSize: 32 }} />,
      color: '#9c27b0',
      path: '/missions'
    }] : []),
    ...(userPermissions.navigation.referrals ? [{
      title: 'הפניות',
      subtitle: `${stats.referrals} הפניות פעילות`,
      icon: <LocalHospitalIcon sx={{ fontSize: 32 }} />,
      color: '#795548',
      path: '/referrals'
    }] : []),
    ...(userPermissions.navigation.forms ? [{
      title: 'טפסים',
      subtitle: 'מסמכים ודוחות',
      icon: <DescriptionIcon sx={{ fontSize: 32 }} />,
      color: '#795548',
      path: '/forms'
    }] : []),
    ...(userPermissions.navigation.hamal ? [{
      title: 'חמ"ל',
      subtitle: 'תצוגת מסכי בקרה',
      icon: <DashboardIcon sx={{ fontSize: 32 }} />,
      color: '#795548',
      path: '/hamal'
    }] : []),
  ];

  // הוסף ניהול משתמשים למפקדים עליונים
  if (userPermissions.navigation.userManagement) {
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

  // אם זה חייל, הצג הודעה במקום את כל הכרטיסים
  if ((user?.role as UserRole) === UserRole.CHAYAL) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, direction: 'rtl' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
            ברוך הבא, {user.displayName}
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>
            מערכת ניהול כוח אדם - פלוגה לוחמת
          </Typography>
        </Box>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>העברה אוטומטית:</strong> אתה מועבר לעמוד האישי שלך...
          </Typography>
        </Alert>
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
        {(user.role as UserRole) === UserRole.CHAYAL && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            תצוגה מותאמת אישית - רק הנתונים הרלוונטיים לך
          </Typography>
        )}
      </Box>

      {/* מידע על הרשאות */}
      <PermissionInfo showDetails={false} variant="info" />

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