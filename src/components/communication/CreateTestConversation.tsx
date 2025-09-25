import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseQuoteChats } from '@/hooks/useSupabaseQuoteChats';
import { useSupabaseCurrentClient } from '@/hooks/useSupabaseCurrentClient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function CreateTestConversation() {
  const [loading, setLoading] = useState(false);
  const { fetchConversations } = useSupabaseQuoteChats();
  const { client } = useSupabaseCurrentClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const createTestData = async () => {
    if (!client?.id || !user?.id) return;

    setLoading(true);
    try {
      // 1. Buscar o client_id do perfil do usuário
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile?.client_id) {
        throw new Error('Perfil do usuário não encontrado ou sem client_id');
      }

      console.log('User profile client_id:', userProfile.client_id);
      console.log('Client id from hook:', client.id);
      console.log('User id:', user.id);

      // 2. Criar cotação com todos os campos obrigatórios
      const testQuoteId = `TEST-${Date.now()}`;
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          id: testQuoteId,
          title: 'Chat Test - Material de Limpeza',
          description: 'Teste do sistema de chat interno',
          client_id: userProfile.client_id, // OBRIGATÓRIO: client_id do perfil
          client_name: client.name,
          created_by: user.id, // OBRIGATÓRIO: usuário criador
          status: 'draft'
        })
        .select()
        .single();

      if (quoteError) {
        console.error('Erro detalhado ao criar cotação:', quoteError);
        throw new Error(`Falha ao criar cotação: ${quoteError.message} (Code: ${quoteError.code})`);
      }

      console.log('Cotação criada:', quote);

      // 3. Verificar/criar fornecedor
      let { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('name', 'Fornecedor Teste Chat')
        .eq('status', 'active')
        .maybeSingle(); // Usar maybeSingle para evitar erro se não encontrar

      let supplierId = existingSupplier?.id;

      if (!supplierId) {
        const { data: supplier, error: supplierError } = await supabase
          .from('suppliers')
          .insert({
            name: 'Fornecedor Teste Chat',
            cnpj: `${Math.floor(Math.random() * 100000000000000)}`,
            email: 'teste.chat@fornecedor.com',
            phone: '(11) 99999-0000',
            status: 'active',
            type: 'local',
            client_id: userProfile.client_id // Vincular ao mesmo cliente
          })
          .select()
          .single();

        if (supplierError) {
          console.error('Erro ao criar fornecedor:', supplierError);
          throw new Error(`Falha ao criar fornecedor: ${supplierError.message}`);
        }
        supplierId = supplier.id;
        console.log('Fornecedor criado:', supplier);
      }

      // 4. Criar conversa
      const { data: conversation, error: conversationError } = await supabase
        .from('quote_conversations')
        .insert({
          quote_id: quote.id,
          client_id: userProfile.client_id,
          supplier_id: supplierId,
          status: 'active'
        })
        .select()
        .single();

      if (conversationError) {
        console.error('Erro ao criar conversa:', conversationError);
        throw new Error(`Falha ao criar conversa: ${conversationError.message}`);
      }

      console.log('Conversa criada:', conversation);

      // 5. Criar mensagens
      const testMessages = [
        {
          conversation_id: conversation.id,
          sender_id: user.id,
          sender_type: 'client' as const,
          content: 'Olá! Gostaria de uma proposta para material de limpeza.'
        },
        {
          conversation_id: conversation.id,
          sender_id: user.id, // Simular como se fosse do fornecedor
          sender_type: 'supplier' as const,
          content: 'Oi! Recebemos sua cotação. Vamos analisar e enviar proposta em breve!'
        }
      ];

      for (const message of testMessages) {
        const { error: messageError } = await supabase
          .from('quote_messages')
          .insert(message);

        if (messageError) {
          console.error('Erro ao criar mensagem:', messageError);
          throw new Error(`Falha ao criar mensagem: ${messageError.message}`);
        }
      }

      toast({
        title: 'Teste criado com sucesso!',
        description: 'Conversa de exemplo criada. Confira na lista de conversas.',
        duration: 5000
      });

      // Recarregar conversas
      await fetchConversations();

    } catch (error: any) {
      console.error('Erro detalhado completo:', error);
      toast({
        title: 'Erro ao criar teste',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
        duration: 8000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">Chat de Teste</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Criar uma conversa de exemplo para testar o sistema de chat interno.
        </p>
        <Button 
          onClick={createTestData} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Criando...' : 'Criar Conversa de Teste'}
        </Button>
      </CardContent>
    </Card>
  );
}