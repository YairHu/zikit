import React from 'react';
import { Box, Typography, Alert, Chip } from '@mui/material';
import { Info as InfoIcon, Security as SecurityIcon } from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { getUserPermissions, getRoleDisplayName } from '../models/UserRole';

interface PermissionInfoProps {
  showDetails?: boolean;
  variant?: 'info' | 'warning' | 'success';
}

const PermissionInfo: React.FC<PermissionInfoProps> = ({ 
  showDetails = false, 
  variant = 'info' 
}) => {
  const { user } = useUser();

  if (!user) return null;

  const permissions = getUserPermissions(user.role);
  const roleName = getRoleDisplayName(user.role);

  const getPermissionDescription = () => {
    if (permissions.content.viewOwnDataOnly) {
      return 'אתה רואה רק את הנתונים האישיים שלך';
    } else if (permissions.content.viewTeamData) {
      return 'אתה רואה את נתוני הצוות שלך';
    } else if (permissions.content.viewPlagaData) {
      return 'אתה רואה את נתוני הפלגה שלך';
    } else if (permissions.content.viewAllData) {
      return 'אתה רואה את כל הנתונים במערכת';
    }
    return 'הרשאות צפייה מוגבלות';
  };

  const getActionDescription = () => {
    const actions = [];
    
    if (permissions.actions.canEdit) actions.push('עריכה');
    if (permissions.actions.canCreate) actions.push('יצירה');
    if (permissions.actions.canDelete) actions.push('מחיקה');
    if (permissions.actions.canAssignRoles) actions.push('שבץ תפקידים');
    if (permissions.actions.canViewSensitiveData) actions.push('צפייה במידע רגיש');
    
    if (actions.length === 0) {
      return 'אין לך הרשאות פעולה';
    }
    
    return `יכולות: ${actions.join(', ')}`;
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Alert 
        severity={variant} 
        icon={<SecurityIcon />}
        sx={{ 
          '& .MuiAlert-message': { 
            width: '100%' 
          } 
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            תפקיד: {roleName}
          </Typography>
          <Chip 
            label={user.role} 
            size="small" 
            variant="outlined" 
            color="primary"
          />
        </Box>
        
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          {getPermissionDescription()}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          {getActionDescription()}
        </Typography>
        
        {showDetails && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <Typography variant="caption" color="text.secondary">
              צוות: {user.team || 'לא מוגדר'} | 
              פלגה: {user.pelaga || 'לא מוגדר'} | 
              יחידה: {user.unit || 'לא מוגדר'}
            </Typography>
          </Box>
        )}
      </Alert>
    </Box>
  );
};

export default PermissionInfo; 