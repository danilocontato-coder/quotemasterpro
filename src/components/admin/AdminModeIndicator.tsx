import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Crown, LogOut } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';

export const AdminModeIndicator = () => {
  const { isInAdminMode, returnToAdmin, isAccessingAs } = useAdminAccess();

  if (!isInAdminMode) {
    return null;
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <Crown className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-orange-800">
          <strong>Modo Administrador:</strong> Você está acessando como usuário temporário para manutenção/teste
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={isAccessingAs}
          onClick={returnToAdmin}
          className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100"
        >
          {isAccessingAs ? (
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-orange-300 border-t-orange-700"></div>
          ) : (
            <LogOut className="h-4 w-4 mr-2" />
          )}
          Voltar ao Admin
        </Button>
      </AlertDescription>
    </Alert>
  );
};