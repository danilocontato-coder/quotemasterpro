import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Headphones, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MessageSquare,
  User,
  Calendar,
  Users,
  FileText,
  ArrowUpDown
} from 'lucide-react';
import { useSupabaseTickets } from '@/hooks/useSupabaseTickets';
import { useSupabaseAdminClients } from '@/hooks/useSupabaseAdminClients';
import { useSupabaseAdminSuppliers } from '@/hooks/useSupabaseAdminSuppliers';
import { CreateTicketModal } from './CreateTicketModal';

export function AdminTicketsManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [newMessageContent, setNewMessageContent] = useState('');

  const { 
    tickets, 
    isLoading, 
    fetchTickets, 
    addTicketMessage,
    updateTicketStatus 
  } = useSupabaseTickets();

  const { clients } = useSupabaseAdminClients();
  const { suppliers } = useSupabaseAdminSuppliers();

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

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
      case 'novo':
        return <Badge className="bg-blue-500 text-white">Novo</Badge>;
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

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const selectedTicketData = selectedTicket ? tickets.find(t => t.id === selectedTicket) : null;

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    await updateTicketStatus(ticketId, newStatus as any);
    fetchTickets();
  };

  const handleAddMessage = async () => {
    if (!selectedTicket || !newMessageContent.trim()) return;

    const success = await addTicketMessage(selectedTicket, newMessageContent, [], true);
    if (success) {
      setNewMessageContent('');
      fetchTickets();
    }
  };

  const getTicketStats = () => {
    return {
      total: tickets.length,
      novo: tickets.filter(t => t.status === 'novo').length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      urgent: tickets.filter(t => t.priority === 'urgent').length
    };
  };

  const stats = getTicketStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciar Tickets de Suporte</h2>
          <p className="text-muted-foreground">
            Gerencie todos os tickets de suporte dos clientes e fornecedores
          </p>
        </div>
        <CreateTicketModal onTicketCreated={() => fetchTickets()} />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Headphones className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.novo}</p>
                <p className="text-sm text-muted-foreground">Novos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.urgent}</p>
                <p className="text-sm text-muted-foreground">Urgentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              Tickets ({filteredTickets.length})
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
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <Headphones className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum ticket encontrado</h3>
                <p className="text-muted-foreground">
                  {tickets.length === 0 
                    ? 'Nenhum ticket foi criado ainda.'
                    : 'Tente ajustar os filtros de busca.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {filteredTickets.map((ticket) => (
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
                            <CardTitle 
                              className="text-sm leading-tight truncate text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Abrir modal de chat direto com o cliente
                              }}
                            >
                              #{ticket.id}
                            </CardTitle>
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                          <h4 className="font-medium text-sm mb-2 line-clamp-1">
                            {ticket.subject}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <User className="h-3 w-3" />
                            <span>{ticket.client_name}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(ticket.created_at)}</span>
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
                    <Select
                      value={selectedTicketData.status}
                      onValueChange={(value) => handleStatusChange(selectedTicketData.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="open">Aberto</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                        <SelectItem value="closed">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <h4 className="font-medium mb-2">{selectedTicketData.subject}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Cliente: {selectedTicketData.client_name}</span>
                    <span>•</span>
                    <span>Criado por: {selectedTicketData.created_by_name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(selectedTicketData.status)}
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
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment: string, index: number) => (
                            <a 
                              key={index} 
                              href={`https://bpsqyaxdhqejozmlejcb.supabase.co/storage/v1/object/public/attachments/${attachment}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
                            >
                              <span>📎 {attachment.split('/').pop()}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Message */}
                <div className="border-t pt-4">
                  <Label htmlFor="message">Adicionar Resposta Interna</Label>
                  <Textarea
                    id="message"
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    placeholder="Digite sua resposta..."
                    rows={3}
                    className="mt-2"
                  />
                  <Button 
                    onClick={handleAddMessage}
                    className="mt-2"
                    disabled={!newMessageContent.trim()}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Adicionar Resposta
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}