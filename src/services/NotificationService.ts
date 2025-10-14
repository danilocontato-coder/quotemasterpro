import { supabase } from '@/integrations/supabase/client';

// Serviço de notificações - integração com Supabase Edge Functions
export interface NotificationConfig {
  email: {
    provider: 'sendgrid' | 'resend' | 'smtp';
    apiKey?: string;
    fromEmail?: string;
    fromName?: string;
  };
  whatsapp: {
    provider: 'evolution-api' | 'twilio' | 'whatsapp-business';
    apiUrl?: string;
    apiToken?: string;
    instanceId?: string;
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
    try {
      // Buscar configurações de branding para obter o nome da empresa
      const { data: brandingData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'company_name')
        .single();

      const settingValue = brandingData?.setting_value as any;
      const companyName = settingValue?.value || 'Sistema de Cotações';

      // TODO: Implementar busca das configurações de notificação do Supabase
      // const { data } = await supabase
      //   .from('notification_settings')
      //   .select('*')
      //   .single();
      
      // Mock configuration for now
      return {
        email: {
          provider: 'sendgrid',
          fromEmail: 'noreply@cotiz.com.br',
          fromName: companyName || 'Cotiz'
        },
        whatsapp: {
          provider: 'evolution-api'
        }
      };
    } catch (error) {
      console.error('Erro ao carregar configurações de notificação:', error);
      return {
        email: {
          provider: 'sendgrid',
          fromEmail: 'noreply@cotiz.com.br',
          fromName: 'Cotiz'
        },
        whatsapp: {
          provider: 'evolution-api'
        }
      };
    }
  }

  async sendQuoteByEmail(
    recipientEmail: string,
    supplierName: string,
    quoteData: QuoteNotificationData
  ): Promise<NotificationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('notify', {
        body: {
          type: 'email',
          to: recipientEmail,
          supplierName,
          quoteData
        }
      });

      if (error) throw error;

      return data;
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
      const { data, error } = await supabase.functions.invoke('notify', {
        body: {
          type: 'whatsapp',
          to: recipientPhone,
          supplierName,
          quoteData
        }
      });

      if (error) throw error;

      return data;
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