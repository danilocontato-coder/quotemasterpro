import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePerformanceDebug } from "./usePerformanceDebug";

export interface ClientGroup {
  id: string;
  name: string;
  description?: string;
  color?: string; // hex color
  clientCount?: number;
  createdAt?: string;
}

export interface ClientContact {
  name: string;
  email: string;
  phone: string;
  position: string;
  isPrimary: boolean;
}

export interface ClientDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  url: string;
}

export interface AdminClient {
  id: string;
  companyName: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string | {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contacts: ClientContact[];
  groupId?: string;
  groupName?: string;
  status: "active" | "inactive" | "pending";
  plan: string;
  planDisplayName?: string;
  createdAt: string;
  lastAccess?: string;
  loginCredentials: {
    username: string;
    password?: string; // when present and useTemporaryPassword=false, it's the manual password
    temporaryPassword: boolean;
    lastPasswordChange?: string;
  };
  documents: ClientDocument[];
  revenue: number;
  quotesCount: number;
  notes?: string;
  // Hierarquia: administradoras e condomínios vinculados
  clientType?: 'direct' | 'administradora' | 'condominio_vinculado';
  parentClientId?: string;
  parentClientName?: string;
  childClientsCount?: number;
  childClients?: AdminClient[]; // Para administradoras, lista de filhos
  // Branding e Aprovações
  brandingSettingsId?: string;
  requiresApproval?: boolean;
  subscriptionPlanId?: string;
  createAsaasSubscription?: boolean;
  firstDueDateOption?: 'immediate' | 'next_month';
}

// Utilities
const formatAddressToText = (addr: AdminClient["address"]) => {
  if (typeof addr === 'string') return addr;
  
  const parts = [
    addr.street && `${addr.street}, ${addr.number}`,
    addr.complement,
    addr.neighborhood,
    addr.city && `${addr.city} - ${addr.state}`,
    addr.zipCode,
  ].filter(Boolean);
  return parts.join(" | ");
};

const parseAddress = (text?: string): AdminClient["address"] => {
  // As we stored as text, return an empty structured address for now
  return {
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  };
};

export function useSupabaseAdminClients() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  console.log('🎯 useSupabaseAdminClients: Hook initialized, clients:', clients.length);
  
  const { trackAsyncOperation, logOperation } = usePerformanceDebug('useSupabaseAdminClients');

