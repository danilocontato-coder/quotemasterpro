import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2 } from 'lucide-react';

interface AIQuoteGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuoteGenerated: (quote: any) => void;
}

export const AIQuoteGeneratorModal: React.FC<AIQuoteGeneratorModalProps> = ({
  open,
  onOpenChange,
  onQuoteGenerated
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    clientType: 'condominio',
    clientLocation: '',
    budget: '',
    deadline: '',
    priorities: 'qualidade_prazo'
  });

  const handleGenerate = async () => {
    if (!formData.description.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, descreva o que precisa para a cotação.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-quote-generator', {
        body: {
          description: formData.description,
          clientInfo: {
            type: formData.clientType,
            location: formData.clientLocation
          },
          preferences: {
            budget: formData.budget,
            deadline: formData.deadline,
            priorities: formData.priorities
          }
        }
      });

      if (error) throw error;

      if (data.success && data.quote) {
        onQuoteGenerated(data.quote);
        onOpenChange(false);
        toast({
          title: 'Cotação Gerada!',
          description: 'A IA criou uma cotação baseada nas suas especificações.',
        });
      } else {
        throw new Error('Erro ao gerar cotação');
      }
    } catch (error) {
      console.error('Error generating AI quote:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar a cotação. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setFormData({
      description: '',
      clientType: 'condominio',
      clientLocation: '',
      budget: '',
      deadline: '',
      priorities: 'qualidade_prazo'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Cotação com IA
          </DialogTitle>
          <DialogDescription>
            Descreva o que você precisa e a IA criará uma cotação estruturada automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição da Necessidade *</Label>
            <Textarea
              id="description"
              placeholder="Ex: Preciso de materiais de limpeza para condomínio de 200 apartamentos, incluindo produtos para áreas comuns, piscina e jardim..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientType">Tipo de Cliente</Label>
              <Select
                value={formData.clientType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, clientType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="condominio">Condomínio</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="industria">Indústria</SelectItem>
                  <SelectItem value="comercio">Comércio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="clientLocation">Localização</Label>
              <Input
                id="clientLocation"
                placeholder="Ex: São Paulo - SP"
                value={formData.clientLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, clientLocation: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget">Orçamento Aproximado</Label>
              <Input
                id="budget"
                placeholder="Ex: R$ 5.000 - R$ 10.000"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="deadline">Prazo Desejado</Label>
              <Input
                id="deadline"
                placeholder="Ex: 15 dias"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="priorities">Prioridades</Label>
            <Select
              value={formData.priorities}
              onValueChange={(value) => setFormData(prev => ({ ...prev, priorities: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qualidade_prazo">Qualidade e Prazo</SelectItem>
                <SelectItem value="menor_preco">Menor Preço</SelectItem>
                <SelectItem value="qualidade_premium">Qualidade Premium</SelectItem>
                <SelectItem value="sustentabilidade">Sustentabilidade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset} disabled={isGenerating}>
            Limpar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Cotação
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};