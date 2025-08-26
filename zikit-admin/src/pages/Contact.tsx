import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Container,
  Paper
} from '@mui/material';
import { useUser } from '../contexts/UserContext';
import { ContactRequest } from '../models/ContactRequest';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const Contact: React.FC = () => {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general' as ContactRequest['category']
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const contactRequest: Omit<ContactRequest, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.uid,
        userName: user.displayName || 'משתמש לא ידוע',
        userEmail: user.email || '',
        subject: formData.subject,
        message: formData.message,
        status: 'pending',
        priority: 'medium',
        category: formData.category
      };

      await addDoc(collection(db, 'contactRequests'), {
        ...contactRequest,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setSnackbar({
        open: true,
        message: 'הפנייה נשלחה בהצלחה! נחזור אליך בהקדם האפשרי.',
        severity: 'success'
      });

      // איפוס הטופס
      setFormData({
        subject: '',
        message: '',
        category: 'general'
      });
    } catch (error) {
      console.error('שגיאה בשליחת הפנייה:', error);
      setSnackbar({
        open: true,
        message: 'שגיאה בשליחת הפנייה. אנא נסה שוב.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight={700}>
          צור קשר
        </Typography>
        
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          נתקלתם בבעיה? רעיון חדש למערכת? כתבו לנו
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>קטגוריה</InputLabel>
            <Select
              value={formData.category}
              label="קטגוריה"
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ContactRequest['category'] })}
              required
            >
              <MenuItem value="general">כללי</MenuItem>
              <MenuItem value="bug">דיווח על באג</MenuItem>
              <MenuItem value="feature">בקשת תכונה חדשה</MenuItem>
              <MenuItem value="support">תמיכה טכנית</MenuItem>
            </Select>
          </FormControl>



          <TextField
            fullWidth
            label="נושא"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="הודעה"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            required
            multiline
            rows={6}
            sx={{ mb: 4 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ py: 1.5 }}
          >
            {loading ? 'שולח...' : 'שלח פנייה'}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Contact;
