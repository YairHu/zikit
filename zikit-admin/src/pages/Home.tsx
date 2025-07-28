import React from 'react';
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
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { UserRole, isHigherRole } from '../models/UserRole';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();

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

  // סטטיסטיקות עבור מפקדים
  const statsCards = [
    {
      title: 'חיילים',
      subtitle: 'כוח האדם הפעיל',
      icon: <GroupsIcon sx={{ fontSize: 32 }} />,
      color: '#3f51b5',
      count: '42',
      path: '/soldiers'
    },
    {
      title: 'צוותים',
      subtitle: 'מבנה ארגוני',
      icon: <PeopleIcon sx={{ fontSize: 32 }} />,
      color: '#4caf50',
      count: '6',
      path: '/teams'
    },
    {
      title: 'רכבים',
      subtitle: 'זמינים ובשימוש',
      icon: <DirectionsCarIcon sx={{ fontSize: 32 }} />,
      color: '#ff9800',
      count: '8',
      path: '/vehicles'
    },
    {
      title: 'משימות פעילות',
      subtitle: 'משימות נוכחיות',
      icon: <AssignmentIcon sx={{ fontSize: 32 }} />,
      color: '#2196f3',
      count: '3',
      path: '/missions'
    }
  ];

  // תפריט ניהול עבור מפקדים
  const managementMenuItems = [
    {
      title: 'חיילים',
      subtitle: 'ניהול כוח אדם',
      icon: <GroupsIcon sx={{ fontSize: 32 }} />,
      color: '#3f51b5',
      path: '/soldiers'
    },
    {
      title: 'צוותים',
      subtitle: 'מבנה ארגוני',
      icon: <PeopleIcon sx={{ fontSize: 32 }} />,
      color: '#4caf50',
      path: '/teams'
    },
    {
      title: 'נהגים',
      subtitle: 'ניהול נהגים',
      icon: <DriveEtaIcon sx={{ fontSize: 32 }} />,
      color: '#9c27b0',
      path: '/drivers'
    },
    {
      title: 'רכבים',
      subtitle: 'מעקב רכבים',
      icon: <DirectionsCarIcon sx={{ fontSize: 32 }} />,
      color: '#ff9800',
      path: '/vehicles'
    },
    {
      title: 'משימות',
      subtitle: 'ניהול משימות',
      icon: <AssignmentIcon sx={{ fontSize: 32 }} />,
      color: '#2196f3',
      path: '/missions'
    },
    {
      title: 'תורנויות',
      subtitle: 'שיבוץ תורנויות',
      icon: <EventNoteIcon sx={{ fontSize: 32 }} />,
      color: '#607d8b',
      path: '/duties'
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
    managementMenuItems.push({
      title: 'ניהול משתמשים',
      subtitle: 'ניהול תפקידים והרשאות',
      icon: <SettingsIcon sx={{ fontSize: 32 }} />,
      color: '#e91e63',
      path: '/users'
    });
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

      {/* סטטיסטיקות מהירות */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          סטטיסטיקות
        </Typography>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(4, 1fr)'
          },
          gap: 2
        }}>
          {statsCards.map((card, index) => (
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
              onClick={() => navigate(card.path)}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Avatar
                  sx={{
                    bgcolor: alpha(card.color, 0.1),
                    color: card.color,
                    width: 64,
                    height: 64,
                    margin: '0 auto 16px auto'
                  }}
                >
                  {card.icon}
                </Avatar>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {card.count}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {card.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {card.subtitle}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* תפריט ניהול */}
      <Box>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          מערכות ניהול
        </Typography>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)'
          },
          gap: 2
        }}>
          {managementMenuItems.map((item, index) => (
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