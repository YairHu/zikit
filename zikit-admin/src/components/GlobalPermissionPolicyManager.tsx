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
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import {
  Security as SecurityIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Policy as PolicyIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
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
import { createDefaultPolicies } from '../utils/createDefaultPolicies';

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

const GlobalPermissionPolicyManager: React.FC = () => {
  const { user: currentUser } = useUser();
  const [policies, setPolicies] = useState<PermissionPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PermissionPolicy | null>(null);
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
    loadPolicies();
  }, []);

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

      await createPermissionPolicy(newPolicy);
      
      setDialogOpen(false);
      resetForm();
      loadPolicies();
      
      alert('מדיניות הרשאות נוצרה בהצלחה!');
    } catch (error) {
      console.error('שגיאה ביצירת מדיניות:', error);
      alert('שגיאה ביצירת מדיניות: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPolicy = async () => {
    if (!editingPolicy) return;

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

      await updatePermissionPolicy(editingPolicy.id, {
        name: policyForm.name,
        description: policyForm.description,
        Statement: statements,
        tags: {
          type: policyForm.type,
          role: policyForm.role
        }
      });
      
      setDialogOpen(false);
      resetForm();
      setEditingPolicy(null);
      loadPolicies();
      
      alert('מדיניות הרשאות עודכנה בהצלחה!');
    } catch (error) {
      console.error('שגיאה בעדכון מדיניות:', error);
      alert('שגיאה בעדכון מדיניות: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק מדיניות זו?')) {
      return;
    }

    try {
      await deletePermissionPolicy(policyId);
      loadPolicies();
      alert('מדיניות הרשאות נמחקה בהצלחה!');
    } catch (error) {
      console.error('שגיאה במחיקת מדיניות:', error);
      alert('שגיאה במחיקת מדיניות: ' + error);
    }
  };

  const handleCreateDefaultPolicies = async () => {
    if (!window.confirm('האם אתה בטוח שברצונך ליצור את מדיניויות ברירת המחדל?')) {
      return;
    }

    try {
      setLoading(true);
      await createDefaultPolicies();
      loadPolicies();
      alert('מדיניויות ברירת המחדל נוצרו בהצלחה!');
    } catch (error) {
      console.error('שגיאה ביצירת מדיניויות ברירת מחדל:', error);
      alert('שגיאה ביצירת מדיניויות ברירת מחדל: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (policy: PermissionPolicy) => {
    setEditingPolicy(policy);
    setPolicyForm({
      name: policy.name,
      description: policy.description || '',
      role: policy.tags?.role as UserRole || UserRole.CHAYAL,
      type: policy.tags?.type || 'custom'
    });

    // מילוי הרשאות מהמדיניות הקיימת
    const navPerms = { ...navigationPermissions };
    const actionPerms = { ...actionPermissions };
    const conds = { ...conditions };

    policy.Statement.forEach(statement => {
      if (statement.Effect === ActionType.ALLOW) {
        if (Array.isArray(statement.Action)) {
          statement.Action.forEach(action => {
            if (action === ActionType.READ) {
              if (Array.isArray(statement.Resource)) {
                statement.Resource.forEach(resource => {
                  if (resource in navPerms) {
                    navPerms[resource as keyof typeof navPerms] = true;
                  }
                });
              }
            } else if (action in actionPerms) {
              actionPerms[action as keyof typeof actionPerms] = true;
            }
          });
        }
      }

      if (statement.Condition) {
        if (statement.Condition.frameworkIdEquals) {
          conds.frameworkIdEquals = statement.Condition.frameworkIdEquals;
        }
        if (statement.Condition.isOwner !== undefined) {
          conds.isOwner = statement.Condition.isOwner;
        }
        if (statement.Condition.hasSoldierDoc !== undefined) {
          conds.hasSoldierDoc = statement.Condition.hasSoldierDoc;
        }
      }
    });

    setNavigationPermissions(navPerms);
    setActionPermissions(actionPerms);
    setConditions(conds);
    setDialogOpen(true);
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
    setEditingPolicy(null);
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

  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    return (
      <Alert severity="warning">
        אין לך הרשאה לניהול מדיניויות הרשאות גלובליות
      </Alert>
    );
  }

  const defaultPolicies = policies.filter(p => p.tags?.type === 'default');
  const customPolicies = policies.filter(p => p.tags?.type === 'custom');

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SecurityIcon sx={{ mr: 2, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            ניהול מדיניויות הרשאות גלובליות
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            יצירה ועריכה של מדיניויות הרשאות למערכת
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="מדיניויות ברירת מחדל" />
          <Tab label="מדיניויות מותאמות אישית" />
        </Tabs>
      </Card>

      {/* Tab 1: Default Policies */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            מדיניויות ברירת מחדל ({defaultPolicies.length})
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={handleCreateDefaultPolicies}
            disabled={loading}
          >
            צור מדיניויות ברירת מחדל
          </Button>
        </Box>

        {defaultPolicies.length === 0 ? (
          <Alert severity="info">
            אין מדיניויות ברירת מחדל במערכת
          </Alert>
        ) : (
          <List>
            {defaultPolicies.map((policy) => (
              <Card key={policy.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {policy.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {policy.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip 
                          label={policy.tags?.role ? getRoleDisplayName(policy.tags.role as UserRole) : 'כללי'} 
                          size="small" 
                          variant="outlined"
                        />
                        <Chip 
                          label={`${policy.Statement.length} הצהרות`} 
                          size="small" 
                          variant="outlined"
                        />
                        <Chip 
                          label={`גרסה ${policy.version}`} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Box>
                      <IconButton
                        color="primary"
                        onClick={() => openEditDialog(policy)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </List>
        )}
      </TabPanel>

      {/* Tab 2: Custom Policies */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            מדיניויות מותאמות אישית ({customPolicies.length})
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => setDialogOpen(true)}
          >
            צור מדיניות חדשה
          </Button>
        </Box>

        {customPolicies.length === 0 ? (
          <Alert severity="info">
            אין מדיניויות מותאמות אישית במערכת
          </Alert>
        ) : (
          <List>
            {customPolicies.map((policy) => (
              <Card key={policy.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {policy.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {policy.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip 
                          label={policy.tags?.role ? getRoleDisplayName(policy.tags.role as UserRole) : 'כללי'} 
                          size="small" 
                          variant="outlined"
                        />
                        <Chip 
                          label={`${policy.Statement.length} הצהרות`} 
                          size="small" 
                          variant="outlined"
                        />
                        <Chip 
                          label={`גרסה ${policy.version}`} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Box>
                      <IconButton
                        color="primary"
                        onClick={() => openEditDialog(policy)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeletePolicy(policy.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </List>
        )}
      </TabPanel>

      {/* Create/Edit Policy Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPolicy ? 'עריכת מדיניות הרשאות' : 'יצירת מדיניות הרשאות חדשה'}
        </DialogTitle>
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
            onClick={editingPolicy ? handleEditPolicy : handleCreatePolicy} 
            variant="contained"
            disabled={loading || !policyForm.name}
          >
            {editingPolicy ? 'עדכן מדיניות' : 'צור מדיניות'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GlobalPermissionPolicyManager;
