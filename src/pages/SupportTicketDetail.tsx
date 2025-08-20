import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, User, Clock, AlertCircle, Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupport } from '@/hooks/useSupport';
import { useToast } from '@/hooks/use-toast';

const SupportTicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getTicketById, addMessage, updateTicketStatus } = useSupport();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [newStatus, setNewStatus] = useState<'open' | 'in_progress' | 'waiting' | 'closed' | ''>('');

  const ticket = getTicketById(id || '');

  if (!ticket) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Ticket não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/support/tickets')} className="mt-4">
          Voltar para Tickets
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: 'Aberto', variant: 'destructive' as const },
      in_progress: { label: 'Em Andamento', variant: 'default' as const },
      waiting: { label: 'Aguardando', variant: 'secondary' as const },
      closed: { label: 'Fechado', variant: 'outline' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Baixa', variant: 'outline' as const },
      medium: { label: 'Média', variant: 'default' as const },
      high: { label: 'Alta', variant: 'destructive' as const },
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma mensagem",
        variant: "destructive",
      });
      return;
    }

    addMessage(ticket.id, newMessage);
    setNewMessage('');
    
    toast({
      title: "Sucesso",
      description: "Mensagem enviada",
    });
  };

  const handleStatusChange = (status: 'open' | 'in_progress' | 'waiting' | 'closed') => {
    updateTicketStatus(ticket.id, status);
    setNewStatus('');
    
    toast({
      title: "Sucesso",
      description: "Status atualizado",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/support/tickets')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ticket #{ticket.id}</h1>
          <p className="text-muted-foreground">{ticket.subject}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Ticket */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(ticket.status)}</div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Prioridade</p>
              <div className="mt-1">{getPriorityBadge(ticket.priority)}</div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Criado por</p>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{ticket.createdBy}</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">SLA</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{ticket.slaUntil}</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Última atualização</p>
              <p className="text-sm mt-1">{ticket.lastUpdate}</p>
            </div>

            {ticket.entityType && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vinculado à</p>
                <p className="text-sm mt-1">{ticket.entityType}: {ticket.entityId}</p>
              </div>
            )}

            {/* Ações do Admin */}
            <div className="pt-4 border-t space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Alterar Status</p>
                <Select value={newStatus} onValueChange={(value: 'open' | 'in_progress' | 'waiting' | 'closed') => setNewStatus(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="waiting">Aguardando</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
                {newStatus && (
                  <Button 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => handleStatusChange(newStatus)}
                  >
                    Alterar Status
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversa */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mensagem inicial */}
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium text-sm">{ticket.createdBy}</span>
                  <span className="text-xs text-muted-foreground">{ticket.createdAt}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {/* Mensagens da conversa */}
              {ticket.messages?.map((message) => (
                <div key={message.id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium text-sm">{message.author}</span>
                    <span className="text-xs text-muted-foreground">{message.createdAt}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Anexos:</p>
                      <div className="flex gap-2">
                        {message.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                            <Paperclip className="h-3 w-3" />
                            {attachment}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Campo de nova mensagem */}
              <div className="border-t pt-4">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Digite sua resposta..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={4}
                  />
                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Anexar Arquivo
                    </Button>
                    <Button onClick={handleSendMessage}>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SupportTicketDetail;