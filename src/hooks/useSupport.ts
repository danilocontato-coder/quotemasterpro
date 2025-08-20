import { useState, useEffect } from 'react';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdBy: string;
  createdAt: string;
  lastUpdate: string;
  slaUntil: string;
  entityType?: string;
  entityId?: string;
  messages?: TicketMessage[];
}

interface TicketMessage {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  attachments?: string[];
}

interface CreateTicketData {
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  entityType?: string;
  entityId?: string;
}

const mockTickets: SupportTicket[] = [
  {
    id: 'TIC-001',
    subject: 'Problema com upload de anexos',
    description: 'Não consigo fazer upload de arquivos PDF nas minhas propostas.',
    status: 'open',
    priority: 'high',
    createdBy: 'Fornecedor Alpha',
    createdAt: '15/01/2024 14:30',
    lastUpdate: '15/01/2024 14:30',
    slaUntil: '16/01/2024 14:30',
    entityType: 'quote',
    entityId: 'RFQ-2024-001',
    messages: [
      {
        id: 'msg-1',
        author: 'Suporte QuoteMaster',
        content: 'Olá! Recebemos sua solicitação e estamos analisando o problema. Você pode nos informar o tamanho do arquivo que está tentando fazer upload?',
        createdAt: '15/01/2024 15:00'
      }
    ]
  },
  {
    id: 'TIC-002',
    subject: 'Dúvida sobre prazo de entrega',
    description: 'Como alterar o prazo de entrega de uma proposta já enviada?',
    status: 'in_progress',
    priority: 'medium',
    createdBy: 'Fornecedor Beta',
    createdAt: '14/01/2024 09:15',
    lastUpdate: '14/01/2024 16:45',
    slaUntil: '16/01/2024 09:15',
    messages: [
      {
        id: 'msg-2',
        author: 'Suporte QuoteMaster',
        content: 'Para alterar o prazo de entrega, você precisa solicitar uma revisão da proposta através do botão "Solicitar Alteração" na tela de detalhes da cotação.',
        createdAt: '14/01/2024 16:45'
      }
    ]
  },
  {
    id: 'TIC-003',
    subject: 'Erro ao gerar relatório',
    description: 'Quando tento gerar o relatório mensal, a página fica carregando indefinidamente.',
    status: 'closed',
    priority: 'low',
    createdBy: 'Condomínio Azul',
    createdAt: '10/01/2024 11:20',
    lastUpdate: '12/01/2024 14:00',
    slaUntil: '12/01/2024 11:20',
    messages: [
      {
        id: 'msg-3',
        author: 'Suporte QuoteMaster',
        content: 'Problema foi corrigido na última atualização do sistema. Por favor, limpe o cache do navegador e tente novamente.',
        createdAt: '12/01/2024 14:00'
      }
    ]
  }
];

export function useSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simula carregamento dos tickets
    const loadTickets = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setTickets(mockTickets);
      setIsLoading(false);
    };

    loadTickets();
  }, []);

  const getTicketById = (id: string): SupportTicket | undefined => {
    return tickets.find(ticket => ticket.id === id);
  };

  const createTicket = (ticketData: CreateTicketData): string => {
    const newTicketId = `TIC-${String(tickets.length + 1).padStart(3, '0')}`;
    const now = new Date();
    const slaHours = ticketData.priority === 'high' ? 24 : ticketData.priority === 'medium' ? 48 : 72;
    const slaDate = new Date(now.getTime() + slaHours * 60 * 60 * 1000);
    
    const newTicket: SupportTicket = {
      id: newTicketId,
      subject: ticketData.subject,
      description: ticketData.description,
      status: 'open',
      priority: ticketData.priority,
      createdBy: 'Usuário Atual', // Mock - would come from auth context
      createdAt: now.toLocaleString('pt-BR'),
      lastUpdate: now.toLocaleString('pt-BR'),
      slaUntil: slaDate.toLocaleString('pt-BR'),
      entityType: ticketData.entityType,
      entityId: ticketData.entityId,
      messages: []
    };

    setTickets(prev => [newTicket, ...prev]);

    // Mock audit log
    console.log('Audit Log:', {
      action: 'TICKET_CREATED',
      ticketId: newTicketId,
      userId: 'current-user',
      timestamp: new Date().toISOString(),
      details: ticketData
    });

    return newTicketId;
  };

  const addMessage = (ticketId: string, content: string) => {
    const messageId = `msg-${Date.now()}`;
    const newMessage: TicketMessage = {
      id: messageId,
      author: 'Usuário Atual',
      content,
      createdAt: new Date().toLocaleString('pt-BR')
    };

    setTickets(prev => prev.map(ticket => {
      if (ticket.id === ticketId) {
        return {
          ...ticket,
          messages: [...(ticket.messages || []), newMessage],
          lastUpdate: new Date().toLocaleString('pt-BR')
        };
      }
      return ticket;
    }));

    // Mock audit log
    console.log('Audit Log:', {
      action: 'TICKET_MESSAGE_ADDED',
      ticketId,
      messageId,
      userId: 'current-user',
      timestamp: new Date().toISOString()
    });
  };

  const updateTicketStatus = (ticketId: string, newStatus: SupportTicket['status']) => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id === ticketId) {
        return {
          ...ticket,
          status: newStatus,
          lastUpdate: new Date().toLocaleString('pt-BR')
        };
      }
      return ticket;
    }));

    // Mock audit log
    console.log('Audit Log:', {
      action: 'TICKET_STATUS_CHANGED',
      ticketId,
      newStatus,
      userId: 'current-user',
      timestamp: new Date().toISOString()
    });
  };

  return {
    tickets,
    isLoading,
    getTicketById,
    createTicket,
    addMessage,
    updateTicketStatus
  };
}