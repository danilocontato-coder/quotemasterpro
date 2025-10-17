import React from "react";
import { Bell, CheckCircle, AlertTriangle, Info, X, FileText, Truck, CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useSupabaseNotifications } from "@/hooks/useSupabaseNotifications";
import { useNavigate } from "react-router-dom";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'error':
      return <X className="h-4 w-4 text-red-500" />;
    case 'proposal':
      return <FileText className="h-4 w-4 text-purple-500" />;
    case 'delivery':
      return <Truck className="h-4 w-4 text-orange-500" />;
    case 'payment':
      return <CreditCard className="h-4 w-4 text-green-600" />;
    case 'quote':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'ticket':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

export const NotificationDropdown = React.memo(function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAllNotifications, isLoading } = useSupabaseNotifications();
  const navigate = useNavigate();

  console.log('🔔 [DROPDOWN] Rendering with notifications:', {
    total: notifications.length,
    unread: unreadCount,
    isLoading
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 bg-background z-50">
        <div className="flex items-center justify-between p-4">
          <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs h-8"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Marcar lidas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllNotifications}
                className="text-xs h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-4 cursor-pointer ${!notification.read ? 'bg-primary/5' : ''}`}
                onClick={() => {
                  console.log('🔔 [DROPDOWN] Clicking notification:', notification.id);
                  markAsRead(notification.id);
                  if (notification.action_url) {
                    console.log('🔔 [DROPDOWN] Navigating to:', notification.action_url);
                    navigate(notification.action_url);
                  }
                }}
              >
                <div className="flex gap-3 w-full">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{notification.title}</p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});