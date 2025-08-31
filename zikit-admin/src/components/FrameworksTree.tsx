import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, IconButton, Chip, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Framework } from '../models/Framework';
import { Soldier } from '../models/Soldier';
import {
  AccountTree as TreeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Groups as GroupsIcon,
  MilitaryTech as MilitaryTechIcon
} from '@mui/icons-material';
import { getStatusColor, PresenceStatus } from '../utils/presenceStatus';

interface FrameworksTreeProps {
  frameworks: Framework[];
  soldiers: Soldier[];
  zoom: number;
  showSoldiers: boolean;
  showPresence: boolean;
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

const FrameworksTree: React.FC<FrameworksTreeProps> = ({ frameworks, soldiers, zoom, showSoldiers, showPresence }) => {
  const navigate = useNavigate();

  const roots = useMemo(() => {
    const map = new Map<string, any>();
    frameworks.forEach(f => map.set(f.id, { ...f, children: [] as any[] }));
    const r: any[] = [];
    frameworks.forEach(f => {
      const node = map.get(f.id)!;
      if (f.parentFrameworkId) {
        const parent = map.get(f.parentFrameworkId);
        if (parent) parent.children.push(node); else r.push(node);
      } else {
        r.push(node);
      }
    });
    return r;
  }, [frameworks]);

  const getFrameworkSoldiers = (frameworkId: string) => soldiers.filter(s => s.frameworkId === frameworkId);

  const FrameworkNode: React.FC<{ framework: any; level: number }> = ({ framework, level }) => {
    const soldiersInFramework = getFrameworkSoldiers(framework.id);
    const hasChildren = (framework.children || []).length > 0;
    const isExpanded = true; // תמיד מורחב
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

    return (
      <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', width: 'max-content' }}>
        {level > 0 && (
          <Box sx={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', width: 2, height: 16, bgcolor: 'divider' }} />
        )}

        <Box sx={{ display: 'inline-block', mt: level > 0 ? 2 : 0 }}>
          <Card sx={{ borderRadius: 2, overflow: 'hidden', minWidth: 260, maxWidth: 320, boxShadow: 3 }}>
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
            </Box>

            <CardContent sx={{ bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, bgcolor: 'action.hover', p: 1, borderRadius: 1, cursor: commander ? 'pointer' : 'default' }} onClick={() => {
                if (framework.commanderId) navigate(`/soldiers/${framework.commanderId}`);
              }}>
                <MilitaryTechIcon fontSize="small" color="warning" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>מפקד: {commanderName}</Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: showSoldiers ? 1.5 : 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupsIcon fontSize="small" color="action" />
                  <Typography variant="caption">{soldiersInFramework.length} חיילים</Typography>
                </Box>
                <Typography variant="caption">{(framework.children || []).length} יחידות משנה</Typography>
              </Box>

              {showSoldiers && soldiersInFramework.length > 0 && (
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {staffSoldiers.length > 0 && (
                    <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                      <Typography variant="subtitle2" sx={{ color: 'warning.main', fontWeight: 700, mb: 1 }}>סגל ({staffSoldiers.length})</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0.75 }}>
                        {staffSoldiers.map((s: Soldier) => (
                          <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'action.selected', p: 1, borderRadius: 1, cursor: 'pointer' }} onClick={() => navigate(`/soldiers/${s.id}`)}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{s.name}</Typography>
                            {showPresence && (
                              <Chip size="small" label={s.presence || ''} sx={{ bgcolor: getStatusColor((s.presence || 'בבסיס') as PresenceStatus), color: '#fff', fontWeight: 600 }} />
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {regularSoldiers.length > 0 && (
                    <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>חיילים ({regularSoldiers.length})</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0.75 }}>
                        {regularSoldiers.map((s: Soldier) => (
                          <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'action.selected', p: 1, borderRadius: 1, cursor: 'pointer' }} onClick={() => navigate(`/soldiers/${s.id}`)}>
                            <Typography variant="body2">{s.name}</Typography>
                            {showPresence && (
                              <Chip size="small" label={s.presence || ''} sx={{ bgcolor: getStatusColor((s.presence || 'בבסיס') as PresenceStatus), color: '#fff', fontWeight: 600 }} />
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => navigate(`/frameworks/${framework.id}`)}>עמוד מסגרת</Button>
              </Box>
            </CardContent>
          </Card>

          {hasChildren && isExpanded && (
            <Box sx={{ mt: 3, position: 'relative', px: 2, width: '100%' }}>
              <Box sx={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', width: 2, height: 16, bgcolor: 'divider' }} />
              <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 3, flexWrap: 'nowrap' }}>
                {(framework.children || []).length > 1 && (
                  <Box sx={{ position: 'absolute', top: -8, left: '12.5%', right: '12.5%', height: 2, bgcolor: 'divider' }} />
                )}
                {(framework.children || []).map((child: any) => (
                  <Box key={child.id} sx={{ position: 'relative', pt: 2 }}>
                    <Box sx={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 2, height: 8, bgcolor: 'divider' }} />
                    <FrameworkNode framework={child} level={level + 1} />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', overflow: 'auto' }}>
      <Box sx={{ transform: `scale(${zoom})`, transformOrigin: '0 0', display: 'flex', justifyContent: 'center', minWidth: '100%', minHeight: '60vh' }}>
        <Box sx={{ display: 'inline-flex', gap: 3, flexWrap: 'nowrap', justifyContent: 'center' }}>
          {roots.map(framework => (
            <FrameworkNode key={framework.id} framework={framework} level={0} />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default FrameworksTree;


