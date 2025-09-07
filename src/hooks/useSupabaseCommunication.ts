import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseCurrentClient } from './useSupabaseCurrentClient';

interface Announcement {
  id: string;
  client_id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  priority: 'low' | 'medium' | 'high';
  target_audience: 'clients' | 'suppliers' | 'all';
  attachments: string[];
  created_by?: string;
  created_by_name?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  read?: boolean;
}

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

export const useSupabaseCommunication = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { client } = useSupabaseCurrentClient();

  // Add a unique render ID to track re-renders
  const renderIdRef = useRef(Math.random().toString(36).substr(2, 9));
  
  console.log('🔍 useSupabaseCommunication hook initialized', {
    userId: user?.id,
    clientId: client?.id,
    userRole: user?.role,
    renderId: renderIdRef.current,
    timestamp: new Date().toISOString()
  });

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    if (!user || !client?.id) {
      console.log('⚠️ Cannot fetch announcements: missing user or client ID');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('📢 Fetching announcements for client:', client.id);

      // First get announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (announcementsError) {
        throw announcementsError;
      }

      // Then get which ones the user has read
      const { data: readsData, error: readsError } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      if (readsError) {
        console.warn('⚠️ Error fetching announcement reads:', readsError);
      }

      const readAnnouncementIds = new Set(readsData?.map(r => r.announcement_id) || []);

      const enrichedAnnouncements = (announcementsData || []).map(announcement => ({
        ...announcement,
        read: readAnnouncementIds.has(announcement.id),
        // Ensure proper types
        type: announcement.type as 'info' | 'warning' | 'success' | 'urgent',
        priority: announcement.priority as 'low' | 'medium' | 'high',
        target_audience: announcement.target_audience as 'clients' | 'suppliers' | 'all',
        created_at: announcement.created_at || new Date().toISOString(),
        updated_at: announcement.updated_at || new Date().toISOString(),
        attachments: announcement.attachments || [],
        created_by: announcement.created_by || undefined,
        created_by_name: announcement.created_by_name || undefined,
        expires_at: announcement.expires_at || undefined
      }));

      console.log('✅ Announcements fetched:', enrichedAnnouncements.length);
      setAnnouncements(enrichedAnnouncements);

    } catch (err) {
      console.error('❌ Error fetching announcements:', err);
      setError(err instanceof Error ? err.message : 'Error fetching announcements');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, client?.id]); // Remove toast from dependencies

  // Fetch tickets with messages
  const fetchTickets = useCallback(async () => {
    if (!user || !client?.id) {
      console.log('⚠️ Cannot fetch tickets: missing user or client ID');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🎫 Fetching tickets for client:', client.id);

      // Get tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('client_id', client.id)
        .order('updated_at', { ascending: false });

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
            // Ensure proper types
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
  }, [user?.id, client?.id]); // Remove toast from dependencies

  // Mark announcement as read
  const markAnnouncementAsRead = useCallback(async (announcementId: string) => {
    if (!user?.id) return;

    try {
      console.log('👁️ Marking announcement as read:', announcementId);

      const { error } = await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_id: user.id
        });

      if (error) {
        throw error;
      }

      // Update local state
      setAnnouncements(prev => prev.map(announcement => 
        announcement.id === announcementId 
          ? { ...announcement, read: true }
          : announcement
      ));

    } catch (err) {
      console.error('❌ Error marking announcement as read:', err);
      toast({
        title: "Erro",
        description: "Não foi possível marcar o comunicado como lido.",
        variant: "destructive"
      });
    }
  }, [user?.id]); // Remove toast from dependencies

  // Create ticket
  const createTicket = useCallback(async (
    subject: string, 
    description: string, 
    priority: 'low' | 'medium' | 'high' | 'urgent', 
    category: string, 
    attachments?: string[]
  ) => {
    if (!user || !client?.id) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o ticket. Dados de usuário/cliente ausentes.",
        variant: "destructive"
      });
      return null;
    }

    try {
      console.log('🎫 Creating ticket:', { subject, priority, category });

      // Create ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          client_id: client.id,
          client_name: client.name,
          subject: subject.trim(),
          description: description.trim(),
          priority,
          category,
          created_by: user.id,
          created_by_name: user.name
        })
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

      // Refresh tickets without causing re-renders
      setTimeout(() => {
        fetchTickets();
      }, 100);
      
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
  }, [user?.id, user?.name, client?.id, client?.name]); // Remove fetchTickets and toast from dependencies

  // Add message to ticket
  const addTicketMessage = useCallback(async (ticketId: string, content: string, attachments?: string[]) => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('💬 Adding message to ticket:', ticketId);

      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          sender_name: user.name,
          content: content.trim(),
          attachments: attachments || [],
          is_internal: false
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Mensagem adicionada",
        description: "Sua mensagem foi adicionada ao ticket.",
      });

      // Refresh tickets to get the new message without causing re-renders
      setTimeout(() => {
        fetchTickets();
      }, 100);

    } catch (err) {
      console.error('❌ Error adding ticket message:', err);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive"
      });
    }
  }, [user?.id, user?.name]); // Remove fetchTickets and toast from dependencies

  // Create announcement (admin only)
  const createAnnouncement = useCallback(async (
    title: string,
    content: string,
    type: 'info' | 'warning' | 'success' | 'urgent',
    priority: 'low' | 'medium' | 'high',
    targetAudience: 'clients' | 'suppliers' | 'all',
    targetClientId?: string,
    expiresAt?: string,
    attachments?: string[]
  ) => {
    if (!user || user.role !== 'admin') {
      toast({
        title: "Erro",
        description: "Apenas administradores podem criar comunicados.",
        variant: "destructive"
      });
      return null;
    }

    try {
      console.log('📢 Creating announcement:', { title, type, targetAudience });

      const { data, error } = await supabase
        .from('announcements')
        .insert({
          client_id: targetClientId || client?.id, // Use provided client or current client
          title: title.trim(),
          content: content.trim(),
          type,
          priority,
          target_audience: targetAudience,
          created_by: user.id,
          created_by_name: user.name,
          expires_at: expiresAt || null,
          attachments: attachments || []
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Comunicado criado",
        description: "O comunicado foi criado com sucesso.",
      });

      // Refresh announcements without causing re-renders
      setTimeout(() => {
        fetchAnnouncements();
      }, 100);
      
      return data.id;

    } catch (err) {
      console.error('❌ Error creating announcement:', err);
      toast({
        title: "Erro",
        description: "Não foi possível criar o comunicado. Tente novamente.",
        variant: "destructive"
      });
      return null;
    }
  }, [user?.id, user?.name, user?.role, client?.id]); // Remove fetchAnnouncements and toast from dependencies

  // Utility functions
  const getUnreadAnnouncementsCount = useCallback(() => {
    return announcements.filter(announcement => !announcement.read).length;
  }, [announcements]);

  const getOpenTicketsCount = useCallback(() => {
    return tickets.filter(ticket => ticket.status === 'open' || ticket.status === 'in_progress').length;
  }, [tickets]);

  // Load initial data - Remove functions from dependencies to prevent infinite re-renders
  useEffect(() => {
    if (user?.id && client?.id) {
      console.log('🔄 Loading communication data...');
      
      // Call functions directly instead of relying on dependencies
      const loadData = async () => {
        await Promise.all([
          fetchAnnouncements(),
          fetchTickets()
        ]);
      };
      
      loadData();
    }
  }, [user?.id, client?.id]); // Only depend on stable IDs

  return {
    // State
    announcements,
    tickets,
    isLoading,
    error,
    
    // Actions
    markAnnouncementAsRead,
    createTicket,
    addTicketMessage,
    createAnnouncement, // Admin only
    
    // Refresh functions
    fetchAnnouncements,
    fetchTickets,
    
    // Utilities
    getUnreadAnnouncementsCount,
    getOpenTicketsCount,
  };
};