export interface PersonalDetails {
  // פרטים בסיסיים
  fullName: string;
  personalNumber: string;
  rank?: string;
  birthDate?: string;
  idNumber?: string;
  phone: string;
  email: string;
  address: string;
  
  // פרטי חירום
  emergencyContact: string;
  emergencyPhone: string;
  emergencyRelation?: string; // קרבה משפחתית
  
  // רקע משפחתי
  maritalStatus?: 'רווק' | 'נשוי' | 'גרוש' | 'אלמן';
  children?: number;
  spouseName?: string;
  spousePhone?: string;
  parentsNames?: string;
  parentsPhone?: string;
  siblingsCount?: number;
  
  // רקע כלכלי
  economicStatus?: 'טוב' | 'בינוני' | 'קשה';
  workHistory?: string;
  specialCircumstances?: string; // נסיבות מיוחדות
}

export interface MedicalInformation {
  // פרופיל רפואי
  medicalProfile: string; // 97, 82, 72 וכו'
  profileDate?: string;
  profileExpiry?: string;
  
  // בעיות רפואיות
  chronicConditions?: string[];
  medications?: string[];
  allergies?: string[];
  surgeries?: string[];
  injuries?: string[];
  
  // מגבלות
  physicalLimitations?: string[];
  dietaryRestrictions?: string[];
  
  // מעקב רפואי
  lastCheckup?: string;
  nextCheckup?: string;
  medicalNotes?: string;
  
  // רגישות
  isSensitive: boolean; // האם מידע רגיש שרק מ"פ יכול לראות
}

export interface MilitaryBackground {
  // שירות קודם
  previousUnits?: string[];
  previousRoles?: string[];
  courses?: string[];
  qualifications?: string[];
  securityClearance?: string;
  
  // רקע צבאי משפחתי
  familyMilitaryHistory?: string;
  
  // הערכות
  commanderEvaluations?: string[];
  strengths?: string[];
  weaknesses?: string[];
  developmentAreas?: string[];
}

export interface Education {
  // השכלה פורמלית
  highSchool?: string;
  highSchoolGrade?: number;
  higherEducation?: string[];
  degrees?: string[];
  currentStudies?: string;
  
  // כישורים מקצועיים
  professionalSkills?: string[];
  languages?: string[];
  languageLevels?: { [language: string]: 'בסיסי' | 'בינוני' | 'מתקדם' | 'שפת אם' };
  
  // תחביבים ויכולות
  hobbies?: string[];
  sports?: string[];
  specialTalents?: string[];
}

export interface PsychologicalProfile {
  // הערכה פסיכולוגית
  psychologicalEvaluation?: string;
  personalityType?: string;
  motivationLevel?: number; // 1-10
  stressResistance?: number; // 1-10
  teamwork?: number; // 1-10
  leadership?: number; // 1-10
  
  // התייחסות לשירות
  motivation?: string;
  expectations?: string;
  concerns?: string;
  goals?: string;
  
  // התאמה לתפקידים
  suitableRoles?: string[];
  unsuitableRoles?: string[];
}

export interface Disciplinary {
  // עברות משמעת
  disciplinaryActions?: {
    date: string;
    type: string;
    description: string;
    punishment?: string;
    resolved: boolean;
  }[];
  
  // פרסים והוקרה
  awards?: {
    date: string;
    type: string;
    description: string;
    grantedBy: string;
  }[];
  
  // הערות התנהגות
  behaviorNotes?: {
    date: string;
    author: string;
    note: string;
    type: 'חיובי' | 'שלילי' | 'נייטרלי';
  }[];
}

export interface Performance {
  // ציונים וכשירויות
  qualifications?: {
    subject: string;
    score: number;
    maxScore: number;
    date: string;
    instructor?: string;
    notes?: string;
  }[];
  
  // מעקב התקדמות
  progressTracking?: {
    date: string;
    area: string;
    progress: number; // 1-10
    notes: string;
    evaluator: string;
  }[];
  
  // יעדים אישיים
  personalGoals?: {
    goal: string;
    targetDate: string;
    progress: number; // 0-100%
    status: 'פעיל' | 'הושג' | 'נדחה';
  }[];
}

export interface Documents {
  // מסמכים מצורפים
  documents?: {
    id: string;
    name: string;
    type: string;
    uploadDate: string;
    uploadedBy: string;
    fileUrl: string;
    category: 'רפואי' | 'אישי' | 'צבאי' | 'חינוכי' | 'אחר';
    isPrivate: boolean; // האם רק החייל ומ"פ יכולים לראות
  }[];
  
  // תמונות
  profilePicture?: string;
  additionalPhotos?: string[];
}

export interface CompleteSoldierProfile {
  // מזהה ומטאדטה
  id: string;
  userUid?: string;
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy: string;
  status: 'pending_assignment' | 'assigned' | 'active' | 'inactive' | 'discharged';
  
  // פרופיל מלא
  personalDetails: PersonalDetails;
  medicalInformation: MedicalInformation;
  militaryBackground: MilitaryBackground;
  education: Education;
  psychologicalProfile: PsychologicalProfile;
  disciplinary: Disciplinary;
  performance: Performance;
  documents: Documents;
  
  // שיבוץ נוכחי
  currentAssignment?: {
    role: string;
    team?: string;
    pelaga?: string;
    commander?: string;
    startDate: string;
  };
  
  // הערות כלליות
  generalNotes?: {
    date: string;
    author: string;
    note: string;
    isPrivate: boolean;
  }[];
  
  // הרשאות צפייה
  viewPermissions: {
    basic: string[]; // UIDs שיכולים לראות מידע בסיסי
    medical: string[]; // UIDs שיכולים לראות מידע רפואי
    full: string[]; // UIDs שיכולים לראות הכל
  };
} 