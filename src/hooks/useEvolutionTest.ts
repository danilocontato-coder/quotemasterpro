import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EvolutionTestResult {
  success: boolean;
  config?: {
    apiUrl: string;
    instance: string | null;
    scope: string;
    hasToken: boolean;
    sendEndpoint: string | null;
  };
  tests?: Array<{
    name: string;
    url: string;
    status?: number;
    ok?: boolean;
    exists?: boolean;
    response?: any;
    error?: string;
  }>;
  sendTest?: {
    endpoint: string;
    phone: string;
    status?: number;
    ok?: boolean;
    response?: any;
    error?: string;
  };
  summary?: {
    totalTests: number;
    workingEndpoints: number;
    recommendedEndpoint: string | null;
    status: 'working' | 'partial' | 'failed';
  };
  error?: string;
}

export function useEvolutionTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EvolutionTestResult | null>(null);
  const { toast } = useToast();

  const testConnection = async (clientId?: string, testPhone?: string) => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🔍 [Evolution Test] Starting test...', { clientId, testPhone });

      const { data, error } = await supabase.functions.invoke('test-evolution-connection', {
        body: { clientId, testPhone }
      });

      if (error) {
        console.error('❌ [Evolution Test] Function error:', error);
        setResult({ success: false, error: error.message });
        toast({
          title: "Erro no teste",
          description: error.message,
          variant: "destructive"
        });
        return null;
      }

      console.log('✅ [Evolution Test] Result:', data);
      setResult(data);

      if (data.success) {
        const status = data.summary?.status;
        if (status === 'working') {
          toast({
            title: "Conexão funcionando!",
            description: `Endpoint recomendado: ${data.summary?.recommendedEndpoint}`,
          });
        } else if (status === 'partial') {
          toast({
            title: "Conexão parcial",
            description: "Alguns endpoints responderam, mas o envio pode não funcionar.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Conexão falhou",
            description: "Nenhum endpoint respondeu corretamente.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Erro",
          description: data.error || "Falha no teste de conexão",
          variant: "destructive"
        });
      }

      return data;
    } catch (error: any) {
      console.error('❌ [Evolution Test] Exception:', error);
      const result = { success: false, error: error.message };
      setResult(result);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    testConnection,
    isLoading,
    result
  };
}
