export async function getClientMergeTags(
  supabase: any, 
  clientId: string
): Promise<Record<string, any>> {
  
  // Buscar dados do cliente
  const { data: client } = await supabase
    .from('clients')
    .select(`
      *,
      subscription_plans:subscription_plan_id (name, description)
    `)
    .eq('id', clientId)
    .single();
  
  if (!client) return {};
  
  // Buscar base_url do sistema
  const { data: baseUrlData } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'base_url')
    .maybeSingle();
  
  const baseUrl = String(baseUrlData?.setting_value || 'https://cotiz.com.br').replace(/"/g, '');
  
  // Preparar todas as variáveis disponíveis
  return {
    // Dados básicos do cliente
    client_name: client.name || '',
    client_email: client.email || '',
    client_phone: client.phone || '',
    client_cnpj: client.cnpj || '',
    client_address: client.address || '',
    company_name: client.company_name || client.name || '',
    
    // Assinatura
    subscription_plan: client.subscription_plans?.name || 'Básico',
    subscription_plan_description: client.subscription_plans?.description || '',
    
    // URLs úteis
    login_url: `${baseUrl}/login`,
    dashboard_url: `${baseUrl}/dashboard`,
    profile_url: `${baseUrl}/settings/profile`,
    support_url: `${baseUrl}/support`,
    
    // Datas
    current_date: new Date().toLocaleDateString('pt-BR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    current_year: new Date().getFullYear(),
    
    // Metadados
    client_id: client.id,
    client_status: client.status || 'active'
  };
}

// Lista de todas as variáveis disponíveis para documentação
export const AVAILABLE_MERGE_TAGS = [
  { tag: '{{client_name}}', description: 'Nome do cliente/condomínio', category: 'cliente' },
  { tag: '{{client_email}}', description: 'E-mail principal', category: 'cliente' },
  { tag: '{{client_phone}}', description: 'Telefone', category: 'cliente' },
  { tag: '{{client_cnpj}}', description: 'CNPJ formatado', category: 'cliente' },
  { tag: '{{client_address}}', description: 'Endereço completo', category: 'cliente' },
  { tag: '{{company_name}}', description: 'Razão social', category: 'cliente' },
  { tag: '{{subscription_plan}}', description: 'Nome do plano de assinatura', category: 'assinatura' },
  { tag: '{{login_url}}', description: 'Link direto para login', category: 'links' },
  { tag: '{{dashboard_url}}', description: 'Link para dashboard', category: 'links' },
  { tag: '{{profile_url}}', description: 'Link para perfil', category: 'links' },
  { tag: '{{support_url}}', description: 'Link para suporte', category: 'links' },
  { tag: '{{current_date}}', description: 'Data atual formatada', category: 'sistema' },
  { tag: '{{current_year}}', description: 'Ano atual', category: 'sistema' },
  { tag: '{{recipient_name}}', description: 'Nome do destinatário', category: 'destinatário' },
  { tag: '{{recipient_email}}', description: 'E-mail do destinatário', category: 'destinatário' },
];
