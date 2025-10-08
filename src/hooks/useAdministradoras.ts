import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminClient } from './useSupabaseAdminClients';

/**
 * Hook para buscar apenas clientes do tipo 'administradora'
 * Usado para popular o ParentClientSelect
 */
export function useAdministradoras() {
  const [administradoras, setAdministradoras] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdministradoras = async () => {
      console.log('🏢 [useAdministradoras] Iniciando busca de administradoras...');
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('clients')
          .select(`
            id, 
            name, 
            cnpj, 
            email,
            company_name,
            status,
            client_type
          `)
          .eq('client_type', 'administradora')
          .eq('status', 'active')
          .order('name');

        if (fetchError) {
          console.error('❌ [useAdministradoras] Erro ao buscar administradoras:', fetchError);
          setError(fetchError.message);
          return;
        }

        console.log(`✅ [useAdministradoras] ${data?.length || 0} administradoras encontradas`);

        // Buscar contagem de condomínios vinculados para cada administradora
        const administradorasWithCounts = await Promise.all(
          (data || []).map(async (admin) => {
            const { count } = await supabase
              .from('clients')
              .select('id', { count: 'exact', head: true })
              .eq('parent_client_id', admin.id)
              .eq('client_type', 'condominio_vinculado');

            console.log(`📊 [useAdministradoras] Administradora "${admin.name}" tem ${count || 0} condomínios vinculados`);

            return {
              id: admin.id,
              companyName: admin.company_name || admin.name,
              name: admin.name,
              cnpj: admin.cnpj || '',
              email: admin.email || '',
              status: admin.status as 'active' | 'inactive' | 'pending',
              clientType: admin.client_type as 'direct' | 'administradora' | 'condominio_vinculado',
              childClientsCount: count || 0,
              // Campos obrigatórios para AdminClient
              phone: '',
              address: '',
              plan: '',
              subscriptionPlanId: '',
              createdAt: new Date().toISOString(),
              revenue: 0,
              quotesCount: 0,
              contacts: [],
              documents: [],
              loginCredentials: {
                username: '',
                temporaryPassword: false,
              }
            } as AdminClient;
          })
        );

        setAdministradoras(administradorasWithCounts);
      } catch (err) {
        console.error('❌ [useAdministradoras] Erro inesperado:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchAdministradoras();
  }, []);

  return { administradoras, loading, error };
}
