import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContractForm } from '@/components/contracts/ContractForm';
import { ModuleGuard } from '@/components/common/ModuleGuard';

const NewContract = () => {
  const navigate = useNavigate();

  return (
    <ModuleGuard requiredModule="contracts" showUpgradePrompt>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/contracts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Novo Contrato</h1>
            <p className="text-muted-foreground">
              Preencha as informações para criar um novo contrato
            </p>
          </div>
        </div>

        <ContractForm mode="create" />
      </div>
    </ModuleGuard>
  );
};

export default NewContract;
