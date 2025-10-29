import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mapCategoriesToSpecialties } from '@/utils/categoryMapping';

interface SuggestedSupplier {
  supplier_id: string;
  name: string;
  region: string;
  state: string;
  city: string;
  specialties: string[];
  is_certified: boolean;
  visibility_scope: string;
  rating: number;
  match_score: number;
}

interface SystemSettings {
  max_suppliers_per_quote: number;
  max_certified_suppliers_priority: number;
}

export function useSupplierSuggestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedSupplier[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    max_suppliers_per_quote: 10,
    max_certified_suppliers_priority: 5
  });

  // Carregar configurações do sistema
  const loadSystemSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'supplier_limits')
        .single();

      if (error) {
        console.error('Erro ao carregar configurações:', error);
        return;
      }

      if (data?.setting_value) {
        const settings = data.setting_value as any;
        if (settings && typeof settings === 'object' && settings.max_suppliers_per_quote) {
          setSystemSettings({
            max_suppliers_per_quote: settings.max_suppliers_per_quote || 10,
            max_certified_suppliers_priority: settings.max_certified_suppliers_priority || 5
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }, []);

  // Atualizar configurações do sistema
  const updateSystemSettings = useCallback(async (newSettings: Partial<SystemSettings>) => {
    try {
      const updatedSettings = { ...systemSettings, ...newSettings };
      
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          setting_value: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'supplier_limits');

      if (error) throw error;

      setSystemSettings(updatedSettings);
      toast.success('Configurações atualizadas com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      toast.error('Erro ao atualizar configurações');
    }
  }, [systemSettings]);

  // Sugerir fornecedores para cotação
  const suggestSuppliers = useCallback(async (
    clientRegion: string,
    clientState: string,
    clientCity: string,
    categories: string[]
  ) => {
    try {
      setIsLoading(true);
      
      // Expandir categorias para incluir especialidades equivalentes
      const expandedCategories = mapCategoriesToSpecialties(categories);
      
      console.log('🔍 Buscando fornecedores:', {
        original_categories: categories,
        expanded_categories: expandedCategories,
        region: clientRegion,
        state: clientState,
        city: clientCity
      });
      
      const { data, error } = await supabase.rpc('suggest_suppliers_for_quote', {
        _client_region: clientRegion,
        _client_state: clientState,
        _client_city: clientCity,
        _categories: expandedCategories,
        _max_suppliers: systemSettings.max_suppliers_per_quote
      });

      if (error) throw error;

      const typedData = data as SuggestedSupplier[];
      
      console.log('✅ Fornecedores sugeridos:', {
        count: typedData?.length || 0,
        suppliers: typedData?.map(s => ({
          name: s.name,
          specialties: s.specialties,
          match_score: s.match_score,
          is_certified: s.is_certified
        }))
      });
      
      setSuggestions(typedData || []);
      
      return typedData || [];
    } catch (error) {
      console.error('❌ Erro ao buscar sugestões:', error);
      toast.error('Erro ao buscar sugestões de fornecedores');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [systemSettings.max_suppliers_per_quote]);

  // Obter fornecedores certificados prioritários
  const getCertifiedSuppliers = useCallback(async (
    clientRegion: string,
    clientState: string,
    categories: string[]
  ) => {
    try {
      const allSuggestions = await suggestSuppliers(clientRegion, clientState, '', categories);
      
      // Filtrar apenas certificados e aplicar limite de prioridade
      const certified = allSuggestions
        .filter(s => s.is_certified)
        .slice(0, systemSettings.max_certified_suppliers_priority);
      
      return certified;
    } catch (error) {
      console.error('Erro ao buscar fornecedores certificados:', error);
      return [];
    }
  }, [suggestSuppliers, systemSettings.max_certified_suppliers_priority]);

  return {
    suggestions,
    isLoading,
    systemSettings,
    loadSystemSettings,
    updateSystemSettings,
    suggestSuppliers,
    getCertifiedSuppliers
  };
}