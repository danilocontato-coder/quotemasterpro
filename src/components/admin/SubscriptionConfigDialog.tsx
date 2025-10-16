import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

type BillingType = 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';
type BillingCycle = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

interface SubscriptionConfig {
  plan_id: string;
  billing_cycle: BillingCycle;
  billing_day: number;
  first_due_date?: Date;
  billing_type: BillingType;
  auto_billing_enabled: boolean;
  issue_nfse_with_invoice: boolean;
  client_id?: string;
  supplier_id?: string;
}

interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  yearly_price: number;
}

interface SubscriptionConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  supplierId?: string;
  onConfirm: (config: SubscriptionConfig) => Promise<void>;
}

export function SubscriptionConfigDialog({
  open,
  onOpenChange,
  clientId,
  supplierId,
  onConfirm
}: SubscriptionConfigDialogProps) {
  const [config, setConfig] = useState<SubscriptionConfig>({
    plan_id: '',
    billing_cycle: 'monthly' as BillingCycle,
    billing_day: 10,
    billing_type: 'BOLETO' as BillingType,
    auto_billing_enabled: true,
    issue_nfse_with_invoice: true,
    client_id: clientId,
    supplier_id: supplierId
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [firstDueDate, setFirstDueDate] = useState<Date | undefined>();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    await Promise.all([fetchPlans(), loadDefaultSettings()]);
  };

  const fetchPlans = async () => {
    try {
      const response = await supabase
        .from('subscription_plans')
        .select('id, name, monthly_price, yearly_price')
        .order('monthly_price');

      if (response.error) throw response.error;
      
      const planData = response.data?.map(p => ({
        id: p.id,
        name: p.name,
        monthly_price: p.monthly_price || 0,
        yearly_price: p.yearly_price || 0
      })) || [];
      
      setPlans(planData);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos');
    }
  };

  const loadDefaultSettings = async () => {
    try {
      const response = await supabase
        .from('financial_settings')
        .select('billing_day, asaas_billing_type, auto_billing_enabled, issue_nfse_with_invoice')
        .single();

      if (response.error && response.error.code !== 'PGRST116') throw response.error;

      if (response.data) {
        const billingType = (response.data.asaas_billing_type || 'BOLETO') as BillingType;
        
        setConfig(prev => ({
          ...prev,
          billing_day: response.data.billing_day ?? 10,
          billing_type: billingType,
          auto_billing_enabled: response.data.auto_billing_enabled ?? true,
          issue_nfse_with_invoice: response.data.issue_nfse_with_invoice ?? true
        }));
      }
    } catch (error) {
      console.error('Error loading default settings:', error);
    }
  };

  const handleConfirm = async () => {
    if (!config.plan_id) {
      toast.error('Selecione um plano');
      return;
    }

    setIsLoading(true);
    try {
      const finalConfig: SubscriptionConfig = {
        ...config,
        first_due_date: firstDueDate,
        client_id: clientId,
        supplier_id: supplierId
      };

      await onConfirm(finalConfig);
      onOpenChange(false);
      toast.success('Assinatura configurada com sucesso');
    } catch (error) {
      console.error('Error configuring subscription:', error);
      toast.error('Erro ao configurar assinatura');
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = <K extends keyof SubscriptionConfig>(
    key: K,
    value: SubscriptionConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Assinatura</DialogTitle>
          <DialogDescription>
            Configure os parâmetros de cobrança e faturamento para a nova assinatura
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seleção de Plano */}
          <div className="space-y-2">
            <Label htmlFor="plan">Plano *</Label>
            <Select value={config.plan_id} onValueChange={(val) => updateConfig('plan_id', val)}>
              <SelectTrigger id="plan">
                <SelectValue placeholder="Selecione um plano" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => {
                  const displayPrice = config.billing_cycle === 'annual' ? plan.yearly_price : plan.monthly_price;
                  const cycle = config.billing_cycle === 'annual' ? 'ano' : 'mês';
                  return (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - R$ {displayPrice.toFixed(2)}/{cycle}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Ciclo de Cobrança */}
          <div className="space-y-2">
            <Label htmlFor="billing-cycle">Ciclo de Cobrança</Label>
            <Select 
              value={config.billing_cycle} 
              onValueChange={(val) => updateConfig('billing_cycle', val as BillingCycle)}
            >
              <SelectTrigger id="billing-cycle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="semiannual">Semestral</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data de Vencimento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing-day">Dia de Vencimento Padrão</Label>
              <Input
                id="billing-day"
                type="number"
                min="1"
                max="28"
                value={config.billing_day}
                onChange={(e) => updateConfig('billing_day', parseInt(e.target.value) || 10)}
              />
              <p className="text-xs text-muted-foreground">
                Dia do mês para vencimento (1-28)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Primeiro Vencimento (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !firstDueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {firstDueDate ? format(firstDueDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={firstDueDate}
                    onSelect={setFirstDueDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Se não definir, usa o dia padrão
              </p>
            </div>
          </div>

          {/* Tipo de Cobrança */}
          <div className="space-y-2">
            <Label htmlFor="billing-type">Tipo de Cobrança</Label>
            <Select 
              value={config.billing_type} 
              onValueChange={(val) => updateConfig('billing_type', val as BillingType)}
            >
              <SelectTrigger id="billing-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                <SelectItem value="UNDEFINED">Cliente Escolhe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Opções de Automação */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="auto-billing" className="text-base">Cobrança Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Gerar cobranças automaticamente a cada ciclo
                </p>
              </div>
              <Switch
                id="auto-billing"
                checked={config.auto_billing_enabled}
                onCheckedChange={(checked) => updateConfig('auto_billing_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="nfse-with-invoice" className="text-base">Emitir NFS-e com Boleto</Label>
                <p className="text-sm text-muted-foreground">
                  Gerar NFS-e junto com a cobrança (ideal para condomínios)
                </p>
              </div>
              <Switch
                id="nfse-with-invoice"
                checked={config.issue_nfse_with_invoice}
                onCheckedChange={(checked) => updateConfig('issue_nfse_with_invoice', checked)}
              />
            </div>
          </div>

          {config.issue_nfse_with_invoice && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A NFS-e será emitida automaticamente junto com cada cobrança. Certifique-se de que as configurações fiscais estão corretas em Configurações → Faturamento.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !config.plan_id}>
            {isLoading ? 'Criando...' : 'Criar Assinatura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
