import { useState, useCallback } from 'react';
import { mockChats, mockAnnouncements, mockTickets, Chat, Message, Announcement, Ticket } from '@/data/mockCommunication';
import { useToast } from '@/hooks/use-toast';

export const useCommunication = () => {
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements);
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const { toast } = useToast();

  const sendMessage = useCallback((chatId: string, content: string, attachments?: string[]) => {
    const newMessage: Message = {
      id: `MSG${Date.now()}`,
      chatId,
      senderId: 'USR001', // Mock current user
      senderName: 'João Silva (Cliente)',
      senderType: 'client',
      content,
      attachments: attachments || [],
      timestamp: new Date().toISOString(),
      read: true,
    };

    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          lastMessage: content,
          lastMessageTime: newMessage.timestamp,
          updatedAt: newMessage.timestamp,
        };
      }
      return chat;
    }));

    toast({
      title: "Mensagem enviada",
      description: "Sua mensagem foi enviada com sucesso.",
    });

    // Simulate supplier response after 2 seconds
    setTimeout(() => {
      const responseMessage: Message = {
        id: `MSG${Date.now() + 1}`,
        chatId,
        senderId: 'SUP001',
        senderName: 'Fornecedor ABC',
        senderType: 'supplier',
        content: 'Recebido! Vou analisar e responder em breve.',
        attachments: [],
        timestamp: new Date().toISOString(),
        read: false,
      };

      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, responseMessage],
            lastMessage: responseMessage.content,
            lastMessageTime: responseMessage.timestamp,
            updatedAt: responseMessage.timestamp,
            unreadCount: chat.unreadCount + 1,
          };
        }
        return chat;
      }));
    }, 2000);
  }, [toast]);

  const markChatAsRead = useCallback((chatId: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          unreadCount: 0,
          messages: chat.messages.map(msg => ({ ...msg, read: true })),
        };
      }
      return chat;
    }));
  }, []);

  const markAnnouncementAsRead = useCallback((announcementId: string) => {
    setAnnouncements(prev => prev.map(announcement => {
      if (announcement.id === announcementId) {
        return { ...announcement, read: true };
      }
      return announcement;
    }));
  }, []);

  const createTicket = useCallback((subject: string, description: string, priority: 'low' | 'medium' | 'high' | 'urgent', category: string, attachments?: string[]) => {
    const newTicket: Ticket = {
      id: `TKT${Date.now()}`,
      subject,
      description,
      status: 'open',
      priority,
      category,
      clientId: '1',
      clientName: 'Condomínio Jardim das Flores',
      createdBy: 'USR001',
      createdByName: 'João Silva',
      assignedTo: null,
      assignedToName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `TMSG${Date.now()}`,
          ticketId: `TKT${Date.now()}`,
          senderId: 'USR001',
          senderName: 'João Silva',
          senderType: 'client',
          content: description,
          attachments: attachments || [],
          timestamp: new Date().toISOString(),
          isInternal: false,
        }
      ],
    };

    setTickets(prev => [newTicket, ...prev]);

    toast({
      title: "Ticket criado",
      description: `Ticket #${newTicket.id} foi criado com sucesso.`,
    });

    return newTicket.id;
  }, [toast]);

  const addTicketMessage = useCallback((ticketId: string, content: string, attachments?: string[]) => {
    const newMessage = {
      id: `TMSG${Date.now()}`,
      ticketId,
      senderId: 'USR001',
      senderName: 'João Silva',
      senderType: 'client' as const,
      content,
      attachments: attachments || [],
      timestamp: new Date().toISOString(),
      isInternal: false,
    };

    setTickets(prev => prev.map(ticket => {
      if (ticket.id === ticketId) {
        return {
          ...ticket,
          messages: [...ticket.messages, newMessage],
          updatedAt: new Date().toISOString(),
        };
      }
      return ticket;
    }));

    toast({
      title: "Mensagem adicionada",
      description: "Sua mensagem foi adicionada ao ticket.",
    });
  }, [toast]);

  const getUnreadChatsCount = useCallback(() => {
    return chats.reduce((total, chat) => total + chat.unreadCount, 0);
  }, [chats]);

  const getUnreadAnnouncementsCount = useCallback(() => {
    return announcements.filter(announcement => !announcement.read).length;
  }, [announcements]);

  const getOpenTicketsCount = useCallback(() => {
    return tickets.filter(ticket => ticket.status === 'open' || ticket.status === 'in_progress').length;
  }, [tickets]);

  return {
    chats,
    announcements,
    tickets,
    sendMessage,
    markChatAsRead,
    markAnnouncementAsRead,
    createTicket,
    addTicketMessage,
    getUnreadChatsCount,
    getUnreadAnnouncementsCount,
    getOpenTicketsCount,
  };
};