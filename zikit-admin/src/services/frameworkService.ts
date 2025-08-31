import { Framework, FrameworkWithDetails, FrameworkTree } from '../models/Framework';
import { Soldier } from '../models/Soldier';
import { dataLayer } from './dataAccessLayer';
import { getAllSoldiers } from './soldierService';
import { getAllActivities, getActivitiesByTeam } from './activityService';
import { getAllDuties, getDutiesByTeam } from './dutyService';
import { getAllTrips, getTripsByTeam } from './tripService';
import { localStorageService, updateTableTimestamp } from './cacheService';
import { getAllReferrals } from './referralService';

export const getAllFrameworks = async (): Promise<Framework[]> => {
  return dataLayer.getAll('frameworks', {
    orderBy: [{ field: 'name', direction: 'asc' }]
  }) as Promise<Framework[]>;
};

export const getFrameworkById = async (id: string): Promise<Framework | null> => {
  return dataLayer.getById('frameworks', id) as Promise<Framework | null>;
};

export const getFrameworksByParent = async (parentId?: string): Promise<Framework[]> => {
  try {
    if (parentId) {
      return dataLayer.query('frameworks', {
        where: [{ field: 'parentFrameworkId', operator: '==', value: parentId }],
        orderBy: [{ field: 'name', direction: 'asc' }]
      }) as Promise<Framework[]>;
    } else {
      return dataLayer.query('frameworks', {
        where: [{ field: 'parentFrameworkId', operator: '==', value: null }],
        orderBy: [{ field: 'name', direction: 'asc' }]
      }) as Promise<Framework[]>;
    }
  } catch (error) {
    console.error('שגיאה בקבלת מסגרות לפי הורה:', error);
    return [];
  }
};

export const getFrameworkTree = async (): Promise<FrameworkTree[]> => {
  const [allFrameworks, allSoldiers] = await Promise.all([
    getAllFrameworks(),
    getAllSoldiers()
  ]);
  
  const buildTree = async (frameworks: Framework[], parentId?: string): Promise<FrameworkTree[]> => {
    const trees = await Promise.all(
      frameworks
        .filter(f => f.parentFrameworkId === parentId)
        .map(async framework => {
          const frameworkSoldiers = allSoldiers.filter(s => s.frameworkId === framework.id);
          const children = await buildTree(frameworks, framework.id);
          
          return {
            framework,
            children,
            soldiers: frameworkSoldiers.map(s => ({
              id: s.id,
              name: s.name,
              role: s.role,
              personalNumber: s.personalNumber
            }))
          };
        })
    );
    return trees;
  };

  return buildTree(allFrameworks);
};

export const createFramework = async (framework: Omit<Framework, 'id' | 'createdAt' | 'updatedAt'>): Promise<Framework> => {
  try {
    const id = await dataLayer.create('frameworks', framework as any);
    const created = await dataLayer.getById('frameworks', id);
    return created as Framework;
  } catch (error) {
    console.error('שגיאה ביצירת מסגרת:', error);
    throw error;
  }
};

export const updateFramework = async (id: string, updates: Partial<Omit<Framework, 'id' | 'createdAt'>>): Promise<Framework | null> => {
  try {
    await dataLayer.update('frameworks', id, updates);
    // החזרת המסגרת המעודכנת
    return await getFrameworkById(id);
  } catch (error) {
    console.error('שגיאה בעדכון מסגרת:', error);
    return null;
  }
};

export const deleteFramework = async (id: string): Promise<boolean> => {
  try {
    // בדיקה שאין מסגרות בנות
    const childFrameworks = await getFrameworksByParent(id);
    if (childFrameworks.length > 0) {
      console.error('לא ניתן למחוק מסגרת עם מסגרות בנות');
      return false;
    }
    
    // בדיקה שאין חיילים במסגרת
    const allSoldiers = await getAllSoldiers();
    const frameworkSoldiers = allSoldiers.filter(s => s.frameworkId === id);
    if (frameworkSoldiers.length > 0) {
      console.error('לא ניתן למחוק מסגרת עם חיילים');
      return false;
    }
    
    await dataLayer.delete('frameworks', id);
    return true;
  } catch (error) {
    console.error('שגיאה במחיקת מסגרת:', error);
    return false;
  }
};

