import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { useUser } from './contexts/UserContext';
import { hasPermission, getUserPermissions, UserRole } from './models/UserRole';
import Home from './pages/Home';
import Soldiers from './pages/Soldiers';
import Teams from './pages/Teams';
import Trips from './pages/Trips';
import Missions from './pages/Missions';
import Duties from './pages/Duties';
import WeeklyDuties from './pages/WeeklyDuties';
import Hamal from './pages/Hamal';
import Forms from './pages/Forms';
import Activities from './pages/Activities';
import Referrals from './pages/Referrals';
import Login from './pages/Login';
import SoldierProfile from './pages/SoldierProfile';
import TeamDetails from './pages/TeamDetails';
import UserManagement from './pages/UserManagement';


import DataSeeder from './pages/DataSeeder';
import ActivityDetails from './pages/ActivityDetails';
import ActivityStatistics from './pages/ActivityStatistics';
import DutyDetails from './pages/DutyDetails';
import FrameworkManagement from './pages/FrameworkManagement';
import FrameworkDetails from './pages/FrameworkDetails';
import PermissionPolicyManagement from './pages/PermissionPolicyManagement';
import { signOutUser } from './services/authService';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, AppBar, Toolbar, Typography, Box, Divider, Avatar, Collapse } from '@mui/material';
import AccessDenied from './components/AccessDenied';

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

// רכיב הגנה על נתיבים
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredPermission?: keyof import('./models/UserRole').RolePermissions['navigation'];
  userRole?: UserRole;
}> = ({ children, requiredPermission, userRole }) => {
  const { user } = useUser();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (requiredPermission && userRole) {
    if (!hasPermission(userRole, requiredPermission)) {
      return <AccessDenied message="אין לך הרשאה לגשת לעמוד זה" />;
    }
  }
  
  return <>{children}</>;
};

