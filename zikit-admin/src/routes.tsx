import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { useUser } from './contexts/UserContext';
import { UserRole, SystemPath, PermissionLevel } from './models/UserRole';
import { canUserAccessPath } from './services/permissionService';
import Home from './pages/Home';
import Soldiers from './pages/Soldiers';
import Frameworks from './pages/Frameworks';
import Trips from './pages/Trips';
import Missions from './pages/Missions';

import WeeklyDuties from './pages/WeeklyDuties';
import Hamal from './pages/Hamal';
import Forms from './pages/Forms';
import Activities from './pages/Activities';
import Referrals from './pages/Referrals';
import Login from './pages/Login';
import SoldierProfile from './pages/SoldierProfile';
import UserManagement from './pages/UserManagement';
import Contact from './pages/Contact';

import ActivityStatistics from './pages/ActivityStatistics';
import DutyDetails from './pages/DutyDetails';
import FrameworkManagement from './pages/FrameworkManagement';
import FrameworkDetails from './pages/FrameworkDetails';
import DataImportExport from './pages/DataImportExport';
import CacheMonitor from './pages/CacheMonitor';
import { signOutUser } from './services/authService';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, AppBar, Toolbar, Typography, Box, Divider, Avatar, Collapse, Menu, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import AccessDenied from './components/AccessDenied';
import { getAllSoldiers } from './services/soldierService';
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
import FileUploadIcon from '@mui/icons-material/FileUpload';
import StorageIcon from '@mui/icons-material/Storage';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';

const drawerWidth = 260;

// רכיב הגנה על נתיבים
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  userRole?: UserRole;
  requiredPath?: SystemPath;
  requiredPermission?: PermissionLevel;
}> = ({ children, userRole, requiredPath, requiredPermission }) => {
  const { user } = useUser();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setHasPermission(false);
        setLoading(false);
        return;
      }
      
      if (!requiredPath || !requiredPermission) {
        setHasPermission(true);
        setLoading(false);
        return;
      }
      
      try {
        const canAccess = await canUserAccessPath(user.uid, requiredPath, requiredPermission);
        setHasPermission(canAccess);
      } catch (error) {
        console.error('שגיאה בבדיקת הרשאות:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkPermission();
  }, [user, requiredPath, requiredPermission]);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>בודק הרשאות...</Typography>
      </Box>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (hasPermission === false) {
    return <AccessDenied />;
  }
  
  return <>{children}</>;
};

