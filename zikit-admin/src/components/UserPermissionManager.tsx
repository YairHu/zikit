import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Grid,
  Paper
} from '@mui/material';
import {
  Security as SecurityIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Policy as PolicyIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { User } from '../models/User';
import { UserRole, getRoleDisplayName } from '../models/UserRole';
import { PermissionPolicy, ResourceType, ActionType } from '../models/PermissionPolicy';
import { 
  getAllPermissionPolicies,
  createPermissionPolicy,
  updatePermissionPolicy,
  deletePermissionPolicy,
  getPoliciesByRole,
  getPoliciesByType
} from '../services/permissionPolicyService';
import { 
  assignPolicyToUser,
  removePolicyFromUser,
  canUserManagePermissions
} from '../services/userService';

interface UserPermissionManagerProps {
  selectedUser: User | null;
  onClose: () => void;
  onUserUpdated: () => void;
}

const UserPermissionManager: React.FC<UserPermissionManagerProps> = ({
  selectedUser,
  onClose,
  onUserUpdated
}) => {
  const { user: currentUser } = useUser();
  const [policies, setPolicies] = useState<PermissionPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PermissionPolicy | null>(null);
  const [policyForm, setPolicyForm] = useState({
    name: '',
    description: '',
    role: UserRole.CHAYAL,
    type: 'custom'
  });

  // הרשאות ניווט
  const [navigationPermissions, setNavigationPermissions] = useState({
    soldiers: false,
    teams: false,
    trips: false,
    missions: false,
    activities: false,
    activityStatistics: false,
    duties: false,
    referrals: false,
    forms: false,
    hamal: false,
    frameworkManagement: false,
    soldierLinking: false,
    userManagement: false,
    dataSeeder: false
  });

  // הרשאות פעולות
  const [actionPermissions, setActionPermissions] = useState({
    create: false,
    read: false,
    update: false,
    delete: false,
    assignRoles: false,
    viewSensitiveData: false,

    removeUsers: false,
    managePermissions: false
  });

  // תנאים
  const [conditions, setConditions] = useState({
    frameworkIdEquals: '',
    isOwner: false,
    hasSoldierDoc: false
  });

  useEffect(() => {
    if (selectedUser) {
      loadPolicies();
    }
  }, [selectedUser]);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const allPolicies = await getAllPermissionPolicies();
      setPolicies(allPolicies);
    } catch (error) {
      console.error('שגיאה בטעינת מדיניויות:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async () => {
    try {
      setLoading(true);

      // יצירת הצהרות הרשאות
      const statements = [];

      // הצהרות ניווט
      Object.entries(navigationPermissions).forEach(([resource, hasPermission]) => {
        if (hasPermission) {
          statements.push({
            Effect: ActionType.ALLOW,
            Action: [ActionType.READ],
            Resource: [resource as ResourceType],
            Condition: conditions.frameworkIdEquals ? {
              frameworkIdEquals: conditions.frameworkIdEquals
            } : undefined
          });
        }
      });

      // הצהרות פעולות
      Object.entries(actionPermissions).forEach(([action, hasPermission]) => {
        if (hasPermission) {
          statements.push({
            Effect: ActionType.ALLOW,
            Action: [action as ActionType],
            Resource: [ResourceType.ALL],
            Condition: conditions.frameworkIdEquals ? {
              frameworkIdEquals: conditions.frameworkIdEquals
            } : undefined
          });
        }
      });

      // הצהרות תנאים מיוחדים
      if (conditions.isOwner) {
        statements.push({
          Effect: ActionType.ALLOW,
          Action: [ActionType.READ],
          Resource: [ResourceType.ALL],
          Condition: { isOwner: true }
        });
      }

      if (conditions.hasSoldierDoc) {
        statements.push({
          Effect: ActionType.ALLOW,
          Action: [ActionType.READ],
          Resource: [ResourceType.ALL],
          Condition: { hasSoldierDoc: true }
        });
      }

      const newPolicy: Omit<PermissionPolicy, 'id' | 'createdAt' | 'updatedAt'> = {
        name: policyForm.name,
        description: policyForm.description,
        version: '1.0',
        Statement: statements,
        createdBy: currentUser?.uid || 'system',
        isActive: true,
        tags: {
          type: policyForm.type,
          role: policyForm.role
        }
      };

      const policyId = await createPermissionPolicy(newPolicy);
      
      // הוספת המדיניות למשתמש הנבחר
      if (selectedUser) {
        await assignPolicyToUser(selectedUser.uid, policyId, currentUser?.uid || '');
      }

      setDialogOpen(false);
      resetForm();
      loadPolicies();
      onUserUpdated();
      
      alert('מדיניות הרשאות נוצרה בהצלחה!');
    } catch (error) {
      console.error('שגיאה ביצירת מדיניות:', error);
      alert('שגיאה ביצירת מדיניות: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPolicy = async (policyId: string) => {
    if (!selectedUser || !currentUser) return;

    try {
      await assignPolicyToUser(selectedUser.uid, policyId, currentUser.uid);
      await loadPolicies(); // טען מחדש את המדיניות
      onUserUpdated();
      alert('מדיניות הרשאות שובצה בהצלחה!');
    } catch (error) {
      console.error('שגיאה בשיבוץ מדיניות:', error);
      alert('שגיאה בשיבוץ מדיניות: ' + error);
    }
  };

  const handleRemovePolicy = async (policyId: string) => {
    if (!selectedUser || !currentUser) return;

    try {
      await removePolicyFromUser(selectedUser.uid, policyId, currentUser.uid);
      await loadPolicies(); // טען מחדש את המדיניות
      onUserUpdated();
      alert('מדיניות הרשאות הוסרה בהצלחה!');
    } catch (error) {
      console.error('שגיאה בהסרת מדיניות:', error);
      alert('שגיאה בהסרת מדיניות: ' + error);
    }
  };

  const resetForm = () => {
    setPolicyForm({
      name: '',
      description: '',
      role: UserRole.CHAYAL,
      type: 'custom'
    });
    setNavigationPermissions({
      soldiers: false,
      teams: false,
      trips: false,
      missions: false,
      activities: false,
      activityStatistics: false,
      duties: false,
      referrals: false,
      forms: false,
      hamal: false,
      frameworkManagement: false,
      soldierLinking: false,
      userManagement: false,
      dataSeeder: false
    });
    setActionPermissions({
      create: false,
      read: false,
      update: false,
      delete: false,
      assignRoles: false,
      viewSensitiveData: false,

      removeUsers: false,
      managePermissions: false
    });
    setConditions({
      frameworkIdEquals: '',
      isOwner: false,
      hasSoldierDoc: false
    });
  };

  const getResourceDisplayName = (resource: string): string => {
    const resourceNames: Record<string, string> = {
      soldiers: 'כוח אדם',
      teams: 'צוותים',
      trips: 'נסיעות',
      missions: 'משימות',
      activities: 'פעילויות',
      activityStatistics: 'סטטיסטיקות פעילויות',
      duties: 'תורנויות',
      referrals: 'הפניות',
      forms: 'טפסים',
      hamal: 'חמ"ל',
      frameworkManagement: 'ניהול מבנה פלוגה',
      soldierLinking: 'קישור חיילים',
      userManagement: 'ניהול משתמשים',
      dataSeeder: 'הכנסת נתונים'
    };
    return resourceNames[resource] || resource;
  };

  const getActionDisplayName = (action: string): string => {
    const actionNames: Record<string, string> = {
      create: 'יצירה',
      read: 'צפייה',
      update: 'עריכה',
      delete: 'מחיקה',
      assignRoles: 'שיבוץ תפקידים',
      viewSensitiveData: 'צפייה במידע רגיש',

      removeUsers: 'הסרת משתמשים',
      managePermissions: 'ניהול הרשאות'
    };
    return actionNames[action] || action;
  };

  if (!selectedUser) return null;

  if (!canUserManagePermissions(currentUser!)) {
    return (
      <Alert severity="warning">
        אין לך הרשאה לניהול הרשאות משתמשים
      </Alert>
    );
  }

  const userPolicies = policies.filter(policy => 
    selectedUser.permissionPolicies?.includes(policy.id)
  );

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SecurityIcon sx={{ mr: 2, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            ניהול הרשאות משתמש
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {selectedUser.displayName} - {getRoleDisplayName(selectedUser.role)}
          </Typography>
        </Box>
      </Box>

      {/* User Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            מידע על המשתמש
          </Typography>
                      <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2">
                  <strong>שם:</strong> {selectedUser.displayName}
                </Typography>
                <Typography variant="body2">
                  <strong>תפקיד:</strong> {getRoleDisplayName(selectedUser.role)}
                </Typography>
                <Typography variant="body2">
                  <strong>מסגרת:</strong> {selectedUser.frameworkId || 'לא מוגדר'}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2">
                  <strong>סטטוס:</strong> {selectedUser.isActive ? 'פעיל' : 'לא פעיל'}
                </Typography>
              </Box>
            </Box>
        </CardContent>
      </Card>

      {/* Current Policies */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              מדיניויות הרשאות נוכחיות
            </Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setDialogOpen(true)}
            >
              הוסף מדיניות
            </Button>
          </Box>

          {userPolicies.length === 0 ? (
            <Alert severity="info">
              למשתמש זה אין מדיניויות הרשאות מותאמות אישית
            </Alert>
          ) : (
            <List>
              {userPolicies.map((policy) => (
                <ListItem key={policy.id} divider>
                  <ListItemText
                    primary={policy.name}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {policy.description}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip 
                            label={policy.tags?.type || 'custom'} 
                            size="small" 
                            variant="outlined"
                            sx={{ mr: 1 }}
                          />
                          <Chip 
                            label={`${policy.Statement.length} הצהרות`} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => handleRemovePolicy(policy.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Available Policies */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            מדיניויות זמינות
          </Typography>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>מדיניויות ברירת מחדל</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {policies.filter(p => p.tags?.type === 'default').map((policy) => (
                  <ListItem key={policy.id} divider>
                    <ListItemText
                      primary={policy.name}
                      secondary={policy.description}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAssignPolicy(policy.id)}
                      disabled={userPolicies.some(p => p.id === policy.id)}
                    >
                      {userPolicies.some(p => p.id === policy.id) ? 'מוקצה' : 'הקצה'}
                    </Button>
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>מדיניויות מותאמות אישית</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {policies.filter(p => p.tags?.type === 'custom').map((policy) => (
                  <ListItem key={policy.id} divider>
                    <ListItemText
                      primary={policy.name}
                      secondary={policy.description}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAssignPolicy(policy.id)}
                      disabled={userPolicies.some(p => p.id === policy.id)}
                    >
                      {userPolicies.some(p => p.id === policy.id) ? 'מוקצה' : 'הקצה'}
                    </Button>
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      {/* Create Policy Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>יצירת מדיניות הרשאות חדשה</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Basic Info */}
            <Typography variant="h6" sx={{ mb: 2 }}>מידע בסיסי</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="שם המדיניות"
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                />
                <FormControl fullWidth>
                  <InputLabel>תפקיד</InputLabel>
                  <Select
                    value={policyForm.role}
                    onChange={(e) => setPolicyForm({ ...policyForm, role: e.target.value as UserRole })}
                    label="תפקיד"
                  >
                    {Object.values(UserRole).map((role) => (
                      <MenuItem key={role} value={role}>
                        {getRoleDisplayName(role)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="תיאור"
                value={policyForm.description}
                onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
              />
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Navigation Permissions */}
            <Typography variant="h6" sx={{ mb: 2 }}>הרשאות ניווט</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              {Object.entries(navigationPermissions).map(([resource, hasPermission]) => (
                <Box key={resource} sx={{ minWidth: '200px' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={hasPermission}
                        onChange={(e) => setNavigationPermissions({
                          ...navigationPermissions,
                          [resource]: e.target.checked
                        })}
                      />
                    }
                    label={getResourceDisplayName(resource)}
                  />
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Action Permissions */}
            <Typography variant="h6" sx={{ mb: 2 }}>הרשאות פעולות</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              {Object.entries(actionPermissions).map(([action, hasPermission]) => (
                <Box key={action} sx={{ minWidth: '200px' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={hasPermission}
                        onChange={(e) => setActionPermissions({
                          ...actionPermissions,
                          [action]: e.target.checked
                        })}
                      />
                    }
                    label={getActionDisplayName(action)}
                  />
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Conditions */}
            <Typography variant="h6" sx={{ mb: 2 }}>תנאים</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="מזהה מסגרת"
                value={conditions.frameworkIdEquals}
                onChange={(e) => setConditions({ ...conditions, frameworkIdEquals: e.target.value })}
                placeholder="השאר ריק לכל המסגרות"
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={conditions.isOwner}
                      onChange={(e) => setConditions({ ...conditions, isOwner: e.target.checked })}
                    />
                  }
                  label="רק לבעלים"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={conditions.hasSoldierDoc}
                      onChange={(e) => setConditions({ ...conditions, hasSoldierDoc: e.target.checked })}
                    />
                  }
                  label="רק לבעלי טופס חייל"
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            ביטול
          </Button>
          <Button 
            onClick={handleCreatePolicy} 
            variant="contained"
            disabled={loading || !policyForm.name}
          >
            צור מדיניות
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserPermissionManager;
