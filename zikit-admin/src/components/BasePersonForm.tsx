import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { BasePerson } from '../models/BasePerson';
import { getFrameworkNameById } from '../services/frameworkService';
import { getAllStatuses, requiresAbsenceDate, requiresCustomText } from '../utils/presenceStatus';
import { createIsraelDate } from '../utils/dateUtils';

interface BasePersonFormProps {
  open: boolean;
  onClose: () => void;
  person?: BasePerson | null;
  onSuccess?: (person: BasePerson) => void;
  mode: 'add' | 'edit';
  title?: string;
}

const emptyPerson: Omit<BasePerson, 'id'> = {
  name: '',
  personalNumber: '',
  rank: '',
  frameworkId: '',
  role: '',
  profile: '',
  qualifications: [],
  licenses: [],
  certifications: [],
  drivingLicenses: [],
  presence: 'בבסיס',
  presenceOther: '',
  absenceUntil: '',
  family: '',
  medicalProfile: '',
  
  // שדות מטופס הקליטה
  email: '',
  fullName: '',
  phone: '',
  birthDate: '',
  address: '',
  additionalInfo: '',
  
  braurTest: {
    strength: 'passed',
    running: ''
  },
  vacationDays: {
    total: 18,
    used: 0,
    status: 'good'
  }
};

