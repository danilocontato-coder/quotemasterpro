import { useState, useEffect } from 'react';
import { mockClients, Client } from '@/data/mockData';

// Simula o cliente logado atualmente
// Em produção, isso viria do contexto de autenticação/Supabase
const CURRENT_CLIENT_ID = '1'; // Simulando cliente logado

export function useCurrentClient() {
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simula busca do cliente atual
    // Em produção, isso seria uma query do Supabase
    const fetchCurrentClient = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Simula delay de rede
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const client = mockClients.find(c => c.id === CURRENT_CLIENT_ID);
        
        if (!client) {
          throw new Error('Cliente não encontrado');
        }
        
        setCurrentClient(client);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setCurrentClient(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentClient();
  }, []);

  const updateClient = async (updates: Partial<Client>) => {
    if (!currentClient) return;

    try {
      setIsLoading(true);
      
      // Simula atualização no servidor
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedClient = { ...currentClient, ...updates };
      setCurrentClient(updatedClient);
      
      // Em produção, isso seria uma mutation no Supabase
      console.log('Cliente atualizado:', updatedClient);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar cliente');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentClient,
    isLoading,
    error,
    updateClient,
    // Dados derivados para facilitar o uso
    clientName: currentClient?.name || '',
    subscriptionPlan: currentClient?.subscriptionPlan || 'basic',
    clientStatus: currentClient?.status || 'inactive',
  };
}