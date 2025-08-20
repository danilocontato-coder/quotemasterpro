import React from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  X, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRoleBasedNotifications } from '@/hooks/useRoleBasedNotifications';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'warning':
      return AlertTriangle;
    case 'error':
      return XCircle;
    default:
      return Info;
  }
};

const getNotificationColors = (type: string) => {
  switch (type) {
    case 'success':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'error':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-blue-600 bg-blue-50 border-blue-200';
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'high':
      return <Badge variant="destructive" className="text-xs">Alta</Badge>;
    case 'medium':
      return <Badge variant="secondary" className="text-xs">Média</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">Baixa</Badge>;
  }
};

export function RoleBasedNotificationDropdown() {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    highPriorityCount, 
    markAsRead, 
    markAllAsRead,
    deleteNotification
  } = useRoleBasedNotifications();

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant={highPriorityCount > 0 ? "destructive" : "default"}
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DropdownMenuLabel className="text-base font-semibold p-0">
              Notificações
            </DropdownMenuLabel>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs h-auto p-1"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
              {highPriorityCount > 0 && (
                <span className="text-red-600 font-medium">
                  {' '}• {highPriorityCount} de alta prioridade
                </span>
              )}
            </p>
          )}
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => {
                const IconComponent = getNotificationIcon(notification.type);
                const colors = getNotificationColors(notification.type);
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 rounded-lg border mb-2 cursor-pointer transition-all hover:shadow-sm group",
                      !notification.read ? "bg-accent/50 border-accent" : "bg-background",
                      colors
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-1.5 rounded-full flex-shrink-0",
                        !notification.read ? "bg-primary/10" : "bg-muted"
                      )}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className={cn(
                            "text-sm font-medium truncate",
                            !notification.read && "font-semibold"
                          )}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1 ml-2">
                            {getPriorityBadge(notification.priority)}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleDeleteNotification(e, notification.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {notification.time}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {notification.category}
                            </Badge>
                            
                            {notification.actionUrl && (
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            )}
                            
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => navigate('/notifications')}
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}