import React from 'react';
import { Bell, Trash2 } from "lucide-react";
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
import { NotificationContent } from "@/components/notifications/NotificationContent";
import { useToast } from "@/hooks/use-toast";

export function RoleBasedNotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAllNotifications, isLoading } = useSupabaseNotifications();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleClearAll = () => {
    if (window.confirm('Deseja realmente limpar todas as notificações? Esta ação não pode ser desfeita.')) {
      clearAllNotifications();
      toast({
        title: "Notificações limpas",
        description: "Todas as notificações foram removidas com sucesso.",
      });
    }
  };

  console.log('🔔 [ROLE-BASED-DROPDOWN] Rendering with real Supabase notifications:', {
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
      
      <DropdownMenuContent align="end" className="w-96 max-w-[95vw]">
        <div className="flex items-center justify-between p-4">
          <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
              >
                Marcar como lidas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearAll}
                className="text-xs text-destructive hover:text-destructive"
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
                  console.log('🔔 [ROLE-BASED-DROPDOWN] Clicking notification:', notification.id);
                  markAsRead(notification.id);
                  if (notification.action_url) {
                    console.log('🔔 [ROLE-BASED-DROPDOWN] Navigating to:', notification.action_url);
                    navigate(notification.action_url);
                  }
                }}
              >
                <NotificationContent
                  notification={notification}
                  onNavigate={(url) => {
                    markAsRead(notification.id);
                    navigate(url);
                  }}
                />
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}