const getMenuItems = async (user: any) => {
  if (!user) return { baseItems: [], managementItems: [], adminItems: [] };
  
  // בדיקת הרשאות
  const canViewHome = await canUserAccessPath(user.uid, SystemPath.HOME, PermissionLevel.VIEW);
  
  const baseItems = [
    { text: 'התיק האישי', icon: <PersonIcon />, path: user.soldierDocId ? `/soldiers/${user.soldierDocId}` : '/soldiers' },
    { text: 'צור קשר', icon: <ContactSupportIcon />, path: '/contact' }
  ];

  // הוספת דף ראשי רק למורשים
  if (canViewHome) {
    baseItems.unshift({ text: 'דף ראשי', icon: <HomeIcon />, path: '/home' });
  }

  // בדיקת הרשאות לכל הנתיבים
  const canViewSoldiers = await canUserAccessPath(user.uid, SystemPath.SOLDIERS, PermissionLevel.VIEW);
  const canViewFrameworks = await canUserAccessPath(user.uid, SystemPath.FRAMEWORKS, PermissionLevel.VIEW);
  const canViewTrips = await canUserAccessPath(user.uid, SystemPath.TRIPS, PermissionLevel.VIEW);
  const canViewMissions = await canUserAccessPath(user.uid, SystemPath.MISSIONS, PermissionLevel.VIEW);
  const canViewActivities = await canUserAccessPath(user.uid, SystemPath.ACTIVITIES, PermissionLevel.VIEW);
  const canViewDuties = await canUserAccessPath(user.uid, SystemPath.DUTIES, PermissionLevel.VIEW);
  const canViewReferrals = await canUserAccessPath(user.uid, SystemPath.REFERRALS, PermissionLevel.VIEW);
  const canViewForms = await canUserAccessPath(user.uid, SystemPath.FORMS, PermissionLevel.VIEW);
  const canViewUsers = await canUserAccessPath(user.uid, SystemPath.USERS, PermissionLevel.VIEW);
  const canViewHamal = await canUserAccessPath(user.uid, SystemPath.HAMAL, PermissionLevel.VIEW);
  const canViewCacheMonitor = await canUserAccessPath(user.uid, SystemPath.CACHE_MONITOR, PermissionLevel.VIEW);

  const managementItems = [
    ...(canViewSoldiers ? [{ text: 'כוח אדם', icon: <GroupsIcon />, path: '/soldiers' }] : []),
    ...(canViewFrameworks ? [{ text: 'מסגרות', icon: <GroupsIcon />, path: '/frameworks' }] : []),
    ...(canViewTrips ? [{ text: 'נסיעות ורכבים', icon: <DirectionsCarIcon />, path: '/trips' }] : []),
    ...(canViewMissions ? [{ text: 'משימות', icon: <AssignmentIcon />, path: '/missions' }] : []),
    ...(canViewActivities ? [{ text: 'פעילויות מבצעיות', icon: <AssignmentIcon />, path: '/activities' }] : []),
    ...(canViewDuties ? [{ text: 'תורנויות', icon: <CalendarMonthIcon />, path: '/weekly-duties' }] : []),
    ...(canViewReferrals ? [{ text: 'הפניות', icon: <LocalHospitalIcon />, path: '/referrals' }] : []),
    ...(canViewForms ? [{ text: 'טפסים', icon: <DescriptionIcon />, path: '/forms' }] : []),
    ...(canViewForms ? [{ text: 'ייבוא/ייצוא נתונים', icon: <FileUploadIcon />, path: '/data-import-export' }] : []),
    ...(canViewHamal ? [{ text: 'מסך חמ"ל', icon: <MonitorIcon />, path: '/hamal' }] : []),
    ...(canViewActivities ? [{ text: 'סטטיסטיקות פעילויות', icon: <BarChartIcon />, path: '/activity-statistics' }] : [])
  ];

  const adminItems = [
    ...(canViewUsers ? [{ text: 'ניהול משתמשים', icon: <KeyIcon />, path: '/users' }] : []),
    ...(canViewFrameworks ? [{ text: 'ניהול מבנה פלוגה', icon: <GroupsIcon />, path: '/framework-management' }] : []),
    ...(canViewCacheMonitor ? [{ text: 'ניטור מטמון מקומי', icon: <StorageIcon />, path: '/cache-monitor' }] : [])
  ];

  return { baseItems, managementItems, adminItems };
};

