import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, CreditCard, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface PaymentCondition {
  type: 'a_vista' | 'parcelado';
  installments: {
    number: number;
    days: number;
    percentage: number;
  }[];
  description: string;
}

interface PaymentConditionTemplate {
  id: string;
  name: string;
  description: string;
  conditions: PaymentCondition;
  is_system: boolean;
}

interface PaymentConditionsSelectProps {
  value?: PaymentCondition;
  onChange: (condition: PaymentCondition) => void;
  totalAmount?: number;
}

export function PaymentConditionsSelect({
  value,
  onChange,
  totalAmount = 0
}: PaymentConditionsSelectProps) {
  const [templates, setTemplates] = useState<PaymentConditionTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_condition_templates')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error loading templates:', error);
        // Fallback to default templates if RLS blocks
        setTemplates(getDefaultTemplates());
        return;
      }

      const formattedTemplates: PaymentConditionTemplate[] = (data || []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        conditions: t.conditions as unknown as PaymentCondition,
        is_system: t.is_system
      }));

      setTemplates(formattedTemplates.length > 0 ? formattedTemplates : getDefaultTemplates());
    } catch (error) {
      console.error('Error in loadTemplates:', error);
      setTemplates(getDefaultTemplates());
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultTemplates = (): PaymentConditionTemplate[] => [
    {
      id: 'default-avista',
      name: 'À Vista',
      description: 'Pagamento integral no ato',
      conditions: { type: 'a_vista', installments: [{ number: 1, days: 0, percentage: 100 }], description: 'À Vista' },
      is_system: true
    },
    {
      id: 'default-30dias',
      name: '30 Dias',
      description: 'Pagamento em 30 dias',
      conditions: { type: 'a_vista', installments: [{ number: 1, days: 30, percentage: 100 }], description: '30 Dias' },
      is_system: true
    },
    {
      id: 'default-7-14-21',
      name: '7/14/21 Dias',
      description: 'Parcelamento em 3x',
      conditions: { 
        type: 'parcelado', 
        installments: [
          { number: 1, days: 7, percentage: 33.33 },
          { number: 2, days: 14, percentage: 33.33 },
          { number: 3, days: 21, percentage: 33.34 }
        ], 
        description: '7/14/21 Dias' 
      },
      is_system: true
    },
    {
      id: 'default-30-60-90',
      name: '30/60/90 Dias',
      description: 'Parcelamento em 3x',
      conditions: { 
        type: 'parcelado', 
        installments: [
          { number: 1, days: 30, percentage: 33.33 },
          { number: 2, days: 60, percentage: 33.33 },
          { number: 3, days: 90, percentage: 33.34 }
        ], 
        description: '30/60/90 Dias' 
      },
      is_system: true
    }
  ];

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onChange(template.conditions);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const calculateInstallmentAmount = (percentage: number): number => {
    return (totalAmount * percentage) / 100;
  };

  const getInstallmentDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label className="font-medium">Condições de Pagamento</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Defina as condições de pagamento que serão aceitas pelo cliente.
                Ao selecionar parcelamento, o sistema gerará cobranças separadas para cada parcela.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Select 
        value={selectedTemplateId} 
        onValueChange={handleTemplateChange}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione as condições de pagamento"} />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{template.name}</span>
                {template.conditions.type === 'parcelado' && (
                  <Badge variant="secondary" className="text-xs">
                    {template.conditions.installments.length}x
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Preview das parcelas */}
      {value && value.installments.length > 0 && totalAmount > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Cronograma de Pagamento
            </div>
            <div className="space-y-2">
              {value.installments.map((installment, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between text-sm p-2 bg-background rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-8 justify-center">
                      {installment.number}
                    </Badge>
                    <span className="text-muted-foreground">
                      {installment.days === 0 
                        ? 'À vista' 
                        : `${installment.days} dias (${getInstallmentDate(installment.days)})`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {installment.percentage.toFixed(1)}%
                    </span>
                    <span className="font-medium">
                      {formatCurrency(calculateInstallmentAmount(installment.percentage))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">{formatCurrency(totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
