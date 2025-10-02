import React from 'react';
import { useModuleAccess, type ModuleKey } from '@/hooks/useModuleAccess';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ModuleGuardProps {
  requiredModule: ModuleKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * ModuleGuard - Componente HOC para proteger features baseado em módulos habilitados
 * 
 * @example
 * <ModuleGuard requiredModule="ai_negotiation">
 *   <AIFeatureComponent />
 * </ModuleGuard>
 */
export const ModuleGuard: React.FC<ModuleGuardProps> = ({
  requiredModule,
  children,
  fallback,
  showUpgradePrompt = true
}) => {
  const { hasAccess, isLoading } = useModuleAccess(requiredModule);
  const navigate = useNavigate();

  // Mostrar skeleton durante carregamento
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Se tem acesso, renderizar children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Se forneceu fallback customizado
  if (fallback) {
    return <>{fallback}</>;
  }

  // Mostrar prompt de upgrade se configurado
  if (showUpgradePrompt) {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <Lock className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900 flex items-center gap-2">
          <Crown className="h-4 w-4" />
          Recurso Premium
        </AlertTitle>
        <AlertDescription className="text-amber-800">
          Este recurso não está disponível no seu plano atual. Faça upgrade para desbloquear funcionalidades avançadas.
        </AlertDescription>
        <Button 
          onClick={() => navigate('/plans')} 
          className="mt-3"
          variant="outline"
        >
          Ver Planos Disponíveis
        </Button>
      </Alert>
    );
  }

  // Não renderizar nada se não tem acesso e não deve mostrar prompt
  return null;
};

/**
 * InlineModuleGuard - Versão inline que retorna null se não tiver acesso
 * Útil para pequenos componentes dentro de uma página
 */
export const InlineModuleGuard: React.FC<ModuleGuardProps> = ({
  requiredModule,
  children
}) => {
  const { hasAccess, isLoading } = useModuleAccess(requiredModule);

  if (isLoading || !hasAccess) {
    return null;
  }

  return <>{children}</>;
};
