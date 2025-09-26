import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2 } from 'lucide-react';
import { useSupabaseCurrentClient } from '@/hooks/useSupabaseCurrentClient';

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
  const { client, clientName } = useSupabaseCurrentClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
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
            name: clientName,
            type: client?.company_name ? 'empresa' : 'condominio',
            location: client?.address || 'Não informado'
          },
          preferences: {
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
          {/* Informações do Cliente (somente exibição) */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Informações do Cliente</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Nome:</span> {clientName || 'Carregando...'}
              </div>
              <div>
                <span className="font-medium">Tipo:</span> {client?.company_name ? 'Empresa' : 'Condomínio'}
              </div>
              <div className="col-span-2">
                <span className="font-medium">Endereço:</span> {client?.address || 'Não informado'}
              </div>
            </div>
          </div>

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
              <Label htmlFor="deadline">Prazo Desejado</Label>
              <input
                type="date"
                id="deadline"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
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