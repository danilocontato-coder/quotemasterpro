import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Search, 
  Filter,
  CheckCircle, 
  AlertTriangle, 
  Info, 
  XCircle,
  ExternalLink,
  Trash2,
  Mail,
  Settings
} from 'lucide-react';
import { useRoleBasedNotifications } from '@/hooks/useRoleBasedNotifications';
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

export default function Notifications() {
  const { 
    notifications, 
    unreadCount, 
    highPriorityCount, 
    markAsRead, 
    markAllAsRead,
    deleteNotification
  } = useRoleBasedNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  const categories = ['all', 'sistema', 'cotacao', 'fornecedor', 'cliente', 'seguranca', 'integracao', 'financeiro'];
  const priorities = ['all', 'high', 'medium', 'low'];

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || notification.category === selectedCategory;
    const matchesPriority = selectedPriority === 'all' || notification.priority === selectedPriority;
    
    return matchesSearch && matchesCategory && matchesPriority;
  });

  const unreadNotifications = filteredNotifications.filter(n => !n.read);
  const readNotifications = filteredNotifications.filter(n => n.read);

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">
            Central de notificações e alertas do sistema
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={markAllAsRead}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
          
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Não lidas</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Alta prioridade</p>
                <p className="text-2xl font-bold">{highPriorityCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar notificações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">Todas as categorias</option>
                {categories.slice(1).map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              
              <select 
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">Todas as prioridades</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Tabs defaultValue="unread" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unread" className="gap-2">
            Não lidas 
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="read">Lidas</TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="space-y-4">
          {unreadNotifications.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Tudo em dia!</h3>
                <p className="text-muted-foreground">Você não possui notificações não lidas.</p>
              </CardContent>
            </Card>
          ) : (
            unreadNotifications.map((notification) => {
              const IconComponent = getNotificationIcon(notification.type);
              const colors = getNotificationColors(notification.type);
              
              return (
                <Card 
                  key={notification.id}
                  className={cn("cursor-pointer transition-all hover:shadow-md", colors)}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-full bg-white/50">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{notification.title}</h4>
                          <div className="flex items-center gap-2 ml-4">
                            {getPriorityBadge(notification.priority)}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3">{notification.message}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {notification.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {notification.time}
                            </span>
                          </div>
                          
                          {notification.actionUrl && (
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {filteredNotifications.map((notification) => {
            const IconComponent = getNotificationIcon(notification.type);
            
            return (
              <Card 
                key={notification.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-sm",
                  !notification.read && "border-l-4 border-l-primary"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2 rounded-full",
                      notification.read ? "bg-muted" : "bg-primary/10"
                    )}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className={cn(
                          "text-sm",
                          notification.read ? "font-medium" : "font-semibold"
                        )}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(notification.priority)}
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {notification.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {notification.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="read" className="space-y-4">
          {readNotifications.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma notificação lida</h3>
                <p className="text-muted-foreground">As notificações que você ler aparecerão aqui.</p>
              </CardContent>
            </Card>
          ) : (
            readNotifications.map((notification) => {
              const IconComponent = getNotificationIcon(notification.type);
              
              return (
                <Card key={notification.id} className="opacity-75">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-full bg-muted">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">{notification.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{notification.message}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{notification.category}</Badge>
                          <span className="text-xs text-muted-foreground">{notification.time}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}