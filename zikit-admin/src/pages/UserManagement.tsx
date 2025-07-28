import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Avatar,
  Chip,
  Alert,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { User } from '../models/User';
import { UserRole, getRoleDisplayName } from '../models/UserRole';
import { 
  getAllUsers, 
  assignRole, 
  assignToTeam,
  canUserAssignRoles
} from '../services/userService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const UserManagement: React.FC = () => {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // Dialogs state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CHAYAL);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPelaga, setSelectedPelaga] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('שגיאה בטעינת משתמשים:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAssignRole = async () => {
    if (!selectedUser || !currentUser) return;
    
    try {
      await assignRole(selectedUser.uid, selectedRole, currentUser.uid);
      setRoleDialogOpen(false);
      loadUsers();
    } catch (error) {
      alert('שגיאה בשיבוץ תפקיד: ' + error);
    }
  };

  const handleAssignTeam = async () => {
    if (!selectedUser) return;
    
    try {
      await assignToTeam(selectedUser.uid, selectedTeam, selectedPelaga);
      setTeamDialogOpen(false);
      loadUsers();
    } catch (error) {
      alert('שגיאה בשיבוץ לצוות: ' + error);
    }
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setRoleDialogOpen(true);
  };

  const openTeamDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedTeam(user.team || '');
    setSelectedPelaga(user.pelaga || '');
    setTeamDialogOpen(true);
  };

  const getRoleColor = (role: UserRole): string => {
    const colors: Record<UserRole, string> = {
      [UserRole.ADMIN]: '#f44336',
      [UserRole.MEFAKED_PLUGA]: '#9c27b0',
      [UserRole.SAMAL_PLUGA]: '#673ab7',
      [UserRole.MEFAKED_PELAGA]: '#3f51b5',
      [UserRole.RASP]: '#5c6bc0',
      [UserRole.SARASP]: '#7986cb',
      [UserRole.KATZIN_NIHUL]: '#9575cd',
      [UserRole.MANIP]: '#ba68c8',
      [UserRole.HOFPAL]: '#ce93d8',
      [UserRole.PAP]: '#e1bee7',
      [UserRole.MEFAKED_TZEVET]: '#2196f3',
      [UserRole.SAMAL]: '#03a9f4',
      [UserRole.MEFAKED_CHAYAL]: '#00bcd4',
      [UserRole.CHAYAL]: '#4caf50',
      [UserRole.HAMAL]: '#ff9800',
    };
    return colors[role] || '#9e9e9e';
  };

  // בדיקת הרשאות
  const canAssignRoles = currentUser ? canUserAssignRoles(currentUser) : false;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, textAlign: 'center' }}>
        <Typography>טוען...</Typography>
      </Container>
    );
  }

  if (!canAssignRoles) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="warning">
          אין לך הרשאה לניהול משתמשים ותפקידים
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
          <AdminIcon />
        </Avatar>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            ניהול משתמשים ותפקידים
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {users.length} משתמשים במערכת
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="כל המשתמשים" icon={<PersonIcon />} />
          <Tab label="לפי תפקידים" icon={<SecurityIcon />} />
          <Tab label="מבנה ארגוני" icon={<GroupIcon />} />
        </Tabs>
      </Card>

      {/* Tab 1: כל המשתמשים */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, 
          gap: 2 
        }}>
          {users.map((userData) => (
            <Card key={userData.uid} sx={{ 
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: 4 }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {userData.displayName}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {userData.email}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={getRoleDisplayName(userData.role)}
                    sx={{ 
                      bgcolor: getRoleColor(userData.role),
                      color: 'white',
                      fontWeight: 600,
                      mb: 1
                    }}
                  />
                  {userData.team && (
                    <Chip 
                      label={`צוות ${userData.team}`}
                      variant="outlined"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                  {userData.pelaga && (
                    <Chip 
                      label={`פלגה ${userData.pelaga}`}
                      variant="outlined"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>

                {userData.personalNumber && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    מס' אישי: {userData.personalNumber}
                  </Typography>
                )}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<SecurityIcon />}
                    onClick={() => openRoleDialog(userData)}
                    variant="outlined"
                  >
                    שנה תפקיד
                  </Button>
                  <Button
                    size="small"
                    startIcon={<GroupIcon />}
                    onClick={() => openTeamDialog(userData)}
                    variant="outlined"
                  >
                    שבץ לצוות
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </TabPanel>

      {/* Tab 2: לפי תפקידים */}
      <TabPanel value={tabValue} index={1}>
        {Object.values(UserRole).map((role) => {
          const roleUsers = users.filter(u => u.role === role);
          if (roleUsers.length === 0) return null;

          return (
            <Card key={role} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Chip 
                    label={getRoleDisplayName(role)}
                    sx={{ 
                      bgcolor: getRoleColor(role),
                      color: 'white',
                      mr: 2
                    }}
                  />
                  {roleUsers.length} משתמשים
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {roleUsers.map((userData) => (
                    <Chip
                      key={userData.uid}
                      label={`${userData.displayName}${userData.team ? ` (צוות ${userData.team})` : ''}`}
                      variant="outlined"
                      onClick={() => openRoleDialog(userData)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </TabPanel>

      {/* Tab 3: מבנה ארגוני */}
      <TabPanel value={tabValue} index={2}>
        <Alert severity="info" sx={{ mb: 3 }}>
          תצוגת מבנה ארגוני - בפיתוח
        </Alert>
      </TabPanel>

      {/* Dialog for Role Assignment */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>שיבוץ תפקיד</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                שיבוץ תפקיד עבור: <strong>{selectedUser.displayName}</strong>
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>תפקיד</InputLabel>
                <Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  label="תפקיד"
                >
                  {Object.values(UserRole).map((role) => (
                    <MenuItem key={role} value={role}>
                      {getRoleDisplayName(role)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleAssignRole} variant="contained">
            שבץ תפקיד
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for Team Assignment */}
      <Dialog open={teamDialogOpen} onClose={() => setTeamDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>שיבוץ לצוות</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                שיבוץ לצוות עבור: <strong>{selectedUser.displayName}</strong>
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>פלגה</InputLabel>
                <Select
                  value={selectedPelaga}
                  onChange={(e) => setSelectedPelaga(e.target.value)}
                  label="פלגה"
                >
                  <MenuItem value="A">פלגה א</MenuItem>
                  <MenuItem value="B">פלגה ב</MenuItem>
                  <MenuItem value="C">פלגה ג</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="צוות (מספר)"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                placeholder="10, 20, 30..."
                sx={{ mb: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleAssignTeam} variant="contained">
            שבץ לצוות
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagement; 