import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContracts } from '@/hooks/useContracts';
import { ContractCard } from '@/components/contracts/ContractCard';
import { ModuleGuard } from '@/components/common/ModuleGuard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CONTRACT_STATUSES } from '@/constants/contracts';

const Contracts = () => {
  const navigate = useNavigate();
  const { contracts, isLoading, deleteContract } = useContracts();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este contrato?')) {
      await deleteContract(id);
    }
  };

  return (
    <ModuleGuard requiredModule="contracts" showUpgradePrompt>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contratos</h1>
            <p className="text-muted-foreground">
              Gerencie todos os seus contratos em um só lugar
            </p>
          </div>
          <Button onClick={() => navigate('/contracts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contrato
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contratos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(CONTRACT_STATUSES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando contratos...</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum contrato encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContracts.map(contract => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onView={(id) => navigate(`/contracts/${id}`)}
                onEdit={(id) => navigate(`/contracts/${id}/edit`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </ModuleGuard>
  );
};

export default Contracts;
