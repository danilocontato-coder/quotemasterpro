import { supabase } from '@/integrations/supabase/client';
import { sendSupplierWelcomeNotifications } from './supplierNotificationService';
import { normalizeDocument, validateCNPJ, validateCPF } from '@/utils/documentValidation';
import { normalizePhoneForDB } from '@/utils/phoneUtils';

export interface CreateCertifiedSupplierParams {
  name: string;
  email: string;
  document_number: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  region?: string;
  address?: string;
  specialties?: string[];
  subscription_plan_id?: string;
}

export interface CreateCertifiedSupplierResult {
  success: boolean;
  supplierId: string;
  authUserId?: string;
  notifications: {
    email?: boolean;
    whatsapp?: boolean;
    inApp?: boolean;
  };
}

/**
 * Cria fornecedor certificado (global) com autenticação e notificações
 * 
 * Diferente de fornecedores locais:
 * - Não requer clientId
 * - type = 'certified'
 * - visibility_scope = 'global'
 * - is_certified = true
 * 
 * Fluxo:
 * 1. Validar dados de entrada
 * 2. Inserir fornecedor na tabela suppliers
 * 3. Criar usuário de autenticação
 * 4. Aguardar sincronização do profile
 * 5. Enviar notificações (email, WhatsApp, in-app)
 */
export const createCertifiedSupplier = async (
  params: CreateCertifiedSupplierParams
): Promise<CreateCertifiedSupplierResult> => {
  try {
    console.log('[CertifiedSupplierService] 🚀 Iniciando criação de fornecedor certificado');
    console.log('[CertifiedSupplierService] 📦 Parâmetros:', { name: params.name, email: params.email });

    // 1. Validações
    const cleanDoc = normalizeDocument(params.document_number);
    
    // Validar CNPJ ou CPF
    const isValidDoc = cleanDoc.length === 11 
      ? validateCPF(cleanDoc) 
      : validateCNPJ(cleanDoc);

    if (!isValidDoc) {
      throw new Error('CNPJ/CPF inválido');
    }

    if (!params.name || !params.email || !cleanDoc) {
      throw new Error('Nome, email e CNPJ/CPF são obrigatórios');
    }

    // 2. Inserir fornecedor certificado
    const supplierData = {
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      document_number: cleanDoc,
      document_type: cleanDoc.length === 11 ? 'cpf' : 'cnpj',
      cnpj: cleanDoc, // Manter retrocompatibilidade
      phone: params.phone || null,
      whatsapp: params.whatsapp || null,
      website: params.website || null,
      region: params.region || null,
      address: params.address ? { full: params.address } : null,
      specialties: params.specialties || [],
      subscription_plan_id: params.subscription_plan_id || 'basic',
      type: 'certified',
      visibility_scope: 'global',
      is_certified: true,
      certification_date: new Date().toISOString(),
      status: 'active'
    };

    console.log('[CertifiedSupplierService] 📝 Inserindo fornecedor...');
    
    const { data: supplier, error: insertError } = await supabase
      .from('suppliers')
      .insert(supplierData)
      .select()
      .single();

    if (insertError || !supplier) {
      console.error('[CertifiedSupplierService] ❌ Erro ao inserir:', insertError);
      throw insertError || new Error('Falha ao criar fornecedor');
    }

    const supplierId = supplier.id;
    console.log('[CertifiedSupplierService] ✅ Fornecedor criado:', supplierId);

    // 3. Criar auth user
    let authUserId: string | undefined;
    
    try {
      const tempPassword = generatePassword();
      
      console.log('[CertifiedSupplierService] 🔐 Criando auth user...');
      
      const { data: authResp, error: authError } = await supabase.functions.invoke(
        'create-auth-user',
        {
          body: {
            email: params.email.trim().toLowerCase(),
            password: tempPassword,
            name: params.name,
            role: 'supplier',
            supplierId,
            temporaryPassword: true,
          },
        }
      );
      
      if (authError || !authResp?.success) {
        console.error('[CertifiedSupplierService] ⚠️ Falha ao criar auth:', authError || authResp?.error);
        // Não bloquear - fornecedor já foi criado
      } else {
        authUserId = authResp.auth_user_id;
        console.log('[CertifiedSupplierService] ✅ Auth user criado:', authUserId);
        
        // 4. Aguardar sincronização do profile
        const profileSynced = await waitForProfileSync(authUserId);
        
        if (!profileSynced) {
          console.warn('[CertifiedSupplierService] ⚠️ Timeout na sincronização do profile');
        }
      }
    } catch (authCreationError) {
      console.error('[CertifiedSupplierService] ⚠️ Erro ao criar auth (não crítico):', authCreationError);
      // Continuar - fornecedor já existe no DB
    }

    // 5. Enviar notificações
    const notificationResults = {
      email: false,
      whatsapp: false,
      inApp: false
    };
    
    try {
      console.log('[CertifiedSupplierService] 📧 Enviando notificações...');
      
      const notifResult = await sendSupplierWelcomeNotifications({
        supplierId,
        supplierName: params.name,
        supplierEmail: params.email,
        supplierWhatsApp: params.whatsapp ? normalizePhoneForDB(params.whatsapp) : undefined,
        administradoraName: 'Cotiz - Plataforma Global',
      });
      
      notificationResults.email = notifResult.results.email || false;
      notificationResults.whatsapp = notifResult.results.whatsapp || false;
      notificationResults.inApp = notifResult.results.notification || false;
      
      console.log('[CertifiedSupplierService] ✅ Notificações enviadas:', notificationResults);
    } catch (notifError) {
      console.error('[CertifiedSupplierService] ⚠️ Erro ao enviar notificações (não crítico):', notifError);
      // Não bloquear - fornecedor já foi criado
    }
    
    console.log('[CertifiedSupplierService] 🎉 Criação completa finalizada com sucesso');
    
    return {
      success: true,
      supplierId,
      authUserId,
      notifications: notificationResults
    };
    
  } catch (error) {
    console.error('[CertifiedSupplierService] ❌ Erro fatal:', error);
    throw error;
  }
};

/**
 * Gera senha temporária segura (10 caracteres)
 */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

/**
 * Aguarda sincronização do profile com backoff exponencial
 * Retorna true se profile foi criado, false se timeout
 */
async function waitForProfileSync(authUserId: string): Promise<boolean> {
  const delays = [300, 600, 1200, 2400, 4800]; // Total: ~9.3s
  
  for (let retry = 0; retry < delays.length; retry++) {
    await new Promise(resolve => setTimeout(resolve, delays[retry]));
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, supplier_id')
      .eq('id', authUserId)
      .maybeSingle();
    
    if (error) {
      console.warn('[CertifiedSupplierService] Erro ao checar profile:', error);
      continue;
    }
    
    if (data) {
      console.log('[CertifiedSupplierService] ✅ Profile sincronizado:', data);
      return true;
    }
    
    console.log(`[CertifiedSupplierService] ⏳ Retry ${retry + 1}/${delays.length}...`);
  }
  
  console.warn('[CertifiedSupplierService] ⚠️ Timeout - profile não sincronizado a tempo');
  return false;
}
