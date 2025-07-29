import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Divider,
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
  drivingLicenses: [],
};

const Soldiers: React.FC = () => {
  const navigate = useNavigate();
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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const refresh = () => {
    setLoading(true);
    getAllSoldiers()
      .then(data => {
        console.log('Loaded soldiers from Firebase:', data.length);
        // אם אין נתונים ב-Firebase, השתמש בדמו
        if (data.length === 0) {
          console.log('No soldiers in Firebase, using demo data');
          setSoldiers(demo);
        } else {
          setSoldiers(data);
        }
      })
      .catch((error) => {
        console.error('Error loading soldiers from Firebase:', error);
        console.log('Using demo data due to error');
        setSoldiers(demo);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  // בדיקה אם יש פרמטר edit ב-URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    if (editId) {
      const soldierToEdit = soldiers.find(s => s.id === editId);
      if (soldierToEdit) {
        handleOpenForm(soldierToEdit);
        // ניקוי הפרמטר מה-URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [soldiers]);

  // דמו אם אין נתונים - נתוני חיילים לפי מבנה הפלוגה
  const demo: Soldier[] = [
    // מפקדי פלוגה
    {
      id: 'mefaked_pluga',
      name: 'מפקד פלוגה',
      personalNumber: '1000001',
      team: 'מפקדה',
      role: 'מפקד פלוגה',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי פלוגות'],
    },
    {
      id: 'samal_pluga',
      name: 'סגן מפקד פלוגה',
      personalNumber: '1000002',
      team: 'מפקדה',
      role: 'סגן מפקד פלוגה',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי צוותים'],
    },
    
    // מפקדי פלגות
    {
      id: 'mefaked_plaga_a',
      name: 'מפקד פלגה א',
      personalNumber: '1000003',
      team: 'פלגה א',
      role: 'מפקד פלגה',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי צוותים'],
    },
    {
      id: 'mefaked_plaga_b',
      name: 'מפקד פלגה ב',
      personalNumber: '1000004',
      team: 'פלגה ב',
      role: 'מפקד פלגה',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי צוותים'],
    },
    {
      id: 'mefaked_plaga_zavit',
      name: 'מפקד פלגה זווית',
      personalNumber: '1000005',
      team: 'פלגה זווית',
      role: 'מפקד פלגה',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי צוותים'],
    },
    
    // מפל"ג
    {
      id: 'rasap',
      name: 'רספ',
      personalNumber: '1000006',
      team: 'מפקדה',
      role: 'רספ',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
      licenses: ['B'],
      certifications: ['קורס רספ'],
    },
    {
      id: 'sarsap',
      name: 'סרספ',
      personalNumber: '1000007',
      team: 'מפקדה',
      role: 'סרספ',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
      licenses: ['B'],
      certifications: ['קורס סרספ'],
    },
    {
      id: 'katzin_niul',
      name: 'קצין ניהול',
      personalNumber: '1000008',
      team: 'מפקדה',
      role: 'קצין ניהול',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'בנאי'],
      licenses: ['B'],
      certifications: ['קורס קציני ניהול'],
    },
    {
      id: 'manip',
      name: 'מניפ',
      personalNumber: '1000009',
      team: 'מפקדה',
      role: 'מניפ',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
      licenses: ['B'],
      certifications: ['קורס מניפ'],
    },
    {
      id: 'chofel',
      name: 'חופל',
      personalNumber: '1000010',
      team: 'מפקדה',
      role: 'חופל',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
      licenses: ['B'],
      certifications: ['קורס חופל'],
    },
    {
      id: 'pap',
      name: 'פפ',
      personalNumber: '1000011',
      team: 'מפקדה',
      role: 'פפ',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
      licenses: ['B'],
      certifications: ['קורס פפ'],
    },
    {
      id: 'samal_rechavim',
      name: 'סמל רכבים',
      personalNumber: '1000012',
      team: 'מפקדה',
      role: 'סמל רכבים',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'נהג'],
      licenses: ['B', 'C'],
      certifications: ['קורס סמלי רכבים'],
    },
    {
      id: 'samal_nahagim',
      name: 'סמל נהגים',
      personalNumber: '1000013',
      team: 'מפקדה',
      role: 'סמל נהגים',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'נהג'],
      licenses: ['B', 'C'],
      certifications: ['קורס סמלי נהגים'],
    },
    {
      id: 'mashkash',
      name: 'משק"ש',
      personalNumber: '1000014',
      team: 'מפקדה',
      role: 'משק"ש',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'קשר'],
      licenses: ['B'],
      certifications: ['קורס משק"ש'],
    },
    
    // צוות 10 - מתחת מפלג א'
    {
      id: 'mefaked_tzevet_10',
      name: 'מפקד צוות 10',
      personalNumber: '1000015',
      team: 'צוות 10',
      role: 'מפקד צוות',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B'],
      certifications: ['קורס מפקדי צוותים'],
    },
    {
      id: 'samal_10',
      name: 'סמל צוות 10',
      personalNumber: '1000016',
      team: 'צוות 10',
      role: 'סמל',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'חובש'],
      licenses: ['B'],
      certifications: ['קורס סמלים'],
    },
    {
      id: 'mefaked_1_10',
      name: 'מפקד 1 צוות 10',
      personalNumber: '1000017',
      team: 'צוות 10',
      role: 'מפקד',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'קלע'],
      licenses: ['B'],
      certifications: ['קורס מפקדים'],
    },
    {
      id: 'mefaked_2_10',
      name: 'מפקד 2 צוות 10',
      personalNumber: '1000018',
      team: 'צוות 10',
      role: 'מפקד',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'נגביסט'],
      licenses: ['B'],
      certifications: ['קורס מפקדים'],
    },
    {
      id: 'chayal_1_10',
      name: 'חייל 1 צוות 10',
      personalNumber: '1000019',
      team: 'צוות 10',
      role: 'חייל',
      profile: '97',
      qualifications: ['חובש', 'קלע', 'צלם'],
      licenses: ['B'],
      certifications: ['הסמכת חובש'],
    },
    {
      id: 'chayal_2_10',
      name: 'חייל 2 צוות 10',
      personalNumber: '1000020',
      team: 'צוות 10',
      role: 'חייל',
      profile: '97',
      qualifications: ['מטמין', 'טכנולוג', 'בנאי'],
      licenses: ['B'],
      certifications: ['הסמכת מטמין'],
    },
    {
      id: 'chayal_3_10',
      name: 'חייל 3 צוות 10',
      personalNumber: '1000021',
      team: 'צוות 10',
      role: 'חייל',
      profile: '97',
      qualifications: ['רחפניסט', 'קשר', 'רוגר'],
      licenses: ['B'],
      certifications: ['הסמכת רחפניסט'],
    },
    {
      id: 'chayal_4_10',
      name: 'חייל 4 צוות 10',
      personalNumber: '1000022',
      team: 'צוות 10',
      role: 'חייל',
      profile: '97',
      qualifications: ['נהג', 'קשר', 'קלע'],
      licenses: ['B', 'C'],
      certifications: ['קורס נהגים'],
    },
    {
      id: 'chayal_5_10',
      name: 'חייל 5 צוות 10',
      personalNumber: '1000023',
      team: 'צוות 10',
      role: 'חייל',
      profile: '97',
      qualifications: ['נגביסט', 'צלם', 'מטמין'],
      licenses: ['B'],
      certifications: ['הסמכת נגביסט'],
    },
    
    // צוות 20 - מתחת מפלג א'
    {
      id: 'mefaked_tzevet_20',
      name: 'מפקד צוות 20',
      personalNumber: '1000024',
      team: 'צוות 20',
      role: 'מפקד צוות',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B'],
      certifications: ['קורס מפקדי צוותים'],
    },
    {
      id: 'samal_20',
      name: 'סמל צוות 20',
      personalNumber: '1000025',
      team: 'צוות 20',
      role: 'סמל',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'חובש'],
      licenses: ['B'],
      certifications: ['קורס סמלים'],
    },
    {
      id: 'mefaked_1_20',
      name: 'מפקד 1 צוות 20',
      personalNumber: '1000026',
      team: 'צוות 20',
      role: 'מפקד',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'קלע'],
      licenses: ['B'],
      certifications: ['קורס מפקדים'],
    },
    {
      id: 'mefaked_2_20',
      name: 'מפקד 2 צוות 20',
      personalNumber: '1000027',
      team: 'צוות 20',
      role: 'מפקד',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'נגביסט'],
      licenses: ['B'],
      certifications: ['קורס מפקדים'],
    },
    {
      id: 'chayal_1_20',
      name: 'חייל 1 צוות 20',
      personalNumber: '1000028',
      team: 'צוות 20',
      role: 'חייל',
      profile: '97',
      qualifications: ['טכנולוג', 'בנאי', 'רחפניסט'],
      licenses: ['B'],
      certifications: ['הסמכת טכנולוג'],
    },
    {
      id: 'chayal_2_20',
      name: 'חייל 2 צוות 20',
      personalNumber: '1000029',
      team: 'צוות 20',
      role: 'חייל',
      profile: '97',
      qualifications: ['קשר', 'רוגר', 'נהג'],
      licenses: ['B', 'C'],
      certifications: ['הסמכת קשר'],
    },
    {
      id: 'chayal_3_20',
      name: 'חייל 3 צוות 20',
      personalNumber: '1000030',
      team: 'צוות 20',
      role: 'חייל',
      profile: '97',
      qualifications: ['חובש', 'קלע', 'צלם'],
      licenses: ['B'],
      certifications: ['הסמכת חובש'],
    },
    {
      id: 'chayal_4_20',
      name: 'חייל 4 צוות 20',
      personalNumber: '1000031',
      team: 'צוות 20',
      role: 'חייל',
      profile: '97',
      qualifications: ['מטמין', 'טכנולוג', 'בנאי'],
      licenses: ['B'],
      certifications: ['הסמכת מטמין'],
    },
    {
      id: 'chayal_5_20',
      name: 'חייל 5 צוות 20',
      personalNumber: '1000032',
      team: 'צוות 20',
      role: 'חייל',
      profile: '97',
      qualifications: ['נגביסט', 'רחפניסט', 'קשר'],
      licenses: ['B'],
      certifications: ['הסמכת נגביסט'],
    },
    
    // צוות 30 - מתחת מפלג א'
    {
      id: 'mefaked_tzevet_30',
      name: 'מפקד צוות 30',
      personalNumber: '1000033',
      team: 'צוות 30',
      role: 'מפקד צוות',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B'],
      certifications: ['קורס מפקדי צוותים'],
    },
    {
      id: 'samal_30',
      name: 'סמל צוות 30',
      personalNumber: '1000034',
      team: 'צוות 30',
      role: 'סמל',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'חובש'],
      licenses: ['B'],
      certifications: ['קורס סמלים'],
    },
    {
      id: 'mefaked_1_30',
      name: 'מפקד 1 צוות 30',
      personalNumber: '1000035',
      team: 'צוות 30',
      role: 'מפקד',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'קלע'],
      licenses: ['B'],
      certifications: ['קורס מפקדים'],
    },
    {
      id: 'mefaked_2_30',
      name: 'מפקד 2 צוות 30',
      personalNumber: '1000036',
      team: 'צוות 30',
      role: 'מפקד',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'נגביסט'],
      licenses: ['B'],
      certifications: ['קורס מפקדים'],
    },
    {
      id: 'chayal_1_30',
      name: 'חייל 1 צוות 30',
      personalNumber: '1000037',
      team: 'צוות 30',
      role: 'חייל',
      profile: '97',
      qualifications: ['רוגר', 'נהג', 'חובש'],
      licenses: ['B', 'C'],
      certifications: ['הסמכת רוגר'],
    },
    {
      id: 'chayal_2_30',
      name: 'חייל 2 צוות 30',
      personalNumber: '1000038',
      team: 'צוות 30',
      role: 'חייל',
      profile: '97',
      qualifications: ['קלע', 'צלם', 'מטמין'],
      licenses: ['B'],
      certifications: ['הסמכת קלע'],
    },
    {
      id: 'chayal_3_30',
      name: 'חייל 3 צוות 30',
      personalNumber: '1000039',
      team: 'צוות 30',
      role: 'חייל',
      profile: '97',
      qualifications: ['טכנולוג', 'בנאי', 'רחפניסט'],
      licenses: ['B'],
      certifications: ['הסמכת טכנולוג'],
    },
    {
      id: 'chayal_4_30',
      name: 'חייל 4 צוות 30',
      personalNumber: '1000040',
      team: 'צוות 30',
      role: 'חייל',
      profile: '97',
      qualifications: ['קשר', 'נגביסט', 'צלם'],
      licenses: ['B'],
      certifications: ['הסמכת קשר'],
    },
    {
      id: 'chayal_5_30',
      name: 'חייל 5 צוות 30',
      personalNumber: '1000041',
      team: 'צוות 30',
      role: 'חייל',
      profile: '97',
      qualifications: ['נהג', 'חובש', 'קלע'],
      licenses: ['B', 'C'],
      certifications: ['קורס נהגים'],
    },
    
    // צוות 40 - מתחת מפלג ב'
    {
      id: 'mefaked_tzevet_40',
      name: 'מפקד צוות 40',
      personalNumber: '1000042',
      team: 'צוות 40',
      role: 'מפקד צוות',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B'],
      certifications: ['קורס מפקדי צוותים'],
    },
    {
      id: 'samal_40',
      name: 'סמל צוות 40',
      personalNumber: '1000043',
      team: 'צוות 40',
      role: 'סמל',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'חובש'],
      licenses: ['B'],
      certifications: ['קורס סמלים'],
    },
    {
      id: 'mefaked_1_40',
      name: 'מפקד 1 צוות 40',
      personalNumber: '1000044',
      team: 'צוות 40',
      role: 'מפקד',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'קלע'],
      licenses: ['B'],
      certifications: ['קורס מפקדים'],
    },
    {
      id: 'mefaked_2_40',
      name: 'מפקד 2 צוות 40',
      personalNumber: '1000045',
      team: 'צוות 40',
      role: 'מפקד',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'נגביסט'],
      licenses: ['B'],
      certifications: ['קורס מפקדים'],
    },
    {
      id: 'chayal_1_40',
      name: 'חייל 1 צוות 40',
      personalNumber: '1000046',
      team: 'צוות 40',
      role: 'חייל',
      profile: '97',
      qualifications: ['מטמין', 'טכנולוג', 'בנאי'],
      licenses: ['B'],
      certifications: ['הסמכת מטמין'],
    },
    {
      id: 'chayal_2_40',
      name: 'חייל 2 צוות 40',
      personalNumber: '1000047',
      team: 'צוות 40',
      role: 'חייל',
      profile: '97',
      qualifications: ['רחפניסט', 'קשר', 'רוגר'],
      licenses: ['B'],
      certifications: ['הסמכת רחפניסט'],
    },
    {
      id: 'chayal_3_40',
      name: 'חייל 3 צוות 40',
      personalNumber: '1000048',
      team: 'צוות 40',
      role: 'חייל',
      profile: '97',
      qualifications: ['נהג', 'קשר', 'קלע'],
      licenses: ['B', 'C'],
      certifications: ['קורס נהגים'],
    },
    {
      id: 'chayal_4_40',
      name: 'חייל 4 צוות 40',
      personalNumber: '1000049',
      team: 'צוות 40',
      role: 'חייל',
      profile: '97',
      qualifications: ['נגביסט', 'צלם', 'מטמין'],
      licenses: ['B'],
      certifications: ['הסמכת נגביסט'],
    },
    {
      id: 'chayal_5_40',
      name: 'חייל 5 צוות 40',
      personalNumber: '1000050',
      team: 'צוות 40',
      role: 'חייל',
      profile: '97',
      qualifications: ['חובש', 'טכנולוג', 'בנאי'],
      licenses: ['B'],
      certifications: ['הסמכת חובש'],
    },
    
    // צוות 50 - מתחת מפלג ב'
    {
      id: 'mefaked_tzevet_50',
      name: 'מפקד צוות 50',
      personalNumber: '1000051',
      team: 'צוות 50',
      role: 'מפקד צוות',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B'],
      certifications: ['קורס מפקדי צוותים'],
    },
    {
      id: 'samal_50',
      name: 'סמל צוות 50',
      personalNumber: '1000052',
      team: 'צוות 50',
      role: 'סמל',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'חובש'],
      licenses: ['B'],
      certifications: ['קורס סמלים'],
    },
    {
      id: 'mefaked_1_50',
      name: 'מפקד 1 צוות 50',
      personalNumber: '1000053',
      team: 'צוות 50',
      role: 'מפקד',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'קלע'],
      licenses: ['B'],
      certifications: ['קורס מפקדים'],
    },
    {
      id: 'mefaked_2_50',
      name: 'מפקד 2 צוות 50',
      personalNumber: '1000054',
      team: 'צוות 50',
      role: 'מפקד',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'נגביסט'],
      licenses: ['B'],
      certifications: ['קורס מפקדים'],
    },
    {
      id: 'chayal_1_50',
      name: 'חייל 1 צוות 50',
      personalNumber: '1000055',
      team: 'צוות 50',
      role: 'חייל',
      profile: '97',
      qualifications: ['רוגר', 'נהג', 'חובש'],
      licenses: ['B', 'C'],
      certifications: ['הסמכת רוגר'],
    },
    {
      id: 'chayal_2_50',
      name: 'חייל 2 צוות 50',
      personalNumber: '1000056',
      team: 'צוות 50',
      role: 'חייל',
      profile: '97',
      qualifications: ['קלע', 'צלם', 'מטמין'],
      licenses: ['B'],
      certifications: ['הסמכת קלע'],
    },
    {
      id: 'chayal_3_50',
      name: 'חייל 3 צוות 50',
      personalNumber: '1000057',
      team: 'צוות 50',
      role: 'חייל',
      profile: '97',
      qualifications: ['טכנולוג', 'בנאי', 'רחפניסט'],
      licenses: ['B'],
      certifications: ['הסמכת טכנולוג'],
    },
    {
      id: 'chayal_4_50',
      name: 'חייל 4 צוות 50',
      personalNumber: '1000058',
      team: 'צוות 50',
      role: 'חייל',
      profile: '97',
      qualifications: ['קשר', 'נגביסט', 'צלם'],
      licenses: ['B'],
      certifications: ['הסמכת קשר'],
    },
    {
      id: 'chayal_5_50',
      name: 'חייל 5 צוות 50',
      personalNumber: '1000059',
      team: 'צוות 50',
      role: 'חייל',
      profile: '97',
      qualifications: ['נהג', 'חובש', 'קלע'],
      licenses: ['B', 'C'],
      certifications: ['קורס נהגים'],
    },
    
    // פלגה זווית אחרת
    {
      id: 'nagad_technologia',
      name: 'נגד טכנולוגיה',
      personalNumber: '1000060',
      team: 'פלגה זווית',
      role: 'נגד טכנולוגיה',
      profile: '97',
      qualifications: ['טכנולוג', 'קשר', 'רחפניסט'],
      licenses: ['B'],
      certifications: ['קורס נגדי טכנולוגיה'],
    },
    {
      id: 'nagad_hasvaa',
      name: 'נגד הסוואה',
      personalNumber: '1000061',
      team: 'פלגה זווית',
      role: 'נגד הסוואה',
      profile: '97',
      qualifications: ['הסוואה', 'קשר', 'צלם'],
      licenses: ['B'],
      certifications: ['קורס נגדי הסוואה'],
    },
    {
      id: 'mashak_technologia',
      name: 'משק טכנולוגיה',
      personalNumber: '1000062',
      team: 'פלגה זווית',
      role: 'משק טכנולוגיה',
      profile: '97',
      qualifications: ['טכנולוג', 'קשר', 'רחפניסט'],
      licenses: ['B'],
      certifications: ['קורס משקי טכנולוגיה'],
    },
    {
      id: 'mashak_hasvaa',
      name: 'משק הסוואה',
      personalNumber: '1000063',
      team: 'פלגה זווית',
      role: 'משק הסוואה',
      profile: '97',
      qualifications: ['הסוואה', 'קשר', 'צלם'],
      licenses: ['B'],
      certifications: ['קורס משקי הסוואה'],
    },
    {
      id: 'samalet_mador',
      name: 'סמלת מדור',
      personalNumber: '1000064',
      team: 'פלגה זווית',
      role: 'סמלת מדור',
      profile: '97',
      qualifications: ['פיקוד', 'קשר', 'חובש'],
      licenses: ['B'],
      certifications: ['קורס סמלים'],
    }
  ];

  // השתמש בדמו אם אין נתונים מ-Firebase או אם יש שגיאה בטעינה
  const data = soldiers.length > 0 ? soldiers : demo;
  console.log('Using data:', data.length, 'items (soldiers from Firebase:', soldiers.length, ', demo:', demo.length, ')');

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

      {/* View Mode Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={viewMode} 
          onChange={(e, newValue) => setViewMode(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab label="תצוגת כרטיסים" value="cards" />
          <Tab label="תצוגה טבלאית" value="table" />
        </Tabs>
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
      ) : viewMode === 'table' ? (
        // Table View
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>שם</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>מספר אישי</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>צוות</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>תפקיד</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>פרופיל</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>כשירויות</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>רישיונות</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>היתרים</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((soldier) => (
                                    <TableRow key={soldier.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: getProfileColor(soldier.profile) }}>
                            {soldier.name.charAt(0)}
                          </Avatar>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 500,
                              cursor: 'pointer',
                              '&:hover': { 
                                color: 'primary.main',
                                textDecoration: 'underline'
                              }
                            }}
                            onClick={() => navigate(`/soldiers/${soldier.id}`)}
                          >
                            {soldier.name}
                          </Typography>
                        </Box>
                      </TableCell>
                  <TableCell>{soldier.personalNumber}</TableCell>
                  <TableCell>
                    <Chip label={soldier.team} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={soldier.role} size="small" color="secondary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={soldier.profile} 
                      size="small" 
                      color={getProfileColor(soldier.profile) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {soldier.qualifications?.slice(0, 2).map((qual, index) => (
                        <Chip key={index} label={qual} size="small" variant="outlined" />
                      ))}
                      {soldier.qualifications && soldier.qualifications.length > 2 && (
                        <Chip label={`+${soldier.qualifications.length - 2}`} size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {soldier.licenses?.map((license, index) => (
                        <Chip key={index} label={license} size="small" color="success" variant="outlined" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {soldier.qualifications?.includes('נהג') ? (
                        soldier.drivingLicenses && soldier.drivingLicenses.length > 0 ? (
                          soldier.drivingLicenses.map((license, index) => (
                            <Chip key={index} label={license} size="small" color="warning" variant="filled" />
                          ))
                        ) : (
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                            אין היתרים
                          </Typography>
                        )
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                          לא נהג
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" color="primary" onClick={() => handleOpenForm(soldier)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteId(soldier.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        // Cards View
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
                  <Box sx={{ mb: 2 }}>
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

                {/* היתרים לנהיגה */}
                {soldier.qualifications?.includes('נהג') && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      היתרים לנהיגה:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {soldier.drivingLicenses && soldier.drivingLicenses.length > 0 ? (
                        soldier.drivingLicenses.map((license, index) => (
                          <Chip 
                            key={index}
                            label={license} 
                            size="small" 
                            color="success"
                            variant="filled"
                          />
                        ))
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                          אין היתרים מוגדרים
                        </Typography>
                      )}
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
              <TextField
                fullWidth
                label="היתרים לנהיגה (35, דימקס, סוואנה, C - מופרד בפסיקים)"
                name="drivingLicenses"
                value={formData.drivingLicenses?.join(', ') || ''}
                onChange={handleArrayChange}
                helperText="רק לנהגים עם כשירות 'נהג'"
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