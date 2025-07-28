export interface Duty {
  id: string;
  type: string;
  date: string;
  assigned: string[];
  status: 'pending' | 'done';
} 