  // Otimizada: Fetch único com controle de inicialização
  useEffect(() => {
    if (initialized) return; // Evita chamadas duplicadas

    const loadData = async () => {
      setLoading(true);
      try {
        // Uma única chamada Promise.all otimizada
        const [groupsResult, clientsResult] = await Promise.all([
          supabase
            .from("client_groups")
            .select("id, name, description, color, client_count, created_at")
            .order('name'),
          supabase
            .from("clients")
            .select(`
              id, name, cnpj, email, phone, address, status, 
              subscription_plan_id, created_at, updated_at, username, 
              group_id, last_access, company_name, notes,
              client_type, parent_client_id, branding_settings_id,
              subscription_plans:subscription_plan_id(id, name, display_name)
            `)
            .order('name')
        ]);

        if (groupsResult.error) {
          console.error("Erro ao carregar grupos:", groupsResult.error);
          throw groupsResult.error;
        }
        if (clientsResult.error) {
          console.error("Erro ao carregar clientes:", clientsResult.error);
          throw clientsResult.error;
        }

        // Processamento otimizado
        const groups: ClientGroup[] = (groupsResult.data || []).map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description ?? undefined,
          color: g.color ?? "#64748b",
          clientCount: g.client_count ?? 0,
          createdAt: g.created_at ?? undefined,
        }));

        const groupsMap = new Map(groups.map((g) => [g.id, g]));

        console.log('🔄 [AdminClients] Mapeando', clientsResult.data?.length || 0, 'clientes com hierarquia');
        
        // Buscar contagens em paralelo para todos os clientes
        const clientIds = clientsResult.data?.map((c: any) => c.id) || [];
        
        const [usersCountsResult, quotesCountsResult, subscriptionsResult, paymentsResult] = await Promise.all([
          // Contagem de usuários por cliente
          supabase
            .from('profiles')
            .select('client_id', { count: 'exact' })
            .in('client_id', clientIds),
          // Contagem de cotações por cliente
          supabase
            .from('quotes')
            .select('client_id', { count: 'exact' })
            .in('client_id', clientIds),
          // Verificar assinaturas ativas
          supabase
            .from('subscriptions')
            .select('client_id, status')
            .in('client_id', clientIds)
            .eq('status', 'active'),
          // Verificar pagamentos pendentes
          supabase
            .from('payments')
            .select('client_id, status')
            .in('client_id', clientIds)
            .in('status', ['pending', 'processing'])
        ]);

        // Criar mapas de contagens
        const usersCountMap = new Map<string, number>();
        const quotesCountMap = new Map<string, number>();
        const activeSubsMap = new Set<string>();
        const pendingPaymentsMap = new Set<string>();

        // Popular mapa de usuários (contar por client_id)
        clientIds.forEach(clientId => {
          const count = usersCountsResult.data?.filter((p: any) => p.client_id === clientId).length || 0;
          usersCountMap.set(clientId, count);
        });

        // Popular mapa de cotações
        clientIds.forEach(clientId => {
          const count = quotesCountsResult.data?.filter((q: any) => q.client_id === clientId).length || 0;
          quotesCountMap.set(clientId, count);
        });

        // Popular conjuntos de assinaturas e pagamentos
        subscriptionsResult.data?.forEach((s: any) => activeSubsMap.add(s.client_id));
        paymentsResult.data?.forEach((p: any) => pendingPaymentsMap.add(p.client_id));
        
        const mapped: AdminClient[] = (clientsResult.data || []).map((c: any) => ({
          id: c.id,
          companyName: c.company_name || c.name || '',
          cnpj: c.cnpj || '',
          email: c.email || '',
          phone: c.phone ?? "",
          address: typeof c.address === 'string' ? c.address : formatAddressToText(parseAddress(c.address ?? undefined)),
          contacts: [],
          groupId: c.group_id ?? undefined,
          groupName: c.group_id ? groupsMap.get(c.group_id)?.name : undefined,
          status: (c.status as AdminClient["status"]) || "active",
          plan: c.subscription_plan_id || "basic",
          planDisplayName: c.subscription_plans?.display_name || c.subscription_plans?.name || "Basic",
          createdAt: c.created_at || new Date().toISOString(),
          lastAccess: c.last_access || undefined,
          loginCredentials: {
            username: c.username || "",
            temporaryPassword: true,
            lastPasswordChange: c.updated_at || undefined,
          },
          documents: [],
          revenue: 0,
          quotesCount: quotesCountMap.get(c.id) || 0,
          notes: c.notes || undefined,
          // Novos campos de hierarquia
          clientType: (c.client_type || 'direct') as 'direct' | 'administradora' | 'condominio_vinculado',
          parentClientId: c.parent_client_id || undefined,
          brandingSettingsId: c.branding_settings_id || undefined,
          requiresApproval: true,
          childClientsCount: 0, // Será calculado depois
        }));

        // Calcular hierarquia
        console.log('📊 [AdminClients] Calculando hierarquia...');
        const clientsMap = new Map(mapped.map(c => [c.id, c]));
        
        mapped.forEach(client => {
          if (client.clientType === 'administradora') {
            const childCount = mapped.filter(c => c.parentClientId === client.id).length;
            client.childClientsCount = childCount;
            if (childCount > 0) {
              console.log(`🏢 [AdminClients] Admin "${client.companyName}" → ${childCount} condomínios`);
            }
          }
          
          if (client.clientType === 'condominio_vinculado' && client.parentClientId) {
            const parent = clientsMap.get(client.parentClientId);
            client.parentClientName = parent?.companyName || 'N/A';
            console.log(`🔗 [AdminClients] Condo "${client.companyName}" → Admin "${client.parentClientName}"`);
          }
        });

        const stats = {
          total: mapped.length,
          admins: mapped.filter(c => c.clientType === 'administradora').length,
          condos: mapped.filter(c => c.clientType === 'condominio_vinculado').length,
          direct: mapped.filter(c => c.clientType === 'direct').length,
        };
        console.log(`✅ [AdminClients] Dados carregados:`, stats);

        setClientGroups(groups);
        setClients(mapped);
        setInitialized(true);
      } catch (error: any) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Falha ao carregar dados de clientes");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [initialized]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch =
        (client.companyName || '').toLowerCase().includes(searchTermLower) ||
        (client.cnpj || '').includes(searchTerm) ||
        (client.email || '').toLowerCase().includes(searchTermLower);

