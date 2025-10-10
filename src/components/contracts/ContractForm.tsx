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
import { CalendarIcon, Loader2, Save, X, FileText, DollarSign, AlertCircle, Upload, FileCheck } from 'lucide-react';
import { format, addMonths, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CONTRACT_TYPES, CONTRACT_STATUSES } from '@/constants/contracts';
import type { Database } from '@/integrations/supabase/types';

type Contract = Database['public']['Tables']['contracts']['Row'];
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];

// Opções de duração de contrato
const CONTRACT_DURATIONS = [
  { value: '6m', label: '6 meses', months: 6 },
  { value: '1y', label: '1 ano', months: 12 },
  { value: '2y', label: '2 anos', months: 24 },
  { value: '3y', label: '3 anos', months: 36 },
  { value: '5y', label: '5 anos', months: 60 },
  { value: 'custom', label: 'Período personalizado', months: 0 }
];

// Opções de periodicidade de pagamento
const PAYMENT_FREQUENCIES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'one_time', label: 'Pagamento Único' }
];

// Schema de validação
const contractSchema = z.object({
  title: z.string().trim().min(3, 'Título deve ter no mínimo 3 caracteres').max(200, 'Título muito longo'),
  contract_type: z.string().min(1, 'Tipo é obrigatório'),
  supplier_id: z.string().uuid('Fornecedor é obrigatório'),
  description: z.string().max(2000, 'Descrição muito longa').optional(),
  start_date: z.date(),
  end_date: z.date(),
  total_value: z.number().min(0, 'Valor deve ser positivo'),
  payment_terms: z.string().max(500, 'Termos de pagamento muito longos').optional(),
  payment_frequency: z.string().min(1, 'Periodicidade é obrigatória'),
  status: z.string().min(1, 'Status é obrigatório'),
  cost_center_id: z.string().uuid().optional().nullable(),
  alert_days_before: z.number().min(0).max(365).optional(),
  auto_renewal: z.boolean().optional(),
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
  const [contractDuration, setContractDuration] = useState('custom');
  const [attachments, setAttachments] = useState<string[]>(() => {
    if (contract?.attachments && Array.isArray(contract.attachments)) {
      return contract.attachments.filter((item): item is string => typeof item === 'string');
    }
    return [];
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  const [formData, setFormData] = useState({
    title: contract?.title || '',
    contract_type: contract?.contract_type || 'fornecimento',
    supplier_id: contract?.supplier_id || '',
    description: contract?.description || '',
    start_date: contract?.start_date ? new Date(contract.start_date) : undefined,
    end_date: contract?.end_date ? new Date(contract.end_date) : undefined,
    total_value: contract?.total_value || 0,
    payment_terms: contract?.payment_terms || '',
    payment_frequency: contract?.payment_frequency || 'monthly',
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

  const handleDurationChange = (duration: string) => {
    setContractDuration(duration);
    
    if (duration !== 'custom' && formData.start_date) {
      const selectedDuration = CONTRACT_DURATIONS.find(d => d.value === duration);
      if (selectedDuration && selectedDuration.months > 0) {
        const endDate = addMonths(formData.start_date, selectedDuration.months);
        setFormData(prev => ({ ...prev, end_date: endDate }));
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Apenas arquivos PDF são permitidos',
        variant: 'destructive'
      });
      return;
    }

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 10MB',
        variant: 'destructive'
      });
      return;
    }

    setUploadingFile(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Fazer upload
      const { data, error } = await supabase.storage
        .from('contract-attachments')
        .upload(fileName, file);

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('contract-attachments')
        .getPublicUrl(data.path);

      setAttachments(prev => [...prev, publicUrl]);
      
      toast({
        title: 'Arquivo enviado',
        description: 'PDF anexado com sucesso'
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erro ao enviar arquivo',
        description: error.message || 'Verifique se o bucket contract-attachments existe',
        variant: 'destructive'
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

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

      const contractData: any = {
        title: formData.title.trim(),
        contract_type: formData.contract_type,
        supplier_id: formData.supplier_id,
        client_id: profile.client_id,
        description: formData.description?.trim() || null,
        start_date: formData.start_date!.toISOString(),
        end_date: formData.end_date!.toISOString(),
        total_value: formData.total_value,
        payment_terms: formData.payment_terms?.trim() || null,
        payment_frequency: formData.payment_frequency,
        status: formData.status,
        cost_center_id: formData.cost_center_id || null,
        alert_days_before: formData.alert_days_before || 30,
        auto_renewal: formData.auto_renewal || false,
        attachments: attachments,
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
        // ID será gerado automaticamente pelo trigger
        const { error } = await supabase
          .from('contracts')
          .insert(contractData);

        if (error) throw error;

        toast({
          title: 'Contrato criado',
          description: 'Contrato criado com sucesso com código automático'
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
          {mode === 'edit' && contract && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Código do Contrato: <span className="font-bold">{contract.id}</span></p>
            </div>
          )}
          
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
          <div className="space-y-2">
            <Label htmlFor="contract_duration">Duração do Contrato</Label>
            <Select value={contractDuration} onValueChange={handleDurationChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a duração" />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_DURATIONS.map(duration => (
                  <SelectItem key={duration.value} value={duration.value}>
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Escolha uma duração pré-definida ou personalizada
            </p>
          </div>

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
                    onSelect={(date) => {
                      setFormData({ ...formData, start_date: date });
                      // Recalcular data final se houver duração selecionada
                      if (date && contractDuration !== 'custom') {
                        const selectedDuration = CONTRACT_DURATIONS.find(d => d.value === contractDuration);
                        if (selectedDuration && selectedDuration.months > 0) {
                          const endDate = addMonths(date, selectedDuration.months);
                          setFormData(prev => ({ ...prev, end_date: endDate }));
                        }
                      }
                    }}
                    initialFocus
                    locale={ptBR}
                    className="pointer-events-auto"
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
                    disabled={contractDuration !== 'custom'}
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
                    disabled={(date) => formData.start_date ? date < formData.start_date : false}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {errors.end_date && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.end_date}
                </p>
              )}
              {contractDuration !== 'custom' && (
                <p className="text-xs text-muted-foreground">
                  Data calculada automaticamente com base na duração selecionada
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
              <Label htmlFor="payment_frequency">
                Periodicidade de Pagamento <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={formData.payment_frequency} 
                onValueChange={(value) => setFormData({ ...formData, payment_frequency: value })}
              >
                <SelectTrigger className={errors.payment_frequency ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione a periodicidade" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_FREQUENCIES.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.payment_frequency && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.payment_frequency}
                </p>
              )}
            </div>
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
            <Label>Anexos (PDF)</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                  id="pdf-upload"
                />
                <Label
                  htmlFor="pdf-upload"
                  className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-accent transition-colors"
                >
                  {uploadingFile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingFile ? 'Enviando...' : 'Anexar PDF'}
                </Label>
                <p className="text-xs text-muted-foreground">Máximo 10MB</p>
              </div>
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((url, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm truncate">
                          Anexo {index + 1}.pdf
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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