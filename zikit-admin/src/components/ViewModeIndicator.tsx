import React from 'react';
import { Box, Chip, Typography, IconButton, Tooltip } from '@mui/material';
import { Person as PersonIcon, Close as CloseIcon } from '@mui/icons-material';
import { useViewMode } from '../contexts/ViewModeContext';
import { getAllSoldiers } from '../services/soldierService';
import { useState, useEffect } from 'react';

const ViewModeIndicator: React.FC = () => {
  const { selectedSoldierId, isViewModeActive, resetViewMode } = useViewMode();
  const [soldiers, setSoldiers] = useState<any[]>([]);

  useEffect(() => {
    const loadSoldiers = async () => {
      try {
        const allSoldiers = await getAllSoldiers();
        setSoldiers(allSoldiers);
      } catch (error) {
        console.error('שגיאה בטעינת חיילים:', error);
      }
    };
    
    if (isViewModeActive) {
      loadSoldiers();
    }
  }, [isViewModeActive]);

  if (!isViewModeActive) {
    return null;
  }

  const currentSoldier = soldiers.find(s => s.id === selectedSoldierId);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80,
        right: 20,
        zIndex: 1200,
        backgroundColor: 'warning.main',
        color: 'warning.contrastText',
        borderRadius: 2,
        padding: 1.5,
        boxShadow: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 200
      }}
    >
      <PersonIcon sx={{ fontSize: 20 }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
          צפייה כחייל
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
          {currentSoldier?.name || 'לא ידוע'}
        </Typography>
      </Box>
      <Tooltip title="חזור לנקודת מבט אישית">
        <IconButton
          size="small"
          onClick={resetViewMode}
          sx={{ 
            color: 'inherit',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default ViewModeIndicator; 