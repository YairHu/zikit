import React, { useEffect, useState } from 'react';
import { Form } from '../models/Form';
import { getAllForms, addForm, updateForm, deleteForm } from '../services/formService';
import { Soldier } from '../models/Soldier';
import { getAllSoldiers } from '../services/soldierService';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';

function formatDate(val: any) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val.seconds) {
    const date = new Date(val.seconds * 1000);
    return date.toLocaleDateString('he-IL');
  }
  return val.toString();
}

const emptyForm: Omit<Form, 'id'> = {
  soldierId: '',
  fileUrl: '',
  uploadedAt: '',
  fileType: '',
  description: '',
};

const Forms: React.FC = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Omit<Form, 'id'>>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const refresh = () => {
    setLoading(true);
    Promise.all([getAllForms(), getAllSoldiers()])
      .then(([formsData, soldiersData]) => {
        setForms(formsData);
        setSoldiers(soldiersData);
      })
      .catch(() => {
        setForms([]);
        setSoldiers([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  // דמו אם אין נתונים
  const demo: Form[] = [
    {
      id: '1',
      soldierId: 'mefaked_pluga',
      fileUrl: 'https://example.com/interview_form.pdf',
      uploadedAt: '2024-01-15',
      fileType: 'pdf',
      description: 'טופס ראיון אישי - מפקד פלוגה',
    },
    {
      id: '2',
      soldierId: 'samal_pluga',
      fileUrl: 'https://example.com/medical_form.pdf',
      uploadedAt: '2024-01-16',
      fileType: 'pdf',
      description: 'טופס רפואי - סגן מפקד פלוגה',
    },
    {
      id: '3',
      soldierId: 'mefaked_tzevet_10',
      fileUrl: 'https://example.com/training_form.pdf',
      uploadedAt: '2024-01-17',
      fileType: 'pdf',
      description: 'טופס הכשרה - מפקד צוות 10',
    }
  ];
  const demoSoldiers: Soldier[] = [
    { id: 'mefaked_pluga', name: 'מפקד פלוגה', personalNumber: '1000001', team: 'מפקדה', role: 'מפקד פלוגה', profile: '97', qualifications: ['פיקוד', 'ניווט', 'קשר'], licenses: ['B', 'C'], certifications: ['קורס מפקדי פלוגות'] },
    { id: 'samal_pluga', name: 'סגן מפקד פלוגה', personalNumber: '1000002', team: 'מפקדה', role: 'סגן מפקד פלוגה', profile: '97', qualifications: ['פיקוד', 'ניווט', 'קשר'], licenses: ['B', 'C'], certifications: ['קורס מפקדי צוותים'] },
    { id: 'mefaked_tzevet_10', name: 'מפקד צוות 10', personalNumber: '1000015', team: 'צוות 10', role: 'מפקד צוות', profile: '97', qualifications: ['פיקוד', 'ניווט', 'קשר'], licenses: ['B'], certifications: ['קורס מפקדי צוותים'] }
  ];

  const data = forms.length > 0 ? forms : demo;
  const soldiersData = soldiers.length > 0 ? soldiers : demoSoldiers;

  const getSoldierName = (id: string) => {
    const s = soldiersData.find(s => s.id === id);
    return s ? s.name : id;
  };

  const handleOpenForm = (form?: Form) => {
    if (form) {
      const { id, ...rest } = form;
      setFormData(rest);
      setEditId(id);
    } else {
      setFormData(emptyForm);
      setEditId(null);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData(emptyForm);
    setEditId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await updateForm(editId, formData);
    } else {
      await addForm(formData);
    }
    handleCloseForm();
    refresh();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteForm(deleteId);
      setDeleteId(null);
      refresh();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          טפסים ומסמכים
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
          sx={{ borderRadius: 2 }}
        >
          הוסף טופס
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* View Mode Tabs */}
          <Box sx={{ mb: 3 }}>
            <Tabs value={viewMode === 'cards' ? 0 : 1} onChange={(_, newValue) => setViewMode(newValue === 0 ? 'cards' : 'table')}>
              <Tab icon={<ViewModuleIcon />} label="כרטיסים" />
              <Tab icon={<ViewListIcon />} label="טבלה" />
            </Tabs>
          </Box>

          {viewMode === 'cards' ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
              {data.map((form) => (
                <Card key={form.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6" fontWeight="bold">
                          {form.fileType?.toUpperCase() || 'קובץ'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenForm(form)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteId(form.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>חייל:</strong> {getSoldierName(form.soldierId)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>תאריך העלאה:</strong> {formatDate(form.uploadedAt)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>תיאור:</strong> {form.description}
                      </Typography>
                    </Box>

                    <Box sx={{ mt: 'auto' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        href={form.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        fullWidth
                      >
                        הצג קובץ
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            // Table View
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>מזהה</TableCell>
                    <TableCell>חייל</TableCell>
                    <TableCell>סוג קובץ</TableCell>
                    <TableCell>תאריך העלאה</TableCell>
                    <TableCell>תיאור</TableCell>
                    <TableCell>קובץ</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((form) => (
                    <TableRow key={form.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {form.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getSoldierName(form.soldierId)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={form.fileType?.toUpperCase() || 'קובץ'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(form.uploadedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {form.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          href={form.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          הצג קובץ
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenForm(form)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteId(form.id)}
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
        </>
      )}
      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>
          {editId ? 'ערוך טופס' : 'הוסף טופס חדש'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>חייל</InputLabel>
                <Select
                  name="soldierId"
                  value={formData.soldierId}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setFormData(prev => ({ ...prev, [name]: value }));
                  }}
                  label="חייל"
                  required
                >
                  {soldiersData.map(soldier => (
                    <MenuItem key={soldier.id} value={soldier.id}>
                      {soldier.name} - {soldier.team}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="קובץ (URL)"
                name="fileUrl"
                value={formData.fileUrl}
                onChange={handleChange}
                required
              />
              <TextField
                fullWidth
                label="תאריך העלאה"
                name="uploadedAt"
                type="date"
                value={formData.uploadedAt}
                onChange={handleChange}
                required
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="סוג קובץ"
                name="fileType"
                value={formData.fileType}
                onChange={handleChange}
                placeholder="pdf, doc, xlsx"
              />
              <TextField
                fullWidth
                label="תיאור"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={3}
                sx={{ gridColumn: { md: 'span 2' } }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForm}>ביטול</Button>
            <Button type="submit" variant="contained">
              {editId ? 'שמור' : 'הוסף'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>מחיקת טופס</DialogTitle>
        <DialogContent>
          <Typography>האם אתה בטוח שברצונך למחוק טופס זה?</Typography>
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

export default Forms; 