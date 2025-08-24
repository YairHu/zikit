import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Alert,
  TextField
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,

} from 'recharts';
import { getCompletedActivities } from '../services/activityService';
import { Activity } from '../models/Activity';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`stats-tabpanel-${index}`}
      aria-labelledby={`stats-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ActivityStatistics: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedActivityType, setSelectedActivityType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const completedActivities = await getCompletedActivities();
      setActivities(completedActivities);
    } catch (error) {
      console.error('שגיאה בטעינת פעילויות:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // פילטור פעילויות
  const filteredActivities = activities.filter(activity => {
    if (selectedTeam !== 'all' && (activity.frameworkId || activity.team) !== selectedTeam) return false;
    if (selectedRegion !== 'all' && activity.region !== selectedRegion) return false;
    if (selectedActivityType !== 'all' && activity.activityType !== selectedActivityType) return false;
    
    // חיפוש דינמי בכל השדות
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        activity.name.toLowerCase().includes(searchLower) ||
        activity.location.toLowerCase().includes(searchLower) ||
        activity.commanderName.toLowerCase().includes(searchLower) ||
        activity.taskLeaderName?.toLowerCase().includes(searchLower) ||
        activity.activityType.toLowerCase().includes(searchLower) ||
        (activity.activityType === 'אחר' && activity.activityTypeOther?.toLowerCase().includes(searchLower)) ||
        activity.region.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  // נתונים לגרפים
  const teamStats = filteredActivities.reduce((acc, activity) => {
    const key = activity.frameworkId || activity.team || 'לא מוגדר';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const regionStats = filteredActivities.reduce((acc, activity) => {
    acc[activity.region] = (acc[activity.region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activityTypeStats = filteredActivities.reduce((acc, activity) => {
    const type = activity.activityType === 'אחר' && activity.activityTypeOther 
      ? activity.activityTypeOther 
      : activity.activityType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const durationStats = filteredActivities.reduce((acc, activity) => {
    const duration = activity.duration;
    if (duration <= 4) acc['1-4 שעות'] = (acc['1-4 שעות'] || 0) + 1;
    else if (duration <= 8) acc['5-8 שעות'] = (acc['5-8 שעות'] || 0) + 1;
    else acc['8+ שעות'] = (acc['8+ שעות'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const monthlyStats = filteredActivities.reduce((acc, activity) => {
    const date = new Date(activity.plannedDate);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // המרה לפורמט של Recharts
  const chartData = {
    teams: Object.entries(teamStats).map(([name, value]) => ({ name, value })),
    regions: Object.entries(regionStats).map(([name, value]) => ({ name, value })),
    activityTypes: Object.entries(activityTypeStats).map(([name, value]) => ({ name, value })),
    durations: Object.entries(durationStats).map(([name, value]) => ({ name, value })),
    monthly: Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({ name, value }))
  };

  const totalActivities = filteredActivities.length;
  const totalDuration = filteredActivities.reduce((sum, activity) => sum + activity.duration, 0);
  const avgDuration = totalActivities > 0 ? (totalDuration / totalActivities).toFixed(1) : 0;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>טוען סטטיסטיקות...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        סטטיסטיקות פעילויות שהסתיימו
      </Typography>

      {/* פילטרים */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            פילטרים
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              placeholder="חיפוש פעילויות..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ 
                minWidth: { xs: '100%', sm: 300 },
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
             <Box sx={{ flex: 1, minWidth: 200 }}>
               <FormControl fullWidth>
                 <InputLabel>צוות</InputLabel>
                 <Select
                   value={selectedTeam}
                   label="צוות"
                   onChange={(e) => setSelectedTeam(e.target.value)}
                 >
                   <MenuItem value="all">כל הצוותים</MenuItem>
                   {Array.from(new Set(activities.map(a => a.team))).map(team => (
                     <MenuItem key={team} value={team}>{team}</MenuItem>
                   ))}
                 </Select>
               </FormControl>
             </Box>
             <Box sx={{ flex: 1, minWidth: 200 }}>
               <FormControl fullWidth>
                 <InputLabel>אזור</InputLabel>
                 <Select
                   value={selectedRegion}
                   label="אזור"
                   onChange={(e) => setSelectedRegion(e.target.value)}
                 >
                   <MenuItem value="all">כל האזורים</MenuItem>
                   {Array.from(new Set(activities.map(a => a.region))).map(region => (
                     <MenuItem key={region} value={region}>{region}</MenuItem>
                   ))}
                 </Select>
               </FormControl>
             </Box>
             <Box sx={{ flex: 1, minWidth: 200 }}>
               <FormControl fullWidth>
                 <InputLabel>סוג פעילות</InputLabel>
                 <Select
                   value={selectedActivityType}
                   label="סוג פעילות"
                   onChange={(e) => setSelectedActivityType(e.target.value)}
                 >
                   <MenuItem value="all">כל הסוגים</MenuItem>
                   {Array.from(new Set(activities.map(a => 
                     a.activityType === 'אחר' && a.activityTypeOther 
                       ? a.activityTypeOther 
                       : a.activityType
                   ))).map(type => (
                     <MenuItem key={type} value={type}>{type}</MenuItem>
                   ))}
                 </Select>
               </FormControl>
             </Box>
           </Box>
        </CardContent>
      </Card>

      {/* סיכום כללי */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                סה"כ פעילויות
              </Typography>
              <Typography variant="h4">
                {totalActivities}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                שעות סה"כ
              </Typography>
              <Typography variant="h4">
                {totalDuration}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                ממוצע שעות
              </Typography>
              <Typography variant="h4">
                {avgDuration}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                צוותים פעילים
              </Typography>
              <Typography variant="h4">
                {Object.keys(teamStats).length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* גרפים */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="סטטיסטיקות">
          <Tab label="לפי צוותים" />
          <Tab label="לפי אזורים" />
          <Tab label="לפי סוג פעילות" />
          <Tab label="לפי משך זמן" />
          <Tab label="לפי חודשים" />
          <Tab label="טבלת נתונים" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            פעילויות לפי צוותים
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData.teams}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            פעילויות לפי אזורים
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData.regions}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  name && percent !== undefined
                    ? `${name} ${(percent * 100).toFixed(0)}%`
                    : name
                }
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.regions.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            פעילויות לפי סוג
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData.activityTypes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            פעילויות לפי משך זמן
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData.durations}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  name && percent !== undefined
                    ? `${name} ${(percent * 100).toFixed(0)}%`
                    : name
                }
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.durations.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>
            פעילויות לפי חודשים
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          <Typography variant="h6" gutterBottom>
            טבלת נתונים מפורטת
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>שם פעילות</TableCell>
                  <TableCell>צוות</TableCell>
                  <TableCell>אזור</TableCell>
                  <TableCell>סוג פעילות</TableCell>
                  <TableCell>תאריך</TableCell>
                  <TableCell>משך (שעות)</TableCell>
                  <TableCell>מפקד</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>{activity.name}</TableCell>
                    <TableCell>
                      <Chip label={activity.team} size="small" />
                    </TableCell>
                    <TableCell>{activity.region}</TableCell>
                    <TableCell>
                      {activity.activityType === 'אחר' && activity.activityTypeOther 
                        ? activity.activityTypeOther 
                        : activity.activityType}
                    </TableCell>
                    <TableCell>{new Date(activity.plannedDate).toLocaleDateString('he-IL')}</TableCell>
                    <TableCell>{activity.duration}</TableCell>
                    <TableCell>{activity.commanderName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {filteredActivities.length === 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          לא נמצאו פעילויות שהסתיימו עם הפילטרים הנוכחיים.
        </Alert>
      )}
    </Container>
  );
};

export default ActivityStatistics; 