import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PAYMENT_FREQUENCIES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'one_time', label: 'Pagamento Único' }
];

interface ValuesStepProps {
  data: any;
  errors: Record<string, string>;
  onChange: (field: string, value: any) => void;
}

export function ValuesStep({ data, errors, onChange }: ValuesStepProps) {
  const [costCenters, setCostCenters] = useState<any[]>([]);

  useEffect(() => {
    const loadCostCenters = async () => {
      const { data: costCentersData } = await supabase
        .from('cost_centers')
        .select('id, name, code')
        .eq('active', true)
        .order('name');
      
      if (costCentersData) setCostCenters(costCentersData);
    };

    loadCostCenters();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-3 bg-primary/10 rounded-lg">
          <DollarSign className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Valores e Pagamento</h3>
          <p className="text-sm text-muted-foreground">
            Informações financeiras do contrato
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="total_value">
            Valor Total do Contrato <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="total_value"
              type="number"
              min="0"
              step="0.01"
              value={data.total_value || ''}
              onChange={(e) => onChange('total_value', parseFloat(e.target.value) || 0)}
              placeholder="0,00"
              className={cn('pl-10', errors.total_value && 'border-destructive')}
            />
          </div>
          {errors.total_value && (
            <p className="text-sm text-destructive">{errors.total_value}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_frequency">
            Periodicidade de Pagamento <span className="text-destructive">*</span>
          </Label>
          <Select value={data.payment_frequency} onValueChange={(value) => onChange('payment_frequency', value)}>
            <SelectTrigger className={errors.payment_frequency ? 'border-destructive' : ''}>
              <SelectValue placeholder="Selecione a periodicidade" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_FREQUENCIES.map((freq) => (
                <SelectItem key={freq.value} value={freq.value}>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {freq.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.payment_frequency && (
            <p className="text-sm text-destructive">{errors.payment_frequency}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="payment_terms">Termos de Pagamento</Label>
          <Textarea
            id="payment_terms"
            value={data.payment_terms}
            onChange={(e) => onChange('payment_terms', e.target.value)}
            placeholder="Ex: Pagamento todo dia 10 de cada mês via transferência bancária..."
            rows={4}
            className={errors.payment_terms ? 'border-destructive' : ''}
          />
          {errors.payment_terms && (
            <p className="text-sm text-destructive">{errors.payment_terms}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Máximo 500 caracteres
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cost_center_id">Centro de Custo (opcional)</Label>
          <Select 
            value={data.cost_center_id || 'none'} 
            onValueChange={(value) => onChange('cost_center_id', value === 'none' ? null : value)}
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
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
