import { Form } from '../models/Form';
import { dataLayer } from './dataAccessLayer';

export const getAllForms = async (): Promise<Form[]> => {
  return dataLayer.getAll('forms') as Promise<Form[]>;
};

export const getFormById = async (id: string): Promise<Form | null> => {
  return dataLayer.getById('forms', id) as Promise<Form | null>;
};

export const addForm = async (form: Omit<Form, 'id'>): Promise<string> => {
  return dataLayer.create('forms', form as any);
};

export const updateForm = async (id: string, form: Partial<Form>) => {
  return dataLayer.update('forms', id, form);
};

export const deleteForm = async (id: string) => {
  return dataLayer.delete('forms', id);
}; 