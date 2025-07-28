import React, { useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Alert,
  CircularProgress
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { signInWithGoogle } from '../services/authService';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await signInWithGoogle();
      // המשתמש יועבר אוטומטית אחרי הכניסה המוצלחת
    } catch (error) {
      console.error('שגיאה בהתחברות:', error);
      setError('שגיאה בהתחברות. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container 
      maxWidth="sm" 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        direction: 'rtl'
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400, boxShadow: 4 }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
              מערכת ניהול כוח אדם
            </Typography>
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              פלוגה לוחמת
            </Typography>
          </Box>

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Login Button */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleLogin}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <GoogleIcon />}
            sx={{ 
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600
            }}
          >
            {loading ? 'מתחבר...' : 'התחבר עם Google'}
          </Button>

          {/* Footer */}
          <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary' }}>
            משתמש מורשה בלבד
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Login; 