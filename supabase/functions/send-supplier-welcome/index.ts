import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveEvolutionConfig, sendEvolutionWhatsApp, normalizePhone } from '../_shared/evolution.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      supplierId, 
      supplierName, 
      supplierPhone, 
      clientId, 
      clientName,
      customVariables = {}
    } = await req.json();

    console.log('📨 Send supplier welcome:', { supplierId, supplierName, clientId, clientName });

    // 1. Validar parâmetros obrigatórios
    if (!supplierId || !supplierName || !supplierPhone) {
      throw new Error('Missing required parameters: supplierId, supplierName, supplierPhone');
    }

    // Validar clientId (obrigatório)
    if (!clientId) {
      console.error('❌ clientId is required but was not provided');
      throw new Error('Missing required parameter: clientId');
    }

    // 2. Buscar nome do sistema
    const { data: systemSettings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'company_name')
      .maybeSingle();

    const platformName = systemSettings?.setting_value?.value || 'QuoteMaster Pro';
    console.log('🏢 Platform name:', platformName);

    // 3. Buscar template de boas-vindas (prioridade: cliente-específico > global)
    let template: any;
    
    const templateQuery = supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('template_type', 'supplier_welcome')
      .eq('active', true);

    if (clientId) {
      const { data: clientTemplate } = await templateQuery
        .eq('client_id', clientId)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      template = clientTemplate;
    }
    
    if (!template) {
      const { data: globalTemplate } = await templateQuery
        .eq('is_global', true)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      template = globalTemplate;
    }

    if (!template) {
      const errorMsg = clientId 
        ? `No WhatsApp template found for supplier_welcome. Please create one in SuperAdmin for client ${clientId} or a global template.`
        : 'No global WhatsApp template found for supplier_welcome. Please create one in SuperAdmin > Templates.';
      
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('📄 Using template:', template.name);

    // 4. Interpolar variáveis no template
    const variables = {
      supplier_name: supplierName,
      client_name: clientName || 'Administrador do Sistema',
      platform_name: platformName,
      access_link: 'https://app.quotemaster.com/login',
      ...customVariables
    };

    let message = template.message_content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(regex, String(value));
    }

    console.log('✏️ Message interpolated with variables');

    // 5. Buscar configuração Evolution API (prioridade: cliente-específico > global)
    const evolutionConfig = await resolveEvolutionConfig(supabase, clientId, true);
    
    if (!evolutionConfig.apiUrl || !evolutionConfig.token) {
      throw new Error('Evolution API not configured. Please configure in SuperAdmin integrations.');
    }

    console.log('🔧 Evolution config:', { 
      scope: evolutionConfig.scope, 
      hasUrl: !!evolutionConfig.apiUrl,
      hasToken: !!evolutionConfig.token,
      instance: evolutionConfig.instance
    });

    // Validação explícita da configuração Evolution
    if (!evolutionConfig.apiUrl) {
      throw new Error('Evolution API URL not configured. Please configure in SuperAdmin > Integrations.');
    }

    if (!evolutionConfig.token) {
      throw new Error('Evolution API token not configured. Please configure in SuperAdmin > Integrations.');
    }

    if (evolutionConfig.scope === 'none') {
      throw new Error('Evolution API not configured (no valid source found).');
    }

    // 6. Normalizar telefone (adicionar DDI 55 se necessário)
    const normalizedPhone = normalizePhone(supplierPhone, '55');
    
    if (!normalizedPhone) {
      throw new Error('Invalid phone number format: ' + supplierPhone);
    }

    console.log('📱 Sending to phone:', normalizedPhone);

    // 7. Enviar mensagem via Evolution API
    const result = await sendEvolutionWhatsApp(
      evolutionConfig,
      normalizedPhone,
      message
    );

    console.log('📤 Send result:', { success: result.success, messageId: result.messageId });

    // 8. Registrar log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        user_id: null,
        action: 'SUPPLIER_WELCOME_WHATSAPP',
        entity_type: 'suppliers',
        entity_id: supplierId,
        panel_type: 'system',
        details: {
          phone: normalizedPhone,
          success: result.success,
          template_id: template.id,
          template_name: template.name,
          platform_name: platformName,
          client_name: clientName,
          message_preview: message.substring(0, 150) + '...',
          evolution_scope: evolutionConfig.scope,
          message_id: result.messageId || null,
          error: result.error || null
        }
      });

    console.log('✅ Audit log created');

    return new Response(
      JSON.stringify({ 
        success: result.success,
        messageId: result.messageId,
        error: result.error
      }),
      { 
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in send-supplier-welcome:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
