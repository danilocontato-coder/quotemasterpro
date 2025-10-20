import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CondominioVinculado {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone?: string;
  address?: string;
  status: string;
  created_at: string;
  cotacoesCount: number;
  usuariosCount: number;
  lastActivity?: string;
}

interface UseCondominiosVinculadosReturn {
  condominios: CondominioVinculado[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCondominiosVinculados(administradoraId?: string): UseCondominiosVinculadosReturn {
  const [condominios, setCondominios] = useState<CondominioVinculado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCondominios = async () => {
    try {
      console.log('🔍 useCondominiosVinculados: Iniciando busca de condomínios');
      setIsLoading(true);
      setError(null);

      let targetAdministradoraId = administradoraId;

      // Se não foi fornecido ID, buscar do usuário atual
      if (!targetAdministradoraId) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('⚠️ useCondominiosVinculados: Usuário não autenticado');
          setIsLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user.id)
          .single();

        if (!profile?.client_id) {
          console.log('⚠️ useCondominiosVinculados: Client_id não encontrado');
          setIsLoading(false);
          return;
        }

        targetAdministradoraId = profile.client_id;
      }

      console.log('🔍 useCondominiosVinculados: Buscando condomínios para administradora:', targetAdministradoraId);

      // Buscar condomínios vinculados
      const { data: condominiosData, error: condominiosError } = await supabase
        .from('clients')
        .select('id, name, cnpj, email, phone, address, status, created_at')
        .eq('parent_client_id', targetAdministradoraId)
        .eq('client_type', 'condominio_vinculado')
        .order('name');

      if (condominiosError) {
        console.error('❌ useCondominiosVinculados: Erro ao buscar condomínios:', condominiosError);
        setError('Erro ao carregar condomínios');
        setIsLoading(false);
        return;
      }

      if (!condominiosData || condominiosData.length === 0) {
        console.log('ℹ️ useCondominiosVinculados: Nenhum condomínio vinculado encontrado');
        setCondominios([]);
        setIsLoading(false);
        return;
      }

      console.log(`✅ useCondominiosVinculados: ${condominiosData.length} condomínios encontrados`);

      // Para cada condomínio, buscar métricas
      const condominiosWithMetrics = await Promise.all(
        condominiosData.map(async (cond) => {
          // Contar cotações (incluindo on_behalf_of_client_id)
          const { count: cotacoesCount } = await supabase
            .from('quotes')
            .select('*', { count: 'exact', head: true })
            .or(`client_id.eq.${cond.id},on_behalf_of_client_id.eq.${cond.id}`);

          // Contar usuários ativos
          const { count: usuariosCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', cond.id)
            .eq('active', true);

          // Última atividade (última cotação criada)
          const { data: lastQuote } = await supabase
            .from('quotes')
            .select('created_at')
            .eq('client_id', cond.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            id: cond.id,
            name: cond.name,
            cnpj: cond.cnpj,
            email: cond.email,
            phone: cond.phone,
            address: cond.address,
            status: cond.status,
            created_at: cond.created_at,
            cotacoesCount: cotacoesCount || 0,
            usuariosCount: usuariosCount || 0,
            lastActivity: lastQuote?.created_at
          };
        })
      );

      console.log('✅ useCondominiosVinculados: Métricas carregadas para todos os condomínios');

      setCondominios(condominiosWithMetrics);
      setIsLoading(false);

    } catch (err) {
      console.error('❌ useCondominiosVinculados: Erro inesperado:', err);
      setError('Erro ao carregar condomínios');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCondominios();
  }, [administradoraId]);

  return {
    condominios,
    isLoading,
    error,
    refetch: fetchCondominios
  };
}
