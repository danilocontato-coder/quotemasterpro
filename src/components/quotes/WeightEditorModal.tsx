import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WeightConfig, validateWeights, DEFAULT_WEIGHT_TEMPLATES } from '@/utils/decisionMatrixCalculator';
import { DollarSign, Clock, Package, Shield, Star, Zap, AlertCircle, Check, HelpCircle } from 'lucide-react';
import { useDecisionMatrixTemplates } from '@/hooks/useDecisionMatrixTemplates';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WeightEditorModalProps {
  open: boolean;
  onClose: () => void;
  initialWeights: WeightConfig;
  onSave: (weights: WeightConfig, templateId?: string) => void;
}

export const WeightEditorModal: React.FC<WeightEditorModalProps> = ({
  open,
  onClose,
  initialWeights,
  onSave
}) => {
  const [weights, setWeights] = useState<WeightConfig>(initialWeights);
  const [savingAsTemplate, setSavingAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const { templates, createTemplate } = useDecisionMatrixTemplates();
  const { toast } = useToast();

  useEffect(() => {
    setWeights(initialWeights);
  }, [initialWeights, open]);

  const totalWeight = Object.values(weights).reduce((sum, val) => sum + val, 0);
  const isValid = validateWeights(weights);

  const redistributeWeights = (
    changedKey: keyof WeightConfig, 
    newValue: number, 
    currentWeights: WeightConfig
  ): WeightConfig => {
    const keys = Object.keys(currentWeights) as Array<keyof WeightConfig>;
    const otherKeys = keys.filter(k => k !== changedKey);
    
    // Calcular quanto sobra para os outros
    const remaining = 100 - newValue;
    
    // Soma atual dos outros pesos
    const otherSum = otherKeys.reduce((sum, key) => sum + currentWeights[key], 0);
    
    if (otherSum === 0) {
      // Se todos outros são zero, distribuir igualmente
      const equalShare = remaining / otherKeys.length;
      const result = { ...currentWeights, [changedKey]: newValue };
      otherKeys.forEach(key => result[key] = Math.round(equalShare * 10) / 10);
      return result;
    }
    
    // Redistribuir proporcionalmente
    const factor = remaining / otherSum;
    const result = { ...currentWeights, [changedKey]: newValue };
    
    otherKeys.forEach(key => {
      result[key] = Math.round(currentWeights[key] * factor * 10) / 10;
    });
    
    // Ajustar arredondamento para somar exatamente 100
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    const diff = 100 - sum;
    if (Math.abs(diff) > 0.01) {
      // Adicionar diferença ao maior peso (exceto o alterado)
      const largestOtherKey = otherKeys.reduce((max, key) => 
        result[key] > result[max] ? key : max
      );
      result[largestOtherKey] += diff;
      result[largestOtherKey] = Math.round(result[largestOtherKey] * 10) / 10;
    }
    
    return result;
  };

  const handleWeightChange = (key: keyof WeightConfig, value: number) => {
    const newWeights = redistributeWeights(key, value, weights);
    setWeights(newWeights);
  };

  const handlePresetSelect = (preset: keyof typeof DEFAULT_WEIGHT_TEMPLATES) => {
    setWeights(DEFAULT_WEIGHT_TEMPLATES[preset]);
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template && template.weights) {
      // Converter template antigo (com sla) para novo formato (com deliveryScore)
      const weights = template.weights as any;
      if ('sla' in weights && !('deliveryScore' in weights)) {
        weights.deliveryScore = weights.sla;
        delete weights.sla;
      }
      setWeights(weights as WeightConfig);
    }
  };

  const handleSave = () => {
    if (!isValid) {
      toast({
        title: 'Pesos inválidos',
        description: 'A soma dos pesos deve ser exatamente 100%',
        variant: 'destructive'
      });
      return;
    }
    onSave(weights);
    onClose();
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite um nome para o template',
        variant: 'destructive'
      });
      return;
    }

    if (!isValid) {
      toast({
        title: 'Pesos inválidos',
        description: 'A soma dos pesos deve ser exatamente 100%',
        variant: 'destructive'
      });
      return;
    }

    createTemplate({
      name: templateName,
      description: templateDescription,
      weights: weights as any
    });

    setTemplateName('');
    setTemplateDescription('');
    setSavingAsTemplate(false);
    onSave(weights);
    onClose();
  };

  const weightItems = [
    { key: 'price' as const, label: 'Preço', icon: DollarSign, color: 'text-green-600' },
    { key: 'deliveryTime' as const, label: 'Prazo de Entrega', icon: Clock, color: 'text-blue-600' },
    { key: 'shippingCost' as const, label: 'Custo de Frete', icon: Package, color: 'text-orange-600' },
    { key: 'warranty' as const, label: 'Garantia', icon: Shield, color: 'text-purple-600' },
    { key: 'deliveryScore' as const, label: 'Pontualidade', icon: Zap, color: 'text-cyan-600', tooltip: 'Baseado no histórico de entregas no prazo' },
    { key: 'reputation' as const, label: 'Reputação', icon: Star, color: 'text-amber-600' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>⚙️ Personalizar Pesos da Matriz de Decisão</DialogTitle>
          <DialogDescription>
            Ajuste a importância de cada critério. A soma deve ser exatamente 100%.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Presets */}
          <div>
            <Label className="mb-2 block">Templates Rápidos</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePresetSelect('equilibrado')}
              >
                Equilibrado
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePresetSelect('focoPreco')}
              >
                Foco em Preço
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePresetSelect('focoQualidade')}
              >
                Foco em Qualidade
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePresetSelect('urgente')}
              >
                Urgente
              </Button>
            </div>
          </div>

          {/* Load from Saved Templates - Apenas customizados */}
          {templates.filter(t => !t.is_system).length > 0 && (
            <div>
              <Label className="mb-2 block flex items-center gap-2">
                <span>Meus Templates Personalizados</span>
              </Label>
              <Select onValueChange={handleLoadTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates
                    .filter(t => !t.is_system)
                    .map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Total dos Pesos</Label>
              <Badge variant={isValid ? 'default' : 'destructive'} className="flex items-center gap-1">
                {isValid ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {totalWeight.toFixed(0)}%
              </Badge>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${isValid ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(totalWeight, 100)}%` }}
              />
            </div>
          </div>

          {/* Weight Sliders */}
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              💡 Ajuste automático: ao mudar um peso, os outros se reequilibram proporcionalmente
            </p>
            {weightItems.map(({ key, label, icon: Icon, color, tooltip }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    {label}
                    {tooltip && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </Label>
                  <Badge variant="outline">{weights[key]}%</Badge>
                </div>
                <Slider
                  value={[weights[key]]}
                  onValueChange={([value]) => handleWeightChange(key, value)}
                  max={100}
                  step={1}
                  className="flex-1"
                />
              </div>
            ))}
          </div>

          {/* Save as Template */}
          {savingAsTemplate && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div>
                <Label htmlFor="template-name">Nome do Template</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: Meu Template Personalizado"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="template-description">Descrição (opcional)</Label>
                <Input
                  id="template-description"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Ex: Template para compras urgentes"
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {!savingAsTemplate && (
            <Button variant="outline" onClick={() => setSavingAsTemplate(true)}>
              💾 Salvar como Template
            </Button>
          )}
          {savingAsTemplate ? (
            <>
              <Button variant="outline" onClick={() => setSavingAsTemplate(false)}>
                Voltar
              </Button>
              <Button onClick={handleSaveAsTemplate} disabled={!isValid}>
                Salvar Template
              </Button>
            </>
          ) : (
            <Button onClick={handleSave} disabled={!isValid}>
              Aplicar Pesos
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
