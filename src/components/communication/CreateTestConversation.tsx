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
      // 1. Criar uma cotação de teste
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          id: `RFQ-TEST-${Date.now()}`,
          title: 'Material de Limpeza - Teste Chat',
          description: 'Cotação de teste para demonstrar o sistema de chat',
          client_id: client.id,
          client_name: client.name,
          status: 'sent',
          created_by: user.id
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // 2. Criar um fornecedor de teste (se não existir)
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('name', 'Fornecedor Chat Teste')
        .single();

      let supplierId = existingSupplier?.id;

      if (!supplierId) {
        const { data: supplier, error: supplierError } = await supabase
          .from('suppliers')
          .insert({
            name: 'Fornecedor Chat Teste',
            cnpj: '12345678000199',
            email: 'teste@fornecedor.com',
            status: 'active',
            type: 'local'
          })
          .select()
          .single();

        if (supplierError) throw supplierError;
        supplierId = supplier.id;
      }

      // 3. Criar conversa
      const { data: conversation, error: conversationError } = await supabase
        .from('quote_conversations')
        .insert({
          quote_id: quote.id,
          client_id: client.id,
          supplier_id: supplierId,
          status: 'active'
        })
        .select()
        .single();

      if (conversationError) throw conversationError;

      // 4. Criar algumas mensagens de exemplo
      const messages = [
        {
          conversation_id: conversation.id,
          sender_id: user.id,
          sender_type: 'client',
          content: 'Olá! Gostaria de receber uma proposta para material de limpeza conforme especificado na cotação.'
        },
        {
          conversation_id: conversation.id,
          sender_id: supplierId, // Simular mensagem do fornecedor
          sender_type: 'supplier',
          content: 'Olá! Recebemos sua solicitação. Vamos analisar os itens e enviar uma proposta em breve. Você tem alguma preferência de marca ou prazo específico?'
        },
        {
          conversation_id: conversation.id,
          sender_id: user.id,
          sender_type: 'client',
          content: 'Precisamos dos produtos até o final do mês. Marcas conhecidas seriam ideais para manter a qualidade.'
        }
      ];

      for (const message of messages) {
        const { error: messageError } = await supabase
          .from('quote_messages')
          .insert(message);

        if (messageError) throw messageError;
      }

      toast({
        title: 'Dados de teste criados!',
        description: 'Uma conversa de exemplo foi criada com sucesso.'
      });

      // Recarregar conversas
      await fetchConversations();

    } catch (error: any) {
      console.error('Erro ao criar dados de teste:', error);
      toast({
        title: 'Erro ao criar dados de teste',
        description: error.message,
        variant: 'destructive'
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