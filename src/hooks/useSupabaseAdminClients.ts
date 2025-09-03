import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  address: {
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
}

// Utilities
const formatAddressToText = (addr: AdminClient["address"]) => {
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

  // Fetch groups and clients
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: groupsData, error: groupsErr }, { data: clientsData, error: clientsErr }] = await Promise.all([
          supabase.from("client_groups").select("id, name, description, color, client_count, created_at"),
          supabase
            .from("clients")
            .select(
              "id, name, cnpj, email, phone, address, status, subscription_plan_id, created_at, updated_at, username, group_id, last_access"
            )
        ]);

        if (groupsErr) throw groupsErr;
        if (clientsErr) throw clientsErr;

        const groups: ClientGroup[] = (groupsData || []).map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description ?? undefined,
          color: g.color ?? "#64748b",
          clientCount: g.client_count ?? 0,
          createdAt: g.created_at ?? undefined,
        }));

        const groupsMap = new Map(groups.map((g) => [g.id, g]));

        const mapped: AdminClient[] = (clientsData || []).map((c) => ({
          id: c.id,
          companyName: c.name,
          cnpj: c.cnpj,
          email: c.email,
          phone: c.phone ?? "",
          address: parseAddress(c.address ?? undefined),
          contacts: [],
          groupId: c.group_id ?? undefined,
          groupName: c.group_id ? groupsMap.get(c.group_id)?.name : undefined,
          status: (c.status as AdminClient["status"]) || "active",
          plan: c.subscription_plan_id || "basic",
          createdAt: c.created_at || new Date().toISOString(),
          lastAccess: c.last_access || undefined,
          loginCredentials: {
            username: c.username || "",
            temporaryPassword: true,
            lastPasswordChange: c.updated_at || undefined,
          },
          documents: [],
          revenue: 0,
          quotesCount: 0,
          notes: undefined,
        }));

        setClientGroups(groups);
        setClients(mapped);
      } catch (e: any) {
        console.error("Erro ao carregar clientes/grupos:", e);
        toast.error("Falha ao carregar dados de clientes");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.cnpj.includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGroup = filterGroup === "all" || client.groupId === filterGroup;
      const matchesStatus = filterStatus === "all" || client.status === filterStatus;

      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [clients, searchTerm, filterGroup, filterStatus]);

  const createClient = async (
    clientData: Omit<AdminClient, "id" | "createdAt" | "revenue" | "quotesCount">
  ) => {
    console.log('useSupabaseAdminClients: createClient iniciado', clientData);
    setLoading(true);
    let createdClientId: string | null = null;

    try {
      // 1) Cria o registro do cliente PRIMEIRO (sempre funciona)
      console.log('useSupabaseAdminClients: Criando registro do cliente');
      const { data: insertData, error: insertErr } = await supabase
        .from("clients")
        .insert({
          name: clientData.companyName,
          cnpj: clientData.cnpj,
          email: clientData.email,
          phone: clientData.phone,
          address: formatAddressToText(clientData.address),
          status: clientData.status,
          subscription_plan_id: clientData.plan,
          username: clientData.loginCredentials.username,
          group_id: clientData.groupId || null,
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error('useSupabaseAdminClients: Erro ao inserir cliente', insertErr);
        throw insertErr;
      }
      createdClientId = insertData?.id as string;
      console.log('useSupabaseAdminClients: Cliente criado com ID', createdClientId);

      // 2) Tenta criar usuário de autenticação (opcional - não bloqueia se falhar)
      try {
        const password = clientData.loginCredentials.password || generateTemporaryPassword();
        console.log('useSupabaseAdminClients: Tentando criar usuário de autenticação');
        
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

        if (!fnErr && authResp) {
          const authPayload = authResp as any;
          if (authPayload?.success !== false && authPayload?.auth_user_id) {
            const createdAuthUserId = authPayload.auth_user_id;
            console.log('useSupabaseAdminClients: Auth user criado com ID', createdAuthUserId);

            // 3) A Edge Function já cria/atualiza profile e users vinculando ao clientId. Nada a fazer aqui.
            
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
          }
        } else {
          console.warn('useSupabaseAdminClients: Falha ao criar usuário de auth (não crítico)', fnErr);
          toast.success("Cliente criado com sucesso! (sem usuário de login - configure depois)");
        }
      } catch (authError) {
        console.warn('useSupabaseAdminClients: Erro na criação de usuário (não crítico)', authError);
      }

      // 5) Audit log
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
    setLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: clientData.companyName,
          email: clientData.email,
          phone: clientData.phone,
          cnpj: clientData.cnpj,
          address: clientData.address ? formatAddressToText(clientData.address) : undefined,
          status: clientData.status,
          subscription_plan_id: clientData.plan,
          username: clientData.loginCredentials?.username,
          group_id: clientData.groupId,
        })
        .eq("id", id);
      if (error) throw error;

      setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...(clientData as any) } : c)));
      toast.success("Cliente atualizado");
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao atualizar cliente");
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (id: string) => {
    console.log('deleteClient: iniciando exclusão do cliente', id);
    setLoading(true);
    try {
      console.log('deleteClient: excluindo do Supabase');
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      
      console.log('deleteClient: exclusão do Supabase bem-sucedida, atualizando estado local');
      setClients((prev) => {
        const newClients = prev.filter((c) => c.id !== id);
        console.log('deleteClient: novo array de clientes:', newClients.length, 'clientes');
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

  const stats = useMemo(() => {
    console.log('stats: recalculando com', clients.length, 'clientes');
    
    if (!clients.length) {
      console.log('stats: sem clientes, retornando valores padrão');
      return { total: 0, active: 0, inactive: 0, pending: 0, totalRevenue: 0, avgQuotes: 0, byGroup: [] as any[] };
    }
    
    const byGroup = clientGroups.map((group) => ({
      name: group.name,
      count: clients.filter((c) => c.groupId === group.id).length,
      color: group.color || "#64748b",
    }));
    
    const totalRevenue = clients.reduce((s, c) => s + (c.revenue || 0), 0);
    const totalQuotes = clients.reduce((s, c) => s + (c.quotesCount || 0), 0);
    const avgQuotes = clients.length > 0 ? Math.round(totalQuotes / clients.length) : 0;
    
    const result = {
      total: clients.length,
      active: clients.filter((c) => c.status === "active").length,
      inactive: clients.filter((c) => c.status === "inactive").length,
      pending: clients.filter((c) => c.status === "pending").length,
      totalRevenue,
      avgQuotes,
      byGroup,
    };
    
    console.log('stats: resultado calculado:', result);
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