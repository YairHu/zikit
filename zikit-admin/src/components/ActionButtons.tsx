import React from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { UserRole, isAdmin } from '../models/UserRole';

interface ActionButtonsProps {
  item?: any;
  itemType: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreate?: () => void;
  onView?: () => void;
  showCreate?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  showView?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'text' | 'outlined' | 'contained';
  compact?: boolean; // אם true - מציג ככפתורים קטנים, אחרת ככפתורים רגילים
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  item,
  itemType,
  onEdit,
  onDelete,
  onCreate,
  onView,
  showCreate = true,
  showEdit = true,
  showDelete = true,
  showView = false,
  size = 'small',
  variant = 'outlined',
  compact = false
}) => {
  const { user } = useUser();

  if (!user) return null;

  const userRole = user.role as UserRole;
  const canEdit = item ? isAdmin(userRole) : false;
  const canDelete = item ? isAdmin(userRole) : false;
  const canCreate = isAdmin(userRole);

  if (compact) {
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {showView && onView && (
          <Tooltip title="צפייה">
            <IconButton size="small" onClick={onView} color="primary">
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        
        {showEdit && onEdit && canEdit && (
          <Tooltip title="עריכה">
            <IconButton size="small" onClick={onEdit} color="primary">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        
        {showDelete && onDelete && canDelete && (
          <Tooltip title="מחיקה">
            <IconButton size="small" onClick={onDelete} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        
        {showCreate && onCreate && canCreate && (
          <Tooltip title="הוספה">
            <IconButton size="small" onClick={onCreate} color="success">
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {showView && onView && (
        <Button
          variant={variant}
          size={size}
          startIcon={<ViewIcon />}
          onClick={onView}
          color="primary"
        >
          צפייה
        </Button>
      )}
      
      {showEdit && onEdit && canEdit && (
        <Button
          variant={variant}
          size={size}
          startIcon={<EditIcon />}
          onClick={onEdit}
          color="primary"
        >
          עריכה
        </Button>
      )}
      
      {showDelete && onDelete && canDelete && (
        <Button
          variant={variant}
          size={size}
          startIcon={<DeleteIcon />}
          onClick={onDelete}
          color="error"
        >
          מחיקה
        </Button>
      )}
      
      {showCreate && onCreate && canCreate && (
        <Button
          variant={variant}
          size={size}
          startIcon={<AddIcon />}
          onClick={onCreate}
          color="success"
        >
          הוספה
        </Button>
      )}
    </Box>
  );
};

export default ActionButtons; 