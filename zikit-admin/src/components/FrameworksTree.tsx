import React, { useMemo, useState } from 'react';
import { Box, Card, CardContent, Typography, IconButton, Chip, Button, Skeleton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Framework } from '../models/Framework';
import { Soldier } from '../models/Soldier';
import {
  AccountTree as TreeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Groups as GroupsIcon,
  MilitaryTech as MilitaryTechIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon
} from '@mui/icons-material';
import { getStatusColor, getStatusLabelWithActivity, PresenceStatus } from '../utils/presenceStatus';

interface FrameworksTreeProps {
  frameworks: Framework[];
  soldiers: Soldier[];
  zoom: number;
  showSoldiers: boolean;
  showPresence: boolean;
  isLoading?: boolean;
}

const getFrameworkLevel = (frameworkName: string): 'COMPANY' | 'PLATOON' | 'TEAM' | 'SQUAD' | 'OTHER' => {
  const name = (frameworkName || '').toLowerCase();
  if (name.includes('פלוג') || name.includes('מפקד')) return 'COMPANY';
  if (name.includes('מחלק') || name.includes('פלג')) return 'PLATOON';
  if (name.includes('צוות')) return 'TEAM';
  if (name.includes('כיתה')) return 'SQUAD';
  return 'OTHER';
};

const getFrameworkColor = (level: string): string => {
  switch (level) {
    case 'COMPANY': return 'linear-gradient(135deg, #ef4444, #dc2626)';
    case 'PLATOON': return 'linear-gradient(135deg, #3b82f6, #2563eb)';
    case 'TEAM': return 'linear-gradient(135deg, #10b981, #059669)';
    case 'SQUAD': return 'linear-gradient(135deg, #f59e0b, #d97706)';
    default: return 'linear-gradient(135deg, #9ca3af, #6b7280)';
  }
};

