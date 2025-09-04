import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Users,
  Building2,
  Database,
  Truck,
  Package,
  Tag,
  AlertTriangle,
  TrendingUp,
  Infinity
} from 'lucide-react';
import { useSupabaseSubscriptionGuard } from '@/hooks/useSupabaseSubscriptionGuard';
import { useAuth } from '@/contexts/AuthContext';

interface UsageLimitsCardProps {
  showTitle?: boolean;
  compact?: boolean;
}

export const UsageLimitsCard: React.FC<UsageLimitsCardProps> = ({ 
  showTitle = true, 
  compact = false 
}) => {
  const { user } = useAuth();
  const { 
    currentUsage, 
    getUsagePercentage, 
    isNearLimit, 
    userPlan,
    checkLimit,
    isLoading: usageLoading
  } = useSupabaseSubscriptionGuard();

  if (!user || !userPlan || usageLoading) {
    return null;
  }

  const limits = [
    {
      key: 'CREATE_QUOTE',
      icon: FileText,
      label: 'Cotações/Mês',
      current: currentUsage.quotesThisMonth,
      limit: userPlan.max_quotes_per_month || userPlan.max_quotes,
      color: 'text-blue-600'
    },
    {
      key: 'ADD_USER',
      icon: Users,
      label: 'Usuários',
      current: currentUsage.usersCount,
      limit: userPlan.max_users_per_client || userPlan.max_users,
      color: 'text-green-600'
    },
    {
      key: 'ADD_SUPPLIER_TO_QUOTE',
      icon: Building2,
      label: 'Fornecedores/Cotação',
      current: currentUsage.suppliersPerQuote,
      limit: userPlan.max_suppliers_per_quote || 5,
      color: 'text-purple-600'
    },
    {
      key: 'UPLOAD_FILE',
      icon: Database,
      label: 'Armazenamento (GB)',
      current: currentUsage.storageUsedGB,
      limit: userPlan.max_storage_gb,
      color: 'text-orange-600'
    }
  ];

  // Adicionar limites específicos para fornecedores se o usuário for fornecedor
  if (user.role === 'supplier') {
    limits.push(
      {
        key: 'RESPOND_TO_QUOTE',
        icon: Truck,
        label: 'Respostas/Mês',
        current: currentUsage.quoteResponsesThisMonth,
        limit: userPlan.max_quote_responses_per_month || 50,
        color: 'text-red-600'
      },
      {
        key: 'ADD_PRODUCT',
        icon: Package,
        label: 'Produtos',
        current: currentUsage.productsInCatalog,
        limit: userPlan.max_products_in_catalog || 100,
        color: 'text-cyan-600'
      },
      {
        key: 'ADD_CATEGORY',
        icon: Tag,
        label: 'Categorias',
        current: currentUsage.categoriesCount,
        limit: userPlan.max_categories_per_supplier || 10,
        color: 'text-yellow-600'
      }
    );
  }

  const nearLimitCount = limits.filter(limit => {
    if (limit.limit === -1) return false;
    const percentage = getUsagePercentage(limit.key);
    const remaining = Math.max(0, limit.limit - limit.current);
    return percentage >= 80 && remaining > 0; // Só considera "próximo do limite" se ainda tiver restantes
  }).length;

  const atLimitCount = limits.filter(limit => {
    if (limit.limit === -1) return false;
    const remaining = Math.max(0, limit.limit - limit.current);
    return remaining === 0; // Limite completamente atingido
  }).length;

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Ilimitado' : limit.toString();
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Limites do Plano</h4>
            <Badge variant="outline">{userPlan.display_name}</Badge>
          </div>
          
          {(nearLimitCount > 0 || atLimitCount > 0) && (
            <Alert className="mb-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {atLimitCount > 0 && nearLimitCount > 0 
                  ? `${atLimitCount} limite(s) atingido(s), ${nearLimitCount} próximo(s) do máximo`
                  : atLimitCount > 0 
                    ? `${atLimitCount} limite(s) atingido(s)`
                    : `${nearLimitCount} limite(s) próximo(s) do máximo`}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-2">
            {limits.slice(0, 4).map((item) => {
              const percentage = getUsagePercentage(item.key);
              const Icon = item.icon;
              
              return (
                <div key={item.key} className="text-center p-2 bg-muted rounded-lg">
                  <Icon className={`h-4 w-4 mx-auto mb-1 ${item.color}`} />
                  <div className="text-xs font-medium">
                    {item.current}/{formatLimit(item.limit)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Uso e Limites do Plano
            </div>
            <Badge variant="outline" className="ml-2">
              {userPlan.display_name}
            </Badge>
          </CardTitle>
          <CardDescription>
            Acompanhe o uso dos recursos do seu plano atual
          </CardDescription>
        </CardHeader>
      )}
      
      <CardContent className="space-y-4">
        {(nearLimitCount > 0 || atLimitCount > 0) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {atLimitCount > 0 && nearLimitCount > 0
                ? `${atLimitCount} limite(s) atingido(s) e ${nearLimitCount} próximo(s) do máximo. Considere fazer upgrade do seu plano.`
                : atLimitCount > 0 
                  ? `${atLimitCount} limite(s) atingido(s). Faça upgrade do seu plano para continuar.`
                  : `Você está próximo do limite em ${nearLimitCount} recurso(s). Considere fazer upgrade do seu plano.`}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {limits.map((item) => {
            const percentage = getUsagePercentage(item.key);
            const Icon = item.icon;
            const isUnlimited = item.limit === -1;
            
            return (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {item.current}/{formatLimit(item.limit)}
                    </span>
                    {isUnlimited && (
                      <Infinity className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
                
                {!isUnlimited && (
                    <div className="space-y-1">
                      <Progress 
                        value={percentage} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{percentage}% usado</span>
                        {Math.max(0, item.limit - item.current) === 0 ? (
                          <span className="text-red-600 font-medium">
                            Limite atingido
                          </span>
                        ) : percentage >= 80 ? (
                          <span className="text-yellow-600 font-medium">
                            Próximo do limite
                          </span>
                        ) : null}
                      </div>
                    </div>
                )}
              </div>
            );
          })}
        </div>

        {(nearLimitCount > 0 || atLimitCount > 0) && (
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('/admin/plans', '_self')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Ver Planos e Fazer Upgrade
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};