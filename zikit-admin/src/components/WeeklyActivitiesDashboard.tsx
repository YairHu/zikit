import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Today as TodayIcon
} from '@mui/icons-material';
import { Activity } from '../models/Activity';
import { Framework } from '../models/Framework';
import { formatToIsraelString } from '../utils/dateUtils';
import { useUser } from '../contexts/UserContext';
import { canUserAccessPath } from '../services/permissionService';
import { SystemPath, PermissionLevel } from '../models/UserRole';

interface WeeklyActivitiesDashboardProps {
  activities: Activity[];
  frameworks: Framework[];
  soldiers?: any[]; // חיילים לשימוש בפילטר לפי משתתפים
  permissions: {
    canEdit: boolean;
  };
  onActivityClick?: (activityId: string) => void; // פונקציה לניווט לפעילות
  showCompletedActivities?: boolean; // האם להציג פעילויות שהסתיימו
}

interface AdditionalText {
  id: string;
  frameworkId: string;
  dayOfWeek: number; // 0 = ראשון, 6 = שבת
  text: string;
  createdBy: string;
  createdAt: string;
}

const WeeklyActivitiesDashboard: React.FC<WeeklyActivitiesDashboardProps> = ({
  activities,
  frameworks,
  soldiers = [],
  permissions,
  onActivityClick,
  showCompletedActivities = true
}) => {
  const { user } = useUser();
  const [showSettings, setShowSettings] = useState(false);
  const [showEndFrameworksOnly, setShowEndFrameworksOnly] = useState(() => {
    const saved = localStorage.getItem('weeklyActivitiesShowEndFrameworksOnly');
    return saved ? JSON.parse(saved) : true;
  });
  const [showByParticipants, setShowByParticipants] = useState(() => {
    const saved = localStorage.getItem('weeklyActivitiesShowByParticipants');
    return saved ? JSON.parse(saved) : false;
  });
  const [weekOffset, setWeekOffset] = useState(() => {
    const saved = localStorage.getItem('weeklyActivitiesWeekOffset');
    return saved ? JSON.parse(saved) : 0;
  });
  const [additionalTexts, setAdditionalTexts] = useState<AdditionalText[]>(() => {
    const saved = localStorage.getItem('weeklyActivitiesAdditionalTexts');
    return saved ? JSON.parse(saved) : [];
  });
  const [editTextDialog, setEditTextDialog] = useState<{
    open: boolean;
    frameworkId: string;
    dayOfWeek: number;
    text: string;
    isNew: boolean;
  }>({
    open: false,
    frameworkId: '',
    dayOfWeek: 0,
    text: '',
    isNew: false
  });

  // ימות השבוע
  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  // קבלת תאריכי השבוע הנוכחי
  const getCurrentWeekDates = useCallback(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = ראשון, 6 = שבת
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay + (weekOffset * 7));
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    
    return weekDates;
  }, [weekOffset]);

  // פונקציה לקבלת מסגרות קצה בלבד
  const getEndFrameworks = useCallback(() => {
    const allFrameworkIds = new Set(frameworks.map(f => f.id));
    const parentFrameworkIds = new Set(frameworks.map(f => f.parentFrameworkId).filter(Boolean));
    
    return frameworks.filter(framework => !parentFrameworkIds.has(framework.id));
  }, [frameworks]);

  // פונקציה לבדיקה אם מסגרת היא תת-מסגרת
  const isChildFramework = useCallback((childId: string, parentId: string): boolean => {
    const child = frameworks.find(f => f.id === childId);
    if (!child) return false;
    
    if (child.parentFrameworkId === parentId) return true;
    if (child.parentFrameworkId) {
      return isChildFramework(child.parentFrameworkId, parentId);
    }
    return false;
  }, [frameworks]);

  // פונקציה למציאת כל המסגרות בהיררכיה כולל מסגרות-בנות
  const getAllFrameworksInHierarchy = useCallback((frameworkId: string): string[] => {
    const direct = [frameworkId];
    const children = frameworks.filter(f => f.parentFrameworkId === frameworkId);
    const childIds = children.flatMap(child => getAllFrameworksInHierarchy(child.id));
    return [...direct, ...childIds];
  }, [frameworks]);

  // פונקציה לקבלת מסגרות לסינון
  const getFilteredFrameworks = useCallback(() => {
    if (showEndFrameworksOnly) {
      return getEndFrameworks();
    }
    return frameworks;
  }, [frameworks, showEndFrameworksOnly, getEndFrameworks]);

  // פונקציה לקבלת פעילויות למסגרת ויום מסוים
  const getActivitiesForFrameworkAndDay = useCallback((frameworkId: string, dayIndex: number) => {
    const weekDates = getCurrentWeekDates();
    const targetDate = weekDates[dayIndex];
    const targetDateString = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // סינון פעילויות לפי סטטוס
    let filteredActivities = activities;
    if (!showCompletedActivities) {
      filteredActivities = activities.filter(activity => activity.status !== 'הסתיימה');
    }
    
    if (showByParticipants) {
      // לפי משתתפים - כל פעילות שיש בה משתתף מהמסגרת
      return filteredActivities.filter(activity => {
        // בדיקה אם התאריך מתאים - המרה לפורמט ISO string
        if (!activity.plannedDate) return false;
        const activityDate = new Date(activity.plannedDate);
        if (isNaN(activityDate.getTime())) return false;
        const activityDateString = activityDate.toISOString().split('T')[0];
        if (activityDateString !== targetDateString) return false;
        
        // בדיקה אם יש משתתף מהמסגרת
        const frameworkSoldiers = soldiers.filter(soldier => 
          soldier.frameworkId === frameworkId || isChildFramework(soldier.frameworkId, frameworkId)
        );
        
        return activity.participants.some(participant => 
          frameworkSoldiers.some(soldier => soldier.id === participant.soldierId)
        );
      });
    } else {
      // לפי שיוך - פעילויות שמשויכות למסגרת
      return filteredActivities.filter(activity => {
        // המרה לפורמט ISO string להשוואה נכונה
        if (!activity.plannedDate) return false;
        const activityDate = new Date(activity.plannedDate);
        if (isNaN(activityDate.getTime())) return false;
        const activityDateString = activityDate.toISOString().split('T')[0];
        return activity.frameworkId === frameworkId && activityDateString === targetDateString;
      });
    }
  }, [activities, soldiers, showByParticipants, showCompletedActivities, getCurrentWeekDates, isChildFramework]);

  // פונקציה לקבלת טקסט נוסף
  const getAdditionalText = useCallback((frameworkId: string, dayIndex: number) => {
    // חישוב התאריך של היום הזה בשבוע הנוכחי
    const weekDates = getCurrentWeekDates();
    const targetDate = weekDates[dayIndex];
    const targetDateString = targetDate.toISOString().split('T')[0];
    
    return additionalTexts.find(text => {
      // חישוב התאריך של הטקסט
      const textDate = new Date();
      textDate.setDate(textDate.getDate() + (text.dayOfWeek - textDate.getDay()) + (weekOffset * 7));
      if (isNaN(textDate.getTime())) return false;
      const textDateString = textDate.toISOString().split('T')[0];
      
      return text.frameworkId === frameworkId && textDateString === targetDateString;
    });
  }, [additionalTexts, weekOffset, getCurrentWeekDates]);

  // פונקציה להוספת/עריכת טקסט נוסף
  const handleAddEditText = (frameworkId: string, dayIndex: number, existingText?: string) => {
    setEditTextDialog({
      open: true,
      frameworkId,
      dayOfWeek: dayIndex,
      text: existingText || '',
      isNew: !existingText
    });
  };

  // פונקציה לשמירת טקסט נוסף
  const handleSaveText = () => {
    const { frameworkId, dayOfWeek, text, isNew } = editTextDialog;
    
    // חישוב התאריך האמיתי של הטקסט
    const textDate = new Date();
    textDate.setDate(textDate.getDate() + (dayOfWeek - textDate.getDay()) + (weekOffset * 7));
    if (isNaN(textDate.getTime())) return;
    const textDateString = textDate.toISOString().split('T')[0];
    
    if (isNew) {
      const newText: AdditionalText = {
        id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        frameworkId,
        dayOfWeek,
        text,
        createdBy: user?.displayName || user?.email || 'משתמש לא ידוע',
        createdAt: new Date().toISOString()
      };
      const updatedTexts = [...additionalTexts, newText];
      setAdditionalTexts(updatedTexts);
      localStorage.setItem('weeklyActivitiesAdditionalTexts', JSON.stringify(updatedTexts));
    } else {
      // עדכון טקסט קיים - נצטרך למצוא אותו לפי התאריך
      const updatedTexts = additionalTexts.map(t => {
        const tDate = new Date();
        tDate.setDate(tDate.getDate() + (t.dayOfWeek - tDate.getDay()) + (weekOffset * 7));
        if (isNaN(tDate.getTime())) return t;
        const tDateString = tDate.toISOString().split('T')[0];
        
        if (t.frameworkId === frameworkId && tDateString === textDateString) {
          return { ...t, text };
        }
        return t;
      });
      setAdditionalTexts(updatedTexts);
      localStorage.setItem('weeklyActivitiesAdditionalTexts', JSON.stringify(updatedTexts));
    }
    
    setEditTextDialog({ open: false, frameworkId: '', dayOfWeek: 0, text: '', isNew: false });
  };



  // פונקציה למחיקת טקסט נוסף
  const handleDeleteText = (frameworkId: string, dayIndex: number) => {
    // חישוב התאריך של היום הזה בשבוע הנוכחי
    const weekDates = getCurrentWeekDates();
    const targetDate = weekDates[dayIndex];
    const targetDateString = targetDate.toISOString().split('T')[0];
    
    const updatedTexts = additionalTexts.filter(t => {
      // חישוב התאריך של הטקסט
      const textDate = new Date();
      textDate.setDate(textDate.getDate() + (t.dayOfWeek - textDate.getDay()) + (weekOffset * 7));
      if (isNaN(textDate.getTime())) return true;
      const textDateString = textDate.toISOString().split('T')[0];
      
      return !(t.frameworkId === frameworkId && textDateString === targetDateString);
    });
    setAdditionalTexts(updatedTexts);
    localStorage.setItem('weeklyActivitiesAdditionalTexts', JSON.stringify(updatedTexts));
  };

  // פונקציה לקבלת תאריך בפורמט תצוגה
  const getDisplayDate = useCallback((dayIndex: number) => {
    const weekDates = getCurrentWeekDates();
    const date = weekDates[dayIndex];
    return formatToIsraelString(date, { 
      month: '2-digit', 
      day: '2-digit' 
    });
  }, [getCurrentWeekDates]);

  const filteredFrameworks = getFilteredFrameworks();
  const weekDates = getCurrentWeekDates();
  
  // קבלת טווח התאריכים של השבוע
  const weekStart = formatToIsraelString(weekDates[0], { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  const weekEnd = formatToIsraelString(weekDates[6], { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with Settings */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" fontWeight="bold">
            דאשבורד פעילויות
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            תצוגת שבוע עם פעילויות לפי מסגרות. לחיצה על פעילות תפתח אותה לעריכה.
            <br />
            <strong>שבוע: {weekStart} - {weekEnd}</strong>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Week Navigation */}
          <Tooltip title="שבוע קודם">
            <IconButton 
              onClick={() => {
                const newOffset = weekOffset - 1;
                setWeekOffset(newOffset);
                localStorage.setItem('weeklyActivitiesWeekOffset', JSON.stringify(newOffset));
              }}
            >
              <NavigateBeforeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="שבוע נוכחי">
            <IconButton 
              onClick={() => {
                setWeekOffset(0);
                localStorage.setItem('weeklyActivitiesWeekOffset', JSON.stringify(0));
              }}
              color={weekOffset === 0 ? 'primary' : 'default'}
            >
              <TodayIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="שבוע הבא">
            <IconButton 
              onClick={() => {
                const newOffset = weekOffset + 1;
                setWeekOffset(newOffset);
                localStorage.setItem('weeklyActivitiesWeekOffset', JSON.stringify(newOffset));
              }}
            >
              <NavigateNextIcon />
            </IconButton>
          </Tooltip>
          {permissions.canEdit && (
            <Tooltip title="הגדרות">
              <IconButton 
                onClick={() => setShowSettings(!showSettings)}
                color={showSettings ? 'primary' : 'default'}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Settings Panel */}
      {showSettings && permissions.canEdit && (
        <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              הגדרות תצוגה
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showEndFrameworksOnly}
                    onChange={(e) => {
                      setShowEndFrameworksOnly(e.target.checked);
                      localStorage.setItem('weeklyActivitiesShowEndFrameworksOnly', JSON.stringify(e.target.checked));
                    }}
                  />
                }
                label="הצג מסגרות קצה בלבד"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showByParticipants}
                    onChange={(e) => {
                      setShowByParticipants(e.target.checked);
                      localStorage.setItem('weeklyActivitiesShowByParticipants', JSON.stringify(e.target.checked));
                    }}
                  />
                }
                label="פעילויות לפי משתתפים (במקום לפי שיוך)"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            סטטיסטיקות השבוע
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Chip 
              label={`סה"כ פעילויות: ${activities.filter(a => {
                if (!a.plannedDate) return false;
                const activityDate = new Date(a.plannedDate);
                if (isNaN(activityDate.getTime())) return false;
                const activityDateString = activityDate.toISOString().split('T')[0];
                const weekStartString = weekDates[0].toISOString().split('T')[0];
                const weekEndString = weekDates[6].toISOString().split('T')[0];
                return activityDateString >= weekStartString && activityDateString <= weekEndString;
              }).length}`} 
              color="primary" 
            />
            <Chip 
              label={`פעילויות השבוע: ${activities.filter(a => {
                if (!a.plannedDate) return false;
                const activityDate = new Date(a.plannedDate);
                if (isNaN(activityDate.getTime())) return false;
                const activityDateString = activityDate.toISOString().split('T')[0];
                const weekStartString = weekDates[0].toISOString().split('T')[0];
                const weekEndString = weekDates[6].toISOString().split('T')[0];
                const inWeek = activityDateString >= weekStartString && activityDateString <= weekEndString;
                const notCompleted = showCompletedActivities || a.status !== 'הסתיימה';
                return inWeek && notCompleted;
              }).length}`} 
              color="success" 
            />
            <Chip 
              label={`מסגרות פעילות: ${filteredFrameworks.length}`} 
              color="secondary" 
            />
            <Chip 
              label={`טקסטים נוספים: ${additionalTexts.filter(text => {
                const textDate = new Date();
                textDate.setDate(textDate.getDate() + (text.dayOfWeek - textDate.getDay()) + (weekOffset * 7));
                if (isNaN(textDate.getTime())) return false;
                const textDateString = textDate.toISOString().split('T')[0];
                const weekStartString = weekDates[0].toISOString().split('T')[0];
                const weekEndString = weekDates[6].toISOString().split('T')[0];
                return textDateString >= weekStartString && textDateString <= weekEndString;
              }).length}`} 
              color="warning" 
            />
          </Box>
        </CardContent>
      </Card>

      {/* Weekly Table */}
      <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ 
                minWidth: 200, 
                width: '15%',
                fontWeight: 'bold',
                backgroundColor: 'primary.main',
                color: 'white'
              }}>
                מסגרת
              </TableCell>
              {weekDays.map((day, index) => (
                <TableCell 
                  key={day} 
                  align="center"
                  sx={{ 
                    width: '12%',
                    fontWeight: 'bold',
                    backgroundColor: 'primary.main',
                    color: 'white'
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {day}
                    </Typography>
                    <Typography variant="caption">
                      {getDisplayDate(index)}
                    </Typography>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFrameworks.map((framework) => (
              <TableRow key={framework.id} hover>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  backgroundColor: 'background.default',
                  borderRight: '2px solid #e0e0e0'
                }}>
                  <Typography variant="body2" fontWeight="bold">
                    {framework.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {framework.level === 'company' ? 'פלוגה' :
                     framework.level === 'platoon' ? 'מחלקה' :
                     framework.level === 'squad' ? 'כיתה' :
                     framework.level === 'team' ? 'צוות' : 'מסגרת'}
                  </Typography>
                </TableCell>
                {weekDays.map((_, dayIndex) => {
                  const activities = getActivitiesForFrameworkAndDay(framework.id, dayIndex);
                  const additionalText = getAdditionalText(framework.id, dayIndex);
                  
                  return (
                    <TableCell 
                      key={dayIndex}
                      sx={{ 
                        minHeight: 120,
                        verticalAlign: 'top',
                        cursor: permissions.canEdit ? 'pointer' : 'default',
                        '&:hover': permissions.canEdit ? {
                          backgroundColor: 'action.hover'
                        } : {}
                      }}
                      onClick={() => {
                        if (permissions.canEdit) {
                          handleAddEditText(framework.id, dayIndex, additionalText?.text);
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {/* Activities */}
                        {activities.map((activity) => (
                          <Chip
                            key={activity.id}
                            label={activity.name}
                            size="small"
                            color="primary"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onActivityClick) {
                                onActivityClick(activity.id);
                              }
                            }}
                            sx={{ 
                              fontSize: '0.75rem',
                              maxWidth: '100%',
                              cursor: onActivityClick ? 'pointer' : 'default',
                              '& .MuiChip-label': {
                                whiteSpace: 'normal',
                                textAlign: 'center'
                              },
                              '&:hover': onActivityClick ? {
                                backgroundColor: 'primary.main',
                                color: 'white'
                              } : {}
                            }}
                          />
                        ))}
                        
                        {/* Additional Text */}
                        {additionalText && (
                          <Box sx={{ 
                            p: 1, 
                            bgcolor: 'warning.light', 
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'warning.main'
                          }}>
                            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                              {additionalText.text}
                            </Typography>
                            {permissions.canEdit && (
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddEditText(framework.id, dayIndex, additionalText.text);
                                  }}
                                  sx={{ p: 0.25 }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteText(framework.id, dayIndex);
                                  }}
                                  sx={{ p: 0.25 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            )}
                          </Box>
                        )}
                        
                        {/* Add Button for Empty Cells */}
                        {activities.length === 0 && !additionalText && permissions.canEdit && (
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'center',
                            opacity: 0.5
                          }}>
                            <AddIcon fontSize="small" />
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Text Dialog */}
      <Dialog 
        open={editTextDialog.open} 
        onClose={() => setEditTextDialog({ open: false, frameworkId: '', dayOfWeek: 0, text: '', isNew: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editTextDialog.isNew ? 'הוסף טקסט נוסף' : 'ערוך טקסט נוסף'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              מסגרת: {frameworks.find(f => f.id === editTextDialog.frameworkId)?.name}
              <br />
              יום: {weekDays[editTextDialog.dayOfWeek]} ({getDisplayDate(editTextDialog.dayOfWeek)})
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="טקסט נוסף"
              value={editTextDialog.text}
              onChange={(e) => setEditTextDialog(prev => ({ ...prev, text: e.target.value }))}
              placeholder="הוסף הערות או מידע נוסף..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTextDialog({ open: false, frameworkId: '', dayOfWeek: 0, text: '', isNew: false })}>
            ביטול
          </Button>
          <Button onClick={handleSaveText} variant="contained">
            שמור
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WeeklyActivitiesDashboard;
