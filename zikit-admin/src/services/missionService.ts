import { Mission } from '../models/Mission';
import { dataLayer } from './dataAccessLayer';

import { getCurrentIsraelTime } from '../utils/dateUtils';
import { getAllSoldiers } from './soldierService';
import { getUserById } from './userService';
import { canUserAccessPath } from './permissionService';
import { SystemPath, PermissionLevel, DataScope } from '../models/UserRole';

const COLLECTION_NAME = 'missions';

// פונקציה פשוטה לקבלת היקף הנתונים של משתמש
const getUserDataScope = async (userId: string, systemPath: SystemPath): Promise<DataScope> => {
  try {
    // בדיקה אם למשתמש יש הרשאת צפייה בכל הנתונים
    const canViewAll = await canUserAccessPath(userId, systemPath, PermissionLevel.VIEW);
    if (canViewAll) {
      // בדיקה אם למשתמש יש הרשאת עריכה - סימן שיש לו גישה לכל הנתונים
      const canEdit = await canUserAccessPath(userId, systemPath, PermissionLevel.EDIT);
      if (canEdit) {
        return DataScope.ALL_DATA;
      }
      // אם יש לו רק הרשאת צפייה - כנראה רק למסגרת שלו
      return DataScope.FRAMEWORK_ONLY;
    }
    // אם אין לו הרשאת צפייה כלל - רק לעצמו
    return DataScope.USER_ONLY;
  } catch (error) {
    console.error('Error getting user data scope:', error);
    return DataScope.USER_ONLY;
  }
};

export const getAllMissions = async (): Promise<Mission[]> => {
  return await dataLayer.getAll(COLLECTION_NAME) as unknown as Promise<Mission[]>;
};

export const getMissionById = async (id: string): Promise<Mission | null> => {
  return await dataLayer.getById(COLLECTION_NAME, id) as unknown as Promise<Mission | null>;
};

export const addMission = async (mission: Omit<Mission, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const missionData = {
    ...mission,
    createdAt: getCurrentIsraelTime(),
    updatedAt: getCurrentIsraelTime()
  };
  
  return await dataLayer.create(COLLECTION_NAME, missionData as any);
};

export const updateMission = async (id: string, updates: Partial<Mission>): Promise<void> => {
  const updateData = {
    ...updates,
    updatedAt: getCurrentIsraelTime()
  };
  
  await dataLayer.update(COLLECTION_NAME, id, updateData as any);
};

export const deleteMission = async (id: string): Promise<void> => {
  return dataLayer.delete('missions', id);
};

// פונקציה לקבלת משימות לפי הרשאות משתמש
export const getMissionsByUserPermissions = async (userId: string): Promise<Mission[]> => {
  try {
    // בדיקת הרשאות המשתמש
    const canView = await canUserAccessPath(userId, SystemPath.MISSIONS, PermissionLevel.VIEW);
    if (!canView) {
      return [];
    }

    // קבלת כל המשימות
    const allMissions = await getAllMissions();
    
    // קבלת היקף הנתונים של המשתמש
    const dataScope = await getUserDataScope(userId, SystemPath.MISSIONS);
    
    // סינון לפי היקף הנתונים
    let filteredMissions: Mission[] = [];
    
    switch (dataScope) {
      case DataScope.USER_ONLY:
        // רק המשימות של המשתמש עצמו
        filteredMissions = allMissions.filter(mission => 
          mission.assignedToSoldiers?.includes(userId)
        );
        break;
        
      case DataScope.FRAMEWORK_ONLY:
        // המשימות של כל החיילים במסגרת של המשתמש
        const user = await getUserById(userId);
        if (user?.team) {
          const frameworkSoldiers = await getSoldiersByFramework(user.team);
          const frameworkSoldierIds = frameworkSoldiers.map(s => s.id);
          filteredMissions = allMissions.filter(mission => 
            mission.assignedToSoldiers?.some(soldierId => frameworkSoldierIds.includes(soldierId))
          );
        }
        break;
        
      case DataScope.ALL_DATA:
        // כל המשימות
        filteredMissions = allMissions;
        break;
        
      default:
        filteredMissions = [];
    }
    
    // מיון לפי תאריך יעד
    return filteredMissions.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  } catch (error) {
    console.error('Error getting missions by user permissions:', error);
    return [];
  }
};

