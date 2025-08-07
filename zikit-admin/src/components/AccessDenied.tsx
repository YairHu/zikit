import React from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Block as BlockIcon } from '@mui/icons-material';

interface AccessDeniedProps {
  message?: string;
  showBackButton?: boolean;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ 
  message = 'אין לך הרשאה לגשת לעמוד זה', 
  showBackButton = true 
}) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        p: 3
      }}
    >
      <BlockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
      
      <Typography variant="h4" component="h1" sx={{ mb: 2, fontWeight: 600 }}>
        גישה נדחתה
      </Typography>
      
      <Alert severity="error" sx={{ mb: 3, maxWidth: 500 }}>
        <Typography variant="body1">
          {message}
        </Typography>
      </Alert>
      
      {showBackButton && (
        <Button
          variant="contained"
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          חזרה לדף הראשי
        </Button>
      )}
    </Box>
  );
};

export default AccessDenied; 