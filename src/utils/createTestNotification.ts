import { supabase } from '@/integrations/supabase/client';

interface CreateTestNotificationParams {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'proposal' | 'delivery' | 'payment' | 'quote' | 'ticket';
  priority?: 'low' | 'normal' | 'high';
  action_url?: string;
  metadata?: any;
}

export async function createTestNotification({
  title,
  message,
  type = 'info',
  priority = 'normal',
  action_url,
  metadata = {}
}: CreateTestNotificationParams) {
  try {
    // Buscar o usuário atual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Criar a notificação usando a função SQL
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: user.id,
      p_title: title,
      p_message: message,
      p_type: type,
      p_priority: priority,
      p_action_url: action_url,
      p_metadata: metadata
    });

    if (error) {
      throw error;
    }

    console.log('✅ Notificação de teste criada:', data);
    return data;
  } catch (error) {
    console.error('❌ Erro ao criar notificação de teste:', error);
    throw error;
  }
}

// Função para criar múltiplas notificações de teste
export async function createTestNotifications() {
  const notifications = [
    {
      title: 'Nova Cotação Criada',
      message: 'A cotação #RFQ01 foi criada com sucesso',
      type: 'quote' as const,
      action_url: '/quotes'
    },
    {
      title: 'Proposta Recebida',
      message: 'Fornecedor ABC enviou uma proposta para cotação #RFQ01',
      type: 'proposal' as const,
      priority: 'normal' as const,
      action_url: '/quotes'
    },
    {
      title: 'Cotação Aprovada',
      message: 'A cotação #RFQ01 foi aprovada pelo gestor',
      type: 'success' as const,
      priority: 'high' as const,
      action_url: '/quotes'
    },
    {
      title: 'Novo Ticket de Suporte',
      message: 'Ticket #TKT001 criado: Problema com login',
      type: 'ticket' as const,
      action_url: '/communication'
    },
    {
      title: 'Pagamento Confirmado',
      message: 'O pagamento da cotação #RFQ01 foi processado com sucesso',
      type: 'payment' as const,
      action_url: '/payments'
    }
  ];

  try {
    for (const notification of notifications) {
      await createTestNotification(notification);
      // Pequeno delay entre notificações
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log('✅ Todas as notificações de teste foram criadas');
  } catch (error) {
    console.error('❌ Erro ao criar notificações de teste:', error);
  }
}

// Função para uso no console do navegador (desenvolvimento)
if (typeof window !== 'undefined') {
  (window as any).createTestNotification = createTestNotification;
  (window as any).createTestNotifications = createTestNotifications;
}