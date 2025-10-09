import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdministradoraQuote {
  id: string;
  title: string;
  description: string;
  status: string;
  total: number;
  client_id: string;
  client_name: string;
  on_behalf_of_client_id?: string;
  on_behalf_of_client_name?: string;
  created_at: string;
  updated_at: string;
  items_count: number;
  responses_count: number;
}

interface UseAdministradoraQuotesReturn {
  quotes: AdministradoraQuote[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdministradoraQuotes(administradoraId?: string): UseAdministradoraQuotesReturn {
  const [quotes, setQuotes] = useState<AdministradoraQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = async () => {
    try {
      console.log('🔍 useAdministradoraQuotes: Iniciando busca de cotações');
      setIsLoading(true);
      setError(null);

      let targetAdministradoraId = administradoraId;

      // Se não foi fornecido ID, buscar do usuário atual
      if (!targetAdministradoraId) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('⚠️ useAdministradoraQuotes: Usuário não autenticado');
          setIsLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user.id)
          .single();

        if (!profile?.client_id) {
          console.log('⚠️ useAdministradoraQuotes: Client_id não encontrado');
          setIsLoading(false);
          return;
        }

        targetAdministradoraId = profile.client_id;
      }

      console.log('🔍 useAdministradoraQuotes: Buscando cotações para administradora:', targetAdministradoraId);

      // Buscar condomínios vinculados
      const { data: condominios } = await supabase
        .from('clients')
        .select('id')
        .eq('parent_client_id', targetAdministradoraId)
        .eq('client_type', 'condominio_vinculado');

      const condominioIds = condominios?.map(c => c.id) || [];

      // Buscar cotações da administradora e dos condomínios
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          id,
          title,
          description,
          status,
          total,
          client_id,
          client_name,
          on_behalf_of_client_id,
          created_at,
          updated_at,
          items_count,
          responses_count
        `)
        .or(`client_id.eq.${targetAdministradoraId},client_id.in.(${condominioIds.join(',')})${condominioIds.length > 0 ? `,on_behalf_of_client_id.in.(${condominioIds.join(',')})` : ''}`)
        .order('created_at', { ascending: false });

      if (quotesError) {
        console.error('❌ useAdministradoraQuotes: Erro ao buscar cotações:', quotesError);
        setError('Erro ao carregar cotações');
        setIsLoading(false);
        return;
      }

      console.log(`✅ useAdministradoraQuotes: ${quotesData?.length || 0} cotações encontradas`);

      // Buscar nomes dos condomínios para on_behalf_of
      const quotesWithNames = await Promise.all(
        (quotesData || []).map(async (quote) => {
          let onBehalfOfName = undefined;
          
          if (quote.on_behalf_of_client_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('name')
              .eq('id', quote.on_behalf_of_client_id)
              .single();
            
            onBehalfOfName = client?.name;
          }

          return {
            ...quote,
            on_behalf_of_client_name: onBehalfOfName
          } as AdministradoraQuote;
        })
      );

      setQuotes(quotesWithNames);
      setIsLoading(false);

    } catch (err) {
      console.error('❌ useAdministradoraQuotes: Erro inesperado:', err);
      setError('Erro ao carregar cotações');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [administradoraId]);

  return {
    quotes,
    isLoading,
    error,
    refetch: fetchQuotes
  };
}