// פונקציה לקבלת חיילים לפי הרשאות משתמש
export const getAvailableSoldiersByPermissions = async (userId: string): Promise<{ id: string; name: string }[]> => {
  try {
    const allSoldiers = await getAllSoldiers();
    const dataScope = await getUserDataScope(userId, SystemPath.MISSIONS);
    
    switch (dataScope) {
      case DataScope.USER_ONLY:
        // רק המשתמש עצמו
        const user = await getUserById(userId);
        return user ? [{ id: userId, name: user.displayName || user.email }] : [];
        
      case DataScope.FRAMEWORK_ONLY:
        // כל החיילים במסגרת של המשתמש
        const currentUser = await getUserById(userId);
        if (currentUser?.team) {
          return allSoldiers
            .filter(soldier => soldier.frameworkId === currentUser.team)
            .map(soldier => ({ 
              id: soldier.id, 
              name: soldier.name || soldier.email || 'חייל ללא שם'
            }));
        }
        return [];
        
      case DataScope.ALL_DATA:
        // כל החיילים
        return allSoldiers.map(soldier => ({ 
          id: soldier.id, 
          name: soldier.name || soldier.email || 'חייל ללא שם'
        }));
        
      default:
        return [];
    }
  } catch (error) {
    console.error('Error getting available soldiers by permissions:', error);
    return [];
  }
};

// פונקציה לקבלת חיילים במסגרת
const getSoldiersByFramework = async (frameworkId: string) => {
  const allSoldiers = await getAllSoldiers();
  return allSoldiers.filter(soldier => soldier.frameworkId === frameworkId);
};

export const getMissionsBySoldier = async (soldierId: string): Promise<Mission[]> => {
  try {
    // קבל את כל המשימות וסנן בצד הלקוח
    const allMissions = await dataLayer.getAll(COLLECTION_NAME) as unknown as Mission[];
    return allMissions
      .filter(mission => 
        mission.assignedToSoldiers?.includes(soldierId)
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  } catch (error) {
    console.error('Error getting missions by soldier:', error);
    return [];
  }
};

export const getMissionsByFramework = async (frameworkId: string): Promise<Mission[]> => {
  try {
    // קבל את כל המשימות וסנן בצד הלקוח
    const allMissions = await dataLayer.getAll(COLLECTION_NAME) as unknown as Mission[];
    return allMissions
      .filter(mission => 
        mission.frameworkId === frameworkId || mission.team === frameworkId
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  } catch (error) {
    console.error('Error getting missions by framework:', error);
    return [];
  }
}; 

// פונקציה ליצירת מדיניות הרשאות ברירת מחדל למשימות
export const createDefaultMissionPolicies = async (): Promise<void> => {
  try {
    const { createPolicy } = await import('./permissionService');
    
    // מדיניות למפקדים - רואים את כל המשימות במסגרת שלהם
    await createPolicy({
      name: 'משימות - מפקדים',
      description: 'מפקדים יכולים לראות ולנהל משימות במסגרת שלהם',
      paths: [SystemPath.MISSIONS],
      dataScope: DataScope.FRAMEWORK_ONLY,
      permissions: [PermissionLevel.VIEW, PermissionLevel.CREATE, PermissionLevel.EDIT, PermissionLevel.DELETE],
      createdBy: 'system'
    }, 'system');

    // מדיניות לחיילים - רואים רק את המשימות שלהם
    await createPolicy({
      name: 'משימות - חיילים',
      description: 'חיילים יכולים לראות רק את המשימות שלהם',
      paths: [SystemPath.MISSIONS],
      dataScope: DataScope.USER_ONLY,
      permissions: [PermissionLevel.VIEW],
      createdBy: 'system'
    }, 'system');

    // מדיניות לאדמין - רואים את כל המשימות
    await createPolicy({
      name: 'משימות - אדמין',
      description: 'אדמין יכול לראות ולנהל את כל המשימות',
      paths: [SystemPath.MISSIONS],
      dataScope: DataScope.ALL_DATA,
      permissions: [PermissionLevel.VIEW, PermissionLevel.CREATE, PermissionLevel.EDIT, PermissionLevel.DELETE],
      createdBy: 'system'
    }, 'system');

  } catch (error) {
    console.error('❌ שגיאה ביצירת מדיניות הרשאות למשימות:', error);
  }
}; 