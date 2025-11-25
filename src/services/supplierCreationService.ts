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
  bank_data?: {
    bank_code?: string;
    bank_name?: string;
    agency?: string;
    agency_digit?: string;
    account_number?: string;
    account_digit?: string;
    account_type?: string;
    account_holder_name?: string;
    account_holder_document?: string;
    pix_key?: string;
    verified?: boolean;
    verified_at?: string | null;
  };
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
 * Busca fornecedor existente por CNPJ
 */
export const findSupplierByCNPJ = async (cnpj: string): Promise<string | null> => {
  const cleanCnpj = normalizeDocument(cnpj);
  
  const { data, error } = await supabase
    .from('suppliers')
    .select('id')
    .eq('cnpj', cleanCnpj)
    .maybeSingle();
  
  if (error) {
    console.error('[SupplierCreationService] Erro ao buscar fornecedor:', error);
    return null;
  }
  
  return data?.id || null;
};

/**
 * Cria associação entre cliente e fornecedor na tabela client_suppliers
 */
export const createClientSupplierAssociation = async (clientId: string, supplierId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('client_suppliers')
      .upsert({
        client_id: clientId,
        supplier_id: supplierId,
        status: 'active',
        associated_at: new Date().toISOString()
      }, {
        onConflict: 'client_id,supplier_id'
      });
    
    if (error) {
      console.error('[SupplierCreationService] Erro ao criar associação:', error);
      return false;
    }
    
    console.log('[SupplierCreationService] ✅ Associação criada:', { clientId, supplierId });
    return true;
  } catch (error) {
    console.error('[SupplierCreationService] Erro ao criar associação:', error);
    return false;
  }
};

/**
 * Cria fornecedor completo com autenticação e notificações
 * 
 * Fluxo:
 * 1. Buscar fornecedor por CNPJ (evitar duplicação)
 * 2. Se não existe, criar novo fornecedor SEM client_id
 * 3. Criar associação em client_suppliers
 * 4. Criar usuário de autenticação (apenas se novo)
 * 5. Aguardar sincronização do profile
 * 6. Enviar notificações (email, WhatsApp, in-app)
 */
export const createSupplierWithAuth = async (params: CreateSupplierParams): Promise<CreateSupplierResult> => {
  const { clientId, type = 'local', ...supplierData } = params;
  
  try {
    console.log('[SupplierCreationService] 🚀 Iniciando criação completa de fornecedor');
    console.log('[SupplierCreationService] 📦 Parâmetros:', { clientId, type, name: supplierData.name });
    
    // 1. Buscar fornecedor existente por CNPJ
    const cleanDoc = normalizeDocument(supplierData.document_number);
    let supplierId = await findSupplierByCNPJ(cleanDoc);
    let isNewSupplier = !supplierId;
    
    if (supplierId) {
      console.log('[SupplierCreationService] ✅ Fornecedor existente encontrado:', supplierId);
    } else {
      // 2. Criar novo fornecedor SEM client_id (catálogo global)
      console.log('[SupplierCreationService] 🆕 Criando novo fornecedor no catálogo global');
      
      const { data: newSupplier, error: createError } = await supabase
        .from('suppliers')
        .insert({
          name: supplierData.name,
          cnpj: cleanDoc,
          document_number: cleanDoc,
          email: supplierData.email,
          phone: supplierData.phone || null,
          whatsapp: supplierData.whatsapp ? normalizePhoneForDB(supplierData.whatsapp) : null,
          website: supplierData.website || null,
          city: supplierData.city || null,
          state: supplierData.state || null,
          address: supplierData.address ? { street: supplierData.address } : null,
          specialties: supplierData.specialties || null,
          type: type,
          status: 'active',
          bank_data: params.bank_data || null
        })
        .select('id')
        .single();
      
      if (createError || !newSupplier) {
        console.error('[SupplierCreationService] ❌ Erro ao criar fornecedor:', createError);
        throw createError || new Error('Falha ao criar fornecedor');
      }
      
      supplierId = newSupplier.id;
      console.log('[SupplierCreationService] ✅ Novo fornecedor criado:', supplierId);
    }
    
    // 3. Se fornecedor já existia, atualizar campos extras (merge de dados)
    if (!isNewSupplier && (supplierData.whatsapp || supplierData.website || supplierData.address || params.bank_data)) {
      console.log('[SupplierCreationService] 📝 Fornecedor existente - atualizando campos extras');
      
      const updateData: any = {};
      if (supplierData.whatsapp) updateData.whatsapp = normalizePhoneForDB(supplierData.whatsapp);
      if (supplierData.website) updateData.website = supplierData.website;
      if (supplierData.city) updateData.city = supplierData.city;
      if (supplierData.state) updateData.state = supplierData.state;
      if (supplierData.address) updateData.address = { street: supplierData.address };
      if (supplierData.specialties?.length) updateData.specialties = supplierData.specialties;
      if (params.bank_data) updateData.bank_data = params.bank_data;
      
      const { error: updateError } = await supabase
        .from('suppliers')
        .update(updateData)
        .eq('id', supplierId);
      
      if (updateError) {
        console.warn('[SupplierCreationService] ⚠️ Erro ao atualizar campos extras (não crítico):', updateError);
      } else {
        console.log('[SupplierCreationService] ✅ Campos extras atualizados');
      }
    }
    
    // 4. Criar associação em client_suppliers
    const associationCreated = await createClientSupplierAssociation(clientId, supplierId);
    if (!associationCreated) {
      console.warn('[SupplierCreationService] ⚠️ Falha ao criar associação (não crítico)');
    }
    
    // 5. Criar auth user (apenas se for novo fornecedor)
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
          
          // 6. Aguardar sincronização do profile
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
    
    // 7. Enviar notificações
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
