import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, CheckCircle, Info, Clock, Eye } from 'lucide-react';
import { useSupabaseAnnouncements } from '@/hooks/useSupabaseAnnouncements';
import { useSupabaseCurrentClient } from '@/hooks/useSupabaseCurrentClient';

export function ClientAnnouncementsList() {
  const { announcements, markAnnouncementAsRead, fetchAnnouncements, isLoading } = useSupabaseAnnouncements();
  const { client } = useSupabaseCurrentClient();

  useEffect(() => {
    if (client?.id) {
      fetchAnnouncements(client.id);
    }
  }, [client?.id, fetchAnnouncements]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'urgent':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-700';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-700';
      case 'success':
        return 'border-green-200 bg-green-50 text-green-700';
      case 'urgent':
        return 'border-red-200 bg-red-50 text-red-700';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-700';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'high') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const handleMarkAsRead = (announcementId: string) => {
    markAnnouncementAsRead(announcementId);
  };

  const unreadCount = announcements.filter(a => !a.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Comunicados do Sistema</h3>
        <Badge variant="outline" className="text-sm">
          {unreadCount} não lidos
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-dashed">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum comunicado</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Os comunicados e avisos importantes aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const typeColor = getTypeColor(announcement.type);
            const expired = isExpired(announcement.expires_at);
            
            return (
              <Card 
                key={announcement.id} 
                className={`transition-all duration-200 hover:shadow-md ${
                  !announcement.read ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
                } ${expired ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg border ${typeColor} flex-shrink-0`}>
                        {getAnnouncementIcon(announcement.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base leading-tight">
                            {announcement.title}
                          </CardTitle>
                          {getPriorityIcon(announcement.priority)}
                          {!announcement.read && (
                            <Badge className="bg-blue-500 text-white text-xs">
                              Novo
                            </Badge>
                          )}
                          {expired && (
                            <Badge variant="secondary" className="text-xs">
                              Expirado
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(announcement.created_at)}</span>
                          <span>•</span>
                          <span>Por {announcement.created_by_name}</span>
                          {announcement.expires_at && (
                            <>
                              <span>•</span>
                              <span>Expira: {formatDate(announcement.expires_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {!announcement.read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsRead(announcement.id)}
                        className="flex-shrink-0"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Marcar como lida
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                  
                  {announcement.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Anexos:</p>
                      <div className="flex flex-wrap gap-2">
                        {announcement.attachments.map((attachment, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {attachment}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}