export enum UserRole {
  ADMIN = 'admin',
  CHAYAL = 'chayal',
}

// פונקציות עזר מינימליות עד למעבר למדיניות דינמית
export const isAdmin = (role: UserRole): boolean => role === UserRole.ADMIN;

export const canManageUsers = (role: UserRole): boolean => isAdmin(role);
export const canViewAllData = (role: UserRole): boolean => isAdmin(role);
export const canEditData = (role: UserRole): boolean => isAdmin(role);
export const canDeleteData = (role: UserRole): boolean => isAdmin(role);

// תצוגת שם תפקיד
export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN:
      return 'מנהל מערכת';
    case UserRole.CHAYAL:
    default:
      return 'חייל';
  }
}; 