const SideDrawer: React.FC<{ open: boolean; onClose: () => void; onLogout: () => void; user: any }> = ({ open, onClose, onLogout, user }) => {
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [soldiers, setSoldiers] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<{
    baseItems: Array<{ text: string; icon: React.ReactElement; path: string }>;
    managementItems: Array<{ text: string; icon: React.ReactElement; path: string }>;
    adminItems: Array<{ text: string; icon: React.ReactElement; path: string }>;
  }>({ baseItems: [], managementItems: [], adminItems: [] });
  
  // טעינת פריטי התפריט
  useEffect(() => {
    const loadMenuItems = async () => {
      if (user) {
        const items = await getMenuItems(user);
        setMenuItems(items);
      }
    };
    loadMenuItems();
  }, [user]);
  
  // טעינת חיילים - לא נדרש יותר כי המטמון המקומי מטפל בזה
  // useEffect(() => {
  //   const loadSoldiers = async () => {
  //     try {
  //       const allSoldiers = await getAllSoldiers();
  //       setSoldiers(allSoldiers);
  //     } catch (error) {
  //       console.error('שגיאה בטעינת חיילים:', error);
  //     }
  //   };
    
  //   // טעינת חיילים לכל משתמש מחובר (הרשאות נבדקות במקום אחר)
  //   if (user) {
  //     loadSoldiers();
  //   }
  // }, [user]);
  
  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ '& .MuiDrawer-paper': { width: drawerWidth, direction: 'rtl' } }}>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mb: 1 }}><ShieldIcon /></Avatar>
        <Typography variant="h6" fontWeight={700}>זיקית</Typography>
        <Typography variant="body2" color="text.secondary">הפלוגה הייעודית</Typography>
      </Box>
      <Divider />
      <List>
        {/* פריטים בסיסיים */}
        {menuItems.baseItems.map((item: any) => (
          <ListItem key={item.text} component={Link} to={item.path} onClick={onClose}>
            <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        
        {/* פריטי ניהול */}
        {menuItems.managementItems.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            {menuItems.managementItems.map((item: any) => (
              <ListItem key={item.text} component={Link} to={item.path} onClick={onClose}>
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </>
        )}
        
        {/* תפריט ניהול מתקפל */}
        {menuItems.adminItems.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItem component="button" onClick={() => setAdminMenuOpen(!adminMenuOpen)}>
              <ListItemIcon sx={{ minWidth: 36 }}><SettingsIcon /></ListItemIcon>
              <ListItemText primary="ניהול" />
              {adminMenuOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItem>
            <Collapse in={adminMenuOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {menuItems.adminItems.map((item: any) => (
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
           user.role === 'chayal' ? 'חייל' : ''}
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
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" sx={{ bgcolor: '#fff', color: '#222', boxShadow: 1, zIndex: 1201 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1, textAlign: 'right', mr: 2 }}>זיקית</Typography>
        </Toolbar>
      </AppBar>
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={handleLogout} user={user} />
      {/* ViewModeIndicator was removed */}
      <Box component="main" sx={{ flexGrow: 1, pt: 9, px: 1, width: '100%' }}>
        {children}
      </Box>
      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 2,
          px: 2,
          mt: 'auto',
          backgroundColor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © כל הזכויות שמורות למפתח 2025
        </Typography>
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
          <Route path="/" element={<Navigate to={user.soldierDocId ? `/soldiers/${user.soldierDocId}` : '/soldiers'} />} />
          <Route path="/home" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/soldiers" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <Soldiers />
            </ProtectedRoute>
          } />
          <Route path="/soldiers/:id" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <SoldierProfile />
            </ProtectedRoute>
          } />
          <Route path="/frameworks" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <Frameworks />
            </ProtectedRoute>
          } />
          <Route path="/frameworks/:id" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <FrameworkDetails />
            </ProtectedRoute>
          } />
          <Route path="/frameworks/:id" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <FrameworkDetails />
            </ProtectedRoute>
          } />
          <Route path="/trips" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <Trips />
            </ProtectedRoute>
          } />
          <Route path="/missions" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <Missions />
            </ProtectedRoute>
          } />
          <Route path="/activities" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <Activities />
            </ProtectedRoute>
          } />

          <Route path="/activity-statistics" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <ActivityStatistics />
            </ProtectedRoute>
          } />
          <Route path="/duties" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <WeeklyDuties />
            </ProtectedRoute>
          } />
          <Route path="/duties/:id" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <DutyDetails />
            </ProtectedRoute>
          } />
          <Route path="/weekly-duties" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <WeeklyDuties />
            </ProtectedRoute>
          } />
          <Route path="/referrals" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <Referrals />
            </ProtectedRoute>
          } />
          <Route path="/hamal" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <Hamal />
            </ProtectedRoute>
          } />
          <Route path="/forms" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <Forms />
            </ProtectedRoute>
          } />
          <Route path="/data-import-export" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <DataImportExport />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <UserManagement />
            </ProtectedRoute>
          } />
  
          <Route path="/framework-management" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <FrameworkManagement />
            </ProtectedRoute>
          } />
          <Route path="/cache-monitor" element={
            <ProtectedRoute 
              userRole={user.role as UserRole}
              requiredPath={SystemPath.CACHE_MONITOR}
              requiredPermission={PermissionLevel.VIEW}
            >
              <CacheMonitor />
            </ProtectedRoute>
          } />
          <Route path="/contact" element={
            <ProtectedRoute userRole={user.role as UserRole}>
              <Contact />
            </ProtectedRoute>
          } />


          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default AppRoutes; 