// הוצאת הקומפוננטה הפנימית החוצה לביצועים טובים יותר
const FrameworkNode: React.FC<{ 
  framework: any; 
  level: number; 
  soldiers: Soldier[]; 
  showSoldiers: boolean; 
  showPresence: boolean;
  onNavigate: (path: string) => void;
}> = ({ framework, level, soldiers, showSoldiers, showPresence, onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const soldiersInFramework = soldiers.filter(s => s.frameworkId === framework.id);
  const hasChildren = (framework.children || []).length > 0;
  const commander = soldiers.find(s => s.id === framework.commanderId);
  const commanderName = commander?.name || 'לא מוגדר';
  const levelKey = getFrameworkLevel(framework.name);

  const staffSoldiers = soldiersInFramework.filter((s: Soldier) => {
    const isCommander = framework.commanderId && s.id === framework.commanderId;
    const isStaffRole = (s.role || '').includes('מפקד') || (s.role || '').includes('סמל') || (s.role || '').includes('רס');
    return isStaffRole && !isCommander;
  });
  
  const regularSoldiers = soldiersInFramework.filter((s: Soldier) => {
    const isCommander = framework.commanderId && s.id === framework.commanderId;
    const isStaffRole = (s.role || '').includes('מפקד') || (s.role || '').includes('סמל') || (s.role || '').includes('רס');
    return !isStaffRole && !isCommander;
  });

  const handleCommanderClick = () => {
    if (framework.commanderId) {
      onNavigate(`/soldiers/${framework.commanderId}`);
    }
  };

  const handleSoldierClick = (soldierId: string) => {
    onNavigate(`/soldiers/${soldierId}`);
  };

  const handleFrameworkClick = () => {
    onNavigate(`/frameworks/${framework.id}`);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        position: 'relative',
        minWidth: 'fit-content'
      }}
    >
      {/* הקו המחבר מלמעלה */}
      {level > 0 && (
        <Box 
          sx={{ 
            width: 2, 
            height: 24, 
            bgcolor: 'divider',
            mb: 1
          }} 
        />
      )}

      {/* כרטיס המסגרת */}
      <Card 
        sx={{ 
          borderRadius: 2, 
          overflow: 'hidden', 
          minWidth: 280, 
          maxWidth: 340, 
          boxShadow: 3,
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 4
          }
        }}
      >
        <Box 
          sx={{
            p: 2,
            color: '#fff',
            background: getFrameworkColor(levelKey),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TreeIcon fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {framework.name}
            </Typography>
          </Box>
          
          {hasChildren && (
            <IconButton 
              size="small" 
              onClick={() => setIsExpanded(!isExpanded)}
              sx={{ color: 'white' }}
              aria-label={isExpanded ? 'כווץ' : 'הרחב'}
            >
              {isExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
            </IconButton>
          )}
        </Box>

        <CardContent sx={{ bgcolor: 'background.paper' }}>
          {/* מפקד */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              mb: 1.5, 
              bgcolor: 'action.hover', 
              p: 1.5, 
              borderRadius: 1, 
              cursor: commander ? 'pointer' : 'default',
              transition: 'background-color 0.2s',
              '&:hover': commander ? { bgcolor: 'action.selected' } : {}
            }} 
            onClick={handleCommanderClick}
            role={commander ? 'button' : undefined}
            tabIndex={commander ? 0 : undefined}
            aria-label={commander ? `עבור לפרטי המפקד ${commanderName}` : undefined}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MilitaryTechIcon fontSize="small" color="warning" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                מפקד: {commanderName}
              </Typography>
            </Box>
            {showPresence && commander && (
              <Chip 
                size="small" 
                label={commander.presence || 'לא מוגדר'} 
                sx={{ 
                  bgcolor: getStatusColor((commander.presence || 'לא מוגדר') as PresenceStatus), 
                  color: '#fff', 
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }} 
              />
            )}
          </Box>

          {/* סטטיסטיקות */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            mb: showSoldiers ? 1.5 : 0 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupsIcon fontSize="small" color="action" />
              <Typography variant="caption">
                {soldiersInFramework.length} חיילים
              </Typography>
            </Box>
            <Typography variant="caption">
              {(framework.children || []).length} יחידות משנה
            </Typography>
          </Box>

          {/* רשימת חיילים */}
          {showSoldiers && soldiersInFramework.length > 0 && (
            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* סגל */}
              {staffSoldiers.length > 0 && (
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ color: 'warning.main', fontWeight: 700, mb: 1 }}
                  >
                    סגל ({staffSoldiers.length})
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0.75 }}>
                    {staffSoldiers.map((s: Soldier) => (
                      <Box 
                        key={s.id} 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          bgcolor: 'background.paper', 
                          p: 1, 
                          borderRadius: 1, 
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:hover': { bgcolor: 'action.selected' }
                        }} 
                        onClick={() => handleSoldierClick(s.id)}
                        role="button"
                        tabIndex={0}
                        aria-label={`עבור לפרטי ${s.name}`}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {s.name}
                        </Typography>
                        {showPresence && (
                          <Chip 
                            size="small" 
                            label={getStatusLabelWithActivity((s.presence || 'לא מוגדר') as PresenceStatus, s.currentActivityName) || 'לא מוגדר'} 
                            sx={{ 
                              bgcolor: getStatusColor((s.presence || 'לא מוגדר') as PresenceStatus), 
                              color: '#fff', 
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }} 
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* חיילים רגילים */}
              {regularSoldiers.length > 0 && (
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ fontWeight: 700, mb: 1 }}
                  >
                    חיילים ({regularSoldiers.length})
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0.75 }}>
                    {regularSoldiers.map((s: Soldier) => (
                      <Box 
                        key={s.id} 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          bgcolor: 'background.paper', 
                          p: 1, 
                          borderRadius: 1, 
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:hover': { bgcolor: 'action.selected' }
                        }} 
                        onClick={() => handleSoldierClick(s.id)}
                        role="button"
                        tabIndex={0}
                        aria-label={`עבור לפרטי ${s.name}`}
                      >
                        <Typography variant="body2">{s.name}</Typography>
                        {showPresence && (
                          <Chip 
                            size="small" 
                            label={getStatusLabelWithActivity((s.presence || 'לא מוגדר') as PresenceStatus, s.currentActivityName) || 'לא מוגדר'} 
                            sx={{ 
                              bgcolor: getStatusColor((s.presence || 'לא מוגדר') as PresenceStatus), 
                              color: '#fff', 
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }} 
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* כפתור פרטי מסגרת */}
          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              size="small" 
              onClick={handleFrameworkClick}
              sx={{ fontWeight: 600 }}
            >
              עמוד מסגרת
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* ילדים */}
      {hasChildren && isExpanded && (
        <Box sx={{ mt: 3, position: 'relative' }}>
          {/* קו אנכי מטה */}
          <Box 
            sx={{ 
              position: 'absolute',
              top: -12,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 2,
              height: 24,
              bgcolor: 'divider'
            }} 
          />
          
          {/* מיכל הילדים - הפתרון לבעיית הריכוז */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'flex-start',
              gap: 3,
              position: 'relative',
              pt: 1
            }}
          >
            {/* קו אופקי מעל הילדים */}
            {(framework.children || []).length > 1 && (
              <Box 
                sx={{ 
                  position: 'absolute',
                  top: 12,
                  height: 2,
                  bgcolor: 'divider',
                  left: `${100 / (framework.children.length * 2)}%`,
                  right: `${100 / (framework.children.length * 2)}%`
                }} 
              />
            )}
            
            {/* הילדים עצמם */}
            {(framework.children || []).map((child: any, index: number) => (
              <Box key={child.id} sx={{ position: 'relative' }}>
                {/* קו אנכי לכל ילד */}
                <Box 
                  sx={{ 
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 2,
                    height: 12,
                    bgcolor: 'divider'
                  }} 
                />
                <Box sx={{ pt: 1 }}>
                  <FrameworkNode 
                    framework={child} 
                    level={level + 1} 
                    soldiers={soldiers}
                    showSoldiers={showSoldiers}
                    showPresence={showPresence}
                    onNavigate={onNavigate}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

const LoadingSkeleton: React.FC = () => (
  <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
    {[1, 2, 3].map(i => (
      <Card key={i} sx={{ minWidth: 280, maxWidth: 340 }}>
        <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
          <Skeleton variant="text" width="70%" height={32} />
        </Box>
        <CardContent>
          <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </CardContent>
      </Card>
    ))}
  </Box>
);

const FrameworksTree: React.FC<FrameworksTreeProps> = ({ 
  frameworks, 
  soldiers, 
  zoom, 
  showSoldiers, 
  showPresence,
  isLoading = false
}) => {
  const navigate = useNavigate();

  const roots = useMemo(() => {
    if (isLoading || !frameworks.length) return [];
    
    const map = new Map<string, any>();
    frameworks.forEach(f => map.set(f.id, { ...f, children: [] as any[] }));
    
    const rootNodes: any[] = [];
    
    frameworks.forEach(f => {
      const node = map.get(f.id)!;
      if (f.parentFrameworkId) {
        const parent = map.get(f.parentFrameworkId);
        if (parent) {
          parent.children.push(node);
        } else {
          // אם האב לא נמצא, זה עדיין root
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });
    
    return rootNodes;
  }, [frameworks, isLoading]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  if (isLoading) {
    return (
      <Box sx={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh'
      }}>
        <LoadingSkeleton />
      </Box>
    );
  }

  if (!roots.length) {
    return (
      <Box sx={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <TreeIcon fontSize="large" color="disabled" />
        <Typography variant="h6" color="text.secondary">
          לא נמצאו מסגרות
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      overflow: 'auto',
      pb: 4
    }}>
      <Box 
        sx={{ 
          transform: `scale(${zoom})`, 
          transformOrigin: 'center top',
          display: 'flex', 
          justifyContent: 'center',
          minHeight: '60vh',
          p: 2
        }}
      >
        {/* המיכל הראשי - כאן הפתרון העיקרי לבעיית הריכוז */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 4, 
            alignItems: 'flex-start',
            justifyContent: 'center',
            flexWrap: 'nowrap',
            flexDirection: 'row'
          }}
        >
          {roots.map(framework => (
            <FrameworkNode 
              key={framework.id} 
              framework={framework} 
              level={0}
              soldiers={soldiers}
              showSoldiers={showSoldiers}
              showPresence={showPresence}
              onNavigate={handleNavigate}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default FrameworksTree;