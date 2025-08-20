import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowRightLeft, 
  Shield, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useGroupPermissionsSync } from '@/hooks/useGroupPermissionsSync';
import { useUserGroups } from '@/hooks/useUsersAndGroups';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

/**
 * Componente para mostrar e gerenciar a sincronização entre
 * grupos de usuários e o sistema de permissões
 */
export function PermissionGroupBridge() {
  const { groups } = useUserGroups();
  const { permissions } = usePermissions();
  const { permissionMapping } = useGroupPermissionsSync();

  const handleSyncPermissions = () => {
    // Forçar re-sincronização
    window.location.reload();
    toast.success('Permissões sincronizadas com sucesso!');
  };

  const getSyncStatus = (groupId: string) => {
    const hasPermissions = permissions[groupId] && Object.keys(permissions[groupId]).length > 0;
    return hasPermissions ? 'synced' : 'pending';
  };

  const syncedCount = groups.filter(group => getSyncStatus(group.id) === 'synced').length;
  const pendingCount = groups.length - syncedCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          Sincronização Grupos ↔ Permissões
        </CardTitle>
        <CardDescription>
          Status da sincronização entre grupos de usuários e sistema de permissões
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-lg font-bold text-green-800">{syncedCount}</p>
            <p className="text-sm text-green-600">Sincronizados</p>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
            <p className="text-lg font-bold text-yellow-800">{pendingCount}</p>
            <p className="text-sm text-yellow-600">Pendentes</p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Shield className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <p className="text-lg font-bold text-blue-800">{Object.keys(permissionMapping).length}</p>
            <p className="text-sm text-blue-600">Mapeamentos</p>
          </div>
        </div>

        {/* Groups Status */}
        <div className="space-y-3">
          <h4 className="font-medium">Status dos Grupos:</h4>
          <div className="space-y-2">
            {groups.map(group => (
              <div key={group.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{group.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.permissions.length} permissões de grupo
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={getSyncStatus(group.id) === 'synced' ? 'default' : 'secondary'}
                    className={getSyncStatus(group.id) === 'synced' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                    }
                  >
                    {getSyncStatus(group.id) === 'synced' ? 'Sincronizado' : 'Pendente'}
                  </Badge>
                  {getSyncStatus(group.id) === 'synced' && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sync Button */}
        <div className="flex justify-center">
          <Button onClick={handleSyncPermissions} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Forçar Sincronização
          </Button>
        </div>

        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Como funciona:</strong> O sistema automaticamente sincroniza as permissões 
            dos grupos de usuários com o módulo de permissões. 
          </p>
          <p>
            Grupos com permissão "*" recebem acesso total. Permissões específicas como 
            "quotes.view" são mapeadas para os módulos correspondentes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}