export const getFrameworkWithDetails = async (id: string): Promise<FrameworkWithDetails | null> => {
  const framework = await getFrameworkById(id);
  if (!framework) return null;

  const [parentFramework, childFrameworks, allSoldiers] = await Promise.all([
    framework.parentFrameworkId ? getFrameworkById(framework.parentFrameworkId) : Promise.resolve(undefined),
    getFrameworksByParent(id),
    getAllSoldiers()
  ]);
  
  const frameworkSoldiers = allSoldiers.filter(s => s.frameworkId === id);
  const commander = allSoldiers.find(s => s.id === framework.commanderId);
  
  // חישוב סה"כ חיילים כולל במסגרות בנות
  const getAllSoldiersInHierarchy = async (frameworkId: string): Promise<number> => {
    const directSoldiers = allSoldiers.filter(s => s.frameworkId === frameworkId).length;
    const children = await getFrameworksByParent(frameworkId);
    const childrenSoldiers = await Promise.all(
      children.map(child => getAllSoldiersInHierarchy(child.id))
    );
    return directSoldiers + childrenSoldiers.reduce((sum, count) => sum + count, 0);
  };
  
  // קבלת כל החיילים בהיררכיה כולל מסגרות בנות
  const getAllSoldiersInHierarchyList = async (frameworkId: string): Promise<Soldier[]> => {
    const directSoldiers = allSoldiers.filter(s => s.frameworkId === frameworkId);
    const children = await getFrameworksByParent(frameworkId);
    const childrenSoldiers = await Promise.all(
      children.map(child => getAllSoldiersInHierarchyList(child.id))
    );
    return [...directSoldiers, ...childrenSoldiers.flat()];
  };

  // קבלת כל הפעילויות בהיררכיה כולל מסגרות בנות
  const getAllActivitiesInHierarchy = async (frameworkId: string): Promise<any[]> => {
    // קבלת כל הפעילויות
    const allActivities = await getAllActivities();
    
    // קבלת כל המסגרות בהיררכיה (כולל המסגרת הנוכחית ומסגרות בנות)
    const getAllFrameworkIdsInHierarchy = async (currentFrameworkId: string): Promise<string[]> => {
      const currentFramework = await getFrameworkById(currentFrameworkId);
      if (!currentFramework) return [currentFrameworkId];
      
      const children = await getFrameworksByParent(currentFrameworkId);
      const childrenIds = await Promise.all(
        children.map(child => getAllFrameworkIdsInHierarchy(child.id))
      );
      
      return [currentFrameworkId, ...childrenIds.flat()];
    };
    
    const frameworkIdsInHierarchy = await getAllFrameworkIdsInHierarchy(frameworkId);
    
    // קבלת שמות המסגרות בהיררכיה
    const allFrameworks = await getAllFrameworks();
    const frameworkNamesInHierarchy = frameworkIdsInHierarchy.map(id => {
      const framework = allFrameworks.find(f => f.id === id);
      return framework ? framework.name : id;
    });
    
    // קבלת כל החיילים בהיררכיה
    const allSoldiersInHierarchy = allSoldiers.filter(s => s.frameworkId && frameworkIdsInHierarchy.includes(s.frameworkId));
    const soldierIdsInHierarchy = allSoldiersInHierarchy.map(s => s.id);
    
    // סינון פעילויות שמתאימות למסגרות בהיררכיה
    const activitiesInHierarchy = allActivities.filter((activity: any) => {
      // אם הפעילות מוגדרת למסגרת בהיררכיה
      if (activity.frameworkId && frameworkIdsInHierarchy.includes(activity.frameworkId)) {
        return true;
      }
      
      // אם הפעילות מוגדרת לפי שם צוות שמתאים למסגרת בהיררכיה
      if (activity.team && frameworkNamesInHierarchy.includes(activity.team)) {
        return true;
      }
      
      // אם יש משתתפים מהמסגרת בהיררכיה
      if (activity.participants && activity.participants.some((p: any) => soldierIdsInHierarchy.includes(p.soldierId))) {
        return true;
      }
      
      // אם המפקד או מוביל המשימה הם מהמסגרת בהיררכיה
      if ((activity.commanderId && soldierIdsInHierarchy.includes(activity.commanderId)) ||
          (activity.taskLeaderId && soldierIdsInHierarchy.includes(activity.taskLeaderId))) {
        return true;
      }
      
      return false;
    });
    
    return activitiesInHierarchy.map((activity: any) => {
      // מציאת שם המסגרת המקורית
      let sourceFrameworkName = '';
      if (activity.frameworkId) {
        const framework = allFrameworks.find(f => f.id === activity.frameworkId);
        sourceFrameworkName = framework ? framework.name : activity.frameworkId;
      } else if (activity.team) {
        sourceFrameworkName = activity.team;
      }
      
      // מציאת המשתתפים מהמסגרת הנוכחית
      const participantsFromCurrentFramework: any[] = [];
      if (activity.participants) {
        activity.participants.forEach((participant: any) => {
          const soldier = allSoldiersInHierarchy.find(s => s.id === participant.soldierId);
          if (soldier) {
            participantsFromCurrentFramework.push({
              soldierId: soldier.id,
              soldierName: soldier.name,
              role: soldier.role,
              frameworkId: soldier.frameworkId,
              frameworkName: allFrameworks.find(f => f.id === soldier.frameworkId)?.name || soldier.frameworkId
            });
          }
        });
      }
      
      // מציאת מפקד/מוביל משימה מהמסגרת הנוכחית
      let commanderFromCurrentFramework = null;
      if (activity.commanderId) {
        const commander = allSoldiersInHierarchy.find(s => s.id === activity.commanderId);
        if (commander) {
          commanderFromCurrentFramework = {
            soldierId: commander.id,
            soldierName: commander.name,
            role: commander.role,
            frameworkId: commander.frameworkId,
            frameworkName: allFrameworks.find(f => f.id === commander.frameworkId)?.name || commander.frameworkId
          };
        }
      }
      
      let taskLeaderFromCurrentFramework = null;
      if (activity.taskLeaderId) {
        const taskLeader = allSoldiersInHierarchy.find(s => s.id === activity.taskLeaderId);
        if (taskLeader) {
          taskLeaderFromCurrentFramework = {
            soldierId: taskLeader.id,
            soldierName: taskLeader.name,
            role: taskLeader.role,
            frameworkId: taskLeader.frameworkId,
            frameworkName: allFrameworks.find(f => f.id === taskLeader.frameworkId)?.name || taskLeader.frameworkId
          };
        }
      }
      
      return { 
        ...activity, 
        frameworkId: activity.frameworkId || activity.team,
        sourceFrameworkName: sourceFrameworkName || '',
        participantsFromCurrentFramework,
        commanderFromCurrentFramework,
        taskLeaderFromCurrentFramework
      };
    });
  };

  // קבלת כל התורנויות בהיררכיה כולל מסגרות בנות
  const getAllDutiesInHierarchy = async (frameworkId: string): Promise<any[]> => {
    // קבלת כל התורנויות
    const allDuties = await getAllDuties();
    
    // קבלת כל המסגרות בהיררכיה (כולל המסגרת הנוכחית ומסגרות בנות)
    const getAllFrameworkIdsInHierarchy = async (currentFrameworkId: string): Promise<string[]> => {
      const currentFramework = await getFrameworkById(currentFrameworkId);
      if (!currentFramework) return [currentFrameworkId];
      
      const children = await getFrameworksByParent(currentFrameworkId);
      const childrenIds = await Promise.all(
        children.map(child => getAllFrameworkIdsInHierarchy(child.id))
      );
      
      return [currentFrameworkId, ...childrenIds.flat()];
    };
    
    const frameworkIdsInHierarchy = await getAllFrameworkIdsInHierarchy(frameworkId);
    
    // קבלת שמות המסגרות בהיררכיה
    const allFrameworks = await getAllFrameworks();
    const frameworkNamesInHierarchy = frameworkIdsInHierarchy.map(id => {
      const framework = allFrameworks.find(f => f.id === id);
      return framework ? framework.name : id;
    });
    
    // קבלת כל החיילים בהיררכיה
    const allSoldiersInHierarchy = allSoldiers.filter(s => s.frameworkId && frameworkIdsInHierarchy.includes(s.frameworkId));
    const soldierIdsInHierarchy = allSoldiersInHierarchy.map(s => s.id);
    
    // סינון תורנויות שמתאימות למסגרות בהיררכיה
    const dutiesInHierarchy = allDuties.filter((duty: any) => {
      // אם התורנות מוגדרת למסגרת בהיררכיה
      if (duty.frameworkId && frameworkIdsInHierarchy.includes(duty.frameworkId)) {
        return true;
      }
      
      // אם התורנות מוגדרת לפי שם צוות שמתאים למסגרת בהיררכיה
      if (duty.team && frameworkNamesInHierarchy.includes(duty.team)) {
        return true;
      }
      
      // אם יש משתתפים מהמסגרת בהיררכיה
      if (duty.participants && duty.participants.some((p: any) => soldierIdsInHierarchy.includes(p.soldierId))) {
        return true;
      }
      
      return false;
    });
    
    return dutiesInHierarchy.map((duty: any) => {
      // מציאת שם המסגרת המקורית
      let sourceFrameworkName = '';
      if (duty.frameworkId) {
        const framework = allFrameworks.find(f => f.id === duty.frameworkId);
        sourceFrameworkName = framework ? framework.name : duty.frameworkId;
      } else if (duty.team) {
        sourceFrameworkName = duty.team;
      }
      
      // מציאת המשתתפים מהמסגרת הנוכחית
      const participantsFromCurrentFramework: any[] = [];
      if (duty.participants) {
        duty.participants.forEach((participant: any) => {
          const soldier = allSoldiersInHierarchy.find(s => s.id === participant.soldierId);
          if (soldier) {
            participantsFromCurrentFramework.push({
              soldierId: soldier.id,
              soldierName: soldier.name,
              role: soldier.role,
              frameworkId: soldier.frameworkId,
              frameworkName: allFrameworks.find(f => f.id === soldier.frameworkId)?.name || soldier.frameworkId
            });
          }
        });
      }
      
      return { 
        ...duty, 
        frameworkId: duty.frameworkId || duty.team,
        sourceFrameworkName: sourceFrameworkName || '',
        participantsFromCurrentFramework
      };
    });
  };

  // קבלת כל הנסיעות בהיררכיה כולל מסגרות בנות
  const getAllTripsInHierarchy = async (frameworkId: string): Promise<any[]> => {
    // קבלת כל הנסיעות
    const allTrips = await getAllTrips();
    
    // קבלת כל המסגרות בהיררכיה (כולל המסגרת הנוכחית ומסגרות בנות)
    const getAllFrameworkIdsInHierarchy = async (currentFrameworkId: string): Promise<string[]> => {
      const currentFramework = await getFrameworkById(currentFrameworkId);
      if (!currentFramework) return [currentFrameworkId];
      
      const children = await getFrameworksByParent(currentFrameworkId);
      const childrenIds = await Promise.all(
        children.map(child => getAllFrameworkIdsInHierarchy(child.id))
      );
      
      return [currentFrameworkId, ...childrenIds.flat()];
    };
    
    const frameworkIdsInHierarchy = await getAllFrameworkIdsInHierarchy(frameworkId);
    
    // קבלת שמות המסגרות בהיררכיה
    const allFrameworks = await getAllFrameworks();
    const frameworkNamesInHierarchy = frameworkIdsInHierarchy.map(id => {
      const framework = allFrameworks.find(f => f.id === id);
      return framework ? framework.name : id;
    });
    
    // קבלת כל החיילים בהיררכיה
    const allSoldiersInHierarchy = allSoldiers.filter(s => s.frameworkId && frameworkIdsInHierarchy.includes(s.frameworkId));
    const soldierIdsInHierarchy = allSoldiersInHierarchy.map(s => s.id);
    
    // סינון נסיעות שמתאימות למסגרות בהיררכיה
    const tripsInHierarchy = allTrips.filter((trip: any) => {
      // אם הנסיעה מוגדרת למסגרת בהיררכיה
      if (trip.frameworkId && frameworkIdsInHierarchy.includes(trip.frameworkId)) {
        return true;
      }
      
      // אם הנסיעה מוגדרת לפי שם צוות שמתאים למסגרת בהיררכיה
      if (trip.team && frameworkNamesInHierarchy.includes(trip.team)) {
        return true;
      }
      
      // אם הנהג הוא מהמסגרת בהיררכיה
      if (trip.driverId && soldierIdsInHierarchy.includes(trip.driverId)) {
        return true;
      }
      
      // אם מפקד הנסיעה הוא מהמסגרת בהיררכיה
      if (trip.commanderId && soldierIdsInHierarchy.includes(trip.commanderId)) {
        return true;
      }
      
      return false;
    });
    
    return tripsInHierarchy.map((trip: any) => {
      // מציאת שם המסגרת המקורית
      let sourceFrameworkName = '';
      if (trip.frameworkId) {
        const framework = allFrameworks.find(f => f.id === trip.frameworkId);
        sourceFrameworkName = framework ? framework.name : trip.frameworkId;
      } else if (trip.team) {
        sourceFrameworkName = trip.team;
      }
      
      // מציאת הנהג מהמסגרת הנוכחית
      let driverFromCurrentFramework = null;
      if (trip.driverId) {
        const driver = allSoldiersInHierarchy.find(s => s.id === trip.driverId);
        if (driver) {
          driverFromCurrentFramework = {
            soldierId: driver.id,
            soldierName: driver.name,
            role: driver.role,
            frameworkId: driver.frameworkId,
            frameworkName: allFrameworks.find(f => f.id === driver.frameworkId)?.name || driver.frameworkId
          };
        }
      }
      
      // מציאת מפקד הנסיעה מהמסגרת הנוכחית
      let commanderFromCurrentFramework = null;
      if (trip.commanderId) {
        const commander = allSoldiersInHierarchy.find(s => s.id === trip.commanderId);
        if (commander) {
          commanderFromCurrentFramework = {
            soldierId: commander.id,
            soldierName: commander.name,
            role: commander.role,
            frameworkId: commander.frameworkId,
            frameworkName: allFrameworks.find(f => f.id === commander.frameworkId)?.name || commander.frameworkId
          };
        }
      }
      
      return { 
        ...trip, 
        frameworkId: trip.frameworkId || trip.team,
        sourceFrameworkName: sourceFrameworkName || '',
        driverFromCurrentFramework,
        commanderFromCurrentFramework
      };
    });
  };
  
  // קבלת כל ההפניות בהיררכיה כולל מסגרות בנות
  const getAllReferralsInHierarchy = async (frameworkId: string): Promise<any[]> => {
    // קבלת כל ההפניות
    const allReferrals = await getAllReferrals();
    
    // קבלת כל המסגרות בהיררכיה (כולל המסגרת הנוכחית ומסגרות בנות)
    const getAllFrameworkIdsInHierarchy = async (currentFrameworkId: string): Promise<string[]> => {
      const currentFramework = await getFrameworkById(currentFrameworkId);
      if (!currentFramework) return [currentFrameworkId];
      
      const children = await getFrameworksByParent(currentFrameworkId);
      const childrenIds = await Promise.all(
        children.map(child => getAllFrameworkIdsInHierarchy(child.id))
      );
      
      return [currentFrameworkId, ...childrenIds.flat()];
    };
    
    const frameworkIdsInHierarchy = await getAllFrameworkIdsInHierarchy(frameworkId);
    
    // קבלת שמות המסגרות בהיררכיה
    const allFrameworks = await getAllFrameworks();
    const frameworkNamesInHierarchy = frameworkIdsInHierarchy.map(id => {
      const framework = allFrameworks.find(f => f.id === id);
      return framework ? framework.name : id;
    });
    
    // קבלת כל החיילים בהיררכיה
    const allSoldiersInHierarchy = allSoldiers.filter(s => s.frameworkId && frameworkIdsInHierarchy.includes(s.frameworkId));
    const soldierIdsInHierarchy = allSoldiersInHierarchy.map(s => s.id);
    
    // סינון הפניות שמתאימות למסגרות בהיררכיה
    const referralsInHierarchy = allReferrals.filter((referral: any) => {
      // אם ההפניה מוגדרת למסגרת בהיררכיה
      if (referral.frameworkId && frameworkIdsInHierarchy.includes(referral.frameworkId)) {
        return true;
      }
      
      // אם ההפניה מוגדרת לפי שם צוות שמתאים למסגרת בהיררכיה
      if (referral.team && frameworkNamesInHierarchy.includes(referral.team)) {
        return true;
      }
      
      // אם החייל הוא מהמסגרת בהיררכיה
      if (referral.soldierId && soldierIdsInHierarchy.includes(referral.soldierId)) {
        return true;
      }
      
      return false;
    });
    
    return referralsInHierarchy.map((referral: any) => {
      // מציאת שם המסגרת המקורית
      let sourceFrameworkName = '';
      if (referral.frameworkId) {
        const framework = allFrameworks.find(f => f.id === referral.frameworkId);
        sourceFrameworkName = framework ? framework.name : referral.frameworkId;
      } else if (referral.team) {
        sourceFrameworkName = referral.team;
      }
      
      return { 
        ...referral, 
        frameworkId: referral.frameworkId || referral.team,
        sourceFrameworkName: sourceFrameworkName || ''
      };
    });
  };
  
  const [totalSoldiers, allSoldiersInHierarchy, activities, duties, trips, referrals] = await Promise.all([
    getAllSoldiersInHierarchy(id),
    getAllSoldiersInHierarchyList(id),
    getAllActivitiesInHierarchy(id),
    getAllDutiesInHierarchy(id),
    getAllTripsInHierarchy(id),
    getAllReferralsInHierarchy(id)
  ]);
  
  return {
    ...framework,
    parentFramework: parentFramework || undefined,
    commander: commander ? {
      id: commander.id,
      name: commander.name,
      rank: commander.role
    } : {
      id: framework.commanderId,
      name: 'לא נמצא',
      rank: ''
    },
    childFrameworks,
    soldiers: frameworkSoldiers.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role,
      personalNumber: s.personalNumber,
      presence: s.presence,
      absenceUntil: s.absenceUntil,
      presenceOther: s.presenceOther
    })),
    allSoldiersInHierarchy: allSoldiersInHierarchy.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role,
      personalNumber: s.personalNumber,
      frameworkId: s.frameworkId || '',
      presence: s.presence,
      absenceUntil: s.absenceUntil,
      presenceOther: s.presenceOther
    })),
    totalSoldiers,
    activities,
    duties,
    trips,
    referrals,
    totalActivities: activities.length,
    totalDuties: duties.length,
    totalTrips: trips.length,
    totalReferrals: referrals.length
  };
};

