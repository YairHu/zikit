import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Avatar,
  Chip,
  Tab,
  Tabs,
  Alert
} from '@mui/material';
import {
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  EventNote as EventNoteIcon,
  Star as StarIcon,
  Email as EmailIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getRoleDisplayName } from '../models/UserRole';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

interface SoldierData {
  fullName?: string;
  personalNumber?: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  medicalProfile?: string;
  militaryBackground?: string;
  additionalInfo?: string;
  formSubmittedAt?: any;
}

const PersonalProfile: React.FC = () => {
  const { user } = useUser();
  const [tabValue, setTabValue] = useState(0);
  const [soldierData, setSoldierData] = useState<SoldierData | null>(null);
  const [loadingSoldierData, setLoadingSoldierData] = useState(false);
  const [missions, setMissions] = useState<any[]>([]);
  const [duties, setDuties] = useState<any[]>([]);

  const loadSoldierData = useCallback(async () => {
    if (!user?.soldierDocId) return;
    
    try {
      setLoadingSoldierData(true);
      const soldierRef = doc(db, 'soldiers', user.soldierDocId);
      const soldierDoc = await getDoc(soldierRef);
      
      if (soldierDoc.exists()) {
        setSoldierData(soldierDoc.data() as SoldierData);
      }
    } catch (error) {
      console.error('שגיאה בטעינת נתוני החייל:', error);
    } finally {
      setLoadingSoldierData(false);
    }
  }, [user?.soldierDocId]);

  const loadUserActivities = useCallback(async () => {
    if (!user) return;
    
    // כאן נטען משימות ותורנויות מה-DB
    // לעת עתה - דמה
    setMissions([
      { id: 1, name: 'אימון צוות 10', date: '2024-01-15', status: 'הושלמה' },
      { id: 2, name: 'משימת שמירה', date: '2024-01-20', status: 'פעילה' },
      { id: 3, name: 'תחזוקת רכבים', date: '2024-01-25', status: 'מתוכננת' }
    ]);
    
    setDuties([
      { id: 1, type: 'שמירה', date: '2024-01-10', shift: 'לילה' },
      { id: 2, type: 'מטבח', date: '2024-01-18', shift: 'בוקר' },
      { id: 3, type: 'ניקיון', date: '2024-01-22', shift: 'צהריים' }
    ]);
  }, [user]);

  useEffect(() => {
    loadUserActivities();
    loadSoldierData();
  }, [loadUserActivities, loadSoldierData]);

  if (!user) {
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
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 60, height: 60 }}>
          <PersonIcon sx={{ fontSize: 30 }} />
        </Avatar>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {user.displayName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip 
              label={getRoleDisplayName(user.role)}
              color="primary"
              size="small"
            />
            {user.team && (
              <Chip 
                label={`צוות ${user.team}`}
                variant="outlined"
                size="small"
              />
            )}
            {user.pelaga && (
              <Chip 
                label={`פלגה ${user.pelaga}`}
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="פרטים אישיים" icon={<PersonIcon />} />
          <Tab label="משימות" icon={<AssignmentIcon />} />
          <Tab label="תורנויות" icon={<EventNoteIcon />} />
          <Tab label="כשירויות" icon={<StarIcon />} />
        </Tabs>
      </Card>

      {/* Tab 1: פרטים אישיים */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 3
        }}>
          {/* פרטים בסיסיים */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                פרטים אישיים
              </Typography>
              <Box sx={{ space: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>{user.email}</Typography>
                </Box>
                {user.personalNumber && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>
                      מס' אישי:
                    </Typography>
                    <Typography>{user.personalNumber}</Typography>
                  </Box>
                )}
                {user.rank && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <StarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>{user.rank}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* מבנה ארגוני */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <HomeIcon sx={{ mr: 1 }} />
                מבנה ארגוני
              </Typography>
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    תפקיד:
                  </Typography>
                  <Typography>{getRoleDisplayName(user.role)}</Typography>
                </Box>
                {user.team && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      צוות:
                    </Typography>
                    <Typography>{user.team}</Typography>
                  </Box>
                )}
                {user.pelaga && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      פלגה:
                    </Typography>
                    <Typography>{user.pelaga}</Typography>
                  </Box>
                )}
                {user.unit && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      יחידה:
                    </Typography>
                    <Typography>{user.unit}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* מידע רגיש - רק למ"פ או למשתמש עצמו */}
        <Box sx={{ mt: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                פרטים נוספים מטופס הקליטה
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                {soldierData?.phone && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      טלפון:
                    </Typography>
                    <Typography>{soldierData.phone}</Typography>
                  </Box>
                )}
                {soldierData?.birthDate && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      תאריך לידה:
                    </Typography>
                    <Typography>{soldierData.birthDate}</Typography>
                  </Box>
                )}
                {soldierData?.address && (
                  <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      כתובת:
                    </Typography>
                    <Typography>{soldierData.address}</Typography>
                  </Box>
                )}
                
                {soldierData?.additionalInfo && (
                  <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      מידע נוסף:
                    </Typography>
                    <Typography>{soldierData.additionalInfo}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>

      {/* Tab 2: משימות */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          המשימות שלי
        </Typography>
        {missions.length > 0 ? (
          <Box sx={{ space: 2 }}>
            {missions.map((mission) => (
              <Card key={mission.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6">{mission.name}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        תאריך: {mission.date}
                      </Typography>
                    </Box>
                    <Chip 
                      label={mission.status}
                      color={mission.status === 'הושלמה' ? 'success' : 'primary'}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            אין משימות פעילות
          </Typography>
        )}
      </TabPanel>

      {/* Tab 3: תורנויות */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          התורנויות שלי
        </Typography>
        {duties.length > 0 ? (
          <Box sx={{ space: 2 }}>
            {duties.map((duty) => (
              <Card key={duty.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6">{duty.type}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        תאריך: {duty.date} | משמרת: {duty.shift}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            אין תורנויות מתוכננות
          </Typography>
        )}
      </TabPanel>

      {/* Tab 4: כשירויות */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          כשירויות והסמכות
        </Typography>
        <Alert severity="info">
          מעקב כשירויות, ציונים וגרפים יתווספו בהמשך פיתוח המערכת
        </Alert>
      </TabPanel>
    </Container>
  );
};

export default PersonalProfile; 