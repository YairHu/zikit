import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  CleaningServices as CleaningIcon
} from '@mui/icons-material';
import { localStorageService, checkTableUpdatesStatus } from '../services/cacheService';
import { formatToIsraelString } from '../utils/dateUtils';

interface CacheInfo {
  tableCount: number;
  entries: Array<{
    key: string;
    lastUpdated: Date;
    isStale: boolean;
  }>;
}

interface TableUpdatesStatus {
  exists: boolean;
  tableCount: number;
  tables: string[];
}

const CacheMonitor: React.FC = () => {
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [tableUpdatesStatus, setTableUpdatesStatus] = useState<TableUpdatesStatus | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadLocalStorageInfo = async () => {
    const info = localStorageService.getLocalStorageInfo();
    setCacheInfo(info);
    
    const status = await checkTableUpdatesStatus();
    setTableUpdatesStatus(status);
    
    setLastRefresh(new Date());
  };

  useEffect(() => {
    loadLocalStorageInfo();
  }, []);

  const handleRefresh = async () => {
    await loadLocalStorageInfo();
  };

  const handleClearAll = async () => {
    localStorageService.clearAllLocalStorage();
    await loadLocalStorageInfo();
  };

  const handleCleanupOld = async () => {
    localStorageService.cleanupOldLocalStorage();
    await loadLocalStorageInfo();
  };

  const handleClearTable = async (tableName: string) => {
    localStorageService.invalidateLocalStorage(tableName);
    await loadLocalStorageInfo();
  };

  const formatTime = (date: Date) => {
    return formatToIsraelString(date, { hour: '2-digit', minute: '2-digit' });
  };

  const getCacheStatus = (isStale: boolean, lastUpdated: Date) => {
    const now = new Date();
    const age = (now.getTime() - lastUpdated.getTime()) / 1000;
    
    if (isStale) {
      return { status: 'stale', label: 'לא מעודכן', color: 'error' as const };
    } else if (age < 3600) { // פחות משעה
      return { status: 'fresh', label: 'טרי', color: 'success' as const };
    } else if (age < 86400) { // פחות מיום
      return { status: 'recent', label: 'עדכני', color: 'warning' as const };
    } else if (age < 604800) { // פחות משבוע
      return { status: 'recent', label: 'עדכני', color: 'warning' as const };
    } else {
      return { status: 'old', label: 'ישן', color: 'error' as const };
    }
  };

  if (!cacheInfo) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          ניטור מטמון מקומי
        </Typography>
        <Alert severity="info">
          טוען מידע על המטמון המקומי...
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          ניטור מטמון מקומי
        </Typography>
                 <Box>
           <Tooltip title="רענן מידע">
             <IconButton onClick={handleRefresh} color="primary">
               <RefreshIcon />
             </IconButton>
           </Tooltip>
           <Tooltip title="נקה מטמון מקומי ישן">
             <IconButton onClick={handleCleanupOld} color="warning">
               <CleaningIcon />
             </IconButton>
           </Tooltip>
           <Tooltip title="נקה כל המטמון המקומי">
             <IconButton onClick={handleClearAll} color="error">
               <ClearIcon />
             </IconButton>
           </Tooltip>
         </Box>
      </Box>

             <Box mb={3}>
         <Box display="flex" gap={2} flexWrap="wrap">
           <Card sx={{ flex: 1, minWidth: 250 }}>
             <CardContent>
               <Box display="flex" justifyContent="space-between" alignItems="center">
                 <Box>
                   <Typography variant="h6" gutterBottom>
                     סיכום מטמון
                   </Typography>
                   <Typography variant="body2" color="text.secondary">
                     נדפס לאחרונה: {formatTime(lastRefresh)}
                   </Typography>
                 </Box>
                 <Box textAlign="center">
                   <Typography variant="h3" color="primary">
                     {cacheInfo.tableCount}
                   </Typography>
                   <Typography variant="body2" color="text.secondary">
                     טבלאות במטמון
                   </Typography>
                 </Box>
               </Box>
             </CardContent>
           </Card>
           
           {tableUpdatesStatus && (
             <Card sx={{ flex: 1, minWidth: 250 }}>
               <CardContent>
                 <Box display="flex" justifyContent="space-between" alignItems="center">
                   <Box>
                     <Typography variant="h6" gutterBottom>
                       טבלת עדכונים
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                       מצב: {tableUpdatesStatus.exists ? 'קיימת' : 'לא קיימת'}
                     </Typography>
                   </Box>
                   <Box textAlign="center">
                     <Typography variant="h3" color={tableUpdatesStatus.exists ? 'success' : 'error'}>
                       {tableUpdatesStatus.tableCount}
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                       טבלאות במעקב
                     </Typography>
                   </Box>
                 </Box>
               </CardContent>
             </Card>
           )}
         </Box>
       </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            פרטי מטמון
          </Typography>
          
          {cacheInfo.entries.length === 0 ? (
            <Alert severity="info" icon={<InfoIcon />}>
              אין נתונים במטמון כרגע
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>טבלה</TableCell>
                    <TableCell>סטטוס</TableCell>
                    <TableCell>עודכן לאחרונה</TableCell>
                    <TableCell>גיל (שניות)</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cacheInfo.entries.map((entry) => {
                    const status = getCacheStatus(entry.isStale, entry.lastUpdated);
                    const age = Math.floor((new Date().getTime() - entry.lastUpdated.getTime()) / 1000);
                    
                    return (
                      <TableRow key={entry.key}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {entry.key}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={status.label}
                            color={status.color}
                            size="small"
                            icon={status.color === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatTime(entry.lastUpdated)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {age}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="נקה מטמון לטבלה זו">
                            <IconButton
                              size="small"
                              onClick={() => handleClearTable(entry.key)}
                              color="error"
                            >
                              <ClearIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

             <Box mt={3}>
         <Alert severity="info" icon={<InfoIcon />}>
           <Typography variant="body2">
             <strong>מידע על המטמון המקומי:</strong>
             <br />
             • המטמון שומר נתונים למשך שבוע (7 ימים)
             <br />
             • הנתונים נשמרים ב-localStorage ולא נמחקים בריענון
             <br />
             • כאשר נתונים משתנים במסד הנתונים, המטמון מתעדכן אוטומטית
             <br />
             • טבלת העדכונים נוצרת אוטומטית אם היא לא קיימת
             <br />
             • כפתור "רענן" מעדכן את המידע המוצג
             <br />
             • כפתור "נקה" מוחק את כל הנתונים מהמטמון
           </Typography>
         </Alert>
       </Box>
    </Box>
  );
};

export default CacheMonitor;
