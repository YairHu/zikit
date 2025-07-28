import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Team } from '../models/Team';

const teamsCollection = collection(db, 'teams');

export const getAllTeams = async (): Promise<Team[]> => {
  const snapshot = await getDocs(teamsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
};

export const getTeamById = async (id: string): Promise<Team | null> => {
  const teamDoc = await getDoc(doc(teamsCollection, id));
  return teamDoc.exists() ? ({ id: teamDoc.id, ...teamDoc.data() } as Team) : null;
};

export const addTeam = async (team: Omit<Team, 'id'>): Promise<string> => {
  const docRef = await addDoc(teamsCollection, team);
  return docRef.id;
};

export const updateTeam = async (id: string, team: Partial<Team>) => {
  await updateDoc(doc(teamsCollection, id), team);
};

export const deleteTeam = async (id: string) => {
  await deleteDoc(doc(teamsCollection, id));
}; 