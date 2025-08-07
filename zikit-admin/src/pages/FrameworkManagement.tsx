import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Paper,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { Framework, FrameworkTree } from '../models/Framework';
import { 
  getAllFrameworks, 
  createFramework, 
  updateFramework, 
  deleteFramework,
  getFrameworkTree,
  getFrameworkWithDetails
} from '../services/frameworkService';
import { getAllSoldiers, updateSoldier } from '../services/soldierService';
import { Soldier } from '../models/Soldier';


interface FrameworkFormData {
  name: string;
  parentFrameworkId: string;
  commanderId: string;
  description: string;
}

const FrameworkManagement: React.FC = () => {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [frameworkTree, setFrameworkTree] = useState<FrameworkTree[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFramework, setEditingFramework] = useState<Framework | null>(null);
  const [formData, setFormData] = useState<FrameworkFormData>({
    name: '',
    parentFrameworkId: '',
    commanderId: '',
    description: ''
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [openSoldiersDialog, setOpenSoldiersDialog] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [frameworkSoldiers, setFrameworkSoldiers] = useState<Soldier[]>([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [frameworksData, soldiersData, treeData] = await Promise.all([
        getAllFrameworks(),
        getAllSoldiers(),
        getFrameworkTree()
      ]);
      
      setFrameworks(frameworksData);
      setSoldiers(soldiersData);
      setFrameworkTree(treeData);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
      setError('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDialog = (framework?: Framework) => {
    if (framework) {
      setEditingFramework(framework);
      setFormData({
        name: framework.name,
        parentFrameworkId: framework.parentFrameworkId || '',
        commanderId: framework.commanderId,
        description: framework.description || ''
      });
    } else {
      setEditingFramework(null);
      setFormData({
        name: '',
        parentFrameworkId: '',
        commanderId: '',
        description: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingFramework(null);
    setError('');
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim() || !formData.commanderId) {
        setError('יש למלא שם מסגרת ומפקד');
        return;
      }

      if (editingFramework) {
        const updateData: any = {
          name: formData.name,
          commanderId: formData.commanderId,
          description: formData.description
        };
        
        if (formData.parentFrameworkId && formData.parentFrameworkId.trim()) {
          updateData.parentFrameworkId = formData.parentFrameworkId;
        }
        
        await updateFramework(editingFramework.id, updateData);
        setSuccess('המסגרת עודכנה בהצלחה');
      } else {
        const createData: any = {
          name: formData.name,
          commanderId: formData.commanderId,
          description: formData.description,
          isActive: true
        };
        
        if (formData.parentFrameworkId && formData.parentFrameworkId.trim()) {
          createData.parentFrameworkId = formData.parentFrameworkId;
        }
        
        await createFramework(createData);
        setSuccess('המסגרת נוצרה בהצלחה');
      }

      handleCloseDialog();
      loadData();
    } catch (error) {
      console.error('שגיאה בשמירת המסגרת:', error);
      setError('שגיאה בשמירת המסגרת');
    }
  };

  const handleDelete = async (framework: Framework) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את המסגרת "${framework.name}"?`)) {
      try {
        const success = await deleteFramework(framework.id);
        if (success) {
          setSuccess('המסגרת נמחקה בהצלחה');
          loadData();
        } else {
          setError('לא ניתן למחוק מסגרת עם מסגרות בנות');
        }
      } catch (error) {
        console.error('שגיאה במחיקת המסגרת:', error);
        setError('שגיאה במחיקת המסגרת');
      }
    }
  };

  const handleManageSoldiers = (framework: Framework) => {
    // קבלת כל החיילים בהיררכיה כולל מסגרות בנות
    const getAllSoldiersInHierarchy = (frameworkId: string): Soldier[] => {
      const directSoldiers = soldiers.filter(s => s.frameworkId === frameworkId);
      const childFrameworks = frameworks.filter(f => f.parentFrameworkId === frameworkId);
      const childSoldiers = childFrameworks.flatMap(child => getAllSoldiersInHierarchy(child.id));
      return [...directSoldiers, ...childSoldiers];
    };
    
    const allSoldiersInHierarchy = getAllSoldiersInHierarchy(framework.id);
    setFrameworkSoldiers(allSoldiersInHierarchy);
    setSelectedFramework(framework);
    setOpenSoldiersDialog(true);
  };

  const handleAddSoldierToFramework = async (soldierId: string) => {
    if (!selectedFramework) return;
    
    try {
      // עדכון החייל במסד הנתונים
      const soldier = soldiers.find(s => s.id === soldierId);
      if (soldier) {
        await updateSoldier(soldierId, { frameworkId: selectedFramework.id });
        
        // עדכון מקומי
        const updatedSoldiers = soldiers.map(s => 
          s.id === soldierId ? { ...s, frameworkId: selectedFramework.id } : s
        );
        setSoldiers(updatedSoldiers);
        
        // עדכון רשימת החיילים במסגרת
        const updatedFrameworkSoldiers = [...frameworkSoldiers, soldier];
        setFrameworkSoldiers(updatedFrameworkSoldiers);
        
        setSuccess(`החייל ${soldier.name} נוסף למסגרת ${selectedFramework.name}`);
      }
    } catch (error) {
      console.error('שגיאה בהוספת חייל למסגרת:', error);
      setError('שגיאה בהוספת חייל למסגרת');
    }
  };

  const handleRemoveSoldierFromFramework = async (soldierId: string) => {
    if (!selectedFramework) return;
    
    try {
      // עדכון החייל במסד הנתונים
      await updateSoldier(soldierId, { frameworkId: '' });
      
      // עדכון מקומי
      const updatedSoldiers = soldiers.map(s => 
        s.id === soldierId ? { ...s, frameworkId: '' } : s
      );
      setSoldiers(updatedSoldiers);
      
      // עדכון רשימת החיילים במסגרת
      const updatedFrameworkSoldiers = frameworkSoldiers.filter(s => s.id !== soldierId);
      setFrameworkSoldiers(updatedFrameworkSoldiers);
      
      const soldier = soldiers.find(s => s.id === soldierId);
      if (soldier) {
        setSuccess(`החייל ${soldier.name} הוסר מהמסגרת ${selectedFramework.name}`);
      }
    } catch (error) {
      console.error('שגיאה בהסרת חייל מהמסגרת:', error);
      setError('שגיאה בהסרת חייל מהמסגרת');
    }
  };

  const handleCloseSoldiersDialog = () => {
    setOpenSoldiersDialog(false);
    setSelectedFramework(null);
    setFrameworkSoldiers([]);
  };

  const renderFrameworkTree = (trees: FrameworkTree[], level = 0) => {
    return trees.map(tree => {
      const commander = soldiers.find(s => s.id === tree.framework.commanderId);
      const frameworkSoldiers = soldiers.filter(s => s.frameworkId === tree.framework.id);
      
      // חישוב סה"כ חיילים כולל במסגרות בנות
      const getTotalSoldiersInHierarchy = (frameworkId: string): number => {
        const directSoldiers = soldiers.filter(s => s.frameworkId === frameworkId).length;
        const childFrameworks = frameworks.filter(f => f.parentFrameworkId === frameworkId);
        const childSoldiers = childFrameworks.reduce((sum, child) => sum + getTotalSoldiersInHierarchy(child.id), 0);
        return directSoldiers + childSoldiers;
      };
      
      const totalSoldiers = getTotalSoldiersInHierarchy(tree.framework.id);
      
      return (
        <Accordion key={tree.framework.id} defaultExpanded={level === 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: isSmallMobile ? 'column' : 'row',
              alignItems: isSmallMobile ? 'flex-start' : 'center', 
              width: '100%', 
              gap: isSmallMobile ? 1 : 2 
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                flex: 1,
                minWidth: 0
              }}>
                <GroupIcon color="primary" sx={{ fontSize: isSmallMobile ? 20 : 24 }} />
                <Typography 
                  variant={isSmallMobile ? "body1" : "h6"} 
                  sx={{ 
                    flex: 1,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tree.framework.name}
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 0.5,
                alignItems: 'center'
              }}>
                <Chip 
                  label={`${frameworkSoldiers.length} ישירים`} 
                  size="small" 
                  color="primary"
                  sx={{ fontSize: isSmallMobile ? '0.7rem' : '0.75rem' }}
                />
                {totalSoldiers > frameworkSoldiers.length && (
                  <Chip 
                    label={`${totalSoldiers} סה"כ`} 
                    size="small" 
                    color="success"
                    sx={{ fontSize: isSmallMobile ? '0.7rem' : '0.75rem' }}
                  />
                )}
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                gap: 0.5,
                flexShrink: 0
              }}>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDialog(tree.framework);
                  }}
                  sx={{ p: isSmallMobile ? 0.5 : 1 }}
                >
                  <EditIcon fontSize={isSmallMobile ? "small" : "medium"} />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(tree.framework);
                  }}
                  sx={{ p: isSmallMobile ? 0.5 : 1 }}
                >
                  <DeleteIcon fontSize={isSmallMobile ? "small" : "medium"} />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManageSoldiers(tree.framework);
                  }}
                  title="ניהול חיילים"
                  sx={{ p: isSmallMobile ? 0.5 : 1 }}
                >
                  <GroupIcon fontSize={isSmallMobile ? "small" : "medium"} />
                </IconButton>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: isSmallMobile ? 1 : 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>מפקד:</strong> {commander ? commander.name : 'לא מוגדר'}
              </Typography>
              {tree.framework.description && (
                <Typography variant="body2" color="text.secondary">
                  <strong>תיאור:</strong> {tree.framework.description}
                </Typography>
              )}
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isSmallMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isSmallMobile ? 'flex-start' : 'center', 
                gap: isSmallMobile ? 1 : 0,
                mb: 1 
              }}>
                <Typography variant="subtitle2">
                  חיילים במסגרת:
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<GroupIcon />}
                  onClick={() => handleManageSoldiers(tree.framework)}
                  sx={{ 
                    fontSize: isSmallMobile ? '0.75rem' : '0.875rem',
                    px: isSmallMobile ? 1 : 2
                  }}
                >
                  ניהול חיילים
                </Button>
              </Box>
              {frameworkSoldiers.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {frameworkSoldiers.map(soldier => (
                    <Chip
                      key={soldier.id}
                      icon={<PersonIcon />}
                      label={`${soldier.name} (${soldier.role})`}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        fontSize: isSmallMobile ? '0.7rem' : '0.75rem',
                        maxWidth: isSmallMobile ? '100%' : 'auto'
                      }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  אין חיילים במסגרת זו
                </Typography>
              )}
            </Box>
            
            {tree.children.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  מסגרות בנות:
                </Typography>
                {renderFrameworkTree(tree.children, level + 1)}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      );
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>טוען נתונים...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: isSmallMobile ? 2 : 4 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isSmallMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isSmallMobile ? 'flex-start' : 'center', 
        gap: isSmallMobile ? 2 : 0,
        mb: 3 
      }}>
        <Typography variant={isSmallMobile ? "h5" : "h4"} component="h1">
          ניהול מבנה פלוגה
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ 
            fontSize: isSmallMobile ? '0.875rem' : '1rem',
            px: isSmallMobile ? 2 : 3
          }}
        >
          הוסף מסגרת
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* עץ המסגרות */}
      <Card>
        <CardContent sx={{ p: isSmallMobile ? 2 : 3 }}>
          <Typography variant={isSmallMobile ? "h6" : "h6"} gutterBottom>
            מבנה המסגרות
          </Typography>
          {frameworkTree.length === 0 ? (
            <Typography color="text.secondary">
              אין מסגרות מוגדרות. לחץ על "הוסף מסגרת" כדי להתחיל.
            </Typography>
          ) : (
            renderFrameworkTree(frameworkTree)
          )}
        </CardContent>
      </Card>

      {/* Dialog להוספה/עריכה */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingFramework ? 'עריכת מסגרת' : 'הוספת מסגרת חדשה'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="שם המסגרת"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>מסגרת אב</InputLabel>
              <Select
                value={formData.parentFrameworkId}
                onChange={(e) => setFormData({ ...formData, parentFrameworkId: e.target.value })}
                label="מסגרת אב"
              >
                <MenuItem value="">ללא מסגרת אב</MenuItem>
                {frameworks
                  .filter(f => f.id !== editingFramework?.id)
                  .map(framework => (
                  <MenuItem key={framework.id} value={framework.id}>
                    {framework.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>מפקד המסגרת</InputLabel>
              <Select
                value={formData.commanderId}
                onChange={(e) => setFormData({ ...formData, commanderId: e.target.value })}
                label="מפקד המסגרת"
                required
              >
                {soldiers.map(soldier => (
                  <MenuItem key={soldier.id} value={soldier.id}>
                    {soldier.name} ({soldier.personalNumber})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="תיאור"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              sx={{ mt: 2 }}
            />
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>ביטול</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingFramework ? 'עדכן' : 'צור'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog לניהול חיילים */}
      <Dialog open={openSoldiersDialog} onClose={handleCloseSoldiersDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          ניהול חיילים - {selectedFramework?.name} (כולל מסגרות בנות)
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: isSmallMobile ? 'column' : 'row',
            gap: 3 
          }}>
            {/* רשימת חיילים במסגרת */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                חיילים במסגרת ובמסגרות בנות ({frameworkSoldiers.length})
              </Typography>
              {frameworkSoldiers.length > 0 ? (
                <List dense>
                  {frameworkSoldiers.map(soldier => (
                    <ListItem
                      key={soldier.id}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveSoldierFromFramework(soldier.id)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={soldier.name}
                        secondary={`${soldier.role} - ${soldier.personalNumber}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  אין חיילים במסגרת זו
                </Typography>
              )}
            </Box>

            {/* רשימת חיילים זמינים להוספה */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                חיילים זמינים להוספה
              </Typography>
              <List dense>
                {soldiers
                  .filter(s => !s.frameworkId || s.frameworkId === '')
                  .map(soldier => (
                    <ListItem
                      key={soldier.id}
                      secondaryAction={
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleAddSoldierToFramework(soldier.id)}
                        >
                          הוסף
                        </Button>
                      }
                    >
                      <ListItemText
                        primary={soldier.name}
                        secondary={`${soldier.role} - ${soldier.personalNumber}`}
                      />
                    </ListItem>
                  ))}
              </List>
              {soldiers.filter(s => !s.frameworkId || s.frameworkId === '').length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  אין חיילים זמינים להוספה
                </Typography>
              )}
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSoldiersDialog}>סגור</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FrameworkManagement;