export interface Mission {
  id: string;
  name: string;
  description?: string;
  date: string;
  duration?: number;
  commander: string;
  participants: string[];
  vehicles: string[];
  status: 'future' | 'active' | 'completed';
  archive?: boolean;
} 