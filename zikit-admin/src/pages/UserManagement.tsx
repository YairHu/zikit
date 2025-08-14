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
  AdminPanelSettings as AdminIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { User } from '../models/User';
import { UserRole, getRoleDisplayName } from '../models/UserRole';
import { 
  getAllUsers, 
  assignRole, 
  canUserAssignRoles,
  canUserRemoveUsers,
  removeUserFromSystem
} from '../services/userService';
import { getAllFrameworks } from '../services/frameworkService';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CHAYAL);
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [assignmentData, setAssignmentData] = useState({
    role: UserRole.CHAYAL,
    frameworkId: '',
    personalNumber: ''
  });

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
    const loadData = async () => {
      await Promise.all([
        loadUsers(),
        loadFrameworks()
      ]);
    };
    loadData();
  }, [loadUsers]);

  const loadFrameworks = async () => {
    try {
      const frameworksData = await getAllFrameworks();
      setFrameworks(frameworksData);
    } catch (error) {
      console.error('שגיאה בטעינת מסגרות:', error);
    }
  };

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
    if (!selectedUser || !currentUser) return;

    // בדיקה שהמסגרת נבחרה
    if (!assignmentData.frameworkId) {
      alert('יש לבחור מסגרת לשיבוץ');
      return;
    }

    // בדיקה שהמספר האישי מלא
    if (!assignmentData.personalNumber) {
      alert('יש למלא מספר אישי');
      return;
    }

    try {
      // עדכון רשומת החייל אם יש
      if (selectedUser.soldierDocId) {
        const soldierRef = doc(db, 'soldiers', selectedUser.soldierDocId);
        await updateDoc(soldierRef, {
          name: selectedUser.displayName, // עדכון השדה name
          role: assignmentData.role,
          frameworkId: assignmentData.frameworkId,
          status: 'assigned',
          assignedBy: currentUser.uid,
          assignedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      // עדכון רשומת המשתמש
      await assignRole(selectedUser.uid, assignmentData.role, currentUser.uid);

      setTeamDialogOpen(false);
      alert('המשתמש שובץ בהצלחה!');
      loadUsers();
    } catch (error) {
      console.error('שגיאה בשיבוץ המשתמש:', error);
      alert('שגיאה בשיבוץ המשתמש: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !currentUser) return;
    
    try {
      await removeUserFromSystem(selectedUser.uid, currentUser.uid);
      setDeleteDialogOpen(false);
      alert('המשתמש הוסר בהצלחה מכל המקומות במערכת!');
      loadUsers();
    } catch (error) {
      alert('שגיאה בהסרת משתמש: ' + error);
    }
  };



  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setRoleDialogOpen(true);
  };

  const openTeamDialog = (user: User) => {
    setSelectedUser(user);
    setAssignmentData({
      role: user.role,
      frameworkId: '',
      personalNumber: user.personalNumber || ''
    });
    setTeamDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
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
  const canRemoveUsers = currentUser ? canUserRemoveUsers(currentUser) : false;

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

      {/* Permissions Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>הרשאות נוכחיות:</strong> 
          {canAssignRoles && ' שיבוץ תפקידים'} 
          {canRemoveUsers && ' הסרת משתמשים'}
          {!canAssignRoles && !canRemoveUsers && ' צפייה בלבד'}
        </Typography>
      </Alert>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="כל המשתמשים" icon={<PersonIcon />} />
          <Tab label="לפי תפקידים" icon={<SecurityIcon />} />
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

                                 <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                   <Button
                     size="small"
                     startIcon={<SecurityIcon />}
                     onClick={() => openRoleDialog(userData)}
                     variant="outlined"
                     disabled={!userData.soldierDocId}
                     title={!userData.soldierDocId ? "יש למלא טופס לפני שיבוץ תפקיד" : ""}
                   >
                     שנה תפקיד
                   </Button>
                   <Button
                     size="small"
                     startIcon={<GroupIcon />}
                     onClick={() => openTeamDialog(userData)}
                     variant="outlined"
                     disabled={!userData.soldierDocId}
                     title={!userData.soldierDocId ? "יש למלא טופס לפני שיבוץ למסגרת" : ""}
                   >
                     שבץ לצוות
                   </Button>
                   {canRemoveUsers && userData.uid !== currentUser?.uid && (
                     <Button
                       size="small"
                       startIcon={<DeleteIcon />}
                       onClick={() => openDeleteDialog(userData)}
                       variant="outlined"
                       color="error"
                     >
                       הסר מהמערכת
                     </Button>
                   )}
                 </Box>
                 
                 {!userData.soldierDocId && (
                   <Alert severity="info" sx={{ mt: 2, fontSize: '0.875rem' }}>
                     <Typography variant="body2">
                       <strong>הערה:</strong> משתמש זה טרם מילא את טופס ההצטרפות. 
                       יש למלא את הטופס לפני שניתן יהיה לשבץ תפקיד או מסגרת.
                     </Typography>
                   </Alert>
                 )}
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
                {canRemoveUsers && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                      פעולות ניהול:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {roleUsers
                        .filter(userData => userData.uid !== currentUser?.uid)
                        .map((userData) => (
                          <Button
                            key={userData.uid}
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() => openDeleteDialog(userData)}
                            variant="outlined"
                            color="error"
                          >
                            הסר {userData.displayName}
                          </Button>
                        ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
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
        <DialogTitle>שיבוץ למסגרת</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                שיבוץ למסגרת עבור: <strong>{selectedUser.displayName}</strong>
              </Typography>
              
              <TextField
                fullWidth
                label="מספר אישי"
                value={assignmentData.personalNumber}
                onChange={(e) => setAssignmentData({ ...assignmentData, personalNumber: e.target.value })}
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>תפקיד</InputLabel>
                <Select
                  value={assignmentData.role}
                  onChange={(e) => setAssignmentData({ ...assignmentData, role: e.target.value as UserRole })}
                  label="תפקיד"
                >
                  {Object.values(UserRole).map((role) => (
                    <MenuItem key={role} value={role}>
                      {getRoleDisplayName(role)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>מסגרת</InputLabel>
                <Select
                  value={assignmentData.frameworkId}
                  onChange={(e) => setAssignmentData({ ...assignmentData, frameworkId: e.target.value })}
                  label="מסגרת"
                >
                  <MenuItem value="">בחר מסגרת</MenuItem>
                  {frameworks.map((framework) => (
                    <MenuItem key={framework.id} value={framework.id}>
                      {framework.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleAssignTeam} variant="contained">
            שבץ למסגרת
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for User Deletion */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>
          הסרת משתמש מהמערכת
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                האם אתה בטוח שברצונך להסיר את המשתמש <strong>{selectedUser.displayName}</strong> מהמערכת?
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                פעולה זו תמחק את המשתמש לחלוטין מהמערכת ולא ניתן יהיה לשחזר את הנתונים.
              </Alert>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                תפקיד: {getRoleDisplayName(selectedUser.role)}
                {selectedUser.team && ` | צוות: ${selectedUser.team}`}
                {selectedUser.pelaga && ` | פלגה: ${selectedUser.pelaga}`}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            ביטול
          </Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error">
            הסר מהמערכת
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagement; 