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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Avatar,
  Chip,
  Alert,
  Fab,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  ExpandMore as ExpandMoreIcon,
  Star as StarIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useUser } from '../contexts/UserContext';
import { User } from '../models/User';
import { UserRole, getRoleDisplayName } from '../models/UserRole';
import { getAllUsers, getUsersByTeam, assignToTeam } from '../services/userService';

interface Team {
  id: string;
  name: string;
  plagaId: string;
  commanderUid?: string;
  samalUid?: string;
  squadLeaders: string[];
  soldiers: string[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const Teams: React.FC = () => {
  const { user } = useUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs state
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedSoldier, setSelectedSoldier] = useState<User | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    plagaId: 'A',
    description: '',
    commanderUid: '',
    samalUid: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allUsers, /* teams will come from API */] = await Promise.all([
        getAllUsers(),
        // TODO: implement getTeams from API
      ]);
      
      setUsers(allUsers);
      
      // Demo teams data - נתחיל עם דאטה לדוגמה
      const demoTeams: Team[] = [
        {
          id: '10',
          name: 'צוות 10',
          plagaId: 'A',
          commanderUid: allUsers.find(u => u.role === UserRole.MEFAKED_TZEVET)?.uid,
          samalUid: allUsers.find(u => u.role === UserRole.SAMAL)?.uid,
          squadLeaders: allUsers.filter(u => u.role === UserRole.MEFAKED_CHAYAL).slice(0, 2).map(u => u.uid),
          soldiers: allUsers.filter(u => u.role === UserRole.CHAYAL).slice(0, 8).map(u => u.uid),
          description: 'צוות לוחם ראשי',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '20',
          name: 'צוות 20',
          plagaId: 'A',
          commanderUid: allUsers.find(u => u.role === UserRole.MEFAKED_TZEVET && u.team === '20')?.uid,
          squadLeaders: allUsers.filter(u => u.role === UserRole.MEFAKED_CHAYAL).slice(2, 4).map(u => u.uid),
          soldiers: allUsers.filter(u => u.role === UserRole.CHAYAL).slice(8, 16).map(u => u.uid),
          description: 'צוות תמיכה',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      setTeams(demoTeams);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTeam = () => {
    setSelectedTeam(null);
    setFormData({
      name: '',
      plagaId: 'A',
      description: '',
      commanderUid: '',
      samalUid: ''
    });
    setTeamDialogOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      plagaId: team.plagaId,
      description: team.description || '',
      commanderUid: team.commanderUid || '',
      samalUid: team.samalUid || ''
    });
    setTeamDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    try {
      // TODO: implement API call to save team
      console.log('Saving team:', formData);
      setTeamDialogOpen(false);
      loadData();
    } catch (error) {
      alert('שגיאה בשמירת הצוות: ' + error);
    }
  };

  const handleAssignSoldier = (team: Team, soldier: User) => {
    setSelectedTeam(team);
    setSelectedSoldier(soldier);
    setAssignDialogOpen(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedTeam || !selectedSoldier) return;
    
    try {
      await assignToTeam(selectedSoldier.uid, selectedTeam.id, selectedTeam.plagaId);
      setAssignDialogOpen(false);
      loadData();
    } catch (error) {
      alert('שגיאה בשיבוץ החייל: ' + error);
    }
  };

  const getUserByUid = (uid: string): User | undefined => {
    return users.find(u => u.uid === uid);
  };

  const getAvailableSoldiers = (): User[] => {
    const assignedSoldiers = teams.flatMap(team => [
      team.commanderUid,
      team.samalUid,
      ...team.squadLeaders,
      ...team.soldiers
    ].filter(Boolean));
    
    return users.filter(user => 
      !assignedSoldiers.includes(user.uid) && 
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MEFAKED_PLUGA
    );
  };

  const getCommanderCandidates = (): User[] => {
    return users.filter(user => 
      user.role === UserRole.MEFAKED_TZEVET ||
      user.role === UserRole.MEFAKED_PELAGA
    );
  };

  const getSamalCandidates = (): User[] => {
    return users.filter(user => user.role === UserRole.SAMAL);
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            <GroupIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              ניהול צוותים
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {teams.length} צוותים פעילים
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateTeam}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          צוות חדש
        </Button>
      </Box>

