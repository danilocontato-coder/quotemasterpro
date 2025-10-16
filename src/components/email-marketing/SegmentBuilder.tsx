import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

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

export function SegmentBuilder({ onSegmentChange, estimatedCount }: SegmentBuilderProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');

  const fields = [
    { value: 'type', label: 'Tipo' },
    { value: 'status', label: 'Status' },
    { value: 'region', label: 'Região' },
    { value: 'created_days_ago', label: 'Dias desde criação' },
  ];

  const operators = {
    type: [
      { value: 'equals', label: 'É igual a' },
      { value: 'not_equals', label: 'Não é igual a' },
    ],
    status: [
      { value: 'equals', label: 'É igual a' },
      { value: 'not_equals', label: 'Não é igual a' },
    ],
    region: [
      { value: 'equals', label: 'É igual a' },
      { value: 'contains', label: 'Contém' },
    ],
    created_days_ago: [
      { value: 'less_than', label: 'Menor que' },
      { value: 'greater_than', label: 'Maior que' },
      { value: 'equals', label: 'Igual a' },
    ],
  };

  const addRule = () => {
    const newRule: Rule = {
      id: Math.random().toString(36).substr(2, 9),
      field: 'type',
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
                  {operators[rule.field as keyof typeof operators]?.map(op => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={rule.value}
                onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                placeholder="Valor"
                className="flex-1"
              />

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

        <Button onClick={addRule} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Regra
        </Button>

        {estimatedCount !== undefined && (
          <div className="p-3 bg-accent rounded-lg">
            <p className="text-sm">
              <span className="font-semibold">{estimatedCount}</span> destinatários correspondem aos filtros
            </p>
          </div>
        )}

        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem filtros: todos os contatos ativos receberão esta campanha
          </p>
        )}
      </CardContent>
    </Card>
  );
}