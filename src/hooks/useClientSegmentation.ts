import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SegmentationOptions {
  clientGroups: { value: string; label: string }[];
  clientTypes: { value: string; label: string }[];
  states: { value: string; label: string }[];
  regions: { value: string; label: string }[];
}

export function useClientSegmentation() {
  const [options, setOptions] = useState<SegmentationOptions>({
    clientGroups: [],
    clientTypes: [],
    states: [],
    regions: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSegmentationOptions();
  }, []);

  const fetchSegmentationOptions = async () => {
    try {
      setIsLoading(true);

      // Buscar grupos de clientes
      const { data: groups } = await supabase
        .from('client_groups')
        .select('id, name')
        .order('name');

      // Buscar tipos distintos de clientes
      const { data: clients } = await supabase
        .from('clients')
        .select('client_type, state, region')
        .eq('status', 'active');

      const clientTypes = [...new Set(clients?.map(c => c.client_type).filter(Boolean))]
        .map(type => ({
          value: type,
          label: type === 'condominio_vinculado' ? 'Condomínio' : 
                 type === 'administradora' ? 'Administradora' : 
                 type === 'direct' ? 'Direto' : type
        }));

      const states = [...new Set(clients?.map(c => c.state).filter(Boolean))]
        .sort()
        .map(state => ({ value: state, label: state }));

      const regions = [...new Set(clients?.map(c => c.region).filter(Boolean))]
        .sort()
        .map(region => ({ value: region, label: region }));

      setOptions({
        clientGroups: groups?.map(g => ({ value: g.id, label: g.name })) || [],
        clientTypes,
        states,
        regions
      });
    } catch (error) {
      console.error('Erro ao buscar opções de segmentação:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const estimateRecipients = async (segmentFilters: any) => {
    try {
      if (!segmentFilters || !segmentFilters.criteria || segmentFilters.criteria.length === 0) {
        const { count } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        return count || 0;
      }

      let query = supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      for (const rule of segmentFilters.criteria) {
        if (!rule.value) continue;

        switch (rule.field) {
          case 'group_id':
            if (rule.operator === 'equals') {
              query = query.eq('group_id', rule.value);
            } else if (rule.operator === 'not_equals') {
              query = query.neq('group_id', rule.value);
            }
            break;
          case 'client_type':
            if (rule.operator === 'equals') {
              query = query.eq('client_type', rule.value);
            } else if (rule.operator === 'not_equals') {
              query = query.neq('client_type', rule.value);
            }
            break;
          case 'state':
            if (rule.operator === 'equals') {
              query = query.eq('state', rule.value);
            } else if (rule.operator === 'contains') {
              query = query.ilike('state', `%${rule.value}%`);
            }
            break;
          case 'region':
            if (rule.operator === 'equals') {
              query = query.eq('region', rule.value);
            } else if (rule.operator === 'contains') {
              query = query.ilike('region', `%${rule.value}%`);
            }
            break;
        }
      }

      const { count } = await query;
      return count || 0;
    } catch (error) {
      console.error('Erro ao estimar destinatários:', error);
      return 0;
    }
  };

  return {
    options,
    isLoading,
    estimateRecipients,
    refetch: fetchSegmentationOptions
  };
}
