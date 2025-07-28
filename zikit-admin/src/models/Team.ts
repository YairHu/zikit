export interface Team {
  id: string;
  name: string;
  commander: string; // מזהה חייל
  staff: string[]; // מזהי חיילים בסגל
  members: string[]; // מזהי חיילים
} 