export const getFrameworkNameById = async (id: string): Promise<string> => {
  try {
    const framework = await getFrameworkById(id);
    return framework ? framework.name : 'לא נמצא';
  } catch (error) {
    console.error('שגיאה בקבלת שם מסגרת:', error);
    return 'שגיאה';
  }
};

// פונקציה לקבלת שמות מסגרות מרובים
export const getFrameworkNamesByIds = async (ids: string[]): Promise<{ [key: string]: string }> => {
  try {
    const frameworks = await getAllFrameworks();
    const namesMap: { [key: string]: string } = {};
    
    ids.forEach(id => {
      const framework = frameworks.find(f => f.id === id);
      namesMap[id] = framework ? framework.name : 'לא נמצא';
    });
    
    return namesMap;
  } catch (error) {
    console.error('שגיאה בקבלת שמות מסגרות:', error);
    return {};
  }
};

export const getAllSoldiersInFrameworkHierarchy = async (frameworkId: string): Promise<any[]> => {
  try {
    const allSoldiers = await getAllSoldiers();
    const allFrameworks = await getAllFrameworks();
    
    const getAllSoldiersInHierarchy = (currentFrameworkId: string): any[] => {
      const directSoldiers = allSoldiers.filter(s => s.frameworkId === currentFrameworkId);
      const childFrameworks = allFrameworks.filter(f => f.parentFrameworkId === currentFrameworkId);
      const childSoldiers = childFrameworks.flatMap(child => getAllSoldiersInHierarchy(child.id));
      return [...directSoldiers, ...childSoldiers];
    };
    
    return getAllSoldiersInHierarchy(frameworkId);
  } catch (error) {
    console.error('שגיאה בקבלת חיילים בהיררכיה:', error);
    return [];
  }
};

