import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Avatar,
  alpha
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
import { UserRole, isHigherRole } from '../models/UserRole';
import { getAllSoldiers } from '../services/soldierService';
import { getAllVehicles } from '../services/vehicleService';
import { getAllActivities } from '../services/activityService';
import { getAllDuties } from '../services/dutyService';
import { getAllMissions } from '../services/missionService';
import { getAllReferrals } from '../services/referralService';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [stats, setStats] = useState({
    soldiers: 0,
    teams: 5, // קבוע - מספר הצוותים
    vehicles: 0,
    drivers: 0,
    activities: 0,
    duties: 0,
    missions: 0,
    referrals: 0
  });
  const [loading, setLoading] = useState(true);

  // טעינת סטטיסטיקות
  useEffect(() => {
    const loadStats = async () => {
      try {
        console.log('מתחיל טעינת סטטיסטיקות...');
        
        const [soldiers, vehicles, activities, duties, missions, referrals] = await Promise.all([
          getAllSoldiers(),
          getAllVehicles(),
          getAllActivities(),
          getAllDuties(),
          getAllMissions(),
          getAllReferrals()
        ]);

        console.log('נתונים שנטענו:', {
          soldiers: soldiers.length,
          vehicles: vehicles.length,
          activities: activities.length,
          duties: duties.length,
          missions: missions.length,
          referrals: referrals.length
        });

        // חישוב נהגים (חיילים עם כשירות נהג)
        const drivers = soldiers.filter(s => s.qualifications?.includes('נהג')).length;

        setStats({
          soldiers: soldiers.length,
          teams: 5, // קבוע
          vehicles: vehicles.length,
          drivers,
          activities: activities.length,
          duties: duties.length,
          missions: missions.length,
          referrals: referrals.length
        });
      } catch (error) {
        console.error('שגיאה בטעינת סטטיסטיקות:', error);
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

  // פונקציה לבדיקה אם המשתמש יכול לראות תפריטי ניהול
  const canAccessManagement = () => {
    return isHigherRole(user.role, UserRole.CHAYAL) || user.canAssignRoles;
  };

  // אם זה חייל רגיל - הפנה לתיק האישי
  if (user.role === UserRole.CHAYAL && !canAccessManagement()) {
    navigate('/profile');
    return null;
  }

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
      path: '/teams'
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
  if (user.canAssignRoles) {
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
      </Box>

      {/* מערכות */}
      <Box>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          מערכות
        </Typography>
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
      </Box>
    </Container>
  );
};

export default Home; 