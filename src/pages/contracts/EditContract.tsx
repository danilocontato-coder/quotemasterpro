import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContractForm } from '@/components/contracts/ContractForm';
import { ModuleGuard } from '@/components/common/ModuleGuard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Contract = Database['public']['Tables']['contracts']['Row'];

const EditContract = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContract = async () => {
      if (!id) {
        navigate('/contracts');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast({
            title: 'Contrato não encontrado',
            description: 'O contrato solicitado não existe',
            variant: 'destructive'
          });
          navigate('/contracts');
          return;
        }

        setContract(data);
      } catch (error: any) {
        console.error('Error fetching contract:', error);
        toast({
          title: 'Erro ao carregar contrato',
          description: error.message,
          variant: 'destructive'
        });
        navigate('/contracts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContract();
  }, [id, navigate, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando contrato...</p>
      </div>
    );
  }

  if (!contract) {
    return null;
  }

  return (
    <ModuleGuard requiredModule="contracts" showUpgradePrompt>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/contracts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Contrato</h1>
            <p className="text-muted-foreground">
              {contract.title}
            </p>
          </div>
        </div>

        <ContractForm mode="edit" contract={contract} />
      </div>
    </ModuleGuard>
  );
};

export default EditContract;