      {/* Teams List */}
      <Box sx={{ mb: 4 }}>
        {teams.map((team) => (
          <Card key={team.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    {team.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Chip label={`פלגה ${team.plagaId}`} size="small" />
                    <Chip label={`${team.soldiers.length + team.squadLeaders.length + (team.commanderUid ? 1 : 0) + (team.samalUid ? 1 : 0)} חיילים`} variant="outlined" size="small" />
                  </Box>
                  {team.description && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      {team.description}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton onClick={() => handleEditTeam(team)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Team Structure */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">מבנה הצוות</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
                    gap: 3 
                  }}>
                    {/* Command Structure */}
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        פיקוד
                      </Typography>
                      
                      {/* Commander */}
                      {team.commanderUid && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                            <StarIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {getUserByUid(team.commanderUid)?.displayName || 'לא נמצא'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              מפקד צוות
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {/* Samal */}
                      {team.samalUid && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {getUserByUid(team.samalUid)?.displayName || 'לא נמצא'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              סמל
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {/* Squad Leaders */}
                      {team.squadLeaders.map((uid, index) => (
                        <Box key={uid} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                            <AssignmentIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {getUserByUid(uid)?.displayName || 'לא נמצא'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              מפקד חיילים {index + 1}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    {/* Soldiers */}
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        חיילים ({team.soldiers.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {team.soldiers.map((uid) => {
                          const soldier = getUserByUid(uid);
                          return (
                            <Chip
                              key={uid}
                              label={soldier?.displayName || 'לא נמצא'}
                              size="small"
                              variant="outlined"
                              onClick={() => soldier && handleAssignSoldier(team, soldier)}
                              sx={{ cursor: 'pointer' }}
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Available Soldiers */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            חיילים זמינים לשיבוץ ({getAvailableSoldiers().length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {getAvailableSoldiers().map((soldier) => (
              <Chip
                key={soldier.uid}
                label={`${soldier.displayName} (${getRoleDisplayName(soldier.role)})`}
                variant="outlined"
                sx={{ cursor: 'pointer' }}
                onClick={() => {
                  // יכול לבחור לאיזה צוות לשבץ
                  setSelectedSoldier(soldier);
                  // TODO: add team selection dialog
                }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* FAB for mobile */}
      <Fab
        color="primary"
        aria-label="add team"
        onClick={handleCreateTeam}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
      >
        <AddIcon />
      </Fab>

      {/* Create/Edit Team Dialog */}
      <Dialog open={teamDialogOpen} onClose={() => setTeamDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTeam ? 'עריכת צוות' : 'צוות חדש'}
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
              label="שם הצוות"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            
            <FormControl fullWidth>
              <InputLabel>פלגה</InputLabel>
              <Select
                value={formData.plagaId}
                onChange={(e) => setFormData({ ...formData, plagaId: e.target.value })}
                label="פלגה"
              >
                <MenuItem value="A">פלגה א</MenuItem>
                <MenuItem value="B">פלגה ב</MenuItem>
                <MenuItem value="C">פלגה ג</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>מפקד צוות</InputLabel>
              <Select
                value={formData.commanderUid}
                onChange={(e) => setFormData({ ...formData, commanderUid: e.target.value })}
                label="מפקד צוות"
              >
                <MenuItem value="">ללא</MenuItem>
                {getCommanderCandidates().map((commander) => (
                  <MenuItem key={commander.uid} value={commander.uid}>
                    {commander.displayName} ({getRoleDisplayName(commander.role)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>סמל</InputLabel>
              <Select
                value={formData.samalUid}
                onChange={(e) => setFormData({ ...formData, samalUid: e.target.value })}
                label="סמל"
              >
                <MenuItem value="">ללא</MenuItem>
                {getSamalCandidates().map((samal) => (
                  <MenuItem key={samal.uid} value={samal.uid}>
                    {samal.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <TextField
                fullWidth
                label="תיאור"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleSaveTeam} variant="contained">
            {selectedTeam ? 'עדכן' : 'צור'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Soldier Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
        <DialogTitle>שיבוץ חייל</DialogTitle>
        <DialogContent>
          {selectedSoldier && selectedTeam && (
            <Alert severity="info" sx={{ mt: 1 }}>
              האם לשבץ את <strong>{selectedSoldier.displayName}</strong> ל-<strong>{selectedTeam.name}</strong>?
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleConfirmAssign} variant="contained">
            שבץ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Teams; 