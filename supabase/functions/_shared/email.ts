import { Resend } from 'npm:resend@2.0.0';

export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  plainText?: string;
}

export async function resolveEmailConfig(supabase: any, clientId?: string | null): Promise<EmailConfig | null> {
  try {
    // Tentar buscar config do cliente primeiro
    if (clientId) {
      const { data: clientConfig } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'email_config')
        .eq('client_id', clientId)
        .single();
      
      if (clientConfig?.setting_value?.resend_api_key) {
        return {
          apiKey: clientConfig.setting_value.resend_api_key,
          fromEmail: clientConfig.setting_value.from_email || 'noreply@cotiz.com.br',
          fromName: clientConfig.setting_value.from_name || 'Cotiz'
        };
      }
    }
    
    // Fallback para config global
    const { data: globalConfig } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'email_config')
      .is('client_id', null)
      .single();
    
    if (globalConfig?.setting_value?.resend_api_key) {
      return {
        apiKey: globalConfig.setting_value.resend_api_key,
        fromEmail: globalConfig.setting_value.from_email || 'noreply@cotiz.com.br',
        fromName: globalConfig.setting_value.from_name || 'Cotiz'
      };
    }
    
    // Fallback para env var
    const envApiKey = Deno.env.get('RESEND_API_KEY');
    if (envApiKey) {
      return {
        apiKey: envApiKey,
        fromEmail: 'noreply@cotiz.com.br',
        fromName: 'Cotiz'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error resolving email config:', error);
    return null;
  }
}

export async function sendEmail(config: EmailConfig, params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const resend = new Resend(config.apiKey);
    
    const result = await resend.emails.send({
      from: `${config.fromName || 'Cotiz'} <${config.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.plainText
    });
    
    if (result.error) {
      console.error('Resend API error:', result.error);
      return { success: false, error: result.error.message };
    }
    
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Helper para substituir variáveis no template
export function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  
  // Substituir variáveis simples {{variable}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value || ''));
  }
  
  // Remover blocos condicionais vazios {{#if variable}}...{{/if}}
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
    return variables[varName] ? content : '';
  });
  
  return result;
}
