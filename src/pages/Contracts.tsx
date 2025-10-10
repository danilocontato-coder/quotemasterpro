import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, FileText, CheckCircle, AlertCircle, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useContracts } from '@/hooks/useContracts';
import { ContractCard } from '@/components/contracts/ContractCard';
import { ModuleGuard } from '@/components/common/ModuleGuard';
import { FilterMetricCard } from '@/components/ui/filter-metric-card';
import { ContractFormModal } from '@/components/contracts/ContractFormModal';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CONTRACT_STATUSES } from '@/constants/contracts';
import type { Database } from '@/integrations/supabase/types';

type Contract = Database['public']['Tables']['contracts']['Row'];

const Contracts = () => {
  const navigate = useNavigate();
  const { contracts, isLoading, deleteContract, refreshContracts } = useContracts();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // Calcular métricas
  const metrics = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const total = contracts.length;
    const active = contracts.filter(c => c.status === 'ativo').length;
    
    const dueSoon = contracts.filter(c => {
      if (c.status !== 'ativo') return false;
      const endDate = new Date(c.end_date);
      return endDate > now && endDate <= thirtyDaysFromNow;
    }).length;

    const expired = contracts.filter(c => {
      const endDate = new Date(c.end_date);
      return endDate < now && c.status !== 'expirado' && c.status !== 'cancelado';
    }).length;

    const renewalPending = contracts.filter(c => c.status === 'renovacao_pendente').length;

    const totalValue = contracts
      .filter(c => c.status === 'ativo')
      .reduce((sum, c) => sum + (c.total_value || 0), 0);

    return {
      total,
      active,
      dueSoon,
      expired,
      renewalPending,
      totalValue
    };
  }, [contracts]);

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === 'active') {
      matchesFilter = contract.status === 'ativo';
    } else if (activeFilter === 'due_soon') {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      const endDate = new Date(contract.end_date);
      matchesFilter = contract.status === 'ativo' && endDate > now && endDate <= thirtyDaysFromNow;
    } else if (activeFilter === 'expired') {
      const endDate = new Date(contract.end_date);
      matchesFilter = endDate < new Date() && contract.status !== 'expirado' && contract.status !== 'cancelado';
    } else if (activeFilter === 'renewal_pending') {
      matchesFilter = contract.status === 'renovacao_pendente';
    }
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    return matchesSearch && matchesFilter && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este contrato?')) {
      await deleteContract(id);
    }
  };

  const handleEdit = (id: string) => {
    const contract = contracts.find(c => c.id === id);
    if (contract) {
      setEditingContract(contract);
      setShowFormModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowFormModal(false);
    setEditingContract(null);
  };

  const handleSuccess = () => {
    refreshContracts();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <ModuleGuard requiredModule="contracts" showUpgradePrompt>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
              Contratos
            </h1>
            <p className="text-sm md:text-base text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
              Gerencie todos os seus contratos em um só lugar
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 animate-fade-in w-full" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
            <Button 
              className="btn-corporate flex items-center gap-2 justify-center w-full sm:w-auto sm:ml-auto"
              onClick={() => setShowFormModal(true)}
            >
              <Plus className="h-4 w-4" />
              Novo Contrato
            </Button>
          </div>
        </div>

        {/* Filter Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
          <div className="animate-scale-in" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
            <FilterMetricCard
              title="Total"
              value={metrics.total}
              icon={<FileText />}
              isActive={activeFilter === 'all'}
              onClick={() => setActiveFilter('all')}
              variant="default"
            />
          </div>
          <div className="animate-scale-in" style={{ animationDelay: '0.15s', opacity: 0, animationFillMode: 'forwards' }}>
            <FilterMetricCard
              title="Ativos"
              value={metrics.active}
              icon={<CheckCircle />}
              isActive={activeFilter === 'active'}
              onClick={() => setActiveFilter('active')}
              variant="success"
            />
          </div>
          <div className="animate-scale-in" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
            <FilterMetricCard
              title="A Vencer"
              value={metrics.dueSoon}
              icon={<Clock />}
              isActive={activeFilter === 'due_soon'}
              onClick={() => setActiveFilter('due_soon')}
              variant="warning"
            />
          </div>
          <div className="animate-scale-in" style={{ animationDelay: '0.25s', opacity: 0, animationFillMode: 'forwards' }}>
            <FilterMetricCard
              title="Vencidos"
              value={metrics.expired}
              icon={<AlertCircle />}
              isActive={activeFilter === 'expired'}
              onClick={() => setActiveFilter('expired')}
              variant="destructive"
            />
          </div>
          <div className="animate-scale-in" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
            <FilterMetricCard
              title="Renovação"
              value={metrics.renewalPending}
              icon={<RefreshCw />}
              isActive={activeFilter === 'renewal_pending'}
              onClick={() => setActiveFilter('renewal_pending')}
              variant="default"
            />
          </div>
          <div className="animate-scale-in" style={{ animationDelay: '0.35s', opacity: 0, animationFillMode: 'forwards' }}>
            <div className="relative group cursor-pointer">
              <div className={cn(
                "h-full border rounded-lg p-3 transition-all",
                "bg-primary/5 border-primary/20 hover:border-primary/40"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Valor Total</span>
                  <div className="text-primary/60">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-lg font-bold text-primary">
                  {formatCurrency(metrics.totalValue)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="card-corporate animate-fade-in" style={{ animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
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
          </CardContent>
        </Card>

        {/* Contracts Grid */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando contratos...</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum contrato encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContracts.map((contract, index) => {
                const animationDelay = Math.min(0.5 + (index * 0.05), 1.4);
                return (
                  <div
                    key={contract.id}
                    className="animate-fade-in"
                    style={{ 
                      animationDelay: `${animationDelay}s`,
                      opacity: 0,
                      animationFillMode: 'forwards'
                    }}
                  >
                    <ContractCard
                      contract={contract}
                      onView={(id) => navigate(`/contracts/${id}`)}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ContractFormModal
        open={showFormModal}
        onClose={handleCloseModal}
        editingContract={editingContract}
        onSuccess={handleSuccess}
      />
    </ModuleGuard>
  );
};

export default Contracts;
