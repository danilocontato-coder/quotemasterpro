import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface AdministradoraContextType {
  currentClientId: string | null;
  setCurrentClientId: (id: string | null) => void;
  condominios: Condominio[];
  isLoading: boolean;
  adminClientId: string | null;
}

interface Condominio {
  id: string;
  name: string;
  cnpj: string;
  activeQuotes: number;
  status: string;
}

const AdministradoraContext = createContext<AdministradoraContextType | undefined>(undefined);

export const AdministradoraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentClientId, setCurrentClientId] = useState<string | null>('all');
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminClientId, setAdminClientId] = useState<string | null>(null);

  useEffect(() => {
    const loadCondominios = async () => {
      if (!user) return;

      try {
        // Buscar client_id do perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user.id)
          .single();

        if (!profile?.client_id) return;

        setAdminClientId(profile.client_id);

        // Buscar condomínios vinculados
        const { data: condominiosData, error } = await supabase
          .from('clients')
          .select(`
            id,
            name,
            cnpj,
            status
          `)
          .eq('parent_client_id', profile.client_id)
          .eq('client_type', 'condominio_vinculado')
          .order('name');

        if (error) throw error;

        // Buscar contagem de cotações ativas para cada condomínio
        const condominiosWithQuotes = await Promise.all(
          (condominiosData || []).map(async (condo) => {
            const { count } = await supabase
              .from('quotes')
              .select('*', { count: 'exact', head: true })
              .eq('on_behalf_of_client_id', condo.id)
              .in('status', ['draft', 'sent', 'under_review']);

            return {
              ...condo,
              activeQuotes: count || 0
            };
          })
        );

        setCondominios(condominiosWithQuotes);
      } catch (error) {
        console.error('Erro ao carregar condomínios:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCondominios();
  }, [user]);

  return (
    <AdministradoraContext.Provider
      value={{
        currentClientId,
        setCurrentClientId,
        condominios,
        isLoading,
        adminClientId
      }}
    >
      {children}
    </AdministradoraContext.Provider>
  );
};

export const useAdministradora = () => {
  const context = useContext(AdministradoraContext);
  if (context === undefined) {
    throw new Error('useAdministradora must be used within AdministradoraProvider');
  }
  return context;
};
