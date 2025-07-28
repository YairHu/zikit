import React, { useEffect, useState } from 'react';
import { Soldier } from '../models/Soldier';
import { getAllSoldiers, addSoldier, updateSoldier, deleteSoldier } from '../services/soldierService';
import { Link } from 'react-router-dom';
import {
  Box,
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
  Avatar,
  Chip,
  IconButton,
  Fab,
  Alert,
  CircularProgress,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Group as GroupIcon,
  Star as StarIcon,
  LocalOffer as BadgeIcon
} from '@mui/icons-material';

const emptySoldier: Omit<Soldier, 'id'> = {
  name: '',
  personalNumber: '',
  team: '',
  role: '',
  profile: '',
  qualifications: [],
  licenses: [],
  certifications: [],
};

const Soldiers: React.FC = () => {
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Omit<Soldier, 'id'>>(emptySoldier);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterQualification, setFilterQualification] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const refresh = () => {
    setLoading(true);
    getAllSoldiers()
      .then(data => setSoldiers(data))
      .catch(() => setSoldiers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  // דמו אם אין נתונים
  const demo: Soldier[] = [
    {
      id: '1',
      name: 'יוסי כהן',
      personalNumber: '1234567',
      team: 'צוות א',
      role: 'לוחם',
      profile: '97',
      qualifications: ['ירי', 'קשר'],
      licenses: ['B'],
      certifications: ['הסמכת חובש'],
    },
    {
      id: '2',
      name: 'משה לוי',
      personalNumber: '2345678',
      team: 'צוות ב',
      role: 'מפקד צוות',
      profile: '97',
      qualifications: ['ירי', 'פיקוד', 'ניווט'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי צוותים', 'הסמכת חובש'],
    },
    {
      id: '3',
      name: 'דוד אברהם',
      personalNumber: '3456789',
      team: 'צוות א',
      role: 'נהג',
      profile: '82',
      qualifications: ['ירי', 'נהיגה'],
      licenses: ['B', 'C1'],
      certifications: ['קורס נהגים'],
    }
  ];

  const data = soldiers.length > 0 ? soldiers : demo;

  const filteredData = data.filter(s =>
    (!filterTeam || s.team.includes(filterTeam)) &&
    (!filterRole || s.role.includes(filterRole)) &&
    (!filterQualification || (s.qualifications && s.qualifications.join(',').includes(filterQualification))) &&
    (!searchTerm || s.name.includes(searchTerm) || s.personalNumber.includes(searchTerm))
  );

  const handleOpenForm = (soldier?: Soldier) => {
    if (soldier) {
      const { id, ...rest } = soldier;
      setFormData(rest);
      setEditId(id);
    } else {
      setFormData(emptySoldier);
      setEditId(null);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData(emptySoldier);
    setEditId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value.split(',').map(s => s.trim()) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await updateSoldier(editId, formData);
    } else {
      await addSoldier(formData);
    }
    handleCloseForm();
    refresh();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteSoldier(deleteId);
      setDeleteId(null);
      refresh();
    }
  };

  const getProfileColor = (profile: string) => {
    const num = parseInt(profile);
    if (num >= 97) return '#4CAF50';
    if (num >= 82) return '#FF9800';
    if (num >= 72) return '#F44336';
    return '#9E9E9E';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              מאגר חיילים
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {filteredData.length} חיילים
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          הוסף חייל
        </Button>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
            gap: 2 
          }}>
            <TextField
              fullWidth
              placeholder="חיפוש לפי שם או מספר אישי"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterIcon />
                  <Typography>מסננים</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, 
                  gap: 2 
                }}>
                  <TextField
                    fullWidth
                    label="צוות"
                    value={filterTeam}
                    onChange={(e) => setFilterTeam(e.target.value)}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="תפקיד"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="כשירות"
                    value={filterQualification}
                    onChange={(e) => setFilterQualification(e.target.value)}
                    size="small"
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(3, 1fr)' 
          }, 
          gap: 2 
        }}>
          {filteredData.map((soldier) => (
            <Card 
              key={soldier.id}
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="h6" 
                      component={Link} 
                      to={`/soldiers/${soldier.id}`}
                      sx={{ 
                        textDecoration: 'none', 
                        color: 'primary.main',
                        fontWeight: 600,
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      {soldier.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      מס' אישי: {soldier.personalNumber}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip 
                        icon={<GroupIcon />}
                        label={soldier.team} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                      <Chip 
                        label={soldier.role} 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" onClick={() => handleOpenForm(soldier)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteId(soldier.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    פרופיל רפואי:
                  </Typography>
                  <Chip 
                    label={soldier.profile}
                    sx={{ 
                      bgcolor: getProfileColor(soldier.profile),
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </Box>

                {soldier.qualifications && soldier.qualifications.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      כשירויות:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {soldier.qualifications.map((qual, index) => (
                        <Chip 
                          key={index}
                          icon={<StarIcon />}
                          label={qual} 
                          size="small" 
                          color="success"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {soldier.licenses && soldier.licenses.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      רישיונות נהיגה:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {soldier.licenses.map((license, index) => (
                        <Chip 
                          key={index}
                          label={license} 
                          size="small" 
                          color="info"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {soldier.certifications && soldier.certifications.length > 0 && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      הסמכות:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {soldier.certifications.map((cert, index) => (
                        <Chip 
                          key={index}
                          icon={<BadgeIcon />}
                          label={cert} 
                          size="small" 
                          color="warning"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* FAB for mobile */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ 
          position: 'fixed', 
          bottom: 16, 
          left: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
        onClick={() => handleOpenForm()}
      >
        <AddIcon />
      </Fab>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editId ? 'עריכת חייל' : 'הוספת חייל חדש'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
              gap: 2, 
              mt: 1 
            }}>
              <TextField
                fullWidth
                label="שם מלא"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <TextField
                fullWidth
                label="מספר אישי"
                name="personalNumber"
                value={formData.personalNumber}
                onChange={handleChange}
                required
              />
              <TextField
                fullWidth
                label="צוות"
                name="team"
                value={formData.team}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                label="תפקיד"
                name="role"
                value={formData.role}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                label="פרופיל רפואי"
                name="profile"
                value={formData.profile}
                onChange={handleChange}
              />
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <TextField
                  fullWidth
                  label="כשירויות (מופרד בפסיקים)"
                  name="qualifications"
                  value={formData.qualifications.join(', ')}
                  onChange={handleArrayChange}
                  multiline
                  rows={2}
                />
              </Box>
              <TextField
                fullWidth
                label="רישיונות נהיגה (מופרד בפסיקים)"
                name="licenses"
                value={formData.licenses.join(', ')}
                onChange={handleArrayChange}
              />
              <TextField
                fullWidth
                label="הסמכות (מופרד בפסיקים)"
                name="certifications"
                value={formData.certifications.join(', ')}
                onChange={handleArrayChange}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseForm}>ביטול</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editId ? 'שמור שינויים' : 'הוסף חייל'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>אישור מחיקה</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            האם אתה בטוח שברצונך למחוק חייל זה? פעולה זו אינה ניתנת לביטול.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>ביטול</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            מחק
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Soldiers; 