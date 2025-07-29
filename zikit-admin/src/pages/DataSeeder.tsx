import React, { useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { seedAllData, seedSoldiers, seedVehicles } from '../utils/seedData';

const DataSeeder: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSeedAll = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const result = await seedAllData();
      if (result) {
        setMessage({ type: 'success', text: 'כל הנתונים הוכנסו בהצלחה!' });
      } else {
        setMessage({ type: 'error', text: 'הייתה שגיאה בהכנסת הנתונים' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `שגיאה: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedSoldiers = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const result = await seedSoldiers();
      if (result) {
        setMessage({ type: 'success', text: 'נתוני החיילים הוכנסו בהצלחה!' });
      } else {
        setMessage({ type: 'error', text: 'הייתה שגיאה בהכנסת נתוני החיילים' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `שגיאה: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedVehicles = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const result = await seedVehicles();
      if (result) {
        setMessage({ type: 'success', text: 'נתוני הרכבים הוכנסו בהצלחה!' });
      } else {
        setMessage({ type: 'error', text: 'הייתה שגיאה בהכנסת נתוני הרכבים' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `שגיאה: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        הכנסת נתוני דמו
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>אזהרה:</strong> פעולה זו תמחק את כל הנתונים הקיימים ותכניס נתוני דמו חדשים.
          פעולה זו אינה ניתנת לביטול!
        </Typography>
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            הכנסת כל הנתונים
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            יכניס 64 חיילים ו-9 רכבים
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSeedAll}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            {loading ? <CircularProgress size={20} /> : 'הכנס את כל הנתונים'}
          </Button>
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              הכנסת חיילים בלבד
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              יכניס 64 חיילים
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleSeedSoldiers}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'הכנס חיילים'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              הכנסת רכבים בלבד
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              יכניס 9 רכבים
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleSeedVehicles}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'הכנס רכבים'}
            </Button>
          </CardContent>
        </Card>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mt: 3 }}>
          {message.text}
        </Alert>
      )}
    </Container>
  );
};

export default DataSeeder; 