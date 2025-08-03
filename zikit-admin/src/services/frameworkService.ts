import { Framework, FrameworkWithDetails, FrameworkTree } from '../models/Framework';
import { getSoldiersByFramework, getAllSoldiers } from './soldierService';

// Mock database for development - בעתיד יתחבר לבסיס נתונים אמיתי
let mockFrameworks: Framework[] = [
  {
    id: '1',
    name: 'פלוגת זיק"ת',
    level: 'company',
    commanderId: 'commander-1',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'פלגה א',
    parentFrameworkId: '1',
    level: 'platoon',
    commanderId: 'commander-2',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '3',
    name: 'פלגה ב',
    parentFrameworkId: '1',
    level: 'platoon',
    commanderId: 'commander-3',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

export const getAllFrameworks = async (): Promise<Framework[]> => {
  // סימולציה של קריאה מבסיס נתונים
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...mockFrameworks]);
    }, 100);
  });
};

export const getFrameworkById = async (id: string): Promise<Framework | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const framework = mockFrameworks.find(f => f.id === id);
      resolve(framework || null);
    }, 100);
  });
};

export const getFrameworksByParent = async (parentId?: string): Promise<Framework[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const frameworks = mockFrameworks.filter(f => f.parentFrameworkId === parentId);
      resolve(frameworks);
    }, 100);
  });
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
  return new Promise((resolve) => {
    setTimeout(() => {
      const newFramework: Framework = {
        ...framework,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockFrameworks.push(newFramework);
      resolve(newFramework);
    }, 100);
  });
};

export const updateFramework = async (id: string, updates: Partial<Omit<Framework, 'id' | 'createdAt'>>): Promise<Framework | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = mockFrameworks.findIndex(f => f.id === id);
      if (index === -1) {
        resolve(null);
        return;
      }

      mockFrameworks[index] = {
        ...mockFrameworks[index],
        ...updates,
        updatedAt: new Date()
      };
      
      resolve(mockFrameworks[index]);
    }, 100);
  });
};

export const deleteFramework = async (id: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // בדיקה שאין מסגרות בנות
      const hasChildren = mockFrameworks.some(f => f.parentFrameworkId === id);
      if (hasChildren) {
        resolve(false); // לא ניתן למחוק מסגרת עם מסגרות בנות
        return;
      }

      const index = mockFrameworks.findIndex(f => f.id === id);
      if (index === -1) {
        resolve(false);
        return;
      }

      mockFrameworks.splice(index, 1);
      resolve(true);
    }, 100);
  });
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
  
  const totalSoldiers = await getAllSoldiersInHierarchy(id);
  
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
      personalNumber: s.personalNumber
    })),
    totalSoldiers
  };
};