import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Soldier } from '../models/Soldier';
import { getAllSoldiers, getAllSoldiersWithFrameworkNames, deleteSoldier } from '../services/soldierService';
import { getAllFrameworks, getFrameworkWithDetails } from '../services/frameworkService';
import { getPresenceColor, getProfileColor } from '../utils/colors';
import { Link } from 'react-router-dom';
import SoldierForm from '../components/SoldierForm';
import HierarchicalChart from '../components/HierarchicalChart';
import { useUser } from '../contexts/UserContext';
import { UserRole, SystemPath, PermissionLevel, DataScope } from '../models/UserRole';
import { getUserAllPermissions } from '../services/permissionService';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Chip,
  IconButton,
  Fab,
  Alert,
  CircularProgress,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Group as GroupIcon,
  Star as StarIcon,
  LocalOffer as BadgeIcon,
  Security as SecurityIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';



const Soldiers: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [soldiersWithFrameworkNames, setSoldiersWithFrameworkNames] = useState<(Soldier & { frameworkName?: string })[]>([]);
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterFramework, setFilterFramework] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterQualification, setFilterQualification] = useState('');
  const [filterPresence, setFilterPresence] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'hierarchy'>('cards');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [permissions, setPermissions] = useState({
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false
  });
  
  // הגדרת השדות הזמינים לתצוגה טבלאית
  const availableColumns = [
    { key: 'name', label: 'שם', visible: true },
    { key: 'personalNumber', label: 'מספר אישי', visible: true },
    { key: 'framework', label: 'מסגרת', visible: true },
    { key: 'role', label: 'תפקיד', visible: true },
    { key: 'commanders', label: 'מפקדים', visible: false },
    { key: 'profile', label: 'פרופיל', visible: true },
    { key: 'presence', label: 'נוכחות', visible: true },
    { key: 'qualifications', label: 'כשירויות', visible: true },
    { key: 'licenses', label: 'רישיונות', visible: true },
    { key: 'drivingLicenses', label: 'היתרים', visible: false },
    { key: 'actions', label: 'פעולות', visible: true }
  ];
  
  const [visibleColumns, setVisibleColumns] = useState(availableColumns);

  const refresh = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // קבלת כל הרשאות המשתמש בבת אחת
      const userAllPermissions = await getUserAllPermissions(user.uid);
      
      // בדיקת הרשאות לחיילים
      const canView = userAllPermissions.permissions[SystemPath.SOLDIERS]?.[PermissionLevel.VIEW] || false;
      const canCreate = userAllPermissions.permissions[SystemPath.SOLDIERS]?.[PermissionLevel.CREATE] || false;
      const canEdit = userAllPermissions.permissions[SystemPath.SOLDIERS]?.[PermissionLevel.EDIT] || false;
      const canDelete = userAllPermissions.permissions[SystemPath.SOLDIERS]?.[PermissionLevel.DELETE] || false;
      
      setPermissions({ canView, canCreate, canEdit, canDelete });
      
      // אם אין הרשאת צפייה - לא טוען נתונים
      if (!canView) {
        setLoading(false);
        return;
      }
      
      // קבלת מדיניות החיילים
      const soldiersPolicy = userAllPermissions.policies.find((policy: any) => 
        policy.paths.includes(SystemPath.SOLDIERS)
      );
      
      // טעינת כל הנתונים קודם
      const [allSoldiers, allSoldiersWithNames, allFrameworks] = await Promise.all([
        getAllSoldiers(),
        getAllSoldiersWithFrameworkNames(),
        getAllFrameworks()
      ]);
      
      let soldiersData: Soldier[] = [];
      let soldiersWithNamesData: (Soldier & { frameworkName?: string })[] = [];
      let frameworksData = allFrameworks;
      
      if (soldiersPolicy) {
        // סינון נתונים לפי מדיניות ההרשאות
        switch (soldiersPolicy.dataScope) {
          case DataScope.USER_ONLY:
            // משתמש רואה רק את עצמו
            const userSoldier = allSoldiers.find(s => s.email === user.email);
            if (userSoldier) {
              soldiersData = [userSoldier];
              const userSoldierWithName = allSoldiersWithNames.find(s => s.id === userSoldier.id);
              soldiersWithNamesData = userSoldierWithName ? [userSoldierWithName] : [userSoldier as any];
            }
            break;
            
          case DataScope.FRAMEWORK_ONLY:
            // משתמש רואה את נתוני המסגרת שלו (כולל מסגרות-בנות)
            const userSoldierForFramework = allSoldiers.find(s => s.email === user.email);
            if (userSoldierForFramework?.frameworkId) {
              // פונקציה למציאת כל החיילים בהיררכיה כולל מסגרות-בנות
              const getAllSoldiersInHierarchy = (frameworkId: string): string[] => {
                const directSoldiers = allSoldiers.filter(s => s.frameworkId === frameworkId).map(s => s.id);
                const childFrameworks = frameworksData.filter(f => f.parentFrameworkId === frameworkId);
                const childSoldiers = childFrameworks.flatMap(child => getAllSoldiersInHierarchy(child.id));
                return [...directSoldiers, ...childSoldiers];
              };
              
              // קבלת כל החיילים בהיררכיה
              const allSoldiersInHierarchy = getAllSoldiersInHierarchy(userSoldierForFramework.frameworkId);
              
              soldiersData = allSoldiers.filter(s => allSoldiersInHierarchy.includes(s.id));
              soldiersWithNamesData = allSoldiersWithNames.filter(s => allSoldiersInHierarchy.includes(s.id));
            }
            break;
            
          case DataScope.ALL_DATA:
          default:
            // משתמש רואה את כל הנתונים
            soldiersData = allSoldiers;
            soldiersWithNamesData = allSoldiersWithNames;
            break;
        }
      } else {
        // אם אין מדיניות - טוען את כל הנתונים
        soldiersData = allSoldiers;
        soldiersWithNamesData = allSoldiersWithNames;
      }
      
      // הלוגים הוסרו כדי להפחית רעש בקונסול
      
      setSoldiers(soldiersData);
      setSoldiersWithFrameworkNames(soldiersWithNamesData);
      setFrameworks(frameworksData);
    } catch (error) {
      console.error('Error loading data from Firebase:', error);
      setSoldiers([]);
      setSoldiersWithFrameworkNames([]);
      setFrameworks([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [user]); // רק כשהמשתמש משתנה

  // בדיקה אם יש פרמטר edit ב-URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    if (editId) {
      const soldierToEdit = soldiers.find(s => s.id === editId);
      if (soldierToEdit) {
        handleOpenForm(soldierToEdit);
        // ניקוי הפרמטר מה-URL אבל נשאר באותו עמוד
        const currentPath = window.location.pathname;
        window.history.replaceState({}, '', currentPath);
      }
    }
  }, [soldiers]);

  // השתמש בנתונים מ-Firebase בלבד
  const data = soldiersWithFrameworkNames;

  const filteredData = data.filter(s =>
          (!filterFramework || (s.frameworkId && s.frameworkId.includes(filterFramework))) &&
    (!filterRole || s.role.includes(filterRole)) &&
    (!filterQualification || (s.qualifications && s.qualifications.join(',').includes(filterQualification))) &&
    (!filterPresence || s.presence === filterPresence) &&
    (!searchTerm || s.name.includes(searchTerm) || s.personalNumber.includes(searchTerm))
  );

  const handleOpenForm = (soldier?: Soldier) => {
    if (soldier && !permissions.canEdit) {
      alert('אין לך הרשאה לערוך חיילים');
      return;
    }
    if (!soldier && !permissions.canCreate) {
      alert('אין לך הרשאה להוסיף חיילים');
      return;
    }
    setEditId(soldier?.id || null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditId(null);
  };

  const handleFormSuccess = (soldier: Soldier) => {
    refresh();
  };

  const handleDelete = async () => {
    if (!permissions.canDelete) {
      alert('אין לך הרשאה למחוק חיילים');
      return;
    }
    if (deleteId) {
      await deleteSoldier(deleteId);
      setDeleteId(null);
      refresh();
    }
  };

  // פונקציות לניהול השדות הנראים
  const handleColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    setVisibleColumns(prev => 
      prev.map(col => 
        col.key === columnKey ? { ...col, visible } : col
      )
    );
  };

  const toggleAllColumns = (visible: boolean) => {
    setVisibleColumns(prev => 
      prev.map(col => ({ ...col, visible }))
    );
  };

  const resetToDefault = () => {
    setVisibleColumns(availableColumns);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  // בדיקה אם למשתמש יש הרשאת צפייה
  if (!permissions.canView) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="warning">
          אין לך הרשאה לצפות במאגר חיילים
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              מאגר חיילים
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {filteredData.length} חיילים
            </Typography>
          </Box>
        </Box>
        {permissions.canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenForm()}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            הוסף חייל
          </Button>
        )}
      </Box>

      {/* View Mode Tabs */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Tabs 
            value={viewMode} 
            onChange={(e, newValue) => setViewMode(newValue)}
          >
            <Tab label="תצוגת כרטיסים" value="cards" />
            <Tab label="תצוגה טבלאית" value="table" />
            <Tab label="תצוגה היררכית" value="hierarchy" />
          </Tabs>
          
          {viewMode === 'table' && (
            <Tooltip title="הגדרות עמודות">
              <IconButton 
                onClick={() => setShowColumnSettings(true)}
                color="primary"
                sx={{ ml: 2 }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Search and Filters - מוסתר בתצוגה היררכית */}
      {viewMode !== 'hierarchy' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
              gap: 2 
            }}>
              <TextField
                fullWidth
                placeholder="חיפוש לפי שם או מספר אישי"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterIcon />
                    <Typography>מסננים</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, 
                    gap: 2 
                  }}>
                    <TextField
                      fullWidth
                      label="מסגרת"
                      value={filterFramework}
                      onChange={(e) => setFilterFramework(e.target.value)}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="תפקיד"
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="כשירות"
                      value={filterQualification}
                      onChange={(e) => setFilterQualification(e.target.value)}
                      size="small"
                    />
                    <FormControl fullWidth size="small">
                      <InputLabel>נוכחות</InputLabel>
                      <Select
                        value={filterPresence}
                        onChange={(e: any) => setFilterPresence(e.target.value)}
                        label="נוכחות"
                      >
                        <MenuItem value="">כל הנוכחויות</MenuItem>
                        <MenuItem value="בבסיס">בבסיס</MenuItem>
                        <MenuItem value="בפעילות">בפעילות</MenuItem>
                        <MenuItem value="חופש">חופש</MenuItem>
                        <MenuItem value="גימלים">גימלים</MenuItem>
                        <MenuItem value="אחר">אחר</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'table' ? (
        // Table View
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                {visibleColumns.filter(col => col.visible).map((column) => (
                  <TableCell key={column.key} sx={{ fontWeight: 'bold' }}>
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((soldier) => (
                <TableRow key={soldier.id} hover>
                  {visibleColumns.filter(col => col.visible).map((column) => {
                    switch (column.key) {
                      case 'name':
                        return (
                          <TableCell key={column.key}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: getProfileColor(soldier.profile) }}>
                                {soldier.name.charAt(0)}
                              </Avatar>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  '&:hover': { 
                                    color: 'primary.main',
                                    textDecoration: 'underline'
                                  }
                                }}
                                onClick={() => navigate(`/soldiers/${soldier.id}`)}
                              >
                                {soldier.name}
                              </Typography>
                            </Box>
                          </TableCell>
                        );
                      
                      case 'personalNumber':
                        return <TableCell key={column.key}>{soldier.personalNumber}</TableCell>;
                      

                      
                      case 'role':
                        return (
                          <TableCell key={column.key}>
                            <Chip label={soldier.role} size="small" color="secondary" variant="outlined" />
                          </TableCell>
                        );
                      
                      case 'framework':
                        return (
                          <TableCell key={column.key}>
                            <Chip 
                              label={soldier.frameworkName || soldier.frameworkId || 'לא מוגדר'} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': { 
                                  bgcolor: 'primary.main',
                                  color: 'white'
                                }
                              }}
                              onClick={() => {
                                if (soldier.frameworkId) {
                                  navigate(`/frameworks/${soldier.frameworkId}`);
                                }
                              }}
                            />
                          </TableCell>
                        );
                      
                      case 'commanders':
                        return (
                          <TableCell key={column.key}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                             {/* מפקדים - יוצג מידע על המפקדים בעתיד */}
                            </Box>
                          </TableCell>
                        );
                      
                      case 'profile':
                        return (
                          <TableCell key={column.key}>
                            <Chip 
                              label={soldier.profile} 
                              size="small" 
                              color={getProfileColor(soldier.profile) as any}
                            />
                          </TableCell>
                        );
                      
                      case 'presence':
                        return (
                          <TableCell key={column.key}>
                            <Chip 
                              label={soldier.presence === 'אחר' && soldier.presenceOther ? `${soldier.presence} - ${soldier.presenceOther}` : soldier.presence || 'לא מוגדר'} 
                              size="small" 
                              sx={{ 
                                bgcolor: getPresenceColor(soldier.presence),
                                color: 'white',
                                fontWeight: 600
                              }}
                            />
                          </TableCell>
                        );
                      
                      case 'qualifications':
                        return (
                          <TableCell key={column.key}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {soldier.qualifications?.slice(0, 2).map((qual, index) => (
                                <Chip key={index} label={qual} size="small" variant="outlined" />
                              ))}
                              {soldier.qualifications && soldier.qualifications.length > 2 && (
                                <Chip label={`+${soldier.qualifications.length - 2}`} size="small" />
                              )}
                            </Box>
                          </TableCell>
                        );
                      
                      case 'licenses':
                        return (
                          <TableCell key={column.key}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {soldier.licenses?.map((license, index) => (
                                <Chip key={index} label={license} size="small" color="success" variant="outlined" />
                              ))}
                            </Box>
                          </TableCell>
                        );
                      
                      case 'drivingLicenses':
                        return (
                          <TableCell key={column.key}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {soldier.qualifications?.includes('נהג') ? (
                                soldier.drivingLicenses && soldier.drivingLicenses.length > 0 ? (
                                  soldier.drivingLicenses.map((license, index) => (
                                    <Chip key={index} label={license} size="small" color="warning" variant="filled" />
                                  ))
                                ) : (
                                  <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                    אין היתרים
                                  </Typography>
                                )
                              ) : (
                                <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                                  לא נהג
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                        );
                      
                      case 'actions':
                        return (
                          <TableCell key={column.key}>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {permissions.canEdit && (
                                <IconButton size="small" color="primary" onClick={() => handleOpenForm(soldier)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              )}
                              {permissions.canDelete && (
                                <IconButton size="small" color="error" onClick={() => setDeleteId(soldier.id)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          </TableCell>
                        );
                      
                      default:
                        return <TableCell key={column.key}></TableCell>;
                    }
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : viewMode === 'hierarchy' ? (
        // Hierarchical Chart View - D3.js
        <HierarchicalChart 
          frameworks={frameworks}
          soldiers={soldiers}
          loading={loading}
        />
      ) : (
        // Cards View
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(3, 1fr)' 
          }, 
          gap: 2 
        }}>
          {filteredData.map((soldier) => (
            <Card 
              key={soldier.id}
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                border: `2px solid ${getPresenceColor(soldier.presence)}`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="h6" 
                      component={Link} 
                      to={`/soldiers/${soldier.id}`}
                      sx={{ 
                        textDecoration: 'none', 
                        color: 'primary.main',
                        fontWeight: 600,
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      {soldier.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      מס' אישי: {soldier.personalNumber}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip 
                        icon={<GroupIcon />}
                        label={soldier.frameworkName || soldier.frameworkId || 'לא מוגדר'} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { 
                            bgcolor: 'primary.main',
                            color: 'white'
                          }
                        }}
                        onClick={() => {
                          if (soldier.frameworkId) {
                            navigate(`/frameworks/${soldier.frameworkId}`);
                          }
                        }}
                      />
                      <Chip 
                        label={soldier.role} 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    {permissions.canEdit && (
                      <IconButton size="small" onClick={() => handleOpenForm(soldier)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {permissions.canDelete && (
                      <IconButton size="small" color="error" onClick={() => setDeleteId(soldier.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    פרופיל רפואי:
                  </Typography>
                  <Chip 
                    label={soldier.profile}
                    sx={{ 
                      bgcolor: getProfileColor(soldier.profile),
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    נוכחות:
                  </Typography>
                  <Chip 
                    label={soldier.presence === 'אחר' && soldier.presenceOther ? `${soldier.presence} - ${soldier.presenceOther}` : soldier.presence || 'לא מוגדר'}
                    sx={{ 
                      bgcolor: getPresenceColor(soldier.presence),
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </Box>

                {soldier.qualifications && soldier.qualifications.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      כשירויות:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {soldier.qualifications.map((qual, index) => (
                        <Chip 
                          key={index}
                          icon={<StarIcon />}
                          label={qual} 
                          size="small" 
                          color="success"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {soldier.licenses && soldier.licenses.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      רישיונות נהיגה:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {soldier.licenses.map((license, index) => (
                        <Chip 
                          key={index}
                          label={license} 
                          size="small" 
                          color="info"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {soldier.certifications && soldier.certifications.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      הסמכות:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {soldier.certifications.map((cert, index) => (
                        <Chip 
                          key={index}
                          icon={<BadgeIcon />}
                          label={cert} 
                          size="small" 
                          color="warning"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* היתרים לנהיגה */}
                {soldier.qualifications?.includes('נהג') && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      היתרים לנהיגה:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {soldier.drivingLicenses && soldier.drivingLicenses.length > 0 ? (
                        soldier.drivingLicenses.map((license, index) => (
                          <Chip 
                            key={index}
                            label={license} 
                            size="small" 
                            color="success"
                            variant="filled"
                          />
                        ))
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                          אין היתרים מוגדרים
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* FAB for mobile */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ 
          position: 'fixed', 
          bottom: 16, 
          left: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
        onClick={() => handleOpenForm()}
      >
        <AddIcon />
      </Fab>

      {/* Add/Edit Dialog */}
      <SoldierForm
        open={showForm}
        onClose={handleCloseForm}
        soldier={editId ? soldiers.find(s => s.id === editId) || null : null}
        onSuccess={handleFormSuccess}
        mode={editId ? 'edit' : 'add'}
      />

      {/* Column Settings Dialog */}
      <Dialog 
        open={showColumnSettings} 
        onClose={() => setShowColumnSettings(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            <Typography>הגדרות עמודות</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              בחר אילו עמודות להציג בטבלה
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button 
                size="small" 
                variant="outlined"
                onClick={() => toggleAllColumns(true)}
              >
                הצג הכל
              </Button>
              <Button 
                size="small" 
                variant="outlined"
                onClick={() => toggleAllColumns(false)}
              >
                הסתר הכל
              </Button>
              <Button 
                size="small" 
                variant="outlined"
                onClick={resetToDefault}
              >
                ברירת מחדל
              </Button>
            </Box>
          </Box>
          
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {visibleColumns.map((column) => (
              <ListItem key={column.key} dense>
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={column.visible}
                    onChange={(e) => handleColumnVisibilityChange(column.key, e.target.checked)}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText 
                  primary={column.label}
                  sx={{ 
                    textDecoration: column.visible ? 'none' : 'line-through',
                    opacity: column.visible ? 1 : 0.6
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {column.visible ? (
                    <VisibilityIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  ) : (
                    <VisibilityOffIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowColumnSettings(false)}>
            סגור
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>אישור מחיקה</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            האם אתה בטוח שברצונך למחוק חייל זה? פעולה זו אינה ניתנת לביטול.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>ביטול</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            מחק
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Soldiers; 