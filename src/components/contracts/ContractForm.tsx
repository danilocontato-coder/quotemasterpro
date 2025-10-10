import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Save, X, FileText, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CONTRACT_TYPES, CONTRACT_STATUSES } from '@/constants/contracts';
import type { Database } from '@/integrations/supabase/types';

type Contract = Database['public']['Tables']['contracts']['Row'];
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];

// Schema de validação
const contractSchema = z.object({
  title: z.string().trim().min(3, 'Título deve ter no mínimo 3 caracteres').max(200, 'Título muito longo'),
  contract_number: z.string().trim().min(1, 'Número do contrato é obrigatório').max(50, 'Número muito longo'),
  contract_type: z.string().min(1, 'Tipo é obrigatório'),
  supplier_id: z.string().uuid('Fornecedor é obrigatório'),
  description: z.string().max(2000, 'Descrição muito longa').optional(),
  start_date: z.date(),
  end_date: z.date(),
  total_value: z.number().min(0, 'Valor deve ser positivo'),
  payment_terms: z.string().max(500, 'Termos de pagamento muito longos').optional(),
  status: z.string().min(1, 'Status é obrigatório'),
  cost_center_id: z.string().uuid().optional().nullable(),
  alert_days_before: z.number().min(0).max(365).optional(),
  auto_renewal: z.boolean().optional(),
  attachments: z.array(z.string()).optional(),
});

interface ContractFormProps {
  contract?: Contract;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
}

export const ContractForm = ({ contract, mode, onSuccess }: ContractFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: contract?.title || '',
    contract_number: contract?.contract_number || '',
    contract_type: contract?.contract_type || 'fornecimento',
    supplier_id: contract?.supplier_id || '',
    description: contract?.description || '',
    start_date: contract?.start_date ? new Date(contract.start_date) : undefined,
    end_date: contract?.end_date ? new Date(contract.end_date) : undefined,
    total_value: contract?.total_value || 0,
    payment_terms: contract?.payment_terms || '',
    status: contract?.status || 'rascunho',
    cost_center_id: contract?.cost_center_id || null,
    alert_days_before: contract?.alert_days_before || 30,
    auto_renewal: contract?.auto_renewal || false,
  });

  // Carregar fornecedores e centros de custo
  useEffect(() => {
    const loadData = async () => {
      try {
        const [suppliersRes, costCentersRes] = await Promise.all([
          supabase.from('suppliers').select('id, name').eq('status', 'active').order('name'),
          supabase.from('cost_centers').select('id, name, code').eq('active', true).order('name')
        ]);

        if (suppliersRes.data) setSuppliers(suppliersRes.data);
        if (costCentersRes.data) setCostCenters(costCentersRes.data);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  const validateForm = () => {
    try {
      contractSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0].toString()] = issue.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Erro de validação',
        description: 'Verifique os campos obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar client_id do perfil do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (!profile?.client_id) throw new Error('Cliente não encontrado');

      // Gerar ID único para novo contrato
      let contractId = contract?.id;
      if (!contractId) {
        const { data: idData } = await supabase.rpc('next_contract_id_by_client', {
          p_client_id: profile.client_id,
          prefix: 'CTR'
        });
        contractId = idData || `CTR-${Date.now()}`;
      }

      const contractData: ContractInsert = {
        id: contractId,
        title: formData.title.trim(),
        contract_number: formData.contract_number.trim(),
        contract_type: formData.contract_type,
        supplier_id: formData.supplier_id,
        client_id: profile.client_id,
        description: formData.description?.trim() || null,
        start_date: formData.start_date!.toISOString(),
        end_date: formData.end_date!.toISOString(),
        total_value: formData.total_value,
        payment_terms: formData.payment_terms?.trim() || null,
        status: formData.status,
        cost_center_id: formData.cost_center_id || null,
        alert_days_before: formData.alert_days_before || 30,
        auto_renewal: formData.auto_renewal || false,
        created_by: user.id,
      };

      if (mode === 'edit' && contract) {
        const { error } = await supabase
          .from('contracts')
          .update(contractData)
          .eq('id', contract.id);

        if (error) throw error;

        toast({
          title: 'Contrato atualizado',
          description: 'Contrato atualizado com sucesso'
        });
      } else {
        const { error } = await supabase
          .from('contracts')
          .insert(contractData);

        if (error) throw error;

        toast({
          title: 'Contrato criado',
          description: 'Contrato criado com sucesso'
        });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/contracts');
      }
    } catch (error: any) {
      console.error('Error saving contract:', error);
      toast({
        title: 'Erro ao salvar contrato',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título do Contrato <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Contrato de Fornecimento de Material"
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_number">
                Número do Contrato <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contract_number"
                value={formData.contract_number}
                onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                placeholder="Ex: CTR-2025-001"
                className={errors.contract_number ? 'border-destructive' : ''}
              />
              {errors.contract_number && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.contract_number}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_type">
                Tipo de Contrato <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.contract_type} onValueChange={(value) => setFormData({ ...formData, contract_type: value })}>
                <SelectTrigger className={errors.contract_type ? 'border-destructive' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.contract_type && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.contract_type}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_id">
                Fornecedor <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.supplier_id} onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}>
                <SelectTrigger className={errors.supplier_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplier_id && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.supplier_id}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o objeto do contrato..."
              rows={4}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vigência e Valores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Vigência e Valores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Data de Início <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.start_date && "text-muted-foreground",
                      errors.start_date && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(formData.start_date, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date}
                    onSelect={(date) => setFormData({ ...formData, start_date: date })}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              {errors.start_date && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.start_date}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Data de Término <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.end_date && "text-muted-foreground",
                      errors.end_date && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_date ? format(formData.end_date, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.end_date}
                    onSelect={(date) => setFormData({ ...formData, end_date: date })}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              {errors.end_date && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.end_date}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_value">
                Valor do Contrato (R$) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="total_value"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_value}
                onChange={(e) => setFormData({ ...formData, total_value: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className={errors.total_value ? 'border-destructive' : ''}
              />
              {errors.total_value && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.total_value}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_STATUSES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_terms">Termos de Pagamento</Label>
            <Textarea
              id="payment_terms"
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              placeholder="Ex: Pagamento mensal até o dia 10"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost_center_id">Centro de Custo (opcional)</Label>
            <Select 
              value={formData.cost_center_id || 'none'} 
              onValueChange={(value) => setFormData({ ...formData, cost_center_id: value === 'none' ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um centro de custo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {costCenters.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alert_days_before">Aviso de Renovação (dias)</Label>
              <Input
                id="alert_days_before"
                type="number"
                min="0"
                max="365"
                value={formData.alert_days_before}
                onChange={(e) => setFormData({ ...formData, alert_days_before: parseInt(e.target.value) || 30 })}
              />
              <p className="text-xs text-muted-foreground">
                Número de dias antes do vencimento para enviar alerta
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auto_renewal" className="flex items-center gap-2">
                <input
                  id="auto_renewal"
                  type="checkbox"
                  checked={formData.auto_renewal}
                  onChange={(e) => setFormData({ ...formData, auto_renewal: e.target.checked })}
                  className="rounded"
                />
                Renovação Automática
              </Label>
              <p className="text-xs text-muted-foreground">
                Marque para renovar automaticamente ao vencimento
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {mode === 'create' ? 'Criar Contrato' : 'Salvar Alterações'}
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate('/contracts')}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
      </div>
    </form>
  );
};
