import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, CheckCircle, Info, Clock, Paperclip, Eye } from "lucide-react";
import { useSupabaseCommunication } from "@/hooks/useSupabaseCommunication";
import { getAnnouncementTypeColor } from "@/data/mockCommunication";

export function AnnouncementsSection() {
  const { announcements, markAnnouncementAsRead } = useSupabaseCommunication();

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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Comunicados do Sistema</h3>
        <Badge variant="outline" className="text-sm">
          {announcements.filter(a => !a.read).length} não lidos
        </Badge>
      </div>

      {announcements.length === 0 ? (
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
            const typeColor = getAnnouncementTypeColor(announcement.type);
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
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(announcement.created_at)}</span>
                          <span>•</span>
                          <span>Por {announcement.created_by_name}</span>
                          {announcement.expires_at && (
                            <>
                              <span>•</span>
                              <span className={expired ? 'text-red-600' : 'text-orange-600'}>
                                {expired ? 'Expirado' : `Expira em ${formatDate(announcement.expires_at)}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={typeColor}>
                        {announcement.type === 'info' && 'Informação'}
                        {announcement.type === 'warning' && 'Aviso'}
                        {announcement.type === 'success' && 'Sucesso'}
                        {announcement.type === 'urgent' && 'Urgente'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {announcement.content}
                  </p>

                  {announcement.attachments.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Anexos:</p>
                      <div className="space-y-2">
                        {announcement.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                            <Paperclip className="h-4 w-4" />
                            <span>{attachment}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {announcement.target_audience === 'all' && 'Todos'}
                        {announcement.target_audience === 'clients' && 'Clientes'}
                        {announcement.target_audience === 'suppliers' && 'Fornecedores'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Prioridade: {announcement.priority === 'low' ? 'Baixa' : 
                                   announcement.priority === 'medium' ? 'Média' : 'Alta'}
                      </Badge>
                    </div>
                    
                    {!announcement.read && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleMarkAsRead(announcement.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Marcar como lido
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}