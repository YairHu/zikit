import { Mission } from '../models/Mission';
import { USE_MOCK } from './mockDatabase';
import { 
  mockGetAllMissions, 
  mockGetMissionById, 
  mockAddMission, 
  mockUpdateMission, 
  mockDeleteMission 
} from './mockDatabase';

// Firebase imports (if needed in the future)
// import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
// import { db } from '../firebase';

export const getAllMissions = async (): Promise<Mission[]> => {
  if (USE_MOCK) {
    return mockGetAllMissions();
  }
  
  // Firebase implementation would go here
  throw new Error('Firebase implementation not yet implemented');
};

export const getMissionById = async (id: string): Promise<Mission | null> => {
  if (USE_MOCK) {
    return mockGetMissionById(id);
  }
  
  // Firebase implementation would go here
  throw new Error('Firebase implementation not yet implemented');
};

export const addMission = async (mission: Omit<Mission, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (USE_MOCK) {
    return mockAddMission(mission);
  }
  
  // Firebase implementation would go here
  throw new Error('Firebase implementation not yet implemented');
};

export const updateMission = async (id: string, updates: Partial<Mission>): Promise<void> => {
  if (USE_MOCK) {
    return mockUpdateMission(id, updates);
  }
  
  // Firebase implementation would go here
  throw new Error('Firebase implementation not yet implemented');
};

export const deleteMission = async (id: string): Promise<void> => {
  if (USE_MOCK) {
    return mockDeleteMission(id);
  }
  
  // Firebase implementation would go here
  throw new Error('Firebase implementation not yet implemented');
}; 