const BasePersonForm: React.FC<BasePersonFormProps> = ({ 
  open, 
  onClose, 
  person, 
  onSuccess, 
  mode,
  title = 'אדם'
}) => {
  const [formData, setFormData] = useState<Omit<BasePerson, 'id'>>(emptyPerson);
  const [loading, setLoading] = useState(false);
  const [frameworkName, setFrameworkName] = useState<string>('');

  useEffect(() => {
    if (person && mode === 'edit') {
      const { id, ...rest } = person;
      // וודא שהמערכים תמיד מאותחלים
      setFormData({
        ...rest,
        qualifications: rest.qualifications || [],
        licenses: rest.licenses || [],
        certifications: rest.certifications || [],
        drivingLicenses: rest.drivingLicenses || []
      });
      
      // קבלת שם המסגרת אם יש מזהה
      if (rest.frameworkId) {
        getFrameworkNameById(rest.frameworkId).then(name => {
          setFrameworkName(name);
        }).catch(() => {
          setFrameworkName('');
        });
      } else {
        setFrameworkName('');
      }
    } else {
      setFormData(emptyPerson);
      setFrameworkName('');
    }
  }, [person, mode, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // טיפול בשדות מורכבים
    if (name === 'braurTestStrength') {
      setFormData(prev => ({
        ...prev,
        braurTest: {
          strength: value as 'passed' | 'failed',
          running: prev.braurTest?.running || ''
        }
      }));
    } else if (name === 'braurTestRunning') {
      setFormData(prev => ({
        ...prev,
        braurTest: {
          strength: prev.braurTest?.strength || 'passed',
          running: value
        }
      }));
    } else if (name === 'vacationDaysTotal') {
      const total = parseInt(value) || 0;
      setFormData(prev => {
        const used = prev.vacationDays?.used || 0;
        const status = total > 9 ? 'critical' : total > 6 ? 'warning' : 'good';
        return {
          ...prev,
          vacationDays: {
            total,
            used,
            status
          }
        };
      });
    } else if (name === 'vacationDaysUsed') {
      const used = parseInt(value) || 0;
      setFormData(prev => {
        const total = prev.vacationDays?.total || 18;
        const status = total > 9 ? 'critical' : total > 6 ? 'warning' : 'good';
        return {
          ...prev,
          vacationDays: {
            total,
            used,
            status
          }
        };
      });
    } else if (name === 'absenceUntil') {
      // טיפול בשדה תאריך - הוספת שעה אוטומטית עם טיפול נכון באזורי זמן
      if (value) {
        const israelDate = createIsraelDate(value);
        // absenceUntil - תמיד 23:59
        israelDate.setHours(23, 59, 0, 0);
        setFormData(prev => ({ ...prev, [name]: israelDate.toISOString() }));
      } else {
        setFormData(prev => ({ ...prev, [name]: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value.split(',').map(s => s.trim()) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // כאן יהיה הקריאה לשירות המתאים
      // כרגע נשתמש ב-callback
      const result = { id: person?.id || 'new-id', ...formData } as BasePerson;
      onSuccess?.(result);
      onClose();
    } catch (error) {
      console.error('שגיאה בשמירת הנתונים:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {mode === 'edit' ? `עריכת ${title} - ${person?.name}` : `הוספת ${title} חדש`}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
            gap: 2, 
            mt: 1 
          }}>
            <TextField
              fullWidth
              label="שם מלא"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <TextField
              fullWidth
              label="מספר אישי"
              name="personalNumber"
              value={formData.personalNumber}
              onChange={handleChange}
              required
            />
            <TextField
              fullWidth
              label="דרגה"
              name="rank"
              value={formData.rank || ''}
              onChange={handleChange}
              placeholder="לדוגמה: טוראי, רב טוראי, סמל"
            />
            <TextField
              fullWidth
              label="מסגרת"
              name="frameworkId"
              value={frameworkName || formData.frameworkId}
              onChange={handleChange}
              helperText="שדה זה אינו ניתן לעריכה"
              disabled
            />
            <TextField
              fullWidth
              label="תפקיד"
              name="role"
              value={formData.role}
              onChange={handleChange}
            />
            <TextField
              fullWidth
              label="פרופיל רפואי"
              name="profile"
              value={formData.profile}
              onChange={handleChange}
            />
            <FormControl fullWidth>
              <InputLabel>נוכחות</InputLabel>
              <Select
                name="presence"
                value={formData.presence || ''}
                onChange={(e: any) => setFormData(prev => ({ ...prev, presence: e.target.value }))}
                label="נוכחות"
              >
                {getAllStatuses().map(status => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {requiresCustomText(formData.presence as any) && (
              <TextField
                fullWidth
                label="פירוט אחר"
                name="presenceOther"
                value={formData.presenceOther || ''}
                onChange={handleChange}
                helperText="פרט את המיקום הספציפי"
              />
            )}
            {requiresAbsenceDate(formData.presence as any) && (
              <>
                <TextField
                  fullWidth
                  label={`${formData.presence} עד מתי?`}
                  name="absenceUntil"
                  type="date"
                  value={formData.absenceUntil ? new Date(formData.absenceUntil).toISOString().split('T')[0] : ''}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </>
            )}
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <TextField
                fullWidth
                label="כשירויות (מופרד בפסיקים)"
                name="qualifications"
                value={(formData.qualifications || []).join(', ')}
                onChange={handleArrayChange}
                multiline
                rows={2}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <TextField
                fullWidth
                label="היתרים לנהיגה (מופרד בפסיקים)"
                name="drivingLicenses"
                value={(formData.drivingLicenses || []).join(', ')}
                onChange={handleArrayChange}
                multiline
                rows={2}
                helperText="לדוגמה: B, C, D, E"
              />
            </Box>
            <TextField
              fullWidth
              label="משפחה"
              name="family"
              value={formData.family || ''}
              onChange={handleChange}
            />
             <TextField
               fullWidth
               label="טלפון"
               name="phone"
               value={formData.phone || ''}
               onChange={handleChange}
             />
             <TextField
               fullWidth
               label="תאריך לידה"
               name="birthDate"
               value={formData.birthDate || ''}
               onChange={handleChange}
               helperText="פורמט: DD/MM/YYYY"
             />
             <TextField
               fullWidth
               label="כתובת"
               name="address"
               value={formData.address || ''}
               onChange={handleChange}
               multiline
               rows={2}
             />
             <TextField
               fullWidth
               label="מידע נוסף"
               name="additionalInfo"
               value={formData.additionalInfo || ''}
               onChange={handleChange}
               multiline
               rows={3}
             />
            <TextField
              fullWidth
              label="ציון מבחן בראור - כח"
              name="braurTestStrength"
              value={formData.braurTest?.strength || ''}
              onChange={handleChange}
              helperText="עבר/לא עבר"
            />
            <TextField
              fullWidth
              label="ציון מבחן בראור - ריצה"
              name="braurTestRunning"
              value={formData.braurTest?.running || ''}
              onChange={handleChange}
              helperText="פורמט: דקות:שניות (לדוג': 14:25)"
            />
            <TextField
              fullWidth
              label="מספר ימי חופש שנותרו"
              name="vacationDaysTotal"
              type="number"
              value={formData.vacationDays?.total || ''}
              onChange={handleChange}
              inputProps={{ min: 0, max: 18 }}
            />
            <TextField
              fullWidth
              label="מספר ימי חופש שכבר נוצלו"
              name="vacationDaysUsed"
              type="number"
              value={formData.vacationDays?.used || ''}
              onChange={handleChange}
              inputProps={{ min: 0, max: 18 }}
            />
            

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            ביטול
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? 'שומר...' : mode === 'edit' ? 'עדכן' : 'הוסף'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BasePersonForm; 