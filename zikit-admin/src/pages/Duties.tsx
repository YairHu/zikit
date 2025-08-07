import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import { Duty, DutyParticipant } from '../models/Duty';
import { Soldier } from '../models/Soldier';
import { getAllDuties, addDuty, updateDuty, deleteDuty } from '../services/dutyService';
import { getAllSoldiers } from '../services/soldierService';
import { getAllFrameworks } from '../services/frameworkService';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Fab,
  Alert,
  CircularProgress,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationOnIcon,
  Group as GroupIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const emptyDuty: Omit<Duty, 'id' | 'createdAt' | 'updatedAt'> = {
  type: '',
  location: '',
  startDate: '',
  startTime: '',
  endTime: '',
  participants: [],
  requiredEquipment: '',
  notes: '',
  frameworkId: '',
  status: 'פעילה'
};

const dutyTypes = ['מטבח', 'רסר', 'פלוגה', 'אחר'];
const statuses = ['פעילה', 'הסתיימה', 'בוטלה'];

const Duties: React.FC = () => {
  const { user } = useUser();
  const [duties, setDuties] = useState<Duty[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Omit<Duty, 'id' | 'createdAt' | 'updatedAt'>>(emptyDuty);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dutiesData, soldiersData, frameworksData] = await Promise.all([
        getAllDuties(),
        getAllSoldiers(),
        getAllFrameworks()
      ]);
      setDuties(dutiesData);
      setSoldiers(soldiersData);
      setFrameworks(frameworksData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleOpenForm = (duty?: Duty) => {
    if (duty) {
      setFormData({
        type: duty.type,
        location: duty.location,
        startDate: duty.startDate,
        startTime: duty.startTime,
        endTime: duty.endTime || '',
        participants: duty.participants,
        requiredEquipment: duty.requiredEquipment || '',
        notes: duty.notes || '',
        frameworkId: duty.frameworkId || '',
        status: duty.status
      });
      setEditId(duty.id);
    } else {
      setFormData(emptyDuty);
      setEditId(null);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData(emptyDuty);
    setEditId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddParticipant = (soldier: Soldier | null) => {
    if (soldier) {
      const newParticipant: DutyParticipant = {
        soldierId: soldier.id,
        soldierName: soldier.name,
        personalNumber: soldier.personalNumber
      };
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, newParticipant]
      }));
    }
  };

  const handleRemoveParticipant = (soldierId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.soldierId !== soldierId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateDuty(editId, formData);
      } else {
        await addDuty(formData);
      }
      handleCloseForm();
      refresh();
    } catch (error) {
      console.error('Error saving duty:', error);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteDuty(deleteId);
        setDeleteId(null);
        refresh();
      } catch (error) {
        console.error('Error deleting duty:', error);
      }
    }
  };

  const handleDutyClick = (dutyId: string) => {
    navigate(`/duties/${dutyId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'פעילה': return 'primary';
      case 'הסתיימה': return 'success';
      case 'בוטלה': return 'error';
      default: return 'default';
    }
  };

  const filteredDuties = duties.filter(duty => {
    const matchesSearch = duty.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         duty.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || duty.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          תורנויות
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/weekly-duties')}
          >
            תצוגה שבועית
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenForm()}
          >
            הוסף תורנות
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="חיפוש..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{ minWidth: 200 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>סטטוס</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="סטטוס"
          >
            <MenuItem value="">כל הסטטוסים</MenuItem>
            {statuses.map(status => (
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* View Mode Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={viewMode} onChange={(_, newValue) => setViewMode(newValue)}>
          <Tab value="cards" label="תצוגת כרטיסים" />
          <Tab value="table" label="תצוגה טבלאית" />
        </Tabs>
      </Box>

      {/* Duties List */}
      {viewMode === 'cards' ? (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {filteredDuties.map((duty) => (
            <Card key={duty.id} sx={{ height: 'fit-content', cursor: 'pointer' }} onClick={() => handleDutyClick(duty.id)}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {duty.type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {duty.team}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label={duty.status} 
                      color={getStatusColor(duty.status) as any}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenForm(duty);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(duty.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationOnIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">{duty.location}</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ScheduleIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {duty.startDate} {duty.startTime}
                    {duty.endTime && ` - ${duty.endTime}`}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <GroupIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">{duty.participants.length} משתתפים</Typography>
                </Box>

                {/* Participants List */}
                {duty.participants.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      משתתפים:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {duty.participants.map((participant) => (
                        <Chip
                          key={participant.soldierId}
                          label={participant.soldierName}
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/soldiers/${participant.soldierId}`);
                          }}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {duty.requiredEquipment && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, mt: 1 }}>
                    <PersonIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">ציוד: {duty.requiredEquipment}</Typography>
                  </Box>
                )}

                {duty.notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {duty.notes}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>סוג</TableCell>
                <TableCell>צוות</TableCell>
                <TableCell>מיקום</TableCell>
                <TableCell>תאריך ושעה</TableCell>
                <TableCell>משתתפים</TableCell>
                <TableCell>סטטוס</TableCell>
                <TableCell>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDuties.map((duty) => (
                <TableRow 
                  key={duty.id} 
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleDutyClick(duty.id)}
                >
                  <TableCell>{duty.type}</TableCell>
                  <TableCell>{duty.team}</TableCell>
                  <TableCell>{duty.location}</TableCell>
                  <TableCell>
                    {duty.startDate} {duty.startTime}
                    {duty.endTime && <br />}
                    {duty.endTime && `עד ${duty.endTime}`}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {duty.participants.map((participant) => (
                        <Chip
                          key={participant.soldierId}
                          label={participant.soldierName}
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/soldiers/${participant.soldierId}`);
                          }}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={duty.status} 
                      color={getStatusColor(duty.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenForm(duty);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(duty.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Form Dialog */}
      <Dialog open={showForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>
          {editId ? 'ערוך תורנות' : 'הוסף תורנות חדשה'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <TextField
                name="type"
                label="סוג תורנות"
                value={formData.type}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                name="location"
                label="מיקום"
                value={formData.location}
                onChange={handleChange}
                required
                fullWidth
              />
              <TextField
                name="startDate"
                label="תאריך התחלה"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                name="startTime"
                label="שעת התחלה"
                type="time"
                value={formData.startTime}
                onChange={handleChange}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                name="endTime"
                label="שעת סיום (לא חובה)"
                type="time"
                value={formData.endTime}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth>
                <InputLabel>מסגרת</InputLabel>
                <Select
                  name="frameworkId"
                  value={formData.frameworkId}
                  onChange={(e) => handleSelectChange('frameworkId', e.target.value)}
                  label="מסגרת"
                  required
                >
                  <MenuItem value="">בחר מסגרת</MenuItem>
                  {frameworks.map(framework => (
                    <MenuItem key={framework.id} value={framework.id}>{framework.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                name="requiredEquipment"
                label="ציוד נדרש (לא חובה)"
                value={formData.requiredEquipment}
                onChange={handleChange}
                fullWidth
              />
              <TextField
                name="notes"
                label="הערות (לא חובה)"
                value={formData.notes}
                onChange={handleChange}
                multiline
                rows={3}
                fullWidth
              />
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                משתתפים
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  options={soldiers.filter(s => 
                    !formData.participants.some(p => p.soldierId === s.id)
                  )}
                  getOptionLabel={(option) => `${option.name} (${option.personalNumber})`}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      handleAddParticipant(newValue);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="הוסף משתתף" />
                  )}
                />
              </Box>
              <List dense>
                {formData.participants.map((participant) => (
                  <ListItem key={participant.soldierId}>
                    <ListItemText
                      primary={participant.soldierName}
                      secondary={participant.personalNumber}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveParticipant(participant.soldierId)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForm}>ביטול</Button>
            <Button type="submit" variant="contained">
              {editId ? 'עדכן' : 'הוסף'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>מחיקת תורנות</DialogTitle>
        <DialogContent>
          <Typography>האם אתה בטוח שברצונך למחוק תורנות זו?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>ביטול</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            מחק
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Duties; 