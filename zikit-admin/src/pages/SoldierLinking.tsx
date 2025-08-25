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
  Box,
  Avatar,
  Chip,
  Alert,
  TextField,
  Autocomplete,
} from '@mui/material';
import {
  Link as LinkIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { formatToIsraelString } from '../utils/dateUtils';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface UnlinkedSoldier {
  id: string;
  email: string;
  fullName: string;
  personalNumber: string;
  phone: string;
  formSubmittedAt: any;
  status: string;
  userUid?: string;
}

interface UnlinkedUser {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  soldierDocId?: string;
}

const SoldierLinking: React.FC = () => {
  const { user } = useUser();
  const [unlinkedSoldiers, setUnlinkedSoldiers] = useState<UnlinkedSoldier[]>([]);
  const [unlinkedUsers, setUnlinkedUsers] = useState<UnlinkedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState<UnlinkedSoldier | null>(null);
  const [selectedUser, setSelectedUser] = useState<UnlinkedUser | null>(null);

  const loadUnlinkedData = useCallback(async () => {
    try {
      setLoading(true);
      
      // טעינת חיילים ללא קישור למשתמש
      const soldiersQuery = query(
        collection(db, 'soldiers'),
        where('userUid', '==', null)
      );
      const soldiersSnapshot = await getDocs(soldiersQuery);
      const soldiers: UnlinkedSoldier[] = [];
      soldiersSnapshot.forEach((doc) => {
        soldiers.push({ id: doc.id, ...doc.data() } as UnlinkedSoldier);
      });

      // טעינת משתמשים ללא קישור לחייל
      const usersQuery = query(
        collection(db, 'users'),
        where('soldierDocId', '==', null)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const users: UnlinkedUser[] = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data() as UnlinkedUser;
                 if (userData.role !== 'admin') { // לא להציג אדמינים
           users.push({ ...userData, uid: doc.id });
         }
      });

      setUnlinkedSoldiers(soldiers);
      setUnlinkedUsers(users);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnlinkedData();
  }, [loadUnlinkedData]);

  const handleOpenLinkDialog = (soldier: UnlinkedSoldier) => {
    setSelectedSoldier(soldier);
    // נסה למצוא משתמש באותו אימייל
    const matchingUser = unlinkedUsers.find(u => u.email === soldier.email);
    setSelectedUser(matchingUser || null);
    setLinkDialogOpen(true);
  };

  const handleLinkSoldierToUser = async () => {
    if (!selectedSoldier || !selectedUser) return;

    try {
      // עדכון רשומת החייל
      const soldierRef = doc(db, 'soldiers', selectedSoldier.id);
      await updateDoc(soldierRef, {
        userUid: selectedUser.uid,
        linkedAt: Timestamp.now(),
        linkedBy: user?.uid,
        updatedAt: Timestamp.now()
      });

      // עדכון רשומת המשתמש
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, {
        soldierDocId: selectedSoldier.id,
        personalNumber: selectedSoldier.personalNumber,
        linkedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      setLinkDialogOpen(false);
      loadUnlinkedData();
      
      alert('הקישור בוצע בהצלחה!');
    } catch (error) {
      alert('שגיאה בקישור: ' + error);
    }
  };

  const handleAutoLink = async () => {
    try {
      let linkedCount = 0;
      
      for (const soldier of unlinkedSoldiers) {
        const matchingUser = unlinkedUsers.find(u => u.email === soldier.email);
        if (matchingUser) {
          // עדכון רשומת החייל
          const soldierRef = doc(db, 'soldiers', soldier.id);
          await updateDoc(soldierRef, {
            userUid: matchingUser.uid,
            linkedAt: Timestamp.now(),
            linkedBy: user?.uid,
            autoLinked: true,
            updatedAt: Timestamp.now()
          });

          // עדכון רשומת המשתמש
          const userRef = doc(db, 'users', matchingUser.uid);
          await updateDoc(userRef, {
            soldierDocId: soldier.id,
            personalNumber: soldier.personalNumber,
            linkedAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });

          linkedCount++;
        }
      }

      loadUnlinkedData();
      alert(`${linkedCount} קישורים בוצעו אוטומטית!`);
    } catch (error) {
      alert('שגיאה בקישור אוטומטי: ' + error);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'לא זמין';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return formatToIsraelString(date, { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getEmailMatch = (soldierEmail: string) => {
    return unlinkedUsers.find(u => u.email === soldierEmail);
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
          <LinkIcon />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            קישור חיילים למשתמשים
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {unlinkedSoldiers.length} חיילים מטפסים, {unlinkedUsers.length} משתמשים לא מקושרים
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleAutoLink}
          disabled={unlinkedSoldiers.length === 0}
          sx={{ ml: 2 }}
        >
          קישור אוטומטי
        </Button>
      </Box>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>מטרה:</strong> קשר בין חיילים שמילאו טופס Google Forms לבין המשתמשים שהתחברו למערכת. 
          לאחר הקישור, החייל יוכל לראות את הפרטים האישיים שלו בתיק האישי.
        </Typography>
      </Alert>

      {/* Auto-link suggestions */}
      {unlinkedSoldiers.some(s => getEmailMatch(s.email)) && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>נמצאו {unlinkedSoldiers.filter(s => getEmailMatch(s.email)).length} התאמות אוטומטיות!</strong> 
            לחץ על "קישור אוטומטי" לקשר את כולם במהירות.
          </Typography>
        </Alert>
      )}

      {/* Grid Layout */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
        gap: 3 
      }}>
        {/* חיילים מטפסים */}
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            חיילים מטפסי Google Forms ({unlinkedSoldiers.length})
          </Typography>
          
          {unlinkedSoldiers.map((soldier) => {
            const emailMatch = getEmailMatch(soldier.email);
            return (
              <Card key={soldier.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {soldier.fullName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">{soldier.email}</Typography>
                        {emailMatch && (
                          <Chip 
                            icon={<CheckCircleIcon />}
                            label="התאמה אוטומטית"
                            color="success"
                            size="small"
                          />
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                        טופס הוגש: {formatDate(soldier.formSubmittedAt)}
                      </Typography>
                      {soldier.personalNumber && (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          מס' אישי: {soldier.personalNumber}
                        </Typography>
                      )}
                    </Box>
                    
                    <Button
                      variant={emailMatch ? "contained" : "outlined"}
                      size="small"
                      startIcon={<LinkIcon />}
                      onClick={() => handleOpenLinkDialog(soldier)}
                      color={emailMatch ? "success" : "primary"}
                    >
                      {emailMatch ? "קישור מהיר" : "קשר ידנית"}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
          
          {unlinkedSoldiers.length === 0 && (
            <Alert severity="success">
              כל החיילים מהטפסים כבר מקושרים למשתמשים!
            </Alert>
          )}
        </Box>

        {/* משתמשים רשומים */}
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            משתמשים לא מקושרים ({unlinkedUsers.length})
          </Typography>
          
          {unlinkedUsers.map((user) => (
            <Card key={user.uid} sx={{ mb: 2, opacity: getEmailMatch(user.email) ? 0.7 : 1 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {user.displayName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">{user.email}</Typography>
                </Box>
                <Chip 
                  label={user.role}
                  size="small"
                  variant="outlined"
                />
                {getEmailMatch(user.email) && (
                  <Box sx={{ mt: 1 }}>
                    <Chip 
                      icon={<WarningIcon />}
                      label="יקושר אוטומטית"
                      color="warning"
                      size="small"
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
          
          {unlinkedUsers.length === 0 && (
            <Alert severity="info">
              כל המשתמשים כבר מקושרים לחיילים!
            </Alert>
          )}
        </Box>
      </Box>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          קישור חייל למשתמש
        </DialogTitle>
        <DialogContent>
          {selectedSoldier && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                חייל מטופס:
              </Typography>
              <Typography variant="body2">
                <strong>שם:</strong> {selectedSoldier.fullName}<br />
                <strong>אימייל:</strong> {selectedSoldier.email}<br />
                <strong>מס' אישי:</strong> {selectedSoldier.personalNumber || 'לא זמין'}
              </Typography>
            </Box>
          )}
          
          <Autocomplete
            options={unlinkedUsers}
            getOptionLabel={(option) => `${option.displayName} (${option.email})`}
            value={selectedUser}
            onChange={(_, newValue) => setSelectedUser(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="בחר משתמש לקישור"
                fullWidth
              />
            )}
            isOptionEqualToValue={(option, value) => option.uid === value.uid}
          />
          
          {selectedUser && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                משתמש נבחר:
              </Typography>
              <Typography variant="body2">
                {selectedUser.displayName} ({selectedUser.email})
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialogOpen(false)}>ביטול</Button>
          <Button 
            onClick={handleLinkSoldierToUser} 
            variant="contained"
            disabled={!selectedUser}
          >
            קשר חייל למשתמש
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SoldierLinking; 