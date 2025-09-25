import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const InactiveClientAlert: React.FC = () => {
  const { error } = useAuth();

  if (!error || !error.includes('desativada')) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="font-medium">
        {error}
      </AlertDescription>
    </Alert>
  );
};