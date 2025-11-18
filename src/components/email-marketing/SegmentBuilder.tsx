import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, X, Users } from 'lucide-react';
import { useClientSegmentation } from '@/hooks/useClientSegmentation';

interface Rule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface SegmentBuilderProps {
  onSegmentChange: (segment: any) => void;
  estimatedCount?: number;
}

export function SegmentBuilder({ onSegmentChange, estimatedCount: externalCount }: SegmentBuilderProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [estimatedCount, setEstimatedCount] = useState<number>(0);
  
  const { options, isLoading, estimateRecipients } = useClientSegmentation();

  const fields = [
    { value: 'group_id', label: '👥 Grupo de Clientes' },
    { value: 'client_type', label: '🏢 Tipo de Cliente' },
    { value: 'state', label: '📍 Estado' },
    { value: 'region', label: '🗺️ Região' },
  ];

  const getOperators = (field: string) => {
    if (field === 'group_id' || field === 'client_type') {
      return [
        { value: 'equals', label: 'É igual a' },
        { value: 'not_equals', label: 'Não é igual a' },
      ];
    }
    return [
      { value: 'equals', label: 'É igual a' },
      { value: 'contains', label: 'Contém' },
    ];
  };

  const getFieldValues = (field: string) => {
    switch (field) {
      case 'group_id':
        return options.clientGroups;
      case 'client_type':
        return options.clientTypes;
      case 'state':
        return options.states;
      case 'region':
        return options.regions;
      default:
        return [];
    }
  };

  useEffect(() => {
    const updateEstimate = async () => {
      const count = await estimateRecipients({ logic, criteria: rules });
      setEstimatedCount(count);
    };
    updateEstimate();
  }, [rules, logic]);

  const addRule = () => {
    const newRule: Rule = {
      id: Math.random().toString(36).substr(2, 9),
      field: 'group_id',
      operator: 'equals',
      value: ''
    };
    const newRules = [...rules, newRule];
    setRules(newRules);
    updateSegment(newRules, logic);
  };

  const removeRule = (id: string) => {
    const newRules = rules.filter(r => r.id !== id);
    setRules(newRules);
    updateSegment(newRules, logic);
  };

  const updateRule = (id: string, field: keyof Rule, value: string) => {
    const newRules = rules.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    );
    setRules(newRules);
    updateSegment(newRules, logic);
  };

  const updateSegment = (currentRules: Rule[], currentLogic: 'AND' | 'OR') => {
    onSegmentChange({
      logic: currentLogic,
      criteria: currentRules.map(r => ({
        field: r.field,
        operator: r.operator,
        value: r.value
      }))
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segmentação de Audiência</CardTitle>
        <p className="text-sm text-muted-foreground">
          Defina quem receberá esta campanha
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Lógica:</span>
          <Select value={logic} onValueChange={(v: 'AND' | 'OR') => {
            setLogic(v);
            updateSegment(rules, v);
          }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">E (AND)</SelectItem>
              <SelectItem value="OR">OU (OR)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div key={rule.id} className="flex gap-2 items-start p-3 border rounded-lg">
              {index > 0 && (
                <Badge variant="secondary" className="mt-2">
                  {logic}
                </Badge>
              )}
              
              <Select value={rule.field} onValueChange={(v) => updateRule(rule.id, 'field', v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fields.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={rule.operator} onValueChange={(v) => updateRule(rule.id, 'operator', v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getOperators(rule.field).map(op => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(rule.field === 'group_id' || rule.field === 'client_type' || 
                rule.field === 'state' || rule.field === 'region') ? (
                <Select value={rule.value} onValueChange={(v) => updateRule(rule.id, 'value', v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getFieldValues(rule.field).map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                  placeholder="Valor"
                  className="flex-1"
                />
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRule(rule.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button onClick={addRule} variant="outline" className="w-full" disabled={isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Regra
        </Button>

        {estimatedCount !== undefined && (
          <Alert className="bg-primary/5 border-primary/20">
            <Users className="h-4 w-4 text-primary" />
            <AlertDescription>
              Esta campanha será enviada para <strong className="text-primary">{estimatedCount} cliente(s)</strong>
            </AlertDescription>
          </Alert>
        )}

        {rules.length === 0 && (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              Sem filtros: a campanha será enviada para <strong>todos os clientes ativos</strong>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}