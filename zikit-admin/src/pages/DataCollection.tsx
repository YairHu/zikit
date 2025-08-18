import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { getPendingData, linkDataManually, PendingData } from '../services/dataLinkingService';



const DataCollection: React.FC = () => {
  const { user } = useUser();
  const [pendingData, setPendingData] = useState<PendingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<PendingData | null>(null);
  const [linkEmail, setLinkEmail] = useState('');

  useEffect(() => {
    loadPendingData();
  }, []);

  const loadPendingData = async () => {
    try {
      setLoading(true);
      const data = await getPendingData();
      setPendingData(data);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים ממתינים:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualLink = (data: PendingData) => {
    setSelectedData(data);
    setLinkEmail(data.email);
    setLinkDialogOpen(true);
  };

  const handleLinkData = async () => {
    if (!selectedData || !linkEmail) return;

    try {
      await linkDataManually(selectedData.type, selectedData.id, linkEmail);
      alert('הנתונים קושרו בהצלחה!');
      setLinkDialogOpen(false);
      loadPendingData();
    } catch (error) {
      console.error('שגיאה בקישור נתונים:', error);
      alert(error instanceof Error ? error.message : 'שגיאה בקישור הנתונים');
    }
  };

  const getStatusColor = (status: string, type: string) => {
    if (type === 'form_data') {
      switch (status) {
        case 'pending_assignment': return 'warning';
        case 'pending_user_link': return 'info';
        default: return 'default';
      }
    } else {
      return 'info';
    }
  };

  const getStatusText = (status: string, type: string) => {
    if (type === 'form_data') {
      switch (status) {
        case 'pending_assignment': return 'ממתין לשיבוץ';
        case 'pending_user_link': return 'ממתין לקישור משתמש';
        default: return status;
      }
    } else {
      return 'ממתין לקישור נתונים';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'לא זמין';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('he-IL');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>טוען נתונים...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
          <PersonIcon />
        </Avatar>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            קליטת נתונים
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            קישור אוטומטי בין משתמשים לנתוני טופס גוגל
          </Typography>
        </Box>
      </Box>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>הוראות:</strong> המערכת מנסה לקשר אוטומטית בין משתמשים שנרשמו לנתונים שהוגשו בטופס גוגל. 
          אם הקישור האוטומטי נכשל, ניתן לקשר ידנית.
        </Typography>
      </Alert>

      {/* Statistics */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Chip 
          icon={<InfoIcon />}
          label={`${pendingData.filter(d => d.type === 'form_data').length} נתוני טופס ממתינים`}
          color="info"
          variant="outlined"
        />
        <Chip 
          icon={<InfoIcon />}
          label={`${pendingData.filter(d => d.type === 'user_data').length} משתמשים ממתינים`}
          color="warning"
          variant="outlined"
        />
      </Box>

      {/* Data List */}
      <Box sx={{ mb: 4 }}>
        {pendingData.map((data) => (
          <Card key={`${data.type}-${data.id}`} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {data.fullName}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip 
                      label={getStatusText(data.status, data.type)}
                      color={getStatusColor(data.status, data.type) as any}
                      size="small"
                    />
                    <Chip 
                      label={data.type === 'form_data' ? 'נתוני טופס' : 'משתמש'}
                      variant="outlined"
                      size="small"
                    />
                    <Chip 
                      label={`הוגש: ${formatDate(data.formSubmittedAt)}`}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <EmailIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2">{data.email}</Typography>
                    </Box>
                    {data.personalNumber && (
                      <Typography variant="body2">
                        מס' אישי: {data.personalNumber}
                      </Typography>
                    )}
                  </Box>
                </Box>
                
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleManualLink(data)}
                >
                  קשר ידנית
                </Button>
              </Box>

              {data.type === 'form_data' && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    פרטים נוספים:
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {data.phone && (
                      <Typography variant="body2">
                        <strong>טלפון:</strong> {data.phone}
                      </Typography>
                    )}
                    {data.birthDate && (
                      <Typography variant="body2">
                        <strong>תאריך לידה:</strong> {data.birthDate}
                      </Typography>
                    )}
                                         {data.address && (
                       <Typography variant="body2">
                         <strong>כתובת:</strong> {data.address}
                       </Typography>
                     )}
                     {data.militaryBackground && (
                       <Typography variant="body2">
                         <strong>רקע צבאי:</strong> {data.militaryBackground}
                       </Typography>
                     )}
                     {data.medicalProfile && (
                       <Typography variant="body2">
                         <strong>פרופיל רפואי:</strong> {data.medicalProfile}
                       </Typography>
                     )}
                    {data.additionalInfo && (
                      <Typography variant="body2">
                        <strong>מידע נוסף:</strong> {data.additionalInfo}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {pendingData.length === 0 && (
        <Alert severity="success">
          <Typography variant="body2">
            אין נתונים ממתינים לקישור. כל הנתונים קושרו בהצלחה!
          </Typography>
        </Alert>
      )}

      {/* Manual Link Dialog */}
      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          קישור ידני - {selectedData?.fullName}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {selectedData?.type === 'form_data' 
              ? 'הזן את כתובת האימייל של המשתמש שתרצה לקשר לנתונים אלו:'
              : 'הזן את כתובת האימייל של נתוני הטופס שתרצה לקשר למשתמש זה:'
            }
          </Typography>
          <TextField
            fullWidth
            label="כתובת אימייל"
            value={linkEmail}
            onChange={(e) => setLinkEmail(e.target.value)}
            type="email"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleLinkData} variant="contained">
            קשר נתונים
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DataCollection; 