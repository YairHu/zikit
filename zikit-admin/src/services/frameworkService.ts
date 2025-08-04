import { Framework, FrameworkWithDetails, FrameworkTree } from '../models/Framework';
import { getAllSoldiers } from './soldierService';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';

export const getAllFrameworks = async (): Promise<Framework[]> => {
  try {
    const frameworksRef = collection(db, 'frameworks');
    const q = query(frameworksRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
      updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt) : new Date()
    })) as Framework[];
  } catch (error) {
    console.error('שגיאה בקבלת מסגרות:', error);
    return [];
  }
};

export const getFrameworkById = async (id: string): Promise<Framework | null> => {
  try {
    const frameworkRef = doc(db, 'frameworks', id);
    const frameworkDoc = await getDoc(frameworkRef);
    
    if (frameworkDoc.exists()) {
      const data = frameworkDoc.data();
      return {
        id: frameworkDoc.id,
        ...data,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
      } as Framework;
    }
    
    return null;
  } catch (error) {
    console.error('שגיאה בקבלת מסגרת:', error);
    return null;
  }
};

export const getFrameworksByParent = async (parentId?: string): Promise<Framework[]> => {
  try {
    const frameworksRef = collection(db, 'frameworks');
    let q;
    
    if (parentId) {
      q = query(frameworksRef, where('parentFrameworkId', '==', parentId));
    } else {
      q = query(frameworksRef, where('parentFrameworkId', '==', null));
    }
    
    const querySnapshot = await getDocs(q);
    
    const frameworks = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
      updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt) : new Date()
    })) as Framework[];
    
    // מיון בצד הלקוח
    return frameworks.sort((a, b) => a.name.localeCompare(b.name, 'he'));
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
    const frameworksRef = collection(db, 'frameworks');
    const newFramework = {
      ...framework,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(frameworksRef, newFramework);
    
    return {
      id: docRef.id,
      ...newFramework,
      createdAt: new Date(newFramework.createdAt),
      updatedAt: new Date(newFramework.updatedAt)
    } as Framework;
  } catch (error) {
    console.error('שגיאה ביצירת מסגרת:', error);
    throw error;
  }
};

export const updateFramework = async (id: string, updates: Partial<Omit<Framework, 'id' | 'createdAt'>>): Promise<Framework | null> => {
  try {
    const frameworkRef = doc(db, 'frameworks', id);
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(frameworkRef, updateData);
    
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
    
    const frameworkRef = doc(db, 'frameworks', id);
    await deleteDoc(frameworkRef);
    
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
  const getAllSoldiersInHierarchyList = async (frameworkId: string): Promise<any[]> => {
    const directSoldiers = allSoldiers.filter(s => s.frameworkId === frameworkId);
    const children = await getFrameworksByParent(frameworkId);
    const childrenSoldiers = await Promise.all(
      children.map(child => getAllSoldiersInHierarchyList(child.id))
    );
    return [...directSoldiers, ...childrenSoldiers.flat()];
  };
  
  const totalSoldiers = await getAllSoldiersInHierarchy(id);
  const allSoldiersInHierarchy = await getAllSoldiersInHierarchyList(id);
  
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
    allSoldiersInHierarchy: allSoldiersInHierarchy.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role,
      personalNumber: s.personalNumber,
      frameworkId: s.frameworkId
    })),
    totalSoldiers
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