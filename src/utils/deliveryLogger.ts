import { logger } from './systemLogger';

/**
 * Logger especializado para o módulo de entregas
 * Wrapper do systemLogger com métodos específicos do domínio
 */
export const deliveryLogger = {
  // Frontend - Modal
  modalOpen: (deliveryId?: string) => {
    logger.info('delivery', 'Modal de confirmação aberto', { deliveryId });
  },
  
  codeInput: (code: string) => {
    logger.info('delivery', 'Código digitado', { 
      code, 
      length: code.length 
    });
  },
  
  confirmAttempt: (code: string) => {
    logger.info('delivery', 'Tentativa de confirmação iniciada', { code });
  },
  
  confirmSuccess: (deliveryId: string, paymentAmount?: number) => {
    logger.info('delivery', 'Confirmação bem-sucedida', { 
      deliveryId, 
      paymentAmount 
    });
  },
  
  confirmError: (code: string, error: any) => {
    logger.error('delivery', 'Erro na confirmação', { 
      code, 
      error: error.message,
      stack: error.stack 
    });
  },
  
  // Backend validation (para uso futuro)
  codeValidation: (code: string, isValid: boolean, reason?: string) => {
    logger.data('Validação de código de entrega', { 
      code, 
      isValid, 
      reason 
    });
  },
  
  // API calls
  apiRequest: (endpoint: string, payload: any) => {
    logger.data('Requisição de API de entrega', {
      endpoint,
      payload
    });
  },
  
  apiResponse: (endpoint: string, success: boolean, data?: any) => {
    if (success) {
      logger.info('delivery', 'Resposta de API bem-sucedida', { endpoint, data });
    } else {
      logger.error('delivery', 'Falha na resposta de API', { endpoint, data });
    }
  }
};

// Debug helper para desenvolvimento
if (import.meta.env.DEV) {
  (window as any).__DEBUG_DELIVERY__ = {
    // Ver últimas entregas
    async getDeliveries() {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://bpsqyaxdhqejozmlejcb.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3F5YXhkaHFlam96bWxlamNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjEwOTMsImV4cCI6MjA3MTEzNzA5M30.DyjuVhKw1IVrEtpq7J-R4v4j0rUSQ1vQnhwR3Ti0-BY'
      );
      
      const { data } = await supabase
        .from('deliveries')
        .select('*, delivery_confirmations(*)')
        .order('created_at', { ascending: false })
        .limit(10);
      console.table(data);
      return data;
    },
    
    // Ver códigos de confirmação
    async getCodes() {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://bpsqyaxdhqejozmlejcb.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3F5YXhkaHFlam96bWxlamNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjEwOTMsImV4cCI6MjA3MTEzNzA5M30.DyjuVhKw1IVrEtpq7J-R4v4j0rUSQ1vQnhwR3Ti0-BY'
      );
      
      const { data } = await supabase
        .from('delivery_confirmations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      console.table(data);
      return data;
    },
    
    // Simular confirmação
    async testConfirm(code: string) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://bpsqyaxdhqejozmlejcb.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3F5YXhkaHFlam96bWxlamNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjEwOTMsImV4cCI6MjA3MTEzNzA5M30.DyjuVhKw1IVrEtpq7J-R4v4j0rUSQ1vQnhwR3Ti0-BY'
      );
      
      const result = await supabase.functions.invoke('confirm-delivery', {
        body: { confirmation_code: code }
      });
      console.log('Resultado:', result);
      return result;
    }
  };
  
  console.log('🔧 [DELIVERY] Debug tools disponíveis em: window.__DEBUG_DELIVERY__');
}
