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
  team: '',
  role: '',
  profile: '',
  qualifications: [],
  licenses: [],
  certifications: [],
  presence: 'בבסיס',
  presenceOther: '',
  family: '',
  militaryBackground: '',
  notes: '',
  medicalProfile: '',
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

  useEffect(() => {
    if (person && mode === 'edit') {
      const { id, ...rest } = person;
      setFormData(rest);
    } else {
      setFormData(emptyPerson);
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
              label="צוות"
              name="team"
              value={formData.team}
              onChange={handleChange}
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
                <MenuItem value="בבסיס">בבסיס</MenuItem>
                <MenuItem value="בפעילות">בפעילות</MenuItem>
                <MenuItem value="חופש">חופש</MenuItem>
                <MenuItem value="גימלים">גימלים</MenuItem>
                <MenuItem value="אחר">אחר</MenuItem>
              </Select>
            </FormControl>
            {formData.presence === 'אחר' && (
              <TextField
                fullWidth
                label="פירוט אחר"
                name="presenceOther"
                value={formData.presenceOther || ''}
                onChange={handleChange}
                helperText="פרט את המיקום הספציפי"
              />
            )}
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <TextField
                fullWidth
                label="כשירויות (מופרד בפסיקים)"
                name="qualifications"
                value={formData.qualifications.join(', ')}
                onChange={handleArrayChange}
                multiline
                rows={2}
              />
            </Box>
            <TextField
              fullWidth
              label="רישיונות נהיגה (מופרד בפסיקים)"
              name="licenses"
              value={formData.licenses.join(', ')}
              onChange={handleArrayChange}
            />
            <TextField
              fullWidth
              label="הסמכות (מופרד בפסיקים)"
              name="certifications"
              value={formData.certifications.join(', ')}
              onChange={handleArrayChange}
            />
            <TextField
              fullWidth
              label="משפחה"
              name="family"
              value={formData.family || ''}
              onChange={handleChange}
            />
            <TextField
              fullWidth
              label="רקע צבאי"
              name="militaryBackground"
              value={formData.militaryBackground || ''}
              onChange={handleChange}
            />
            <TextField
              fullWidth
              label="הערות"
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="פרופיל רפואי"
              name="medicalProfile"
              value={formData.medicalProfile || ''}
              onChange={handleChange}
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