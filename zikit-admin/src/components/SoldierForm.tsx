import React from 'react';
import { Soldier } from '../models/Soldier';
import { updateSoldier, addSoldier, getSoldierById } from '../services/soldierService';
import BasePersonForm from './BasePersonForm';

interface SoldierFormProps {
  open: boolean;
  onClose: () => void;
  soldier?: Soldier | null;
  onSuccess?: (soldier: Soldier) => void;
  mode: 'add' | 'edit';
}

const SoldierForm: React.FC<SoldierFormProps> = ({ 
  open, 
  onClose, 
  soldier, 
  onSuccess, 
  mode 
}) => {
  const handleSuccess = async (person: any) => {
    try {
      if (mode === 'edit' && soldier) {
        await updateSoldier(soldier.id, person);
        const updatedSoldier = await getSoldierById(soldier.id);
        if (updatedSoldier) {
          onSuccess?.(updatedSoldier);
        }
      } else {
        const newId = await addSoldier(person);
        const newSoldier = await getSoldierById(newId);
        if (newSoldier) {
          onSuccess?.(newSoldier);
        }
      }
    } catch (error) {
      console.error('שגיאה בשמירת החייל:', error);
    }
  };

  return (
    <BasePersonForm
      open={open}
      onClose={onClose}
      person={soldier}
      onSuccess={handleSuccess}
      mode={mode}
      title="חייל"
      disableRole
    />
  );
};

export default SoldierForm; 