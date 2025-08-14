import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Avatar,
  Chip,
  Alert,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField
} from '@mui/material';
import {
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  MedicalServices as MedicalIcon,
  School as SchoolIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { UserRole, getRoleDisplayName } from '../models/UserRole';
import { assignRole, assignToTeam } from '../services/userService';
import { getAllFrameworks } from '../services/frameworkService';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface PendingSoldier {
  id: string;
  email: string;
  fullName: string;
  personalNumber: string;
  phone: string;
  birthDate: string;
  address: string;
  medicalProfile: string;
  militaryBackground: string;
  additionalInfo: string;
  formSubmittedAt: any;
  status: string;
  userUid?: string;
}

const PendingSoldiers: React.FC = () => {
  const { user } = useUser();
  const [pendingSoldiers, setPendingSoldiers] = useState<PendingSoldier[]>([]);
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState<PendingSoldier | null>(null);
  
  // Assignment form state
  const [assignmentData, setAssignmentData] = useState({
    role: UserRole.CHAYAL,
    team: '',
    pelaga: 'A',
    frameworkId: '',
    personalNumber: ''
  });

  const loadPendingSoldiers = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'soldiers'),
        where('status', 'in', ['pending_assignment', 'assigned'])
      );
      
      const querySnapshot = await getDocs(q);
      const soldiers: PendingSoldier[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // רק חיילים שיש להם userUid (כלומר קושרו למשתמש)
        if (data.userUid) {
          soldiers.push({
            id: doc.id,
            ...data
          } as PendingSoldier);
        }
      });
      
      // מיון לפי תאריך הגשת הטופס
      soldiers.sort((a, b) => {
        const aTime = a.formSubmittedAt?.seconds || 0;
        const bTime = b.formSubmittedAt?.seconds || 0;
        return bTime - aTime;
      });
      
      setPendingSoldiers(soldiers);
    } catch (error) {
      console.error('שגיאה בטעינת חיילים ממתינים:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        loadPendingSoldiers(),
        loadFrameworks()
      ]);
    };
    loadData();
  }, [loadPendingSoldiers]);

  const loadFrameworks = async () => {
    try {
      const frameworksData = await getAllFrameworks();
      setFrameworks(frameworksData);
    } catch (error) {
      console.error('שגיאה בטעינת מסגרות:', error);
    }
  };

  const handleOpenAssignDialog = (soldier: PendingSoldier) => {
    setSelectedSoldier(soldier);
    setAssignmentData({
      role: UserRole.CHAYAL,
      team: '',
      pelaga: 'A',
      frameworkId: '',
      personalNumber: soldier.personalNumber || ''
    });
    setAssignDialogOpen(true);
  };

  const handleAssignSoldier = async () => {
    if (!selectedSoldier || !user) return;

    // בדיקה שהמסגרת נבחרה
    if (!assignmentData.frameworkId) {
      alert('יש לבחור מסגרת לשיבוץ');
      return;
    }

    // בדיקה שהמספר האישי מלא
    if (!assignmentData.personalNumber) {
      alert('יש למלא מספר אישי');
      return;
    }

    try {
      // לוג לפני העדכון
      console.log('=== לפני שיבוץ לצוות ===');
      console.log('SelectedSoldier data:', selectedSoldier);
      console.log('AssignmentData:', assignmentData);
      
      // עדכון רשומת החייל - רק השדות הרלוונטיים לשיבוץ
      const soldierRef = doc(db, 'soldiers', selectedSoldier.id);
      const updateData = {
        role: assignmentData.role,
        team: assignmentData.team || null,
        pelaga: assignmentData.pelaga,
        frameworkId: assignmentData.frameworkId || null,
        status: 'assigned',
        assignedBy: user.uid,
        assignedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      console.log('Update data:', updateData);
      await updateDoc(soldierRef, updateData);
      
      // לוג אחרי העדכון
      console.log('=== אחרי שיבוץ לצוות ===');
      const updatedDoc = await getDoc(soldierRef);
      console.log('Updated soldier data:', updatedDoc.data());

      // אם יש משתמש מקושר - עדכן גם אותו
      if (selectedSoldier.userUid) {
        await assignRole(selectedSoldier.userUid, assignmentData.role, user.uid);
        if (assignmentData.team) {
          await assignToTeam(selectedSoldier.userUid, assignmentData.team, assignmentData.pelaga, user.uid);
        }
      }

      setAssignDialogOpen(false);
      alert('החייל שובץ בהצלחה!');
      loadPendingSoldiers();
    } catch (error) {
      console.error('שגיאה בשיבוץ החייל:', error);
      alert('שגיאה בשיבוץ החייל: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleRejectSoldier = async (soldier: PendingSoldier) => {
    try {
      const soldierRef = doc(db, 'soldiers', soldier.id);
      await updateDoc(soldierRef, {
        status: 'rejected',
        rejectedBy: user?.uid,
        rejectedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      loadPendingSoldiers();
    } catch (error) {
      alert('שגיאה בדחיית החייל: ' + error);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'לא זמין';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('he-IL');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_assignment': return 'warning';
      case 'assigned': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_assignment': return 'ממתין לשיבוץ';
      case 'assigned': return 'שובץ';
      case 'rejected': return 'נדחה';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, textAlign: 'center' }}>
        <Typography>טוען...</Typography>
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
            חיילים ממתינים לשיבוץ
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {pendingSoldiers.filter(s => s.status === 'pending_assignment').length} ממתינים, {pendingSoldiers.filter(s => s.status === 'assigned').length} שובצו
          </Typography>
        </Box>
      </Box>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>הוראות:</strong> חיילים אלו מילאו את טופס ההצטרפות וקושרו למשתמשים במערכת. לאחר בדיקת הפרטים, שבץ אותם לתפקיד וצוות מתאים.
        </Typography>
      </Alert>

      {/* Soldiers List */}
      <Box sx={{ mb: 4 }}>
        {pendingSoldiers.map((soldier) => (
          <Card key={soldier.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {soldier.fullName}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip 
                      label={getStatusText(soldier.status)}
                      color={getStatusColor(soldier.status) as any}
                      size="small"
                    />
                    <Chip 
                      label={`הוגש: ${formatDate(soldier.formSubmittedAt)}`}
                      variant="outlined"
                      size="small"
                    />
                    {soldier.personalNumber && (
                      <Chip 
                        label={`מס' אישי: ${soldier.personalNumber}`}
                        variant="outlined"
                        size="small"
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <EmailIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2">{soldier.email}</Typography>
                    </Box>
                    {soldier.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2">{soldier.phone}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {soldier.status === 'pending_assignment' && (
                    <>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<CheckIcon />}
                        onClick={() => handleOpenAssignDialog(soldier)}
                        color="primary"
                      >
                        שבץ
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRejectSoldier(soldier)}
                      >
                        <CloseIcon />
                      </IconButton>
                    </>
                  )}
                  {soldier.status === 'assigned' && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AssignmentIcon />}
                      onClick={() => handleOpenAssignDialog(soldier)}
                    >
                      ערוך שיבוץ
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Soldier Details */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">פרטים אישיים</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
                    gap: 3 
                  }}>
                    {/* Personal Info */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        מידע אישי
                      </Typography>
                      {soldier.birthDate && (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>תאריך לידה:</strong> {soldier.birthDate}
                        </Typography>
                      )}
                      {soldier.address && (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>כתובת:</strong> {soldier.address}
                        </Typography>
                      )}

                    </Box>

                    {/* Background */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        רקע ומיומנויות
                      </Typography>

                      {soldier.militaryBackground && (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>רקע צבאי:</strong> {soldier.militaryBackground}
                        </Typography>
                      )}
                      {soldier.medicalProfile && (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>פרופיל רפואי:</strong> {soldier.medicalProfile}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Additional Info */}
                  {soldier.additionalInfo && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        מידע נוסף
                      </Typography>
                      {soldier.additionalInfo && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>מידע נוסף:</strong> {soldier.additionalInfo}
                        </Typography>
                      )}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </Box>

      {pendingSoldiers.length === 0 && (
        <Alert severity="info">
          אין חיילים ממתינים לשיבוץ כרגע
        </Alert>
      )}

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          שיבוץ חייל: {selectedSoldier?.fullName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
            gap: 2, 
            mt: 1 
          }}>
            <TextField
              fullWidth
              label="מספר אישי"
              value={assignmentData.personalNumber}
              onChange={(e) => setAssignmentData({ ...assignmentData, personalNumber: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>תפקיד</InputLabel>
              <Select
                value={assignmentData.role}
                onChange={(e) => setAssignmentData({ ...assignmentData, role: e.target.value as UserRole })}
                label="תפקיד"
              >
                {Object.values(UserRole).map((role) => (
                  <MenuItem key={role} value={role}>
                    {getRoleDisplayName(role)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>פלגה</InputLabel>
              <Select
                value={assignmentData.pelaga}
                onChange={(e) => setAssignmentData({ ...assignmentData, pelaga: e.target.value })}
                label="פלגה"
              >
                <MenuItem value="A">פלגה א</MenuItem>
                <MenuItem value="B">פלגה ב</MenuItem>
                <MenuItem value="C">פלגה ג</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>מסגרת</InputLabel>
              <Select
                value={assignmentData.frameworkId}
                onChange={(e) => setAssignmentData({ ...assignmentData, frameworkId: e.target.value })}
                label="מסגרת"
              >
                <MenuItem value="">בחר מסגרת</MenuItem>
                {frameworks.map((framework) => (
                  <MenuItem key={framework.id} value={framework.id}>
                    {framework.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="צוות (אופציונלי)"
              value={assignmentData.team}
              onChange={(e) => setAssignmentData({ ...assignmentData, team: e.target.value })}
              placeholder="10, 20, 30..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleAssignSoldier} variant="contained">
            שבץ חייל
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PendingSoldiers; 