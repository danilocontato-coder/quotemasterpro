import { supabase } from '@/integrations/supabase/client';
import { sendSupplierWelcomeNotifications } from './supplierNotificationService';
import { normalizeDocument } from '@/utils/documentValidation';
import { normalizePhoneForDB } from '@/utils/phoneUtils';

export interface CreateSupplierParams {
  name: string;
  email: string;
  document_number: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  state: string;
  city: string;
  address?: string;
  specialties?: string[];
  clientId: string;
  type?: 'local' | 'certified';
}

export interface CreateSupplierResult {
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
 * Cria fornecedor completo com autenticação e notificações
 * 
 * Fluxo:
 * 1. Criar/buscar fornecedor no DB
 * 2. Associar ao cliente
 * 3. Criar usuário de autenticação
 * 4. Aguardar sincronização do profile
 * 5. Enviar notificações (email, WhatsApp, in-app)
 */
export const createSupplierWithAuth = async (params: CreateSupplierParams): Promise<CreateSupplierResult> => {
  const { clientId, type = 'local', ...supplierData } = params;
  
  try {
    console.log('[SupplierCreationService] 🚀 Iniciando criação completa de fornecedor');
    console.log('[SupplierCreationService] 📦 Parâmetros:', { clientId, type, name: supplierData.name });
    
    // 1. Criar/buscar fornecedor
    const cleanDoc = normalizeDocument(supplierData.document_number);
    
    const { data: supplierResult, error: supplierError } = await supabase.rpc(
      'find_or_create_supplier_by_cnpj',
      {
        p_cnpj: cleanDoc,
        p_name: supplierData.name,
        p_email: supplierData.email,
        p_phone: supplierData.phone || null
      }
    );
    
    if (supplierError || !supplierResult?.[0]) {
      console.error('[SupplierCreationService] ❌ Erro ao criar fornecedor:', supplierError);
      throw supplierError || new Error('Falha ao criar fornecedor');
    }
    
    const supplierId = supplierResult[0].supplier_id;
    const isNewSupplier = supplierResult[0].is_new;
    console.log('[SupplierCreationService] ✅ Fornecedor:', supplierId, isNewSupplier ? '(NOVO)' : '(EXISTENTE)');
    
    // 2. Associar ao cliente
    const { error: assocError } = await supabase.rpc('associate_supplier_to_client', {
      p_supplier_id: supplierId,
      p_client_id: clientId
    });
    
    if (assocError) {
      console.error('[SupplierCreationService] ❌ Erro ao associar:', assocError);
      throw assocError;
    }
    console.log('[SupplierCreationService] ✅ Associado ao cliente:', clientId);
    
    // 3. Criar auth user (apenas se for novo fornecedor)
    let authUserId: string | undefined;
    
    if (isNewSupplier) {
      try {
        const tempPassword = generatePassword();
        
        console.log('[SupplierCreationService] 🔐 Criando auth user...');
        
        const { data: authResp, error: authError } = await supabase.functions.invoke(
          'create-auth-user',
          {
            body: {
              email: supplierData.email.trim(),
              password: tempPassword,
              name: supplierData.name,
              role: 'supplier',
              supplierId,
              temporaryPassword: true,
            },
          }
        );
        
        if (authError || !authResp?.success) {
          console.error('[SupplierCreationService] ⚠️ Falha ao criar auth:', authError || authResp?.error);
          // Não bloquear - fornecedor já foi criado
        } else {
          authUserId = authResp.auth_user_id;
          console.log('[SupplierCreationService] ✅ Auth user criado:', authUserId);
          
          // 4. Aguardar sincronização do profile
          const profileSynced = await waitForProfileSync(authUserId);
          
          if (!profileSynced) {
            console.warn('[SupplierCreationService] ⚠️ Timeout na sincronização do profile');
          }
        }
      } catch (authCreationError) {
        console.error('[SupplierCreationService] ⚠️ Erro ao criar auth (não crítico):', authCreationError);
        // Continuar - fornecedor já existe no DB
      }
    } else {
      console.log('[SupplierCreationService] ℹ️ Fornecedor existente - pulando criação de auth');
    }
    
    // 5. Enviar notificações
    const notificationResults = {
      email: false,
      whatsapp: false,
      inApp: false
    };
    
    try {
      // Buscar nome do cliente para a mensagem
      const { data: clientData } = await supabase
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .single();
      
      const clientName = clientData?.name || 'Cliente';
      
      console.log('[SupplierCreationService] 📧 Enviando notificações...');
      
      const notifResult = await sendSupplierWelcomeNotifications({
        supplierId,
        supplierName: supplierData.name,
        supplierEmail: supplierData.email,
        supplierWhatsApp: supplierData.whatsapp ? normalizePhoneForDB(supplierData.whatsapp) : undefined,
        administradoraName: clientName,
      });
      
      notificationResults.email = notifResult.results.email || false;
      notificationResults.whatsapp = notifResult.results.whatsapp || false;
      notificationResults.inApp = notifResult.results.notification || false;
      
      console.log('[SupplierCreationService] ✅ Notificações enviadas:', notificationResults);
    } catch (notifError) {
      console.error('[SupplierCreationService] ⚠️ Erro ao enviar notificações (não crítico):', notifError);
      // Não bloquear - fornecedor já foi criado
    }
    
    console.log('[SupplierCreationService] 🎉 Criação completa finalizada com sucesso');
    
    return {
      success: true,
      supplierId,
      authUserId,
      notifications: notificationResults
    };
    
  } catch (error) {
    console.error('[SupplierCreationService] ❌ Erro fatal:', error);
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
      console.warn('[SupplierCreationService] Erro ao checar profile:', error);
      continue;
    }
    
    if (data) {
      console.log('[SupplierCreationService] ✅ Profile sincronizado:', data);
      return true;
    }
    
    console.log(`[SupplierCreationService] ⏳ Retry ${retry + 1}/${delays.length}...`);
  }
  
  console.warn('[SupplierCreationService] ⚠️ Timeout - profile não sincronizado a tempo');
  return false;
}
