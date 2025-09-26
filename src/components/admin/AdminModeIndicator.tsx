import React, { useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Crown, LogOut } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';

export const AdminModeIndicator = () => {
  const { isInAdminMode, returnToAdmin, isAccessingAs, getAdminAccessData } = useAdminAccess();

  // Limpar URL do token admin após carregar os dados
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const adminToken = urlParams.get('adminToken');
    
    if (adminToken && isInAdminMode) {
      // Remover o token da URL sem recarregar a página
      urlParams.delete('adminToken');
      const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [isInAdminMode]);

  if (!isInAdminMode) {
    return null;
  }

  const adminData = getAdminAccessData();
  const targetName = adminData?.targetClientName || adminData?.targetSupplierName || 'usuário';

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <Crown className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-orange-800">
          <strong>Modo Administrador:</strong> Acessando como "{targetName}" para manutenção/teste
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={isAccessingAs}
          onClick={() => {
            // Fechar a aba atual e voltar ao admin na aba original
            window.close();
          }}
          className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100"
        >
          {isAccessingAs ? (
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-orange-300 border-t-orange-700"></div>
          ) : (
            <LogOut className="h-4 w-4 mr-2" />
          )}
          Fechar Aba
        </Button>
      </AlertDescription>
    </Alert>
  );
};