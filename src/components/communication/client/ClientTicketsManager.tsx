import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Headphones, 
  Plus, 
  MessageSquare, 
  Clock, 
  User,
  AlertTriangle,
  CheckCircle,
  FileText
} from 'lucide-react';
import { useSupabaseTickets } from '@/hooks/useSupabaseTickets';
import { useSupabaseCurrentClient } from '@/hooks/useSupabaseCurrentClient';
import { useAuth } from '@/contexts/AuthContext';

export function ClientTicketsManager() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [newMessageContent, setNewMessageContent] = useState('');

  const { tickets, fetchTickets, createTicket, addTicketMessage, isLoading } = useSupabaseTickets();
  const { client } = useSupabaseCurrentClient();
  const { user } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: ''
  });

  useEffect(() => {
    if (client?.id) {
      fetchTickets(client.id);
    }
  }, [client?.id, fetchTickets]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-red-500 text-white">Aberto</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500 text-white">Em Andamento</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500 text-white">Resolvido</Badge>;
      case 'closed':
        return <Badge variant="secondary">Fechado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white">Alta</Badge>;
      case 'medium':
        return <Badge variant="secondary">Média</Badge>;
      case 'low':
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return null;
    }
  };

  const selectedTicketData = selectedTicket ? tickets.find(t => t.id === selectedTicket) : null;

  const handleCreateTicket = async () => {
    if (!formData.subject.trim() || !formData.description.trim() || !client?.id || !user?.name) {
      return;
    }

    const ticketId = await createTicket(
      client.id,
      client.name,
      formData.subject,
      formData.description,
      formData.priority,
      formData.category || 'Geral'
    );

    if (ticketId) {
      setIsCreateModalOpen(false);
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
        category: ''
      });
      fetchTickets(client.id);
    }
  };

  const handleAddMessage = async () => {
    if (!selectedTicket || !newMessageContent.trim()) return;

    const success = await addTicketMessage(selectedTicket, newMessageContent);
    if (success) {
      setNewMessageContent('');
      if (client?.id) {
        fetchTickets(client.id);
      }
    }
  };

  const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tickets de Suporte</h3>
          <p className="text-sm text-muted-foreground">
            {openTicketsCount} tickets abertos
          </p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Novo Ticket de Suporte</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Descreva brevemente o problema"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o problema em detalhes"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Ex: Técnico, Financeiro"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTicket}>
                  Criar Ticket
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              Meus Tickets ({tickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12">
                <Headphones className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum ticket criado</h3>
                <p className="text-muted-foreground">
                  Crie seu primeiro ticket de suporte clicando no botão acima.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {tickets.map((ticket) => (
                  <Card 
                    key={ticket.id} 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedTicket === ticket.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedTicket(ticket.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-sm leading-tight truncate">
                              #{ticket.id}
                            </CardTitle>
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                          <h4 className="font-medium text-sm mb-2 line-clamp-1">
                            {ticket.subject}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(ticket.created_at)}</span>
                            {ticket.category && (
                              <>
                                <span>•</span>
                                <span>{ticket.category}</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {ticket.description}
                          </p>
                          {ticket.messages.length > 1 && (
                            <div className="flex items-center gap-1 mt-2">
                              <MessageSquare className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {ticket.messages.length} mensagens
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Detail */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes do Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedTicketData ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Selecione um ticket</h3>
                <p className="text-muted-foreground">
                  Clique em um ticket da lista para ver os detalhes
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Ticket Header */}
                <div className="border-b pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">#{selectedTicketData.id}</h3>
                    {getStatusBadge(selectedTicketData.status)}
                  </div>
                  <h4 className="font-medium mb-2">{selectedTicketData.subject}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Criado em: {formatDate(selectedTicketData.created_at)}</span>
                    {selectedTicketData.assigned_to_name && (
                      <>
                        <span>•</span>
                        <span>Atribuído a: {selectedTicketData.assigned_to_name}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {getPriorityBadge(selectedTicketData.priority)}
                    {selectedTicketData.category && (
                      <Badge variant="outline">{selectedTicketData.category}</Badge>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {selectedTicketData.messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`p-3 rounded-lg ${
                        message.is_internal 
                          ? 'bg-yellow-50 border-l-4 border-l-yellow-400' 
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{message.sender_name}</span>
                          {message.is_internal && (
                            <Badge variant="secondary" className="text-xs">Interno</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  ))}
                </div>

                {/* Add Message (only for open/in_progress tickets) */}
                {(selectedTicketData.status === 'open' || selectedTicketData.status === 'in_progress') && (
                  <div className="border-t pt-4">
                    <Label htmlFor="message">Adicionar Comentário</Label>
                    <Textarea
                      id="message"
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.target.value)}
                      placeholder="Digite seu comentário..."
                      rows={3}
                      className="mt-2"
                    />
                    <Button 
                      onClick={handleAddMessage}
                      className="mt-2"
                      disabled={!newMessageContent.trim()}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Enviar Comentário
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}