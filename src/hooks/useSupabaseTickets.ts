import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SupportTicket {
  id: string;
  client_id: string;
  client_name?: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  created_by: string;
  created_by_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
  messages: TicketMessage[];
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  attachments: string[];
  is_internal: boolean;
  created_at: string;
}

export const useSupabaseTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch tickets for admin (all) or client-specific
  const fetchTickets = useCallback(async (clientId?: string) => {
    if (!user) {
      console.log('⚠️ Cannot fetch tickets: no user');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false });

      // Filter by client if specified or if not admin
      if (clientId) {
        query = query.eq('client_id', clientId);
      } else if (user.role !== 'admin') {
        console.log('⚠️ Non-admin users need a client ID');
        return;
      }

      const { data: ticketsData, error: ticketsError } = await query;

      if (ticketsError) {
        throw ticketsError;
      }

      // Get messages for each ticket
      const ticketsWithMessages = await Promise.all(
        (ticketsData || []).map(async (ticket) => {
          const { data: messagesData, error: messagesError } = await supabase
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: true });

          if (messagesError) {
            console.warn(`⚠️ Error fetching messages for ticket ${ticket.id}:`, messagesError);
          }

          return {
            ...ticket,
            status: ticket.status as 'open' | 'in_progress' | 'resolved' | 'closed',
            priority: ticket.priority as 'low' | 'medium' | 'high' | 'urgent',
            created_at: ticket.created_at || new Date().toISOString(),
            updated_at: ticket.updated_at || new Date().toISOString(),
            client_name: ticket.client_name || undefined,
            category: ticket.category || undefined,
            created_by_name: ticket.created_by_name || undefined,
            assigned_to: ticket.assigned_to || undefined,
            assigned_to_name: ticket.assigned_to_name || undefined,
            messages: (messagesData || []).map(msg => ({
              ...msg,
              created_at: msg.created_at || new Date().toISOString(),
              sender_name: msg.sender_name || undefined,
              attachments: msg.attachments || [],
              is_internal: msg.is_internal || false
            }))
          };
        })
      );

      console.log('✅ Tickets fetched:', ticketsWithMessages.length);
      setTickets(ticketsWithMessages);

    } catch (err) {
      console.error('❌ Error fetching tickets:', err);
      setError(err instanceof Error ? err.message : 'Error fetching tickets');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create ticket
  const createTicket = useCallback(async (
    subject: string, 
    description: string, 
    priority: 'low' | 'medium' | 'high' | 'urgent', 
    category: string,
    clientId?: string,
    supplierId?: string,
    targetName?: string,
    attachments?: string[]
  ) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive"
      });
      return null;
    }

    try {
      // Create ticket
      const ticketData_insert: any = {
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category,
        created_by: user.id,
        created_by_name: user.name
      };
      
      if (clientId) {
        ticketData_insert.client_id = clientId;
        ticketData_insert.client_name = targetName;
      } else if (supplierId) {
        ticketData_insert.supplier_id = supplierId;
        ticketData_insert.supplier_name = targetName;
      }

      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .insert(ticketData_insert)
        .select()
        .single();

      if (ticketError) {
        throw ticketError;
      }

      // Create initial message
      const { error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketData.id,
          sender_id: user.id,
          sender_name: user.name,
          content: description.trim(),
          attachments: attachments || [],
          is_internal: false
        });

      if (messageError) {
        throw messageError;
      }

      toast({
        title: "Ticket criado",
        description: `Ticket #${ticketData.id} foi criado com sucesso.`,
      });
      
      return ticketData.id;

    } catch (err) {
      console.error('❌ Error creating ticket:', err);
      toast({
        title: "Erro",
        description: "Não foi possível criar o ticket. Tente novamente.",
        variant: "destructive"
      });
      return null;
    }
  }, [user, toast]);

  // Add message to ticket
  const addTicketMessage = useCallback(async (
    ticketId: string, 
    content: string, 
    attachments?: string[],
    isInternal = false
  ) => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          sender_name: user.name,
          content: content.trim(),
          attachments: attachments || [],
          is_internal: isInternal
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Mensagem adicionada",
        description: "Sua mensagem foi adicionada ao ticket.",
      });

      return true;

    } catch (err) {
      console.error('❌ Error adding ticket message:', err);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  // Update ticket status (admin only)
  const updateTicketStatus = useCallback(async (
    ticketId: string, 
    status: 'open' | 'in_progress' | 'resolved' | 'closed',
    assignedTo?: string,
    assignedToName?: string
  ) => {
    if (!user || user.role !== 'admin') {
      toast({
        title: "Erro",
        description: "Apenas administradores podem alterar status de tickets.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const updates: any = { status };
      if (assignedTo !== undefined) {
        updates.assigned_to = assignedTo;
        updates.assigned_to_name = assignedToName || null;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) {
        throw error;
      }

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { 
              ...ticket, 
              status, 
              assigned_to: assignedTo,
              assigned_to_name: assignedToName,
              updated_at: new Date().toISOString()
            }
          : ticket
      ));

      toast({
        title: "Status atualizado",
        description: "O status do ticket foi atualizado com sucesso.",
      });

      return true;

    } catch (err) {
      console.error('❌ Error updating ticket status:', err);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do ticket.",
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  // Utility functions
  const getOpenTicketsCount = useCallback(() => {
    return tickets.filter(ticket => ticket.status === 'open' || ticket.status === 'in_progress').length;
  }, [tickets]);

  const getTicketsByStatus = useCallback((status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    return tickets.filter(ticket => ticket.status === status);
  }, [tickets]);

  const getTicketsByPriority = useCallback((priority: 'low' | 'medium' | 'high' | 'urgent') => {
    return tickets.filter(ticket => ticket.priority === priority);
  }, [tickets]);

  return {
    // State
    tickets,
    isLoading,
    error,
    
    // Actions
    fetchTickets,
    createTicket,
    addTicketMessage,
    updateTicketStatus,
    
    // Utilities
    getOpenTicketsCount,
    getTicketsByStatus,
    getTicketsByPriority,
  };
};