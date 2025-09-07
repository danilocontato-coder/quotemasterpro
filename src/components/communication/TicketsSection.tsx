import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Headphones, Plus, Clock, User, AlertTriangle } from "lucide-react";
import { useCommunication } from "@/hooks/useCommunication";
import { getTicketStatusColor, getTicketPriorityColor } from "@/data/mockCommunication";
import { CreateTicketModal } from "./CreateTicketModal";
import { TicketDetailModal } from "./TicketDetailModal";

export function TicketsSection() {
  const { tickets } = useCommunication();
  const [createTicketModalOpen, setCreateTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketDetailModalOpen, setTicketDetailModalOpen] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'in_progress':
        return 'Em Andamento';
      case 'resolved':
        return 'Resolvido';
      case 'closed':
        return 'Fechado';
      default:
        return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'Baixa';
      case 'medium':
        return 'Média';
      case 'high':
        return 'Alta';
      case 'urgent':
        return 'Urgente';
      default:
        return priority;
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const handleViewTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setTicketDetailModalOpen(true);
  };

  const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tickets de Suporte</h3>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {openTicketsCount} tickets abertos
          </Badge>
          <Button onClick={() => setCreateTicketModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Ticket
          </Button>
        </div>
      </div>

      {tickets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Headphones className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum ticket criado</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Precisa de ajuda? Crie um ticket de suporte e nossa equipe entrará em contato.
            </p>
            <Button onClick={() => setCreateTicketModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => {
            const statusColor = getTicketStatusColor(ticket.status);
            const priorityColor = getTicketPriorityColor(ticket.priority);
            const isOpen = ticket.status === 'open' || ticket.status === 'in_progress';
            
            return (
              <Card 
                key={ticket.id} 
                className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
                  isOpen ? 'border-l-4 border-l-orange-500' : ''
                }`}
                onClick={() => handleViewTicket(ticket)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base leading-tight">
                          {ticket.subject}
                        </CardTitle>
                        {getPriorityIcon(ticket.priority)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-mono">#{ticket.id}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(ticket.createdAt)}</span>
                        {ticket.assignedToName && (
                          <>
                            <span>•</span>
                            <User className="h-3 w-3" />
                            <span>Atribuído a {ticket.assignedToName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColor}>
                        {getPriorityText(ticket.priority)}
                      </Badge>
                      <Badge className={statusColor}>
                        {getStatusText(ticket.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {ticket.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {ticket.category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {ticket.messages.length} mensagens
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Atualizado em {formatDate(ticket.updatedAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateTicketModal
        open={createTicketModalOpen}
        onOpenChange={setCreateTicketModalOpen}
      />

      <TicketDetailModal
        ticket={selectedTicket}
        open={ticketDetailModalOpen}
        onOpenChange={setTicketDetailModalOpen}
      />
    </div>
  );
}