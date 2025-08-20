// Serviço de notificações - estrutura preparada para integração Supabase
export interface NotificationConfig {
  email: {
    provider: 'sendgrid' | 'resend' | 'smtp';
    apiKey?: string;
    fromEmail?: string;
    fromName?: string;
  };
  whatsapp: {
    provider: 'twilio' | 'whatsapp-business';
    apiKey?: string;
    accountSid?: string;
    fromNumber?: string;
  };
}

export interface QuoteNotificationData {
  quoteId: string;
  quoteTitle: string;
  deadline: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  clientName: string;
  clientContact: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class NotificationService {
  private config: NotificationConfig | null = null;

  // Será usado quando conectado ao Supabase para buscar configurações
  async loadConfiguration(): Promise<NotificationConfig | null> {
    // TODO: Implementar busca das configurações do Supabase
    // const { data } = await supabase
    //   .from('notification_settings')
    //   .select('*')
    //   .single();
    
    // Mock configuration for now
    return {
      email: {
        provider: 'sendgrid',
        fromEmail: 'noreply@quotemaster.com',
        fromName: 'QuoteMaster Pro'
      },
      whatsapp: {
        provider: 'twilio',
        fromNumber: '+5511999999999'
      }
    };
  }

  async sendQuoteByEmail(
    recipientEmail: string,
    supplierName: string,
    quoteData: QuoteNotificationData
  ): Promise<NotificationResult> {
    try {
      // TODO: Implementar chamada real para API de email via Supabase Edge Function
      // const { data, error } = await supabase.functions.invoke('send-email', {
      //   body: {
      //     to: recipientEmail,
      //     template: 'quote-request',
      //     data: {
      //       supplierName,
      //       ...quoteData
      //     }
      //   }
      // });

      console.log(`[EMAIL] Enviando cotação para ${supplierName} (${recipientEmail}):`, {
        quoteId: quoteData.quoteId,
        title: quoteData.quoteTitle,
        items: quoteData.items.length,
        deadline: quoteData.deadline
      });

      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        messageId: `email_${Date.now()}`
      };
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return {
        success: false,
        error: 'Falha no envio do email'
      };
    }
  }

  async sendQuoteByWhatsApp(
    recipientPhone: string,
    supplierName: string,
    quoteData: QuoteNotificationData
  ): Promise<NotificationResult> {
    try {
      // TODO: Implementar chamada real para API do WhatsApp via Supabase Edge Function
      // const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      //   body: {
      //     to: recipientPhone,
      //     template: 'quote-request',
      //     data: {
      //       supplierName,
      //       ...quoteData
      //     }
      //   }
      // });

      console.log(`[WHATSAPP] Enviando cotação para ${supplierName} (${recipientPhone}):`, {
        quoteId: quoteData.quoteId,
        title: quoteData.quoteTitle,
        items: quoteData.items.length,
        deadline: quoteData.deadline
      });

      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1500));

      return {
        success: true,
        messageId: `whatsapp_${Date.now()}`
      };
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      return {
        success: false,
        error: 'Falha no envio do WhatsApp'
      };
    }
  }

  // Método para envio em lote
  async sendQuoteToSuppliers(
    suppliers: Array<{
      id: string;
      name: string;
      email?: string;
      phone?: string;
    }>,
    quoteData: QuoteNotificationData,
    methods: {
      email: boolean;
      whatsapp: boolean;
    }
  ): Promise<{
    results: Array<{
      supplierId: string;
      supplierName: string;
      email?: NotificationResult;
      whatsapp?: NotificationResult;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const supplier of suppliers) {
      const supplierResult: any = {
        supplierId: supplier.id,
        supplierName: supplier.name
      };

      // Envio por email
      if (methods.email && supplier.email) {
        const emailResult = await this.sendQuoteByEmail(
          supplier.email,
          supplier.name,
          quoteData
        );
        supplierResult.email = emailResult;
        if (emailResult.success) successful++;
        else failed++;
      }

      // Envio por WhatsApp
      if (methods.whatsapp && supplier.phone) {
        const whatsappResult = await this.sendQuoteByWhatsApp(
          supplier.phone,
          supplier.name,
          quoteData
        );
        supplierResult.whatsapp = whatsappResult;
        if (whatsappResult.success) successful++;
        else failed++;
      }

      results.push(supplierResult);
    }

    return {
      results,
      summary: {
        total: results.length,
        successful,
        failed
      }
    };
  }

  // Verificar se as configurações estão válidas
  async validateConfiguration(): Promise<{
    email: boolean;
    whatsapp: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // TODO: Implementar validação real das APIs
    // Quando conectado ao Supabase, verificar se as chaves de API estão configuradas e válidas
    
    return {
      email: true, // Mock - será true quando API estiver configurada
      whatsapp: true, // Mock - será true quando API estiver configurada
      errors
    };
  }
}

export const notificationService = new NotificationService();