const getMenuItems = (user: any) => {
  if (!user) return { baseItems: [], managementItems: [], adminItems: [] };
  
  const userPermissions = getUserPermissions(user.role as UserRole);
  
  // ניווט שונה עבור חייל
  if (user.role === UserRole.CHAYAL) {
    console.log('ניווט עבור חייל:', {
      userRole: user.role,
      soldierDocId: user.soldierDocId,
      frameworkId: user.frameworkId,
      team: user.team
    });
    
    const baseItems = [
      { text: 'התיק האישי', icon: <PersonIcon />, path: user.soldierDocId ? `/soldiers/${user.soldierDocId}` : '/soldiers' }
    ];

    const managementItems: any[] = [];
    const adminItems: any[] = [];

    return { baseItems, managementItems, adminItems };
  }

  // ניווט רגיל עבור מפקדים
  const baseItems = [
    { text: 'דף ראשי', icon: <HomeIcon />, path: '/' },
    { text: 'התיק האישי', icon: <PersonIcon />, path: user.soldierDocId ? `/soldiers/${user.soldierDocId}` : '/soldiers' }
  ];

  const managementItems = [
    ...(userPermissions.navigation.soldiers ? [{ text: 'כוח אדם', icon: <GroupsIcon />, path: '/soldiers' }] : []),
    ...(userPermissions.navigation.teams ? [{ 
      text: 'מסגרות', 
      icon: <GroupsIcon />, 
      path: '/frameworks' 
    }] : []),
    ...(userPermissions.navigation.trips ? [{ text: 'נסיעות ורכבים', icon: <DirectionsCarIcon />, path: '/trips' }] : []),
    ...(userPermissions.navigation.missions ? [{ text: 'משימות', icon: <AssignmentIcon />, path: '/missions' }] : []),
    ...(userPermissions.navigation.activities ? [{ text: 'פעילויות מבצעיות', icon: <AssignmentIcon />, path: '/activities' }] : []),
    ...(userPermissions.navigation.activityStatistics ? [{ text: 'סטטיסטיקות פעילויות', icon: <BarChartIcon />, path: '/activity-statistics' }] : []),
    ...(userPermissions.navigation.duties ? [{ text: 'תורנויות', icon: <CalendarMonthIcon />, path: '/duties' }] : []),
    ...(userPermissions.navigation.referrals ? [{ text: 'הפניות', icon: <LocalHospitalIcon />, path: '/referrals' }] : []),
    ...(userPermissions.navigation.forms ? [{ text: 'טפסים', icon: <DescriptionIcon />, path: '/forms' }] : []),
    ...(userPermissions.navigation.hamal ? [{ text: 'מסך חמ"ל', icon: <MonitorIcon />, path: '/hamal' }] : []),
  ];

  const adminItems = [
    ...(userPermissions.navigation.frameworkManagement ? [{ text: 'ניהול מבנה פלוגה', icon: <GroupsIcon />, path: '/framework-management' }] : []),
    ...(userPermissions.navigation.userManagement ? [{ text: 'ניהול משתמשים', icon: <SettingsIcon />, path: '/users' }] : []),
    ...(userPermissions.navigation.dataSeeder ? [{ text: 'הכנסת נתונים', icon: <SettingsIcon />, path: '/data-seeder' }] : []),
    ...(user.role === UserRole.ADMIN ? [{ text: 'ניהול מדיניויות הרשאות', icon: <ShieldIcon />, path: '/permission-policies' }] : []),
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
        {managementItems.length > 0 && (
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
        {adminItems.length > 0 && (
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
          <Route path="/soldiers" element={
            <ProtectedRoute requiredPermission="soldiers" userRole={user.role as UserRole}>
              <Soldiers />
            </ProtectedRoute>
          } />
          <Route path="/soldiers/:id" element={
            <ProtectedRoute requiredPermission="soldiers" userRole={user.role as UserRole}>
              <SoldierProfile />
            </ProtectedRoute>
          } />
          <Route path="/teams" element={
            <ProtectedRoute requiredPermission="teams" userRole={user.role as UserRole}>
              <Teams />
            </ProtectedRoute>
          } />
          <Route path="/teams/:teamId" element={
            <ProtectedRoute requiredPermission="teams" userRole={user.role as UserRole}>
              <TeamDetails />
            </ProtectedRoute>
          } />
          <Route path="/frameworks/:id" element={
            <ProtectedRoute requiredPermission="teams" userRole={user.role as UserRole}>
              <FrameworkDetails />
            </ProtectedRoute>
          } />
          <Route path="/trips" element={
            <ProtectedRoute requiredPermission="trips" userRole={user.role as UserRole}>
              <Trips />
            </ProtectedRoute>
          } />
          <Route path="/missions" element={
            <ProtectedRoute requiredPermission="missions" userRole={user.role as UserRole}>
              <Missions />
            </ProtectedRoute>
          } />
          <Route path="/activities" element={
            <ProtectedRoute requiredPermission="activities" userRole={user.role as UserRole}>
              <Activities />
            </ProtectedRoute>
          } />
          <Route path="/activities/:id" element={
            <ProtectedRoute requiredPermission="activities" userRole={user.role as UserRole}>
              <ActivityDetails />
            </ProtectedRoute>
          } />
          <Route path="/activity-statistics" element={
            <ProtectedRoute requiredPermission="activityStatistics" userRole={user.role as UserRole}>
              <ActivityStatistics />
            </ProtectedRoute>
          } />
          <Route path="/duties" element={
            <ProtectedRoute requiredPermission="duties" userRole={user.role as UserRole}>
              <Duties />
            </ProtectedRoute>
          } />
          <Route path="/duties/:id" element={
            <ProtectedRoute requiredPermission="duties" userRole={user.role as UserRole}>
              <DutyDetails />
            </ProtectedRoute>
          } />
          <Route path="/weekly-duties" element={
            <ProtectedRoute requiredPermission="duties" userRole={user.role as UserRole}>
              <WeeklyDuties />
            </ProtectedRoute>
          } />
          <Route path="/referrals" element={
            <ProtectedRoute requiredPermission="referrals" userRole={user.role as UserRole}>
              <Referrals />
            </ProtectedRoute>
          } />
          <Route path="/hamal" element={
            <ProtectedRoute requiredPermission="hamal" userRole={user.role as UserRole}>
              <Hamal />
            </ProtectedRoute>
          } />
          <Route path="/forms" element={
            <ProtectedRoute requiredPermission="forms" userRole={user.role as UserRole}>
              <Forms />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute requiredPermission="userManagement" userRole={user.role as UserRole}>
              <UserManagement />
            </ProtectedRoute>
          } />
  
          <Route path="/framework-management" element={
            <ProtectedRoute requiredPermission="frameworkManagement" userRole={user.role as UserRole}>
              <FrameworkManagement />
            </ProtectedRoute>
          } />

          <Route path="/data-seeder" element={
            <ProtectedRoute requiredPermission="dataSeeder" userRole={user.role as UserRole}>
              <DataSeeder />
            </ProtectedRoute>
          } />
          <Route path="/permission-policies" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <PermissionPolicyManagement />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default AppRoutes; 