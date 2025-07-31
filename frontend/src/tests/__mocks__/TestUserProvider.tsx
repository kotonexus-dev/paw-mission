// src/context/TestUserProvider.tsx

'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface User {
  firebase_uid: string;
  child_name: string;
  current_plan: 'free' | 'premium';
}

export interface AuthContextType {
  currentUser: User | null;
}

const mockUser: User = {
  firebase_uid: 'test-uid',
  child_name: 'さき',
  current_plan: 'premium',
};

const AuthContext = createContext<AuthContextType>({
  currentUser: mockUser,
});

export const TestUserProvider = ({ children }: { children: ReactNode }) => (
  <AuthContext.Provider value={{ currentUser: mockUser }}>
    {children}
  </AuthContext.Provider>
);

export const useAuth = (): AuthContextType => useContext(AuthContext);
