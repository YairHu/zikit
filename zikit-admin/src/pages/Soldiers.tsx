import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Soldier } from '../models/Soldier';
import { getAllSoldiers, deleteSoldier } from '../services/soldierService';
import { getPresenceColor, getProfileColor } from '../utils/colors';
import { Link } from 'react-router-dom';
import SoldierForm from '../components/SoldierForm';
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
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Tooltip
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
  LocalOffer as BadgeIcon,
  Security as SecurityIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';



const Soldiers: React.FC = () => {
  const navigate = useNavigate();
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterQualification, setFilterQualification] = useState('');
  const [filterPresence, setFilterPresence] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'hierarchy'>('cards');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  
  // הגדרת השדות הזמינים לתצוגה טבלאית
  const availableColumns = [
    { key: 'name', label: 'שם', visible: true },
    { key: 'personalNumber', label: 'מספר אישי', visible: true },
    { key: 'team', label: 'צוות', visible: true },
    { key: 'role', label: 'תפקיד', visible: true },
    { key: 'framework', label: 'מסגרת', visible: false },
    { key: 'commanders', label: 'מפקדים', visible: false },
    { key: 'profile', label: 'פרופיל', visible: true },
    { key: 'presence', label: 'נוכחות', visible: true },
    { key: 'qualifications', label: 'כשירויות', visible: true },
    { key: 'licenses', label: 'רישיונות', visible: true },
    { key: 'drivingLicenses', label: 'היתרים', visible: false },
    { key: 'actions', label: 'פעולות', visible: true }
  ];
  
  const [visibleColumns, setVisibleColumns] = useState(availableColumns);

  const refresh = useCallback(() => {
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
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // בדיקה אם יש פרמטר edit ב-URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    if (editId) {
      const soldierToEdit = soldiers.find(s => s.id === editId);
      if (soldierToEdit) {
        handleOpenForm(soldierToEdit);
        // ניקוי הפרמטר מה-URL אבל נשאר באותו עמוד
        const currentPath = window.location.pathname;
        window.history.replaceState({}, '', currentPath);
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
      frameworkId: 'מפקדה',
      role: 'מפקד פלוגה',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי פלוגות'],
      presence: 'בבסיס'
    },
    {
      id: 'samal_pluga',
      name: 'סגן מפקד פלוגה',
      personalNumber: '1000002',
      frameworkId: 'מפקדה',
      role: 'סגן מפקד פלוגה',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי צוותים'],
      presence: 'בבסיס'
    },
    
    // מפקדי פלגות
    {
      id: 'mefaked_plaga_a',
      name: 'מפקד פלגה א',
      personalNumber: '1000003',
      frameworkId: 'פלגה א',
      role: 'מפקד פלגה',
      profile: '97',
      qualifications: ['פיקוד', 'ניווט', 'קשר'],
      licenses: ['B', 'C'],
      certifications: ['קורס מפקדי צוותים'],
      presence: 'בבסיס'
    },
    {
      id: 'mefaked_plaga_b',
      name: 'מפקד פלגה ב',
      personalNumber: '1000004',
      frameworkId: 'פלגה ב',
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
      frameworkId: 'פלגה זווית',
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
      frameworkId: 'מפקדה',
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
      frameworkId: 'מפקדה',
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
      frameworkId: 'מפקדה',
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
      frameworkId: 'מפקדה',
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
      frameworkId: 'מפקדה',
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
      frameworkId: 'מפקדה',
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
      frameworkId: 'מפקדה',
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
      frameworkId: 'מפקדה',
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
      frameworkId: 'מפקדה',
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
      frameworkId: 'צוות 10',
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
      frameworkId: 'צוות 10',
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
      frameworkId: 'צוות 10',
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
      frameworkId: 'צוות 10',
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
      frameworkId: 'צוות 10',
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
      frameworkId: 'צוות 10',
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
      frameworkId: 'צוות 10',
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
      frameworkId: 'צוות 10',
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
      frameworkId: 'צוות 10',
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
      frameworkId: 'צוות 20',
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
      frameworkId: 'צוות 20',
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
      frameworkId: 'צוות 20',
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
      frameworkId: 'צוות 20',
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
      frameworkId: 'צוות 20',
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
      frameworkId: 'צוות 20',
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
      frameworkId: 'צוות 20',
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
      frameworkId: 'צוות 20',
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
      frameworkId: 'צוות 20',
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
      frameworkId: 'צוות 30',
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
      frameworkId: 'צוות 30',
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
      frameworkId: 'צוות 30',
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
      frameworkId: 'צוות 30',
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
      frameworkId: 'צוות 30',
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
      frameworkId: 'צוות 30',
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
      frameworkId: 'צוות 30',
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
      frameworkId: 'צוות 30',
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
      frameworkId: 'צוות 30',
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
      frameworkId: 'צוות 40',
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
      frameworkId: 'צוות 40',
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
      frameworkId: 'צוות 40',
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
      frameworkId: 'צוות 40',
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
      frameworkId: 'צוות 40',
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
      frameworkId: 'צוות 40',
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
      frameworkId: 'צוות 40',
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
      frameworkId: 'צוות 40',
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
      frameworkId: 'צוות 40',
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
      frameworkId: 'צוות 50',
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
      frameworkId: 'צוות 50',
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
      frameworkId: 'צוות 50',
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
      frameworkId: 'צוות 50',
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
      frameworkId: 'צוות 50',
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
      frameworkId: 'צוות 50',
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
      frameworkId: 'צוות 50',
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
      frameworkId: 'צוות 50',
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
      frameworkId: 'צוות 50',
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
      frameworkId: 'פלגה זווית',
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
      frameworkId: 'פלגה זווית',
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
      frameworkId: 'פלגה זווית',
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
      frameworkId: 'פלגה זווית',
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
      frameworkId: 'פלגה זווית',
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
          (!filterTeam || (s.frameworkId && s.frameworkId.includes(filterTeam))) &&
    (!filterRole || s.role.includes(filterRole)) &&
    (!filterQualification || (s.qualifications && s.qualifications.join(',').includes(filterQualification))) &&
    (!filterPresence || s.presence === filterPresence) &&
    (!searchTerm || s.name.includes(searchTerm) || s.personalNumber.includes(searchTerm))
  );

  const handleOpenForm = (soldier?: Soldier) => {
    setEditId(soldier?.id || null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditId(null);
  };

  const handleFormSuccess = (soldier: Soldier) => {
    refresh();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteSoldier(deleteId);
      setDeleteId(null);
      refresh();
    }
  };

  // פונקציות לניהול השדות הנראים
  const handleColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    setVisibleColumns(prev => 
      prev.map(col => 
        col.key === columnKey ? { ...col, visible } : col
      )
    );
  };

  const toggleAllColumns = (visible: boolean) => {
    setVisibleColumns(prev => 
      prev.map(col => ({ ...col, visible }))
    );
  };

  const resetToDefault = () => {
    setVisibleColumns(availableColumns);
  };

  // פונקציה לארגון החיילים לפי צוותים
  const getSoldiersByTeam = () => {
    const teams: { [key: string]: Soldier[] } = {};
    
    filteredData.forEach((soldier: Soldier) => {
      const frameworkId = soldier.frameworkId || 'לא מוגדר';
      if (!teams[frameworkId]) {
        teams[frameworkId] = [];
      }
      teams[frameworkId].push(soldier);
    });
    
    return teams;
  };

  // פונקציה ליצירת מבנה היררכי של הפלוגה
  const getHierarchicalStructure = () => {
    const structure = {
      pluga: {
        name: 'מפקדת פלוגה',
        type: 'pluga',
        soldiers: filteredData.filter(s => s.frameworkId === '1'), // פלוגת זיק"ת
        children: {
          plagaA: {
            name: 'פלגה א',
            type: 'plaga',
            soldiers: filteredData.filter(s => s.frameworkId === 'פלגה א'),
            children: {
              team1: {
                name: 'צוות 1',
                type: 'team',
                soldiers: filteredData.filter(s => s.frameworkId === 'צוות 1')
              },
              team2: {
                name: 'צוות 2',
                type: 'team',
                soldiers: filteredData.filter(s => s.frameworkId === 'צוות 2')
              },
              team3: {
                name: 'צוות 3',
                type: 'team',
                soldiers: filteredData.filter(s => s.frameworkId === 'צוות 3')
              }
            }
          },
          plagaB: {
            name: 'פלגה ב',
            type: 'plaga',
            soldiers: filteredData.filter(s => s.frameworkId === 'פלגה ב'),
            children: {
              team4: {
                name: 'צוות 4',
                type: 'team',
                soldiers: filteredData.filter(s => s.frameworkId === 'צוות 4')
              },
              team5: {
                name: 'צוות 5',
                type: 'team',
                soldiers: filteredData.filter(s => s.frameworkId === 'צוות 5')
              },
              team6: {
                name: 'צוות 6',
                type: 'team',
                soldiers: filteredData.filter(s => s.frameworkId === 'צוות 6')
              }
            }
          },
          plagaZavit: {
            name: 'פלגה זווית',
            type: 'plaga',
            soldiers: filteredData.filter(s => s.frameworkId === 'פלגה זווית'),
            children: {
              team7: {
                name: 'צוות 7',
                type: 'team',
                soldiers: filteredData.filter(s => s.frameworkId === 'צוות 7')
              },
              team8: {
                name: 'צוות 8',
                type: 'team',
                soldiers: filteredData.filter(s => s.frameworkId === 'צוות 8')
              }
            }
          },
          mplag: {
            name: 'מפל"ג',
            type: 'mplag',
            soldiers: filteredData.filter(s => s.frameworkId === 'מפל"ג')
          }
        }
      }
    };
    
    return structure;
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Tabs 
            value={viewMode} 
            onChange={(e, newValue) => setViewMode(newValue)}
          >
            <Tab label="תצוגת כרטיסים" value="cards" />
            <Tab label="תצוגה טבלאית" value="table" />
            <Tab label="תצוגה היררכית" value="hierarchy" />
          </Tabs>
          
          {viewMode === 'table' && (
            <Tooltip title="הגדרות עמודות">
              <IconButton 
                onClick={() => setShowColumnSettings(true)}
                color="primary"
                sx={{ ml: 2 }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
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
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, 
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
                  <FormControl fullWidth size="small">
                    <InputLabel>נוכחות</InputLabel>
                    <Select
                      value={filterPresence}
                      onChange={(e: any) => setFilterPresence(e.target.value)}
                      label="נוכחות"
                    >
                      <MenuItem value="">כל הנוכחויות</MenuItem>
                      <MenuItem value="בבסיס">בבסיס</MenuItem>
                      <MenuItem value="בפעילות">בפעילות</MenuItem>
                      <MenuItem value="חופש">חופש</MenuItem>
                      <MenuItem value="גימלים">גימלים</MenuItem>
                      <MenuItem value="אחר">אחר</MenuItem>
                    </Select>
                  </FormControl>
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
                {visibleColumns.filter(col => col.visible).map((column) => (
                  <TableCell key={column.key} sx={{ fontWeight: 'bold' }}>
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((soldier) => (
                <TableRow key={soldier.id} hover>
                  {visibleColumns.filter(col => col.visible).map((column) => {
                    switch (column.key) {
                      case 'name':
                        return (
                          <TableCell key={column.key}>
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
                        );
                      
                      case 'personalNumber':
                        return <TableCell key={column.key}>{soldier.personalNumber}</TableCell>;
                      
                      case 'team':
                        return (
                          <TableCell key={column.key}>
                            <Chip 
                              label={soldier.frameworkId} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': { 
                                  bgcolor: 'primary.main',
                                  color: 'white'
                                }
                              }}
                              onClick={() => {
                                const teamId = soldier.frameworkId?.replace('צוות ', '') || '';
                                navigate(`/teams/${teamId}`);
                              }}
                            />
                          </TableCell>
                        );
                      
                      case 'role':
                        return (
                          <TableCell key={column.key}>
                            <Chip label={soldier.role} size="small" color="secondary" variant="outlined" />
                          </TableCell>
                        );
                      
                      case 'framework':
                        return (
                          <TableCell key={column.key}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                             {/* מסגרת - יוצג מידע על המסגרת בעתיד */}
                            </Box>
                          </TableCell>
                        );
                      
                      case 'commanders':
                        return (
                          <TableCell key={column.key}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                             {/* מפקדים - יוצג מידע על המפקדים בעתיד */}
                            </Box>
                          </TableCell>
                        );
                      
                      case 'profile':
                        return (
                          <TableCell key={column.key}>
                            <Chip 
                              label={soldier.profile} 
                              size="small" 
                              color={getProfileColor(soldier.profile) as any}
                            />
                          </TableCell>
                        );
                      
                      case 'presence':
                        return (
                          <TableCell key={column.key}>
                            <Chip 
                              label={soldier.presence === 'אחר' && soldier.presenceOther ? `${soldier.presence} - ${soldier.presenceOther}` : soldier.presence || 'לא מוגדר'} 
                              size="small" 
                              sx={{ 
                                bgcolor: getPresenceColor(soldier.presence),
                                color: 'white',
                                fontWeight: 600
                              }}
                            />
                          </TableCell>
                        );
                      
                      case 'qualifications':
                        return (
                          <TableCell key={column.key}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {soldier.qualifications?.slice(0, 2).map((qual, index) => (
                                <Chip key={index} label={qual} size="small" variant="outlined" />
                              ))}
                              {soldier.qualifications && soldier.qualifications.length > 2 && (
                                <Chip label={`+${soldier.qualifications.length - 2}`} size="small" />
                              )}
                            </Box>
                          </TableCell>
                        );
                      
                      case 'licenses':
                        return (
                          <TableCell key={column.key}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {soldier.licenses?.map((license, index) => (
                                <Chip key={index} label={license} size="small" color="success" variant="outlined" />
                              ))}
                            </Box>
                          </TableCell>
                        );
                      
                      case 'drivingLicenses':
                        return (
                          <TableCell key={column.key}>
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
                        );
                      
                      case 'actions':
                        return (
                          <TableCell key={column.key}>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton size="small" color="primary" onClick={() => handleOpenForm(soldier)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => setDeleteId(soldier.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        );
                      
                      default:
                        return <TableCell key={column.key}></TableCell>;
                    }
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : viewMode === 'hierarchy' ? (
        // Hierarchical Visual View
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 4, 
          alignItems: 'center',
          minHeight: '600px',
          position: 'relative'
        }}>
          {/* מפקדת פלוגה - רמה ראשונה */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            position: 'relative'
          }}>
            {/* קו מחבר למטה */}
            <Box sx={{ 
              width: '2px', 
              height: '40px', 
              bgcolor: 'primary.main',
              mb: 1
            }} />
            
            {/* קוביית מפקדת פלוגה */}
            <Card sx={{ 
              bgcolor: 'primary.main', 
              color: 'white',
              minWidth: '200px',
              textAlign: 'center',
              boxShadow: 3,
              position: 'relative'
            }}>
              <CardContent sx={{ p: 2 }}>
                <SecurityIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  מפקדת פלוגה
                </Typography>
                <Typography variant="body2">
                  {getHierarchicalStructure().pluga.soldiers.length} חיילים
                </Typography>
              </CardContent>
            </Card>

            {/* קווים מחברים לפלגות */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              width: '100%', 
              maxWidth: '800px',
              mt: 2,
              position: 'relative'
            }}>
              {/* קו שמאלי */}
              <Box sx={{ 
                width: '2px', 
                height: '40px', 
                bgcolor: 'primary.main',
                position: 'absolute',
                left: '25%',
                top: '-20px'
              }} />
              
              {/* קו מרכזי */}
              <Box sx={{ 
                width: '2px', 
                height: '40px', 
                bgcolor: 'primary.main',
                position: 'absolute',
                left: '50%',
                top: '-20px',
                transform: 'translateX(-50%)'
              }} />
              
              {/* קו ימני */}
              <Box sx={{ 
                width: '2px', 
                height: '40px', 
                bgcolor: 'primary.main',
                position: 'absolute',
                right: '25%',
                top: '-20px'
              }} />
            </Box>
          </Box>

          {/* פלגות - רמה שנייה */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            width: '100%', 
            maxWidth: '800px',
            gap: 2
          }}>
            {/* פלגה א */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Card sx={{ 
                bgcolor: 'secondary.main', 
                color: 'white',
                width: '100%',
                textAlign: 'center',
                boxShadow: 2
              }}>
                <CardContent sx={{ p: 2 }}>
                  <SupervisorAccountIcon sx={{ fontSize: 30, mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    פלגה א
                  </Typography>
                  <Typography variant="body2">
                    {getHierarchicalStructure().pluga.children.plagaA.soldiers.length} חיילים
                  </Typography>
                </CardContent>
              </Card>

              {/* קווים מחברים לצוותים */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                width: '100%', 
                mt: 2,
                position: 'relative'
              }}>
                <Box sx={{ 
                  width: '2px', 
                  height: '30px', 
                  bgcolor: 'secondary.main',
                  position: 'absolute',
                  left: '33%',
                  top: '-15px'
                }} />
                <Box sx={{ 
                  width: '2px', 
                  height: '30px', 
                  bgcolor: 'secondary.main',
                  position: 'absolute',
                  left: '50%',
                  top: '-15px',
                  transform: 'translateX(-50%)'
                }} />
                <Box sx={{ 
                  width: '2px', 
                  height: '30px', 
                  bgcolor: 'secondary.main',
                  position: 'absolute',
                  right: '33%',
                  top: '-15px'
                }} />
              </Box>

              {/* צוותים */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                width: '100%', 
                mt: 2,
                gap: 1
              }}>
                {['צוות 1', 'צוות 2', 'צוות 3'].map((teamName, index) => {
                  const teamSoldiers = (getHierarchicalStructure().pluga.children.plagaA.children as any)[`team${index + 1}`]?.soldiers || [];
                  return (
                    <Card 
                      key={teamName}
                      sx={{ 
                        flex: 1,
                        bgcolor: 'grey.100',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => navigate(`/teams/${teamName}`)}
                    >
                      <CardContent sx={{ p: 1 }}>
                        <GroupIcon sx={{ fontSize: 20, mb: 0.5 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                          {teamName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {teamSoldiers.length}
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </Box>

            {/* פלגה ב */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Card sx={{ 
                bgcolor: 'secondary.main', 
                color: 'white',
                width: '100%',
                textAlign: 'center',
                boxShadow: 2
              }}>
                <CardContent sx={{ p: 2 }}>
                  <SupervisorAccountIcon sx={{ fontSize: 30, mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    פלגה ב
                  </Typography>
                  <Typography variant="body2">
                    {getHierarchicalStructure().pluga.children.plagaB.soldiers.length} חיילים
                  </Typography>
                </CardContent>
              </Card>

              {/* קווים מחברים לצוותים */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                width: '100%', 
                mt: 2,
                position: 'relative'
              }}>
                <Box sx={{ 
                  width: '2px', 
                  height: '30px', 
                  bgcolor: 'secondary.main',
                  position: 'absolute',
                  left: '33%',
                  top: '-15px'
                }} />
                <Box sx={{ 
                  width: '2px', 
                  height: '30px', 
                  bgcolor: 'secondary.main',
                  position: 'absolute',
                  left: '50%',
                  top: '-15px',
                  transform: 'translateX(-50%)'
                }} />
                <Box sx={{ 
                  width: '2px', 
                  height: '30px', 
                  bgcolor: 'secondary.main',
                  position: 'absolute',
                  right: '33%',
                  top: '-15px'
                }} />
              </Box>

              {/* צוותים */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                width: '100%', 
                mt: 2,
                gap: 1
              }}>
                {['צוות 4', 'צוות 5', 'צוות 6'].map((teamName, index) => {
                  const teamSoldiers = (getHierarchicalStructure().pluga.children.plagaB.children as any)[`team${index + 4}`]?.soldiers || [];
                  return (
                    <Card 
                      key={teamName}
                      sx={{ 
                        flex: 1,
                        bgcolor: 'grey.100',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => navigate(`/teams/${teamName}`)}
                    >
                      <CardContent sx={{ p: 1 }}>
                        <GroupIcon sx={{ fontSize: 20, mb: 0.5 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                          {teamName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {teamSoldiers.length}
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </Box>

            {/* פלגה זווית */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Card sx={{ 
                bgcolor: 'secondary.main', 
                color: 'white',
                width: '100%',
                textAlign: 'center',
                boxShadow: 2
              }}>
                <CardContent sx={{ p: 2 }}>
                  <SupervisorAccountIcon sx={{ fontSize: 30, mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    פלגה זווית
                  </Typography>
                  <Typography variant="body2">
                    {getHierarchicalStructure().pluga.children.plagaZavit.soldiers.length} חיילים
                  </Typography>
                </CardContent>
              </Card>

              {/* קווים מחברים לצוותים */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                width: '100%', 
                mt: 2,
                position: 'relative'
              }}>
                <Box sx={{ 
                  width: '2px', 
                  height: '30px', 
                  bgcolor: 'secondary.main',
                  position: 'absolute',
                  left: '50%',
                  top: '-15px',
                  transform: 'translateX(-50%)'
                }} />
              </Box>

              {/* צוותים */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                width: '100%', 
                mt: 2,
                gap: 1
              }}>
                {['צוות 7', 'צוות 8'].map((teamName, index) => {
                  const teamSoldiers = (getHierarchicalStructure().pluga.children.plagaZavit.children as any)[`team${index + 7}`]?.soldiers || [];
                  return (
                    <Card 
                      key={teamName}
                      sx={{ 
                        flex: 1,
                        bgcolor: 'grey.100',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => navigate(`/teams/${teamName}`)}
                    >
                      <CardContent sx={{ p: 1 }}>
                        <GroupIcon sx={{ fontSize: 20, mb: 0.5 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                          {teamName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {teamSoldiers.length}
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </Box>

            {/* מפל"ג */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Card sx={{ 
                bgcolor: 'warning.main', 
                color: 'white',
                width: '100%',
                textAlign: 'center',
                boxShadow: 2
              }}>
                <CardContent sx={{ p: 2 }}>
                  <PersonIcon sx={{ fontSize: 30, mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    מפל"ג
                  </Typography>
                  <Typography variant="body2">
                    {getHierarchicalStructure().pluga.children.mplag.soldiers.length} חיילים
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>
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
                border: `2px solid ${getPresenceColor(soldier.presence)}`,
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
                        label={soldier.frameworkId} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { 
                            bgcolor: 'primary.main',
                            color: 'white'
                          }
                        }}
                        onClick={() => {
                          const teamId = soldier.frameworkId?.replace('צוות ', '') || '';
                          navigate(`/teams/${teamId}`);
                        }}
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

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    נוכחות:
                  </Typography>
                  <Chip 
                    label={soldier.presence === 'אחר' && soldier.presenceOther ? `${soldier.presence} - ${soldier.presenceOther}` : soldier.presence || 'לא מוגדר'}
                    sx={{ 
                      bgcolor: getPresenceColor(soldier.presence),
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
      <SoldierForm
        open={showForm}
        onClose={handleCloseForm}
        soldier={editId ? soldiers.find(s => s.id === editId) || null : null}
        onSuccess={handleFormSuccess}
        mode={editId ? 'edit' : 'add'}
      />

      {/* Column Settings Dialog */}
      <Dialog 
        open={showColumnSettings} 
        onClose={() => setShowColumnSettings(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            <Typography>הגדרות עמודות</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              בחר אילו עמודות להציג בטבלה
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button 
                size="small" 
                variant="outlined"
                onClick={() => toggleAllColumns(true)}
              >
                הצג הכל
              </Button>
              <Button 
                size="small" 
                variant="outlined"
                onClick={() => toggleAllColumns(false)}
              >
                הסתר הכל
              </Button>
              <Button 
                size="small" 
                variant="outlined"
                onClick={resetToDefault}
              >
                ברירת מחדל
              </Button>
            </Box>
          </Box>
          
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {visibleColumns.map((column) => (
              <ListItem key={column.key} dense>
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={column.visible}
                    onChange={(e) => handleColumnVisibilityChange(column.key, e.target.checked)}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText 
                  primary={column.label}
                  sx={{ 
                    textDecoration: column.visible ? 'none' : 'line-through',
                    opacity: column.visible ? 1 : 0.6
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {column.visible ? (
                    <VisibilityIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  ) : (
                    <VisibilityOffIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowColumnSettings(false)}>
            סגור
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