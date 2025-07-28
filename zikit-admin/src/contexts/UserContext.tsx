import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange } from '../services/authService';
import { User } from '../models/User';

interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    setLoading(true);
    // הרענון יקרה אוטומטית דרך onAuthChange
  };

  useEffect(() => {
    const unsubscribe = onAuthChange((userData) => {
      setUser(userData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: UserContextType = {
    user,
    loading,
    refreshUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}; 