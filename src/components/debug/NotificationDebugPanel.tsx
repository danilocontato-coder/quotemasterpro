import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSupabaseNotifications } from '@/hooks/useSupabaseNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { createTestNotifications } from '@/utils/createTestNotification';
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  Wifi,
  WifiOff,
  Activity,
  Trash2
} from 'lucide-react';

export function NotificationDebugPanel() {
  const { user } = useAuth();
  const { notifications, unreadCount, isLoading, error, refetch, markAllAsRead } = useSupabaseNotifications();
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    console.log('🔍 [DEBUG-PANEL] Setting up realtime monitoring');
    
    const channel = supabase
      .channel('debug-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔍 [DEBUG-PANEL] Realtime event received:', payload);
        }
      )
      .subscribe((status) => {
        console.log('🔍 [DEBUG-PANEL] Realtime status:', status);
        setRealtimeStatus(status as any);
      });

    return () => {
      console.log('🔍 [DEBUG-PANEL] Cleaning up realtime monitoring');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCreateTestNotifications = async () => {
    try {
      await createTestNotifications();
      console.log('✅ [DEBUG-PANEL] Test notifications created');
    } catch (error) {
      console.error('❌ [DEBUG-PANEL] Error creating test notifications:', error);
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (!user) return;
    
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('✅ [DEBUG-PANEL] All notifications deleted');
      refetch();
    } catch (error) {
      console.error('❌ [DEBUG-PANEL] Error deleting notifications:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getRealtimeIcon = () => {
    switch (realtimeStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getRealtimeColor = () => {
    switch (realtimeStatus) {
      case 'connected':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'connecting':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Status do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status do Sistema de Notificações
          </CardTitle>
          <CardDescription>
            Monitoramento em tempo real do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{notifications.length}</div>
              <div className="text-sm text-muted-foreground">Total de Notificações</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
              <div className="text-sm text-muted-foreground">Não Lidas</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Badge className={getRealtimeColor()}>
                {getRealtimeIcon()}
                <span className="ml-2 capitalize">{realtimeStatus}</span>
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">Realtime Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controles de Teste */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Controles de Teste
          </CardTitle>
          <CardDescription>
            Ferramentas para testar o sistema de notificações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleCreateTestNotifications}>
              <Bell className="h-4 w-4 mr-2" />
              Criar Notificações de Teste
            </Button>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Recarregar
            </Button>
            <Button onClick={markAllAsRead} variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar Todas como Lidas
            </Button>
            <Button 
              onClick={handleDeleteAllNotifications} 
              variant="destructive"
              disabled={deleteLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Todas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Lista de Notificações ({notifications.length})
          </CardTitle>
          <CardDescription>
            Todas as notificações do usuário atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Carregando notificações...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>Erro: {error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhuma notificação encontrada</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-3 border rounded-lg ${
                    !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{notification.title}</span>
                        <Badge variant={notification.priority === 'high' ? 'destructive' : 'secondary'}>
                          {notification.type}
                        </Badge>
                        <Badge variant="outline">
                          {notification.priority}
                        </Badge>
                        {!notification.read && (
                          <Badge variant="default">Nova</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações de Debug */}
      <Card>
        <CardHeader>
          <CardTitle>Informações de Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <div><strong>User ID:</strong> {user?.id}</div>
            <div><strong>User Role:</strong> {user?.role}</div>
            <div><strong>Realtime Status:</strong> {realtimeStatus}</div>
            <div><strong>Loading:</strong> {isLoading ? 'Sim' : 'Não'}</div>
            <div><strong>Error:</strong> {error || 'Nenhum'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}