      const matchesGroup = filterGroup === "all" || client.groupId === filterGroup;
      const matchesStatus = filterStatus === "all" || client.status === filterStatus;

      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [clients, searchTerm, filterGroup, filterStatus]);

  const createClient = async (
    clientData: Omit<AdminClient, "id" | "createdAt" | "revenue" | "quotesCount">,
    notificationOptions?: { sendByEmail?: boolean; sendByWhatsApp?: boolean }
  ) => {
    console.log('➕ [AdminClients] Criando cliente:', clientData.companyName);
    console.log('📋 [AdminClients] Tipo:', clientData.clientType || 'direct');
    if (clientData.clientType === 'condominio_vinculado') {
      console.log('🔗 [AdminClients] Vinculado à administradora:', clientData.parentClientId);
    }
    if (clientData.clientType === 'administradora') {
      console.log('🎨 [AdminClients] Branding ID:', clientData.brandingSettingsId);
      console.log('✅ [AdminClients] Requer aprovação:', clientData.requiresApproval);
    }
    setLoading(true);
    let createdClientId: string | null = null;

    try {
      // 1) Cria o registro do cliente PRIMEIRO (sempre funciona)
      console.log('🔧 [AdminClients] Preparando payload...');
      const insertPayload = {
        name: clientData.companyName,
        company_name: clientData.companyName,
        cnpj: clientData.cnpj,
        email: clientData.email,
        phone: clientData.phone,
        address: typeof clientData.address === 'string' ? clientData.address : formatAddressToText(clientData.address),
        status: clientData.status,
        subscription_plan_id: clientData.plan,
        username: clientData.loginCredentials.username,
        group_id: clientData.groupId || null,
        notes: clientData.notes || null,
        // Hierarquia e branding
        client_type: clientData.clientType || 'direct',
        parent_client_id: clientData.parentClientId || null,
        branding_settings_id: clientData.brandingSettingsId || null,
      };
      console.log('💾 [AdminClients] Payload preparado:', {
        ...insertPayload,
        client_type: insertPayload.client_type,
        has_parent: !!insertPayload.parent_client_id,
        has_branding: !!insertPayload.branding_settings_id,
      });

      const { data: insertData, error: insertErr } = await supabase
        .from("clients")
        .insert([insertPayload])
        .select("id, subscription_plan_id")
        .single();

      if (insertErr) {
        console.error('❌ DEBUG: Erro ao inserir cliente', insertErr);
        throw insertErr;
      }
      createdClientId = insertData?.id as string;
      console.log('✅ DEBUG: Cliente criado com sucesso', {
        id: createdClientId,
        planSalvo: insertData?.subscription_plan_id
      });

      // Criar cliente no Asaas automaticamente
      try {
        console.log('📤 Criando cliente no Asaas...', createdClientId);
        const { data: asaasData, error: asaasError } = await supabase.functions.invoke(
          'create-asaas-customer',
          {
            body: { 
              clientId: createdClientId,
              createAsaasSubscription: clientData.createAsaasSubscription
            }
          }
        );

        if (asaasError) {
          console.error('⚠️ Erro ao criar cliente no Asaas (não bloqueante):', asaasError);
        } else if (asaasData?.success) {
          console.log('✅ Cliente criado no Asaas:', asaasData.asaasCustomerId);
        }
      } catch (asaasErr) {
        console.error('⚠️ Falha ao criar cliente no Asaas (não bloqueante):', asaasErr);
        // Não bloqueia a criação do cliente se falhar
      }

      // 3) Criar registro de assinatura no Supabase
      try {
        console.log('📋 Criando assinatura no Supabase...');
        const currentDate = new Date();
        const billingDay = 10; // Será buscado de financial_settings futuramente

        // Calcular data baseada no dia de cobrança
        let firstDueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), billingDay);
        if (firstDueDate <= currentDate) {
          firstDueDate.setMonth(firstDueDate.getMonth() + 1);
        }

        // Garantir D+2 mínimo
        const minDueDate = new Date();
        minDueDate.setDate(minDueDate.getDate() + 2);

        if (firstDueDate < minDueDate) {
          firstDueDate = minDueDate;
          console.log(`⚠️ Data ajustada para D+2: ${firstDueDate.toISOString().split('T')[0]}`);
        }

        console.log(`📅 Primeira data de vencimento: ${firstDueDate.toISOString().split('T')[0]}`);

        const { data: subscriptionData, error: subError } = await supabase
          .from('subscriptions')
          .insert({
            client_id: createdClientId,
            plan_id: clientData.plan,
            billing_cycle: 'monthly',
            status: 'active',
            current_period_start: currentDate.toISOString(),
            current_period_end: firstDueDate.toISOString()
          })
          .select('id')
          .single();

        if (subError) {
          console.error('⚠️ Erro ao criar assinatura (não bloqueante):', subError);
        } else if (subscriptionData?.id) {
          console.log('✅ Assinatura criada no Supabase:', subscriptionData.id);

          // 4) Configurar cobrança automática (boleto + NF-e)
          try {
            console.log('💳 Configurando cobrança automática...');
            const { data: billingResult, error: billingError } = await supabase.functions.invoke(
              'setup-client-billing',
              { body: { subscription_id: subscriptionData.id } }
            );

            if (billingError) {
              console.error('⚠️ Erro ao configurar cobrança (não bloqueante):', billingError);
            } else if (billingResult?.success) {
              console.log('✅ Cobrança configurada:', {
                boleto: billingResult.boleto_url,
                nfse: billingResult.nfse_issued ? 'Emitida' : 'Não emitida'
              });
            }
          } catch (billingErr) {
            console.error('⚠️ Falha ao configurar cobrança:', billingErr);
          }
        }
      } catch (subscriptionErr) {
        console.error('⚠️ Falha ao criar assinatura:', subscriptionErr);
      }

      // 2) Tenta criar usuário de autenticação (opcional - não bloqueia se falhar)
      try {
        const password = clientData.loginCredentials.password || generateTemporaryPassword();
        console.log('🔐 DEBUG: Tentando criar usuário de autenticação', {
          email: clientData.email,
          role: 'manager',
          clientId: createdClientId,
          temporaryPassword: clientData.loginCredentials.temporaryPassword
        });
        
        const { data: authResp, error: fnErr } = await supabase.functions.invoke("create-auth-user", {
          body: {
            email: clientData.email,
            password,
            name: clientData.companyName,
            role: "manager",
            clientId: createdClientId,
            temporaryPassword: clientData.loginCredentials.temporaryPassword,
          },
        });

        console.log('🔐 DEBUG: Resposta da edge function:', { authResp, fnErr });

        if (!fnErr && authResp) {
          const authPayload = authResp as any;
          if (authPayload?.success !== false && authPayload?.auth_user_id) {
            const createdAuthUserId = authPayload.auth_user_id;
            console.log('✅ DEBUG: Auth user criado com ID', createdAuthUserId);

            // Verificar se profile foi criado corretamente
            const { data: profileCheck } = await supabase
              .from('profiles')
              .select('id, client_id, role')
              .eq('id', createdAuthUserId)
              .maybeSingle();
            
            console.log('👤 DEBUG: Profile criado:', profileCheck);

            // Verificar se user foi criado corretamente
            const { data: userCheck } = await supabase
              .from('users')
              .select('id, client_id, role, auth_user_id')
              .eq('auth_user_id', createdAuthUserId)
              .maybeSingle();
            
            console.log('👥 DEBUG: User criado:', userCheck);
            
            // Mostrar credenciais criadas com toast melhorado
            const copyToClipboard = async (text: string) => {
              try {
                await navigator.clipboard.writeText(text);
                return true;
              } catch (error) {
                console.error('Erro ao copiar:', error);
                return false;
              }
            };

            const credentialsMessage = `🎉 Cliente criado com sucesso!

📧 Email: ${clientData.email}
🔑 Senha: ${password}

⚠️ IMPORTANTE: Anote essas credenciais!
• O cliente usa o EMAIL para fazer login
• Esta senha não será exibida novamente
• Clique aqui para copiar as credenciais`;

            toast.success(credentialsMessage, {
              duration: 20000, // 20 segundos
              action: {
                label: "📋 Copiar",
                onClick: async () => {
                  const credentials = `Email: ${clientData.email}\nSenha: ${password}`;
                  const copied = await copyToClipboard(credentials);
                  if (copied) {
                    toast.success("✅ Credenciais copiadas para a área de transferência!");
                  } else {
                    toast.error("❌ Erro ao copiar. Anote manualmente.");
                  }
                }
              }
            });

            // Enviar credenciais via WhatsApp se solicitado
            if (notificationOptions?.sendByWhatsApp) {
              const primaryContact = clientData.contacts?.find(c => c.isPrimary);
              const phoneNumber = primaryContact?.phone || clientData.phone;
              
              if (phoneNumber) {
                try {
                  console.log('📱 DEBUG: Enviando credenciais via WhatsApp para', phoneNumber);
                  const { data: notifyResp, error: notifyErr } = await supabase.functions.invoke("notify", {
                    body: {
                      type: "whatsapp_user_credentials",
                      to: phoneNumber,
                      userData: {
                        email: clientData.email,
                        password: password,
                        companyName: clientData.companyName,
                        loginUrl: window.location.origin + "/auth/login"
                      }
                    }
                  });

                  if (notifyErr) {
                    console.error('Erro ao enviar WhatsApp:', notifyErr);
                    toast.error("Erro ao enviar credenciais via WhatsApp");
                  } else {
                    console.log('✅ WhatsApp enviado com sucesso:', notifyResp);
                    toast.success(`📱 Credenciais enviadas via WhatsApp para ${phoneNumber}`);
                  }
                } catch (whatsappError) {
                  console.error('Erro no envio WhatsApp:', whatsappError);
                  toast.error("Falha ao enviar WhatsApp - verifique a configuração");
                }
              } else {
                toast.error("Número de telefone não informado para envio via WhatsApp");
              }
            }

            // Enviar credenciais via E-mail se solicitado
            if (notificationOptions?.sendByEmail) {
              try {
                console.log('📧 DEBUG: Enviando credenciais via E-mail para', clientData.email);
                
                const { data: emailResp, error: emailErr } = await supabase.functions.invoke("send-email", {
                  body: {
                    to: clientData.email,
                    subject: "Suas Credenciais de Acesso - Cotiz",
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #003366;">Bem-vindo ao Cotiz!</h2>
                        <p>Olá ${clientData.companyName},</p>
                        <p>Seu acesso ao sistema foi criado com sucesso. Seguem suas credenciais:</p>
                        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                          <p><strong>E-mail:</strong> ${clientData.email}</p>
                          <p><strong>Senha temporária:</strong> ${password}</p>
                          <p><strong>Empresa:</strong> ${clientData.companyName}</p>
                        </div>
                        <p>
                          <a href="${window.location.origin}/auth/login" 
                             style="background: #003366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Acessar Sistema
                          </a>
                        </p>
                        <p style="color: #666; font-size: 12px; margin-top: 30px;">
                          Por segurança, você deverá alterar a senha no primeiro login.
                        </p>
                      </div>
                    `,
                    client_id: createdClientId
                  }
                });

                if (emailErr) {
                  console.error('Erro ao enviar E-mail:', emailErr);
                  toast.error("Erro ao enviar credenciais via E-mail");
                } else {
                  console.log('✅ E-mail enviado com sucesso:', emailResp);
                  toast.success(`📧 Credenciais enviadas para ${clientData.email}`);
                }
              } catch (emailError) {
                console.error('Erro no envio de E-mail:', emailError);
                toast.error("Falha ao enviar E-mail - verifique a configuração");
              }
            }
          }
        } else {
          console.warn('useSupabaseAdminClients: Falha ao criar usuário de auth (não crítico)', fnErr);
          toast.success("Cliente criado com sucesso! (sem usuário de login - configure depois)");
        }
      } catch (authError) {
        console.warn('useSupabaseAdminClients: Erro na criação de usuário (não crítico)', authError);
      }

      // 5) Aplicar características do plano ao cliente recém-criado
      await applyPlanCharacteristicsToClient(createdClientId, clientData.plan);

      // 6) Audit log
      await supabase.from("audit_logs").insert({
        action: "CLIENT_CREATE",
        entity_type: "clients",
        entity_id: createdClientId,
        panel_type: "admin",
        details: {
          companyName: clientData.companyName,
          email: clientData.email,
          plan: clientData.plan,
        },
      });

      console.log('useSupabaseAdminClients: Cliente criado com sucesso');
      
      // Atualiza estado local
      setClients((prev) => [
        ...prev,
        {
          ...(clientData as any),
          id: createdClientId!,
          createdAt: new Date().toISOString(),
          revenue: 0,
          quotesCount: 0,
        },
      ]);

      return { id: createdClientId };
    } catch (e: any) {
      console.error("useSupabaseAdminClients: Erro ao criar cliente:", e);
      toast.error("Erro ao criar cliente: " + (e?.message || "Erro desconhecido"));

      // rollback do cliente se criado
      if (createdClientId) {
        console.log('useSupabaseAdminClients: Fazendo rollback do cliente', createdClientId);
        await supabase.from("clients").delete().eq("id", createdClientId);
      }
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (id: string, clientData: Partial<AdminClient>) => {
    console.log('✏️ [AdminClients] Atualizando cliente:', id);
    if (clientData.clientType) {
      console.log('📋 [AdminClients] Mudança de tipo:', clientData.clientType);
    }
    setLoading(true);
    try {
      
      // Preparar dados para a atualização
      const updateData: any = {};
      
      if (clientData.companyName !== undefined) updateData.name = clientData.companyName;
      if (clientData.email !== undefined) updateData.email = clientData.email;
      if (clientData.phone !== undefined) updateData.phone = clientData.phone || null;
      if (clientData.cnpj !== undefined) updateData.cnpj = clientData.cnpj;
      if (clientData.address !== undefined) {
        updateData.address = typeof clientData.address === 'string' 
          ? clientData.address 
          : formatAddressToText(clientData.address);
      }
      if (clientData.status !== undefined) updateData.status = clientData.status;
      if (clientData.plan !== undefined) updateData.subscription_plan_id = clientData.plan;
      if (clientData.loginCredentials?.username !== undefined) {
        updateData.username = clientData.loginCredentials.username || null;
      }
      if (clientData.groupId !== undefined) {
        updateData.group_id = clientData.groupId || null;
      }
      if (clientData.notes !== undefined) {
        updateData.notes = clientData.notes || null;
      }
      
      // Novos campos de hierarquia e branding
      if (clientData.clientType !== undefined) updateData.client_type = clientData.clientType;
      if (clientData.parentClientId !== undefined) updateData.parent_client_id = clientData.parentClientId || null;
      if (clientData.brandingSettingsId !== undefined) updateData.branding_settings_id = clientData.brandingSettingsId || null;
      if (clientData.requiresApproval !== undefined) updateData.requires_approval = clientData.requiresApproval;

      console.log('💾 [AdminClients] Campos atualizados:', Object.keys(updateData).join(', '));

      const { error } = await supabase
        .from("clients")
        .update(updateData)
        .eq("id", id);

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      console.log('Cliente atualizado com sucesso no banco');

      // Se o plano foi alterado, aplicar as características do plano ao cliente
      if (clientData.plan !== undefined) {
        await applyPlanCharacteristicsToClient(id, clientData.plan);
      }

      // Usar batch update para otimizar re-renders
      const clientUpdateBatch = {
        companyName: clientData.companyName,
        email: clientData.email,
        phone: clientData.phone || "",
        cnpj: clientData.cnpj,
        address: typeof clientData.address === 'string' ? clientData.address : formatAddressToText(clientData.address || parseAddress()),
        status: clientData.status,
        plan: clientData.plan,
        groupId: clientData.groupId,
        groupName: clientData.groupId ? clientGroups.find(g => g.id === clientData.groupId)?.name : undefined
      };

      // Atualizar estado local de forma otimizada - UMA ÚNICA OPERAÇÃO
      setClients((prev) => {
        console.log('🔄 Atualizando estado local do cliente', id);
        return prev.map((c) => 
          c.id === id ? { ...c, ...clientUpdateBatch } : c
        );
      });

      toast.success("Cliente atualizado com sucesso!");
    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error("Falha ao atualizar cliente: " + (error?.message || "Erro desconhecido"));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (id: string) => {
    console.log('🗑️ [AdminClients] Iniciando exclusão do cliente', id);
    setLoading(true);
    try {
      // Buscar dados do cliente antes de excluir para log de auditoria
      const clientToDelete = clients.find(c => c.id === id);
      
      // Primeiro, deletar do Asaas se existir asaas_customer_id
      try {
        console.log('🔧 [AdminClients] Deletando cliente do Asaas');
        const { data: deleteAsaasData, error: deleteAsaasError } = await supabase.functions.invoke(
          'delete-asaas-customer',
          {
            body: { clientId: id }
          }
        );

        if (deleteAsaasError) {
          console.error('⚠️ [AdminClients] Erro ao deletar do Asaas (não bloqueante):', deleteAsaasError);
          toast.warning('Cliente será excluído localmente, mas houve erro ao excluir do Asaas');
        } else {
          console.log('✅ [AdminClients] Cliente deletado do Asaas:', deleteAsaasData);
        }
      } catch (asaasError) {
        console.error('⚠️ [AdminClients] Erro ao chamar função de exclusão Asaas:', asaasError);
        // Continuar mesmo se falhar no Asaas
      }
      
      console.log('🗑️ [AdminClients] Excluindo do Supabase (CASCADE ativado)');
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) {
        console.error('❌ [AdminClients] Erro ao excluir:', error);
        throw error;
      }
      
      // Registrar auditoria da exclusão
      try {
        await supabase.from('audit_logs').insert({
          action: 'CLIENT_DELETED',
          entity_type: 'clients',
          entity_id: id,
          panel_type: 'admin',
          details: {
            company_name: clientToDelete?.companyName,
            cnpj: clientToDelete?.cnpj,
            users_count: clientToDelete?.quotesCount || 0,
            quotes_count: clientToDelete?.quotesCount || 0,
            deleted_at: new Date().toISOString()
          }
        });
        console.log('📝 [AdminClients] Log de auditoria criado');
      } catch (auditError) {
        console.error('⚠️ [AdminClients] Erro ao criar log de auditoria (não bloqueante):', auditError);
      }
      
      console.log('✅ [AdminClients] Exclusão bem-sucedida, atualizando estado local');
      setClients((prev) => {
        const newClients = prev.filter((c) => c.id !== id);
        console.log('📊 [AdminClients] Novo total de clientes:', newClients.length);
        return newClients;
      });
      
      console.log('deleteClient: mostrando toast de sucesso');
      toast.success("Cliente excluído");
      console.log('deleteClient: operação concluída com sucesso');
    } catch (e: any) {
      console.error('deleteClient: erro:', e);
      toast.error("Falha ao excluir cliente");
    } finally {
      console.log('deleteClient: finalizando loading');
      setLoading(false);
    }
  };

  const createGroup = async (
    groupData: Omit<ClientGroup, "id" | "createdAt" | "clientCount">
  ) => {
    const { data, error } = await supabase
      .from("client_groups")
      .insert({ name: groupData.name, description: groupData.description, color: groupData.color })
      .select("id, name, description, color, client_count, created_at")
      .single();
    if (error) {
      toast.error("Erro ao criar grupo");
      throw error;
    }
    const newGroup: ClientGroup = {
      id: data.id,
      name: data.name,
      description: data.description ?? undefined,
      color: data.color ?? "#64748b",
      clientCount: data.client_count ?? 0,
      createdAt: data.created_at ?? undefined,
    };
    setClientGroups((prev) => [...prev, newGroup]);
    return newGroup;
  };

  const updateGroup = async (id: string, groupData: Partial<ClientGroup>) => {
    const { error } = await supabase
      .from("client_groups")
      .update({ name: groupData.name, description: groupData.description, color: groupData.color })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar grupo");
      throw error;
    }
    setClientGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...groupData } : g)));
  };

  const deleteGroup = async (id: string) => {
    // Remover associação dos clientes antes (set group_id null)
    await supabase.from("clients").update({ group_id: null }).eq("group_id", id);
    const { error } = await supabase.from("client_groups").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir grupo");
      throw error;
    }
    setClientGroups((prev) => prev.filter((g) => g.id !== id));
    // Atualizar clientes locais
    setClients((prev) => prev.map((c) => (c.groupId === id ? { ...c, groupId: undefined, groupName: undefined } : c)));
  };

  const generateTemporaryPassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 10; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
    return password;
  };

  // Aplicar características do plano ao cliente
  const applyPlanCharacteristicsToClient = async (clientId: string, planId: string) => {
    try {
      console.log('🎯 DEBUG: Aplicando características do plano', { clientId, planId });
      
      // Buscar dados completos do plano no Supabase
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !planData) {
        console.error('❌ DEBUG: Erro ao buscar dados do plano:', planError);
        return;
      }

      console.log('📋 DEBUG: Dados do plano encontrados:', {
        id: planData.id,
        name: planData.display_name,
        limits: {
          maxQuotes: planData.max_quotes,
          maxUsers: planData.max_users,
          maxSuppliers: planData.max_suppliers,
          maxStorageGB: planData.max_storage_gb,
        }
      });

      // Verificar se client_usage já existe
      const { data: existingUsage } = await supabase
        .from('client_usage')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      console.log('📊 DEBUG: Usage existente:', existingUsage);

      // Aplicar limites do plano na tabela client_usage
      const usageData = {
        client_id: clientId,
        // Resetar contadores mensais se mudou de plano
        quotes_this_month: existingUsage?.quotes_this_month || 0,
        quote_responses_this_month: existingUsage?.quote_responses_this_month || 0,
        // Manter contadores atuais se já existem
        users_count: existingUsage?.users_count || 0,
        storage_used_gb: existingUsage?.storage_used_gb || 0,
        products_in_catalog: existingUsage?.products_in_catalog || 0,
        categories_count: existingUsage?.categories_count || 0,
        updated_at: new Date().toISOString(),
        last_reset_date: new Date().toISOString().split('T')[0]
      };

      console.log('💾 DEBUG: Dados de usage a serem salvos:', usageData);

      const { error: usageError } = await supabase
        .from('client_usage')
        .upsert(usageData, {
          onConflict: 'client_id',
          ignoreDuplicates: false
        });

      if (usageError) {
        console.error('❌ DEBUG: Erro ao aplicar limites do plano:', usageError);
      } else {
        console.log('✅ DEBUG: Características do plano aplicadas com sucesso');
        toast.success(`Plano ${planData.display_name} aplicado com todas suas características!`);
      }

      // Verificar se foi salvo corretamente
      const { data: savedUsage } = await supabase
        .from('client_usage')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      console.log('✔️ DEBUG: Usage salvo no banco:', savedUsage);

      // Criar log de auditoria
      await supabase.from('audit_logs').insert({
        action: 'PLAN_APPLIED',
        entity_type: 'clients',
        entity_id: clientId,
        panel_type: 'admin',
        details: {
          planId,
          planName: planData.display_name,
          planLimits: {
            maxQuotes: planData.max_quotes,
            maxUsers: planData.max_users,
            maxSuppliers: planData.max_suppliers,
            maxStorageGB: planData.max_storage_gb,
            maxQuotesPerMonth: planData.max_quotes_per_month || planData.max_quotes,
            maxUsersPerClient: planData.max_users_per_client || planData.max_users,
            maxSuppliersPerQuote: planData.max_suppliers_per_quote || 5,
            maxQuoteResponsesPerMonth: planData.max_quote_responses_per_month || 50,
            maxProductsInCatalog: planData.max_products_in_catalog || 100,
            maxCategoriesPerSupplier: planData.max_categories_per_supplier || 10
          }
        }
      });

      console.log('📝 DEBUG: Log de auditoria criado');

    } catch (error) {
      console.error('❌ DEBUG: Erro ao aplicar características do plano:', error);
      toast.error('Erro ao aplicar características do plano');
    }
  };

  const generateUsername = (companyName: string) => {
    return (
      companyName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15) + Math.floor(Math.random() * 100)
    );
  };

  const resetClientPassword = async (clientId: string, email: string) => {
    console.log('resetClientPassword: resetando senha para cliente', clientId, email);
    setLoading(true);
    try {
      const password = generateTemporaryPassword();
      console.log('resetClientPassword: nova senha gerada');
      
      const { data: authResp, error: fnErr } = await supabase.functions.invoke("create-auth-user", {
        body: {
          email,
          password,
          name: "Reset Password", // não usado no reset
          role: "manager", // não usado no reset
          clientId,
          temporaryPassword: true,
          action: 'reset_password',
        },
      });

      if (!fnErr && authResp?.success) {
        console.log('resetClientPassword: senha resetada com sucesso');
        
        const copyToClipboard = async (text: string) => {
          try {
            await navigator.clipboard.writeText(text);
            return true;
          } catch (error) {
            console.error('Erro ao copiar:', error);
            return false;
          }
        };

        const resetMessage = `🔄 Senha resetada com sucesso!

📧 Email: ${email}
🔑 Nova senha: ${password}

⚠️ Anote a nova senha!`;

        toast.success(resetMessage, {
          duration: 15000,
          action: {
            label: "📋 Copiar",
            onClick: async () => {
              const credentials = `Email: ${email}\nNova senha: ${password}`;
              const copied = await copyToClipboard(credentials);
              if (copied) {
                toast.success("✅ Credenciais copiadas!");
              } else {
                toast.error("❌ Erro ao copiar.");
              }
            }
          }
        });
        
        return password;
      } else {
        const errorMsg = authResp?.error || 'Erro desconhecido';
        console.error('resetClientPassword: erro:', errorMsg);
        toast.error(`Erro ao resetar senha: ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } catch (e: any) {
      console.error('resetClientPassword: erro:', e);
      toast.error("Erro ao resetar senha: " + (e?.message || "Erro desconhecido"));
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // Memoizar stats para evitar recálculos desnecessários
  const stats = useMemo(() => {
    console.log('📊 stats: recalculando com', clients.length, 'clientes');
    
    if (!clients.length) {
      console.log('📊 stats: sem clientes, retornando valores padrão');
      return { total: 0, active: 0, inactive: 0, pending: 0, totalRevenue: 0, avgQuotes: 0, byGroup: [] as any[] };
    }
    
    // Usar Set para otimizar as contagens
    const statusCounts = { active: 0, inactive: 0, pending: 0 };
    let totalRevenue = 0;
    let totalQuotes = 0;
    
    // Uma única passagem pelos clientes
    for (const client of clients) {
      statusCounts[client.status]++;
      totalRevenue += client.revenue || 0;
      totalQuotes += client.quotesCount || 0;
    }
    
    // Mapear grupos de forma otimizada
    const groupMap = new Map<string, number>();
    for (const client of clients) {
      if (client.groupId) {
        groupMap.set(client.groupId, (groupMap.get(client.groupId) || 0) + 1);
      }
    }
    
    const byGroup = clientGroups.map((group) => ({
      name: group.name,
      count: groupMap.get(group.id) || 0,
      color: group.color || "#64748b",
    }));
    
    const avgQuotes = clients.length > 0 ? Math.round(totalQuotes / clients.length) : 0;
    
    const result = {
      total: clients.length,
      active: statusCounts.active,
      inactive: statusCounts.inactive,
      pending: statusCounts.pending,
      totalRevenue,
      avgQuotes,
      byGroup,
    };
    
    console.log('📊 stats: resultado calculado (otimizado):', result);
    return result;
  }, [clients, clientGroups]);

  return {
    clients: filteredClients,
    clientGroups,
    searchTerm,
    setSearchTerm,
    filterGroup,
    setFilterGroup,
    filterStatus,
    setFilterStatus,
    createClient,
    updateClient,
    deleteClient,
    createGroup,
    updateGroup,
    deleteGroup,
    resetClientPassword,
    generateUsername,
    generateTemporaryPassword,
    stats,
    loading,
  };
}