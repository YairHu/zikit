import { Vehicle } from '../models/Vehicle';
import { dataLayer } from './dataAccessLayer';

export const getAllVehicles = async (): Promise<Vehicle[]> => {
  return dataLayer.getAll('vehicles') as Promise<Vehicle[]>;
};

export const getVehicleById = async (id: string): Promise<Vehicle | null> => {
  return dataLayer.getById('vehicles', id) as Promise<Vehicle | null>;
};

export const addVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<string> => {
  return dataLayer.create('vehicles', vehicle as any);
};

export const updateVehicle = async (id: string, vehicle: Partial<Vehicle>) => {
  return dataLayer.update('vehicles', id, vehicle);
};

export const deleteVehicle = async (id: string) => {
  return dataLayer.delete('vehicles', id);
}; 