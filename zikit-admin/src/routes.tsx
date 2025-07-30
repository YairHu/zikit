import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { useUser } from './contexts/UserContext';
import Home from './pages/Home';
import Soldiers from './pages/Soldiers';
import Teams from './pages/Teams';
import Drivers from './pages/Drivers';
import Vehicles from './pages/Vehicles';
import Missions from './pages/Missions';
import Duties from './pages/Duties';
import Hamal from './pages/Hamal';
import Forms from './pages/Forms';
import Activities from './pages/Activities';
import Referrals from './pages/Referrals';
import Login from './pages/Login';
import SoldierProfile from './pages/SoldierProfile';
import TeamDetails from './pages/TeamDetails';
import UserManagement from './pages/UserManagement';
import PersonalProfile from './pages/PersonalProfile';
import PendingSoldiers from './pages/PendingSoldiers';
import SoldierLinking from './pages/SoldierLinking';
import DataSeeder from './pages/DataSeeder';
import ActivityDetails from './pages/ActivityDetails';
import ActivityStatistics from './pages/ActivityStatistics';
import DutyDetails from './pages/DutyDetails';
import { signOutUser } from './services/authService';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, AppBar, Toolbar, Typography, Box, Divider, Avatar, Collapse } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import GroupsIcon from '@mui/icons-material/Groups';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LinkIcon from '@mui/icons-material/Link';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import KeyIcon from '@mui/icons-material/VpnKey';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ShieldIcon from '@mui/icons-material/Shield';
import LogoutIcon from '@mui/icons-material/Logout';
import MonitorIcon from '@mui/icons-material/Monitor';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BarChartIcon from '@mui/icons-material/BarChart';

const drawerWidth = 260;

const getMenuItems = (user: any) => {
  const baseItems = [
    { text: 'דף ראשי', icon: <HomeIcon />, path: '/' },
    { text: 'התיק האישי', icon: <PersonIcon />, path: '/profile' }
  ];

  const managementItems = [
    { text: 'כוח אדם', icon: <GroupsIcon />, path: '/soldiers' },
    { text: 'צוותים', icon: <GroupsIcon />, path: '/teams' },
    { text: 'נהגים', icon: <KeyIcon />, path: '/drivers' },
    { text: 'רכבים', icon: <DirectionsCarIcon />, path: '/vehicles' },
    { text: 'משימות', icon: <AssignmentIcon />, path: '/missions' },
    { text: 'פעילויות מבצעיות', icon: <AssignmentIcon />, path: '/activities' },
    { text: 'סטטיסטיקות פעילויות', icon: <BarChartIcon />, path: '/activity-statistics' },
    { text: 'תורנויות', icon: <CalendarMonthIcon />, path: '/duties' },
    { text: 'הפניות', icon: <LocalHospitalIcon />, path: '/referrals' },
    { text: 'טפסים', icon: <DescriptionIcon />, path: '/forms' },
    { text: 'מסך חמ"ל', icon: <MonitorIcon />, path: '/hamal' }
  ];

  const adminItems = [
    { text: 'חיילים ממתינים', icon: <PersonIcon />, path: '/pending-soldiers' },
    { text: 'קישור חיילים', icon: <LinkIcon />, path: '/soldier-linking' },
    { text: 'ניהול משתמשים', icon: <SettingsIcon />, path: '/users' },
    { text: 'הכנסת נתונים', icon: <SettingsIcon />, path: '/data-seeder' }
  ];

  return { baseItems, managementItems, adminItems };
};

const SideDrawer: React.FC<{ onLogout: () => void, open: boolean, onClose: () => void, user: any }> = ({ onLogout, open, onClose, user }) => {
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const { baseItems, managementItems, adminItems } = getMenuItems(user);
  
  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ '& .MuiDrawer-paper': { width: drawerWidth, direction: 'rtl' } }}>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mb: 1 }}><ShieldIcon /></Avatar>
        <Typography variant="h6" fontWeight={700}>zikit</Typography>
        <Typography variant="body2" color="text.secondary">מערכת ניהול כוח אדם</Typography>
      </Box>
      <Divider />
      <List>
        {/* פריטים בסיסיים */}
        {baseItems.map((item) => (
          <ListItem key={item.text} component={Link} to={item.path} onClick={onClose}>
            <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        
        {/* פריטי ניהול */}
        {user && (user.canAssignRoles || user.role !== 'chayal') && (
          <>
            <Divider sx={{ my: 1 }} />
            {managementItems.map((item) => (
              <ListItem key={item.text} component={Link} to={item.path} onClick={onClose}>
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </>
        )}
        
        {/* תפריט ניהול מתקפל */}
        {user && user.canAssignRoles && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItem component="button" onClick={() => setAdminMenuOpen(!adminMenuOpen)}>
              <ListItemIcon sx={{ minWidth: 36 }}><SettingsIcon /></ListItemIcon>
              <ListItemText primary="ניהול" />
              {adminMenuOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItem>
            <Collapse in={adminMenuOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {adminItems.map((item) => (
                  <ListItem key={item.text} component={Link} to={item.path} onClick={onClose} sx={{ pl: 4 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}
        
        <ListItem component="button" onClick={onLogout} sx={{ mt: 2 }}>
          <ListItemIcon sx={{ minWidth: 36 }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="התנתק" />
        </ListItem>
      </List>
      <Box sx={{ flexGrow: 1 }} />
      {user && (
        <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary', fontSize: 14 }}>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, mx: 'auto', mb: 1 }}>
            {user.displayName?.charAt(0) || 'U'}
          </Avatar>
          {user.displayName}<br />
          {user.role === 'admin' ? 'מנהל מערכת' : 
           user.role === 'mefaked_pluga' ? 'מפקד פלוגה' :
           user.role === 'mefaked_tzevet' ? 'מפקד צוות' :
           user.role === 'chayal' ? 'חייל' : 'משתמש'}
        </Box>
      )}
    </Drawer>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await signOutUser();
    navigate('/');
  };
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" sx={{ bgcolor: '#fff', color: '#222', boxShadow: 1, zIndex: 1201 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1, textAlign: 'right', mr: 2 }}>zikit</Typography>
        </Toolbar>
      </AppBar>
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={handleLogout} user={user} />
      <Box component="main" sx={{ flexGrow: 1, pt: 9, px: 1, width: '100%' }}>
        {children}
      </Box>
    </Box>
  );
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        direction: 'rtl'
      }}>
        טוען...
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/soldiers" element={<Soldiers />} />
          <Route path="/soldiers/:id" element={<SoldierProfile />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:teamId" element={<TeamDetails />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/activities/:id" element={<ActivityDetails />} />
          <Route path="/activity-statistics" element={<ActivityStatistics />} />
          <Route path="/duties" element={<Duties />} />
          <Route path="/duties/:id" element={<DutyDetails />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/hamal" element={<Hamal />} />
          <Route path="/forms" element={<Forms />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/profile" element={<PersonalProfile />} />
          <Route path="/pending-soldiers" element={<PendingSoldiers />} />
          <Route path="/soldier-linking" element={<SoldierLinking />} />
          <Route path="/data-seeder" element={<DataSeeder />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default AppRoutes; 