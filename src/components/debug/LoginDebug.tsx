import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const LoginDebug: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded text-xs max-w-xs">
      <div><strong>DEBUG LOGIN:</strong></div>
      <div>isLoading: {String(isLoading)}</div>
      <div>user: {user ? `${user.email} (${user.role})` : 'null'}</div>
      <div>clientId: {user?.clientId || 'null'}</div>
      <div>Current URL: {window.location.pathname}</div>
    </div>
  );
};