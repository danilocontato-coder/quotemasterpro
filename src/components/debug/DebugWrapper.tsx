import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDebugReloads } from '@/hooks/useDebugReloads';

/**
 * Componente wrapper para debug que funciona dentro do AuthProvider
 */
export const DebugWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Debug profundo de reloads - agora dentro do AuthProvider
  useDebugReloads(user);
  
  return <>{children}</>;
};