import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseCurrentClient } from '@/hooks/useSupabaseCurrentClient';

export interface QuoteConversation {
  id: string;
  quote_id: string;
  client_id: string;
  supplier_id: string;
  status: 'active' | 'closed';
  created_at: string;
  updated_at: string;
  last_message_at: string;
  // Dados relacionados
  quote_title?: string;
  supplier_name?: string;
  client_name?: string;
  unread_count?: number;
  last_message?: string;
  messages_count?: number;
}

export interface QuoteMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'client' | 'supplier';
  content: string;
  attachments: string[];
  read_at: string | null;
  created_at: string;
  sender_name?: string;
}

export const useSupabaseQuoteChats = () => {
  const [conversations, setConversations] = useState<QuoteConversation[]>([]);
  const [messages, setMessages] = useState<Record<string, QuoteMessage[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { client } = useSupabaseCurrentClient();

  // Buscar conversas do cliente atual
  const fetchConversations = useCallback(async () => {
    if (!client?.id || !user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Buscar conversas básicas
      const { data: conversationsData, error: fetchError } = await supabase
        .from('quote_conversations')
        .select('*')
        .eq('client_id', client.id)
        .order('last_message_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Buscar detalhes adicionais para cada conversa
      const conversationsWithDetails = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          // Buscar dados da cotação
          const { data: quoteData } = await supabase
            .from('quotes')
            .select('title, client_name')
            .eq('id', conv.quote_id)
            .single();

          // Buscar dados do fornecedor
          const { data: supplierData } = await supabase
            .from('suppliers')
            .select('name')
            .eq('id', conv.supplier_id)
            .single();

          // Buscar última mensagem
          const { data: lastMessage } = await supabase
            .from('quote_messages')
            .select('content, created_at, sender_type, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Buscar contagem total de mensagens
          const { count: messagesCount } = await supabase
            .from('quote_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id);

          // Buscar mensagens não lidas (do ponto de vista do cliente)
          const { count: unreadCount } = await supabase
            .from('quote_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_type', 'supplier')
            .is('read_at', null);

          return {
            ...conv,
            status: conv.status as 'active' | 'closed',
            quote_title: quoteData?.title || `Cotação ${conv.quote_id}`,
            supplier_name: supplierData?.name || 'Fornecedor',
            client_name: quoteData?.client_name || client.name,
            last_message: lastMessage?.content || 'Nenhuma mensagem ainda',
            messages_count: messagesCount || 0,
            unread_count: unreadCount || 0,
          } as QuoteConversation;
        })
      );

      setConversations(conversationsWithDetails);
      
    } catch (err: any) {
      console.error('Erro ao buscar conversas:', err);
      setError(err.message);
      toast({
        title: "Erro ao carregar conversas",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [client?.id, user?.id, toast]);

  // Buscar mensagens de uma conversa específica
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('quote_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Buscar nomes dos remetentes
      const messagesWithSenderName = await Promise.all(
        (data || []).map(async (msg) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', msg.sender_id)
            .single();

          return {
            ...msg,
            sender_type: msg.sender_type as 'client' | 'supplier',
            sender_name: profileData?.name || (msg.sender_type === 'client' ? 'Cliente' : 'Fornecedor'),
            attachments: msg.attachments || []
          } as QuoteMessage;
        })
      );

      setMessages(prev => ({
        ...prev,
        [conversationId]: messagesWithSenderName
      }));

    } catch (err: any) {
      console.error('Erro ao buscar mensagens:', err);
      toast({
        title: "Erro ao carregar mensagens",
        description: err.message,
        variant: "destructive"
      });
    }
  }, [user?.id, toast]);

  // Enviar mensagem
  const sendMessage = useCallback(async (conversationId: string, content: string, attachments?: string[]) => {
    if (!user?.id) return;

    try {
      const { data, error: sendError } = await supabase
        .from('quote_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: 'client',
          content: content.trim(),
          attachments: attachments || []
        })
        .select()
        .single();

      if (sendError) throw sendError;

      // Atualizar mensagens localmente
      await fetchMessages(conversationId);
      
      // Recarregar conversas para atualizar última mensagem
      await fetchConversations();

      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso"
      });

    } catch (err: any) {
      console.error('Erro ao enviar mensagem:', err);
      toast({
        title: "Erro ao enviar mensagem",
        description: err.message,
        variant: "destructive"
      });
    }
  }, [user?.id, toast, fetchMessages, fetchConversations]);

  // Marcar mensagens como lidas
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      // Marcar mensagens do fornecedor como lidas
      const { error: updateError } = await supabase
        .from('quote_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'supplier')
        .is('read_at', null);

      if (updateError) throw updateError;

      // Atualizar conversas localmente
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );

    } catch (err: any) {
      console.error('Erro ao marcar mensagens como lidas:', err);
    }
  }, [user?.id]);

  // Criar conversa para uma cotação específica (se não existir)
  const createConversationForQuote = useCallback(async (quoteId: string, supplierId: string) => {
    if (!client?.id || !user?.id) return;

    try {
      // Verificar se já existe conversa
      const { data: existing } = await supabase
        .from('quote_conversations')
        .select('id')
        .eq('quote_id', quoteId)
        .eq('supplier_id', supplierId)
        .single();

      if (existing) {
        return existing.id;
      }

      // Criar nova conversa
      const { data, error: createError } = await supabase
        .from('quote_conversations')
        .insert({
          quote_id: quoteId,
          client_id: client.id,
          supplier_id: supplierId,
          status: 'active'
        })
        .select()
        .single();

      if (createError) throw createError;

      // Recarregar conversas
      await fetchConversations();
      
      return data.id;

    } catch (err: any) {
      console.error('Erro ao criar conversa:', err);
      toast({
        title: "Erro ao criar conversa",
        description: err.message,
        variant: "destructive"
      });
    }
  }, [client?.id, user?.id, toast, fetchConversations]);

  // Configurar realtime para conversas e mensagens
  useEffect(() => {
    if (!client?.id) return;

    // Canal para conversas
    const conversationsChannel = supabase
      .channel('quote_conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quote_conversations',
          filter: `client_id=eq.${client.id}`
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    // Canal para mensagens
    const messagesChannel = supabase
      .channel('quote_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quote_messages'
        },
        (payload) => {
          // Recarregar mensagens da conversa afetada
          if (payload.new?.conversation_id) {
            fetchMessages(payload.new.conversation_id);
            fetchConversations(); // Para atualizar última mensagem
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [client?.id, fetchConversations, fetchMessages]);

  // Carregar conversas inicialmente
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const getUnreadChatsCount = useCallback(() => {
    return conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0);
  }, [conversations]);

  return {
    conversations,
    messages,
    loading,
    error,
    sendMessage,
    fetchMessages,
    markMessagesAsRead,
    createConversationForQuote,
    fetchConversations,
    getUnreadChatsCount
  };
};