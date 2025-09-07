import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  Plus, 
  MessageSquare, 
  Users, 
  Send,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Archive,
  Paperclip,
  File
} from 'lucide-react';
import { useSupabaseAnnouncements } from '@/hooks/useSupabaseAnnouncements';
import { CreateAnnouncementModal } from '@/components/admin/CreateAnnouncementModal';
import { AdminTicketsManager } from '@/components/communication/admin/AdminTicketsManager';

export const CommunicationManagement = () => {
  const [createAnnouncementOpen, setCreateAnnouncementOpen] = useState(false);
  
  const { 
    announcements, 
    fetchAnnouncements,
    isLoading: announcementsLoading 
  } = useSupabaseAnnouncements();

  // Fetch all data for admin view
  React.useEffect(() => {
    fetchAnnouncements(); // Admin can see all announcements
  }, [fetchAnnouncements]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'urgent':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'success':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Comunicação</h1>
            <p className="text-muted-foreground">Comunicados e tickets de suporte da plataforma</p>
          </div>
          <Button onClick={() => setCreateAnnouncementOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Comunicado
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Comunicados Ativos</p>
                  <p className="text-2xl font-bold text-blue-900">{announcements.length}</p>
                </div>
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

        </div>

        <Tabs defaultValue="announcements" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="announcements">Comunicados</TabsTrigger>
            <TabsTrigger value="tickets">Tickets de Suporte</TabsTrigger>
          </TabsList>

          <TabsContent value="announcements" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Comunicados</CardTitle>
                    <CardDescription>Gerenciar comunicados para clientes e fornecedores</CardDescription>
                  </div>
                  <Button onClick={() => setCreateAnnouncementOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Comunicado
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {announcements.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum comunicado encontrado</h3>
                    <p className="text-muted-foreground mb-4">Crie o primeiro comunicado para sua plataforma</p>
                    <Button onClick={() => setCreateAnnouncementOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Comunicado
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`p-1 rounded ${getTypeColor(announcement.type)}`}>
                                  {getTypeIcon(announcement.type)}
                                </div>
                                <h3 className="font-semibold">{announcement.title}</h3>
                                <Badge className={getTypeColor(announcement.type)}>
                                  {announcement.type === 'info' && 'Informação'}
                                  {announcement.type === 'warning' && 'Aviso'}
                                  {announcement.type === 'success' && 'Sucesso'}
                                  {announcement.type === 'urgent' && 'Urgente'}
                                </Badge>
                              </div>
                               <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                 {announcement.content}
                               </p>
                               <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                 <div className="flex items-center gap-1">
                                   <Clock className="h-3 w-3" />
                                   {formatDate(announcement.created_at)}
                                 </div>
                                 <div className="flex items-center gap-1">
                                   <Users className="h-3 w-3" />
                                   {announcement.target_audience === 'all' && 'Todos'}
                                   {announcement.target_audience === 'clients' && 'Clientes'}
                                   {announcement.target_audience === 'suppliers' && 'Fornecedores'}
                                   {announcement.recipients_count && announcement.recipients_count > 1 && 
                                     ` (${announcement.recipients_count} destinatários)`
                                   }
                                 </div>
                                 {announcement.expires_at && (
                                   <div className="flex items-center gap-1">
                                     <Calendar className="h-3 w-3" />
                                     Expira: {formatDate(announcement.expires_at)}
                                   </div>
                                 )}
                                 {announcement.attachments && announcement.attachments.length > 0 && (
                                   <div className="flex items-center gap-1">
                                     <Paperclip className="h-3 w-3" />
                                     {announcement.attachments.length} anexos
                                   </div>
                                 )}
                               </div>
                             </div>
                             <div className="flex items-center gap-2">
                               <Badge variant="outline">
                                 Prioridade: {announcement.priority === 'low' ? 'Baixa' : 
                                           announcement.priority === 'medium' ? 'Média' : 'Alta'}
                               </Badge>
                               {announcement.recipients_count && announcement.recipients_count > 1 && (
                                 <Badge variant="secondary">
                                   {announcement.recipients_count} destinatários
                                 </Badge>
                               )}
                               
                               {/* Menu de Ações */}
                               <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                     <MoreVertical className="h-4 w-4" />
                                   </Button>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent align="end">
                                   <DropdownMenuItem>
                                     <Edit className="h-4 w-4 mr-2" />
                                     Editar
                                   </DropdownMenuItem>
                                   <DropdownMenuItem>
                                     <Archive className="h-4 w-4 mr-2" />
                                     Arquivar
                                   </DropdownMenuItem>
                                   <DropdownMenuItem className="text-red-600">
                                     <Trash2 className="h-4 w-4 mr-2" />
                                     Excluir
                                   </DropdownMenuItem>
                                 </DropdownMenuContent>
                               </DropdownMenu>
                             </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            <AdminTicketsManager />
          </TabsContent>
        </Tabs>
      </div>

      <CreateAnnouncementModal
        open={createAnnouncementOpen}
        onOpenChange={setCreateAnnouncementOpen}
        onSuccess={() => {
          setCreateAnnouncementOpen(false);
          fetchAnnouncements(); // Refresh the list after creating
        }}
      />
    </div>
  );
};

export default CommunicationManagement;