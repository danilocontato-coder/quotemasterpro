import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdministradoraMetrics {
  totalCondominios: number;
  totalCotacoes: number;
  economiaTotal: number;
  fornecedoresUnicos: number;
  usuariosTotais: number;
  cotacoesMesAtual: number;
}

interface UseAdministradoraDataReturn {
  isAdministradora: boolean;
  metrics: AdministradoraMetrics | null;
  clientId: string | null;
  clientName: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdministradoraData(): UseAdministradoraDataReturn {
  const [isAdministradora, setIsAdministradora] = useState(false);
  const [metrics, setMetrics] = useState<AdministradoraMetrics | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      console.log('🔍 useAdministradoraData: Iniciando busca de dados');
      setIsLoading(true);
      setError(null);

      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('⚠️ useAdministradoraData: Usuário não autenticado');
        setIsLoading(false);
        return;
      }

      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.client_id) {
        console.log('⚠️ useAdministradoraData: Client_id não encontrado');
        setIsLoading(false);
        return;
      }

      const currentClientId = profile.client_id;
      setClientId(currentClientId);

      console.log('🔍 useAdministradoraData: Verificando tipo de cliente:', currentClientId);

      // Buscar informações do cliente
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, client_type')
        .eq('id', currentClientId)
        .single();

      if (clientError || !client) {
        console.error('❌ useAdministradoraData: Erro ao buscar cliente:', clientError);
        setError('Erro ao buscar informações do cliente');
        setIsLoading(false);
        return;
      }

      setClientName(client.name);

      // Verificar se é administradora
      const isAdmin = client.client_type === 'administradora';
      setIsAdministradora(isAdmin);

      console.log(`✅ useAdministradoraData: Tipo detectado - ${client.client_type}`, {
        isAdministradora: isAdmin
      });

      if (!isAdmin) {
        console.log('ℹ️ useAdministradoraData: Cliente não é administradora, finalizando');
        setIsLoading(false);
        return;
      }

      // Se é administradora, buscar métricas consolidadas
      console.log('📊 useAdministradoraData: Buscando métricas consolidadas');

      // 1. Contar condomínios vinculados
      const { count: condominiosCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('parent_client_id', currentClientId)
        .eq('status', 'active');

      const totalCondominios = condominiosCount || 0;
      console.log(`📊 Total de condomínios vinculados: ${totalCondominios}`);

      // 2. Buscar IDs dos condomínios para agregação
      const { data: condominios } = await supabase
        .from('clients')
        .select('id')
        .eq('parent_client_id', currentClientId);

      const condominioIds = condominios?.map(c => c.id) || [];
      
      // Incluir a própria administradora nas métricas
      const allClientIds = [currentClientId, ...condominioIds];

      console.log(`📊 Agregando dados de ${allClientIds.length} clientes (administradora + condomínios)`);

      // 3. Contar cotações totais
      const { count: cotacoesCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .in('client_id', allClientIds);

      const totalCotacoes = cotacoesCount || 0;

      // 4. Cotações do mês atual
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { count: cotacoesMesCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .in('client_id', allClientIds)
        .gte('created_at', inicioMes.toISOString());

      const cotacoesMesAtual = cotacoesMesCount || 0;

      // 5. Calcular economia total (soma de descontos em negociações)
      const { data: negociacoes } = await supabase
        .from('ai_negotiations')
        .select('discount_percentage, original_amount')
        .in('client_id', allClientIds)
        .eq('status', 'completed');

      const economiaTotal = negociacoes?.reduce((acc, neg) => {
        const desconto = (neg.original_amount * (neg.discount_percentage || 0)) / 100;
        return acc + desconto;
      }, 0) || 0;

      // 6. Contar fornecedores únicos
      const { data: quotesWithSuppliers } = await supabase
        .from('quotes')
        .select('supplier_id')
        .in('client_id', allClientIds)
        .not('supplier_id', 'is', null);

      const uniqueSupplierIds = new Set(
        quotesWithSuppliers?.map(q => q.supplier_id).filter(Boolean) || []
      );
      const fornecedoresUnicos = uniqueSupplierIds.size;

      // 7. Contar usuários totais
      const { count: usuariosCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('client_id', allClientIds)
        .eq('active', true);

      const usuariosTotais = usuariosCount || 0;

      const consolidatedMetrics: AdministradoraMetrics = {
        totalCondominios,
        totalCotacoes,
        economiaTotal,
        fornecedoresUnicos,
        usuariosTotais,
        cotacoesMesAtual
      };

      console.log('✅ useAdministradoraData: Métricas consolidadas calculadas:', consolidatedMetrics);

      setMetrics(consolidatedMetrics);
      setIsLoading(false);

    } catch (err) {
      console.error('❌ useAdministradoraData: Erro inesperado:', err);
      setError('Erro ao carregar dados da administradora');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    isAdministradora,
    metrics,
    clientId,
    clientName,
    isLoading,
    error,
    refetch: fetchData
  };
}
