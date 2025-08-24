import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton
} from '@mui/material';
import {
  DirectionsCar as VehicleIcon,
  Person as DriverIcon,
  Schedule as TimeIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Trip } from '../models/Trip';
import { Vehicle } from '../models/Vehicle';
import { Soldier } from '../models/Soldier';
import { updateDriverStatuses, updateTripStatusesAutomatically } from '../services/tripService';
// import { updateActivityStatusesAutomatically } from '../services/activityService';
import { updateDutyStatusesAutomatically } from '../services/dutyService';
import { getSoldierCurrentStatus } from '../services/soldierService';
import TripsTimeline from './TripsTimeline';

interface TripsDashboardProps {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Soldier[];
  activities?: any[];
  frameworks?: any[];
  onRefresh: () => void;
  onAddTripFromTimeline?: (tripData: {
    departureTime: string;
    returnTime: string;
    vehicleId?: string;
    driverId?: string;
  }) => void;
}

interface DashboardStats {
  activeTrips: number;
  plannedTrips: number;
  availableVehicles: number;
  availableDrivers: number;
  driversOnTrip: number;
  driversResting: number;
  driversOnSickLeave: number;
  driversOnVacation: number;
  driversOther: number;
}

const TripsDashboard: React.FC<TripsDashboardProps> = ({
  trips,
  vehicles,
  drivers,
  activities = [],
  frameworks = [],
  onRefresh,
  onAddTripFromTimeline
}) => {
  // עדכון תקופתי של סטטוסים (כל 5 דקות)
  useEffect(() => {
    const updateStatuses = async () => {
      try {
        await Promise.all([
          updateTripStatusesAutomatically(),
          updateDriverStatuses(),
          updateDutyStatusesAutomatically()
        ]);
      } catch (error) {
        console.error('שגיאה בעדכון תקופתי של סטטוסים:', error);
      }
    };

    // עדכון ראשוני
    updateStatuses();

    // עדכון תקופתי כל 5 דקות
    const interval = setInterval(updateStatuses, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);


  // חישוב סטטיסטיקות - נסיעות בביצוע ומתוכננות
  const stats: DashboardStats = useMemo(() => {
    // נסיעות בביצוע
    const activeTrips = trips.filter(t => t.status === 'בביצוע');
    // נסיעות מתוכננות
    const plannedTrips = trips.filter(t => t.status === 'מתוכננת');
    
    // חישוב סטטוס נהגים לפי המערכת החדשה
    const driversOnTrip = drivers.filter(d => getSoldierCurrentStatus(d) === 'בנסיעה').length;
    const driversResting = drivers.filter(d => getSoldierCurrentStatus(d) === 'במנוחה').length;
    const driversOnSickLeave = drivers.filter(d => getSoldierCurrentStatus(d) === 'גימלים').length;
    const driversOnVacation = drivers.filter(d => getSoldierCurrentStatus(d) === 'חופש').length;
    const driversOther = drivers.filter(d => getSoldierCurrentStatus(d) === 'אחר').length;
    const availableDrivers = drivers.filter(d => getSoldierCurrentStatus(d) === 'בבסיס').length;
    
    return {
      activeTrips: activeTrips.length,
      plannedTrips: plannedTrips.length,
      availableVehicles: vehicles.filter(v => v.status === 'available').length,
      availableDrivers: availableDrivers,
      driversOnTrip: driversOnTrip,
      driversResting: driversResting,
      driversOnSickLeave: driversOnSickLeave,
      driversOnVacation: driversOnVacation,
      driversOther: driversOther
    };
  }, [trips, vehicles, drivers]);





  const handleRefresh = async () => {
    // עדכון אוטומטי של סטטוס נסיעות ונהגים
    await Promise.all([
      updateTripStatusesAutomatically(),
      updateDriverStatuses()
    ]);
    onRefresh();
  };







  return (
    <Box>
      {/* כותרת עם כפתור רענון */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2" sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
          דאשבורד נסיעות
        </Typography>
        <IconButton
          onClick={handleRefresh}
          sx={{ color: 'primary.main' }}
          title="רענן נתונים"
          size="small"
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* סטטיסטיקות - נסיעות בביצוע, רכבים ונהגים זמינים */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: { xs: 1, sm: 3 }, 
        mb: 3,
        justifyContent: { xs: 'space-between', sm: 'flex-start' }
      }}>
        <Card sx={{ 
          flex: { xs: '1 1 calc(50% - 4px)', sm: '1 1 250px' }, 
          minWidth: { xs: '140px', sm: '250px' },
          maxWidth: { xs: 'calc(50% - 4px)', sm: 'none' }
        }}>
          <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
            <Box display="flex" alignItems="center">
              <TimeIcon color="warning" sx={{ mr: 1, fontSize: { xs: '1.2rem', sm: '2rem' } }} />
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>{stats.activeTrips}</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
              נסיעות בביצוע
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
              {stats.plannedTrips} נסיעות מתוכננות
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ 
          flex: { xs: '1 1 calc(50% - 4px)', sm: '1 1 250px' }, 
          minWidth: { xs: '140px', sm: '250px' },
          maxWidth: { xs: 'calc(50% - 4px)', sm: 'none' }
        }}>
          <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
            <Box display="flex" alignItems="center">
              <VehicleIcon color="success" sx={{ mr: 1, fontSize: { xs: '1.2rem', sm: '2rem' } }} />
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>{stats.availableVehicles}</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
              רכבים זמינים
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
              מתוך {vehicles.length} רכבים
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ 
          flex: { xs: '1 1 100%', sm: '1 1 250px' }, 
          minWidth: { xs: '140px', sm: '250px' },
          maxWidth: { xs: '100%', sm: 'none' }
        }}>
          <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
            <Box display="flex" alignItems="center">
              <DriverIcon color="success" sx={{ mr: 1, fontSize: { xs: '1.2rem', sm: '2rem' } }} />
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>{stats.availableDrivers}</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
              נהגים זמינים
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Chip size="small" label={`${stats.driversOnTrip} בנסיעה`} color="warning" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }} />
              <Chip size="small" label={`${stats.driversResting} במנוחה`} color="info" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }} />
              <Chip size="small" label={`${stats.driversOnSickLeave} בגימלים`} sx={{ 
                fontSize: { xs: '0.6rem', sm: '0.75rem' },
                backgroundColor: '#FFD600',
                color: '#000'
              }} />
              <Chip size="small" label={`${stats.driversOnVacation} בחופש`} sx={{ 
                fontSize: { xs: '0.6rem', sm: '0.75rem' },
                backgroundColor: '#00BCD4',
                color: '#fff'
              }} />
              {stats.driversOther > 0 && (
                <Chip size="small" label={`${stats.driversOther} אחר`} sx={{ 
                  fontSize: { xs: '0.6rem', sm: '0.75rem' },
                  backgroundColor: '#9C27B0',
                  color: '#fff'
                }} />
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>



      {/* ציר זמן נסיעות */}
      <Box sx={{ mb: 3 }}>
        <TripsTimeline
          trips={trips}
          vehicles={vehicles}
          drivers={drivers}
          activities={activities}
          frameworks={frameworks}
          onAddTripFromTimeline={onAddTripFromTimeline}
        />
      </Box>


    </Box>
  );
};

export default TripsDashboard;
