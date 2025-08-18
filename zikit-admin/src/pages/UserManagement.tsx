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
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Checkbox,
  FormGroup,
  FormControlLabel
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  AdminPanelSettings as AdminIcon,
  Delete as DeleteIcon,
  Policy as PolicyIcon,
  Add as AddIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { User } from '../models/User';
import { 
  UserRole, 
  PermissionPolicy, 
  Role, 
  SystemPath, 
  DataScope, 
  PermissionLevel,
  getDataScopeDisplayName,
  getPermissionLevelDisplayName,
  getSystemPathDisplayName
} from '../models/UserRole';
import { 
  getAllUsers, 
  assignRoleByName, 
  canUserAssignRoles,
  canUserRemoveUsers,
  removeUserFromSystem
} from '../services/userService';
import { getAllFrameworks } from '../services/frameworkService';
import { 
  getAllPolicies, 
  createPolicy, 
  updatePolicy, 
  deletePolicy,
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  getUserPermissions,
  canUserAccessPath
} from '../services/permissionService';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getAllSoldiers } from '../services/soldierService';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [permissions, setPermissions] = useState({
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false
  });
  
  // פונקציה עזר לאתחול pathPermissions
  const createEmptyPathPermissions = (): Record<SystemPath, PermissionLevel[]> => {
    return Object.values(SystemPath).reduce((acc, path) => {
      acc[path] = [];
      return acc;
    }, {} as Record<SystemPath, PermissionLevel[]>);
  };
  
  // Permission management state
  const [policies, setPolicies] = useState<PermissionPolicy[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [soldiers, setSoldiers] = useState<any[]>([]);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<{
    policies: PermissionPolicy[];
    role: Role | null;
  } | null>(null);
  
  // Dialogs state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [roleManagementDialogOpen, setRoleManagementDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [assignmentData, setAssignmentData] = useState({
    role: '',
    frameworkId: '',
    personalNumber: ''
  });
  
  // Policy management state
  const [editingPolicy, setEditingPolicy] = useState<PermissionPolicy | null>(null);
  const [policyForm, setPolicyForm] = useState({
    name: '',
    description: '',
    dataScope: DataScope.FRAMEWORK_ONLY,
    pathPermissions: createEmptyPathPermissions()
  });
  
  // Role management state
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    policies: [] as string[]
  });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('שגיאה בטעינת משתמשים:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFrameworks = async () => {
    try {
      const frameworksData = await getAllFrameworks();
      setFrameworks(frameworksData);
    } catch (error) {
      console.error('שגיאה בטעינת מסגרות:', error);
    }
  };

  const loadPolicies = async () => {
    try {
      const policiesData = await getAllPolicies();
      setPolicies(policiesData);
    } catch (error) {
      console.error('שגיאה בטעינת מדיניות:', error);
    }
  };

  const loadRoles = async () => {
    try {
      const rolesData = await getAllRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('שגיאה בטעינת תפקידים:', error);
    }
  };

  const loadSoldiers = async () => {
    try {
      const soldiersData = await getAllSoldiers();
      setSoldiers(soldiersData);
    } catch (error) {
      console.error('שגיאה בטעינת חיילים:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // בדיקת הרשאות המשתמש
        if (currentUser) {
          const canView = await canUserAccessPath(currentUser.uid, SystemPath.USERS, PermissionLevel.VIEW);
          const canCreate = await canUserAccessPath(currentUser.uid, SystemPath.USERS, PermissionLevel.CREATE);
          const canEdit = await canUserAccessPath(currentUser.uid, SystemPath.USERS, PermissionLevel.EDIT);
          const canDelete = await canUserAccessPath(currentUser.uid, SystemPath.USERS, PermissionLevel.DELETE);
          
          setPermissions({ canView, canCreate, canEdit, canDelete });
          
          // אם אין הרשאת צפייה - לא טוען נתונים
          if (!canView) {
            setLoading(false);
            return;
          }
        }
        
        await Promise.all([
          loadUsers(),
          loadFrameworks(),
          loadPolicies(),
          loadRoles(),
          loadSoldiers()
        ]);
      } catch (error) {
        console.error('שגיאה בטעינת נתונים:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser, loadUsers]);

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole || !currentUser || !permissions.canEdit) {
      if (!permissions.canEdit) {
        alert('אין לך הרשאה לשבץ תפקידים');
        return;
      }
      return;
    }
    
    try {
      await assignRoleByName(selectedUser.uid, selectedRole, currentUser.uid);
      setRoleDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('שגיאה בשיבוץ תפקיד:', error);
      alert('שגיאה בשיבוץ תפקיד');
    }
  };

  const handleAssignTeam = async () => {
    if (!selectedUser || !currentUser || !permissions.canEdit) {
      if (!permissions.canEdit) {
        alert('אין לך הרשאה לשבץ למסגרת');
        return;
      }
      return;
    }

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
      await assignRoleByName(selectedUser.uid, assignmentData.role, currentUser.uid);

      setTeamDialogOpen(false);
      alert('המשתמש שובץ בהצלחה!');
      loadUsers();
    } catch (error) {
      console.error('שגיאה בשיבוץ המשתמש:', error);
      alert('שגיאה בשיבוץ המשתמש: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !currentUser || !permissions.canDelete) {
      if (!permissions.canDelete) {
        alert('אין לך הרשאה להסיר משתמשים');
        return;
      }
      return;
    }
    
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
    setSelectedRole(typeof user.role === 'string' ? user.role : user.role);
    setRoleDialogOpen(true);
  };

  const openTeamDialog = (user: User) => {
    setSelectedUser(user);
    
    // מציאת המסגרת הנוכחית של המשתמש
    const soldier = soldiers.find(s => s.email === user.email);
    const currentFrameworkId = soldier?.frameworkId || '';
    
    setAssignmentData({
      role: typeof user.role === 'string' ? user.role : user.role,
      frameworkId: currentFrameworkId,
      personalNumber: user.personalNumber || ''
    });
    setTeamDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const openPolicyDialog = async (user: User) => {
    setSelectedUser(user);
    try {
      const userPermissions = await getUserPermissions(user.uid);
      setSelectedUserPermissions(userPermissions);
      setPolicyDialogOpen(true);
    } catch (error) {
      console.error('שגיאה בטעינת הרשאות משתמש:', error);
      alert('שגיאה בטעינת הרשאות משתמש');
    }
  };

  const openRoleManagementDialog = () => {
    setRoleManagementDialogOpen(true);
  };

  const handleCreatePolicy = async () => {
    if (!currentUser || !permissions.canCreate) {
      alert('אין לך הרשאה ליצור מדיניות');
      return;
    }
    
    try {
      // המרה לפורמט הישן לתאימות
      const paths = Object.keys(policyForm.pathPermissions).filter(path => 
        policyForm.pathPermissions[path as SystemPath].length > 0
      ) as SystemPath[];
      const allPermissions = Array.from(new Set(
        Object.values(policyForm.pathPermissions).flat()
      ));
      
      await createPolicy({
        name: policyForm.name,
        description: policyForm.description,
        paths,
        dataScope: policyForm.dataScope,
        permissions: allPermissions,
        pathPermissions: policyForm.pathPermissions, // שמירת הפורמט החדש
        createdBy: currentUser.uid
      }, currentUser.uid);
      
      setPolicyForm({
        name: '',
        description: '',
        dataScope: DataScope.FRAMEWORK_ONLY,
        pathPermissions: createEmptyPathPermissions()
      });
      loadPolicies();
      alert('מדיניות נוצרה בהצלחה!');
    } catch (error) {
      alert('שגיאה ביצירת מדיניות: ' + error);
    }
  };

  const handleUpdatePolicy = async () => {
    if (!editingPolicy || !currentUser || !permissions.canEdit) {
      alert('אין לך הרשאה לערוך מדיניות');
      return;
    }
    
    try {
      // המרה לפורמט הישן לתאימות
      const paths = Object.keys(policyForm.pathPermissions).filter(path => 
        policyForm.pathPermissions[path as SystemPath].length > 0
      ) as SystemPath[];
      const allPermissions = Array.from(new Set(
        Object.values(policyForm.pathPermissions).flat()
      ));
      
      await updatePolicy(editingPolicy.id, {
        name: policyForm.name,
        description: policyForm.description,
        paths,
        dataScope: policyForm.dataScope,
        permissions: allPermissions,
        pathPermissions: policyForm.pathPermissions // שמירת הפורמט החדש
      }, currentUser.uid);
      
      setEditingPolicy(null);
      setPolicyForm({
        name: '',
        description: '',
        dataScope: DataScope.FRAMEWORK_ONLY,
        pathPermissions: createEmptyPathPermissions()
      });
      loadPolicies();
      alert('מדיניות עודכנה בהצלחה!');
    } catch (error) {
      alert('שגיאה בעדכון מדיניות: ' + error);
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!permissions.canDelete) {
      alert('אין לך הרשאה למחוק מדיניות');
      return;
    }
    
    if (!window.confirm('האם אתה בטוח שברצונך למחוק מדיניות זו?')) return;
    
    try {
      await deletePolicy(policyId);
      loadPolicies();
      alert('מדיניות נמחקה בהצלחה!');
    } catch (error) {
      alert('שגיאה במחיקת מדיניות: ' + error);
    }
  };

  const handleCreateRole = async () => {
    if (!currentUser || !permissions.canCreate) {
      alert('אין לך הרשאה ליצור תפקיד');
      return;
    }
    
    try {
      await createRole({
        ...roleForm,
        createdBy: currentUser.uid,
        isSystem: false
      }, currentUser.uid);
      setRoleForm({
        name: '',
        description: '',
        policies: []
      });
      loadRoles();
      alert('תפקיד נוצר בהצלחה!');
    } catch (error) {
      alert('שגיאה ביצירת תפקיד: ' + error);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole || !currentUser || !permissions.canEdit) {
      alert('אין לך הרשאה לערוך תפקיד');
      return;
    }
    
    try {
      await updateRole(editingRole.id, roleForm, currentUser.uid);
      setEditingRole(null);
      setRoleForm({
        name: '',
        description: '',
        policies: []
      });
      loadRoles();
      alert('תפקיד עודכן בהצלחה!');
    } catch (error) {
      alert('שגיאה בעדכון תפקיד: ' + error);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!permissions.canDelete) {
      alert('אין לך הרשאה למחוק תפקיד');
      return;
    }
    
    if (!window.confirm('האם אתה בטוח שברצונך למחוק תפקיד זה?')) return;
    
    try {
      await deleteRole(roleId);
      loadRoles();
      alert('תפקיד נמחק בהצלחה!');
    } catch (error) {
      alert('שגיאה במחיקת תפקיד: ' + error);
    }
  };

  const editPolicy = (policy: PermissionPolicy) => {
    setEditingPolicy(policy);
    
    // המרה מהפורמט הישן לפורמט החדש
    const pathPermissions = createEmptyPathPermissions();
    
    // אם יש pathPermissions במדיניות (הפורמט החדש), השתמש בהם
    if (policy.pathPermissions) {
      Object.keys(policy.pathPermissions).forEach(path => {
        pathPermissions[path as SystemPath] = [...policy.pathPermissions![path as SystemPath]];
      });
    } else {
      // אחרת, השתמש בפורמט הישן - כל הנתיבים מקבלים את כל ההרשאות
      policy.paths.forEach(path => {
        pathPermissions[path] = [...policy.permissions];
      });
    }
    
    setPolicyForm({
      name: policy.name,
      description: policy.description,
      dataScope: policy.dataScope,
      pathPermissions
    });
  };

  const editRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description,
      policies: [...role.policies]
    });
  };

  const getRoleColor = (role: UserRole | string): string => {
    if (typeof role === 'string') {
      // אם זה "טרם הוזנו פרטים" - צבע כתום
      if (role === 'טרם הוזנו פרטים') {
        return '#ff9800';
      }
      
      // אם זה שם תפקיד - נחפש את התפקיד ברשימה
      const foundRole = roles.find(r => r.name === role);
      if (foundRole) {
        return foundRole.isSystem ? '#1976d2' : '#4caf50';
      }
    }
    
    // אם זה UserRole enum - נחזיר צבע ברירת מחדל
    return '#9e9e9e';
  };

  const getRoleDisplayName = (role: UserRole | string): string => {
    if (typeof role === 'string') {
      // אם זה שם תפקיד - נחפש את התפקיד ברשימה
      const foundRole = roles.find(r => r.name === role);
      if (foundRole) {
        return foundRole.name;
      }
      
      // אם זה "טרם הוזנו פרטים" - נחזיר אותו כמו שהוא
      if (role === 'טרם הוזנו פרטים') {
        return role;
      }
    }
    
    // אם זה UserRole enum - נחזיר את השם כמו שהוא
    return role as string;
  };

  // פונקציה למציאת שם המסגרת לפי מזהה
  const getFrameworkName = (userEmail: string): string => {
    const soldier = soldiers.find(s => s.email === userEmail);
    if (soldier && soldier.frameworkId) {
      const framework = frameworks.find(f => f.id === soldier.frameworkId);
      return framework ? framework.name : soldier.frameworkId;
    }
    return 'לא מוגדר';
  };

  // בדיקת הרשאות
  const canAssignRoles = permissions.canEdit;
  const canRemoveUsers = permissions.canDelete;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, textAlign: 'center' }}>
        <Typography>טוען...</Typography>
      </Container>
    );
  }

  // בדיקה אם למשתמש יש הרשאת צפייה
  if (!permissions.canView) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="warning">
          אין לך הרשאה לצפות בניהול משתמשים ותפקידים
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
          <Tab label="ניהול מדיניות הרשאות" icon={<PolicyIcon />} />
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
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600,
                        cursor: userData.soldierDocId ? 'pointer' : 'default',
                        '&:hover': { textDecoration: userData.soldierDocId ? 'underline' : 'none' }
                      }}
                      onClick={() => userData.soldierDocId && navigate(`/soldier-profile/${userData.soldierDocId}`)}
                    >
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
                      label={`מסגרת ${userData.team}`}
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

                <Box sx={{ mb: 2 }}>
                {userData.personalNumber && (
                    <Chip 
                      label={`מס' אישי: ${userData.personalNumber}`}
                      variant="outlined"
                      size="small"
                      sx={{ 
                        bgcolor: '#f5f5f5',
                        borderColor: '#e0e0e0',
                        color: '#666',
                        fontWeight: 500,
                        mb: 1
                      }}
                    />
                  )}
                  <Chip 
                    label={`מסגרת: ${getFrameworkName(userData.email)}`}
                    variant="outlined"
                    size="small"
                    sx={{ 
                      bgcolor: '#e3f2fd',
                      borderColor: '#2196f3',
                      color: '#1976d2',
                      fontWeight: 500,
                      mb: 1
                    }}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                                 <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                   <Button
                     size="small"
                     startIcon={<GroupIcon />}
                     onClick={() => openTeamDialog(userData)}
                     variant="outlined"
                    disabled={!userData.soldierDocId || !permissions.canEdit}
                    title={!userData.soldierDocId ? "יש למלא טופס לפני שיבוץ חייל" : (!permissions.canEdit ? "אין לך הרשאה לערוך שיבוצים" : "")}
                   >
                    שבץ חייל
                   </Button>
                     <Button
                       size="small"
                    startIcon={<PolicyIcon />}
                    onClick={() => openPolicyDialog(userData)}
                       variant="outlined"
                    color="secondary"
                     >
                    מדיניות הרשאות
                     </Button>
                  {permissions.canDelete && userData.uid !== currentUser?.uid && (
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
                       יש למלא את הטופס לפני שניתן יהיה לשבץ חייל.
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
        {roles.map((role) => {
          const roleUsers = users.filter(u => u.role === role.name);
          if (roleUsers.length === 0) return null;

          return (
            <Card key={role.id} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Chip 
                    label={role.name}
                    sx={{ 
                      bgcolor: role.isSystem ? '#1976d2' : '#4caf50',
                      color: 'white',
                      mr: 2
                    }}
                  />
                  {roleUsers.length} משתמשים
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  {role.description}
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
                {permissions.canDelete && (
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

      {/* Tab 3: ניהול מדיניות הרשאות */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            ניהול מדיניות הרשאות ותפקידים
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              כאן תוכל לנהל מדיניות הרשאות ותפקידים במערכת.
              {!permissions.canView && ' צפייה בלבד'}
            </Typography>
            {/* <Button 
              size="small" 
              onClick={initializeDefaultData}
              sx={{ mt: 1 }}
              variant="outlined"
            >
              אתחל תפקידים ומדיניות ברירת מחדל
            </Button> */}
          </Alert>

          {/* מדיניות הרשאות */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">מדיניות הרשאות</Typography>
                {permissions.canCreate && (
                  <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    onClick={() => {
                      setEditingPolicy({ id: '' } as PermissionPolicy); // פתיחת דיאלוג יצירה
                      setPolicyForm({
                        name: '',
                        description: '',
                        dataScope: DataScope.FRAMEWORK_ONLY,
                        pathPermissions: createEmptyPathPermissions()
                      });
                    }}
                  >
                    הוסף מדיניות
                  </Button>
                )}
              </Box>
              
              <List>
                {policies.map((policy) => (
                  <ListItem key={policy.id} divider>
                    <ListItemText
                      primary={policy.name}
                      secondary={
                        <Box>
                          <Typography variant="body2">{policy.description}</Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            נתיבים: {(policy.paths || []).map(p => getSystemPathDisplayName(p)).join(', ')} | 
                            היקף: {getDataScopeDisplayName(policy.dataScope)} | 
                            הרשאות: {policy.pathPermissions ? 
                              Object.entries(policy.pathPermissions)
                                .filter(([_, permissions]) => permissions.length > 0)
                                .map(([path, permissions]) => 
                                  `${getSystemPathDisplayName(path as SystemPath)}: ${permissions.map(p => getPermissionLevelDisplayName(p)).join(', ')}`
                                ).join('; ')
                              : policy.permissions.map(p => getPermissionLevelDisplayName(p)).join(', ')
                            }
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      {permissions.canEdit && (
                        <IconButton onClick={() => editPolicy(policy)}>
                          <EditIcon />
                        </IconButton>
                      )}
                      {permissions.canDelete && (
                        <IconButton onClick={() => handleDeletePolicy(policy.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* תפקידים */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">תפקידים</Typography>
                {permissions.canCreate && (
                  <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    onClick={() => {
                      setEditingRole({ id: '' } as Role); // פתיחת דיאלוג יצירה
                      setRoleForm({
                        name: '',
                        description: '',
                        policies: []
                      });
                    }}
                  >
                    הוסף תפקיד
                  </Button>
                )}
              </Box>
              
              <List>
                {roles.map((role) => (
                  <ListItem key={role.id} divider>
                    <ListItemText
                      primary={role.name}
                      secondary={role.description}
                    />
                    <ListItemSecondaryAction>
                      {permissions.canEdit && (
                        <IconButton onClick={() => editRole(role)}>
                          <EditIcon />
                        </IconButton>
                      )}
                      {permissions.canDelete && !role.isSystem && (
                        <IconButton onClick={() => handleDeleteRole(role.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
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
                  onChange={(e) => setSelectedRole(e.target.value as string)}
                  label="תפקיד"
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.name}>
                      {role.name}
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
                  onChange={(e) => setAssignmentData({ ...assignmentData, role: e.target.value })}
                  label="תפקיד"
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.name}>
                      {role.name}
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

      {/* Dialog for Policy Management */}
      <Dialog open={policyDialogOpen} onClose={() => setPolicyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>ניהול מדיניות הרשאות</DialogTitle>
        <DialogContent>
          {selectedUser && selectedUserPermissions && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                הרשאות עבור: {selectedUser.displayName}
              </Typography>
              
              {selectedUserPermissions.role && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      תפקיד: {selectedUserPermissions.role.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {selectedUserPermissions.role.description}
                    </Typography>
                  </CardContent>
                </Card>
              )}
              
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                מדיניות הרשאות:
              </Typography>
              
              {selectedUserPermissions.policies.length > 0 ? (
                <List>
                  {selectedUserPermissions.policies.map((policy) => (
                    <ListItem key={policy.id} divider>
                      <ListItemText
                        primary={policy.name}
                        secondary={
                          <Box>
                            <Typography variant="body2">{policy.description}</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              נתיבים: {(policy?.paths || []).map(p => getSystemPathDisplayName(p)).join(', ')} | 
                              היקף: {getDataScopeDisplayName(policy.dataScope)} | 
                              הרשאות: {policy.pathPermissions ? 
                                Object.entries(policy.pathPermissions)
                                  .filter(([_, permissions]) => permissions.length > 0)
                                  .map(([path, permissions]) => 
                                    `${getSystemPathDisplayName(path as SystemPath)}: ${permissions.map(p => getPermissionLevelDisplayName(p)).join(', ')}`
                                  ).join('; ')
                                : policy.permissions.map(p => getPermissionLevelDisplayName(p)).join(', ')
                              }
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  אין מדיניות הרשאות מוגדרות למשתמש זה
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialogOpen(false)}>סגור</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for Policy Form */}
      <Dialog open={editingPolicy !== null} onClose={() => setEditingPolicy(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPolicy && editingPolicy.id && editingPolicy.id !== '' ? 'עריכת מדיניות' : 'יצירת מדיניות חדשה'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="שם המדיניות"
            value={policyForm.name}
            onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="תיאור"
            value={policyForm.description}
            onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            הרשאות לפי נתיבי מערכת:
          </Typography>
          <Box sx={{ mb: 2 }}>
            <FormGroup>
              {Object.values(SystemPath).map((path) => (
                <Box key={path} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    {getSystemPathDisplayName(path)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Object.values(PermissionLevel).map((level) => (
                      <FormControlLabel
                        key={level}
                        control={
                          <Checkbox
                            checked={policyForm.pathPermissions[path]?.includes(level) || false}
                            onChange={(e) => {
                              const currentPermissions = policyForm.pathPermissions[path] || [];
                              if (e.target.checked) {
                                setPolicyForm({
                                  ...policyForm,
                                  pathPermissions: {
                                    ...policyForm.pathPermissions,
                                    [path]: [...currentPermissions, level]
                                  }
                                });
                              } else {
                                setPolicyForm({
                                  ...policyForm,
                                  pathPermissions: {
                                    ...policyForm.pathPermissions,
                                    [path]: currentPermissions.filter(p => p !== level)
                                  }
                                });
                              }
                            }}
                          />
                        }
                        label={getPermissionLevelDisplayName(level)}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </FormGroup>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              סימון מהיר לפי רמת הרשאה:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.values(PermissionLevel).map((level) => {
                const allPaths = Object.values(SystemPath);
                const checkedPaths = allPaths.filter(path => 
                  policyForm.pathPermissions[path]?.includes(level)
                );
                const isIndeterminate = checkedPaths.length > 0 && checkedPaths.length < allPaths.length;
                const isChecked = checkedPaths.length === allPaths.length;
                
                return (
                  <FormControlLabel
                    key={level}
                    control={
                      <Checkbox
                        checked={isChecked}
                        indeterminate={isIndeterminate}
                        onChange={(e) => {
                          const newPathPermissions = { ...policyForm.pathPermissions };
                          allPaths.forEach(path => {
                            const currentPermissions = newPathPermissions[path] || [];
                            if (e.target.checked) {
                              // סמן הכל
                              if (!currentPermissions.includes(level)) {
                                newPathPermissions[path] = [...currentPermissions, level];
                              }
                            } else {
                              // בטל הכל
                              newPathPermissions[path] = currentPermissions.filter(p => p !== level);
                            }
                          });
                          setPolicyForm({ ...policyForm, pathPermissions: newPathPermissions });
                        }}
                      />
                    }
                    label={getPermissionLevelDisplayName(level)}
                  />
                );
              })}
            </Box>
          </Box>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>היקף נתונים</InputLabel>
            <Select
              value={policyForm.dataScope}
              onChange={(e) => setPolicyForm({ ...policyForm, dataScope: e.target.value as DataScope })}
              label="היקף נתונים"
            >
              {Object.values(DataScope).map((scope) => (
                <MenuItem key={scope} value={scope}>
                  {getDataScopeDisplayName(scope)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingPolicy(null)}>ביטול</Button>
          <Button 
            onClick={editingPolicy && editingPolicy.id && editingPolicy.id !== '' ? handleUpdatePolicy : handleCreatePolicy} 
            variant="contained"
          >
            {editingPolicy && editingPolicy.id && editingPolicy.id !== '' ? 'עדכן' : 'צור'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for Role Form */}
      <Dialog open={editingRole !== null} onClose={() => setEditingRole(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRole && editingRole.id && editingRole.id !== '' ? 'עריכת תפקיד' : 'יצירת תפקיד חדש'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="שם התפקיד"
            placeholder="לדוגמה: מפקד צוות, מפקד מחלקה"
            helperText="שם התפקיד כפי שיוצג במערכת"
            value={roleForm.name}
            onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="תיאור"
            value={roleForm.description}
            onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            מדיניות הרשאות:
          </Typography>
          <FormGroup>
            {policies.map((policy) => (
              <FormControlLabel
                key={policy.id}
                control={
                  <Checkbox
                    checked={roleForm.policies.includes(policy.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRoleForm({
                          ...roleForm,
                          policies: [...roleForm.policies, policy.id]
                        });
                      } else {
                        setRoleForm({
                          ...roleForm,
                          policies: roleForm.policies.filter(p => p !== policy.id)
                        });
                      }
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">{policy.name}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      {(policy.paths || []).map(p => getSystemPathDisplayName(p)).join(', ')} - {
                        policy.pathPermissions ? 
                          Object.entries(policy.pathPermissions)
                            .filter(([_, permissions]) => permissions.length > 0)
                            .map(([path, permissions]) => 
                              `${getSystemPathDisplayName(path as SystemPath)}: ${permissions.map(p => getPermissionLevelDisplayName(p)).join(', ')}`
                            ).join('; ')
                          : policy.permissions.map(p => getPermissionLevelDisplayName(p)).join(', ')
                      }
                    </Typography>
                  </Box>
                }
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingRole(null)}>ביטול</Button>
          <Button 
            onClick={editingRole && editingRole.id && editingRole.id !== '' ? handleUpdateRole : handleCreateRole} 
            variant="contained"
          >
            {editingRole && editingRole.id && editingRole.id !== '' ? 'עדכן' : 'צור'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagement; 