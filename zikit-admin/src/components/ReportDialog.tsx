import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Box,
  Chip,
  Typography
} from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';
import { getPresenceColor } from '../utils/colors';
import { formatToIsraelString } from '../utils/dateUtils';
import { 
  getAllStatuses, 
  requiresAbsenceDate, 
  requiresCustomText,
  getStatusLabel,
  mapStatusForReport
} from '../utils/presenceStatus';

interface ReportSoldier {
  id: string;
  name: string;
  role: string;
  personalNumber: string;
  frameworkName: string;
  presence: string;
  presenceOther?: string;
  absenceUntil?: string;
  editedPresence: string;
  otherText: string;
}

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  frameworkName: string;
  reportData: ReportSoldier[];
  onUpdateReportPresence: (soldierId: string, newPresence: string) => void;
  onUpdateReportOtherText: (soldierId: string, otherText: string) => void;
}

const ReportDialog: React.FC<ReportDialogProps> = ({
  open,
  onClose,
  frameworkName,
  reportData,
  onUpdateReportPresence,
  onUpdateReportOtherText
}) => {
  const handlePrintReport = () => {
    const reportText = reportData.map(soldier => {
      let status;
      if (soldier.editedPresence === 'אחר' && soldier.otherText) {
        status = soldier.otherText;
      } else if (requiresCustomText(soldier.editedPresence as any) && soldier.otherText) {
        status = `${soldier.editedPresence} - ${soldier.otherText}`;
      } else {
        status = mapStatusForReport(soldier.editedPresence as any);
      }
      return `${soldier.name} - ${soldier.role} - ${soldier.personalNumber} - ${soldier.frameworkName} - ${status}`;
    }).join('\n');
    
    alert(`דוח 1 - סטטוס נוכחות חיילים במסגרת ${frameworkName}:\n\n${reportText}`);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 1, sm: 2 },
          width: { xs: 'calc(100% - 16px)', sm: 'auto' }
        }
      }}
    >
      <DialogTitle sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
        דוח 1 - סטטוס נוכחות חיילים במסגרת {frameworkName}
      </DialogTitle>
      <DialogContent sx={{ padding: { xs: 1, sm: 2 } }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, padding: { xs: '8px 4px', sm: '16px' } }}>שם</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, padding: { xs: '8px 4px', sm: '16px' } }}>תפקיד</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, padding: { xs: '8px 4px', sm: '16px' } }}>מספר אישי</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, padding: { xs: '8px 4px', sm: '16px' } }}>מסגרת</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, padding: { xs: '8px 4px', sm: '16px' } }}>סטטוס נוכחות</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, padding: { xs: '8px 4px', sm: '16px' } }}>עריכת דוח</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.map((soldier) => (
                <TableRow key={soldier.id}>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, padding: { xs: '8px 4px', sm: '16px' } }}>
                    {soldier.name}
                  </TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, padding: { xs: '8px 4px', sm: '16px' } }}>
                    {soldier.role}
                  </TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, padding: { xs: '8px 4px', sm: '16px' } }}>
                    {soldier.personalNumber}
                  </TableCell>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, padding: { xs: '8px 4px', sm: '16px' } }}>
                    {soldier.frameworkName}
                  </TableCell>
                  <TableCell sx={{ padding: { xs: '8px 4px', sm: '16px' } }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Chip 
                        label={soldier.presence === 'אחר' && soldier.presenceOther ? `${soldier.presence} - ${soldier.presenceOther}` : soldier.presence} 
                        sx={{ 
                          bgcolor: getPresenceColor(soldier.presence),
                          color: 'white',
                          fontSize: { xs: '0.7rem', sm: '0.75rem' }
                        }}
                        size="small"
                      />
                      {requiresAbsenceDate(soldier.presence as any) && soldier.absenceUntil && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                          {`עד ${formatToIsraelString(soldier.absenceUntil, { year: 'numeric', month: '2-digit', day: '2-digit' })}`}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ padding: { xs: '8px 4px', sm: '16px' } }}>
                    <FormControl size="small" sx={{ minWidth: { xs: 80, sm: 120 } }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <FormControl size="small" sx={{ minWidth: { xs: 80, sm: 120 } }}>
                          <Select
                            value={soldier.editedPresence}
                            onChange={(e) => onUpdateReportPresence(soldier.id, e.target.value)}
                            size="small"
                            sx={{
                              '& .MuiSelect-select': {
                                fontSize: { xs: '0.7rem', sm: '0.875rem' }
                              }
                            }}
                          >
                            {getAllStatuses().map((status) => (
                              <MenuItem key={status} value={status} sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                {getStatusLabel(status)}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        {requiresCustomText(soldier.editedPresence as any) && (
                          <TextField
                            size="small"
                            placeholder="הזן טקסט חופשי"
                            value={soldier.otherText || ''}
                            onChange={(e) => onUpdateReportOtherText(soldier.id, e.target.value)}
                            sx={{ 
                              minWidth: { xs: 80, sm: 200 },
                              '& .MuiInputBase-input': {
                                fontSize: { xs: '0.7rem', sm: '0.875rem' }
                              }
                            }}
                          />
                        )}
                      </Box>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ padding: { xs: 1, sm: 2 } }}>
        <Button onClick={onClose} size="small">
          ביטול
        </Button>
        <Button onClick={handlePrintReport} variant="contained" startIcon={<PrintIcon />} size="small">
          הפק דוח
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportDialog;
