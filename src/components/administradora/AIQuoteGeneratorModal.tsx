import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAdministradoraAICredits } from '@/hooks/useAdministradoraAICredits';
import { useCondominiosVinculados } from '@/hooks/useCondominiosVinculados';
import { Sparkles, Loader2, Building2, Users } from 'lucide-react';

interface AIQuoteGeneratorModalProps {
  administradoraId: string;
  administradoraName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuoteGenerated: (quote: any) => void;
}

export function AIQuoteGeneratorModal({
  administradoraId,
  administradoraName,
  open,
  onOpenChange,
  onQuoteGenerated
}: AIQuoteGeneratorModalProps) {
  const { credits, checkCredits, refetch } = useAdministradoraAICredits(administradoraId);
  const { condominios } = useCondominiosVinculados(administradoraId);
  const { toast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    targetType: 'self' as 'self' | 'condominio',
    targetCondominioId: '',
    deadline: '',
    priorities: 'qualidade_prazo'
  });

  const handleReset = () => {
    setFormData({
      description: '',
      targetType: 'self',
      targetCondominioId: '',
      deadline: '',
      priorities: 'qualidade_prazo'
    });
  };

  const handleGenerate = async () => {
    if (!formData.description.trim()) {
      toast({
        title: 'Erro de Validação',
        description: 'Por favor, descreva o que você precisa para a cotação.',
        variant: 'destructive'
      });
      return;
    }

    if (formData.targetType === 'condominio' && !formData.targetCondominioId) {
      toast({
        title: 'Erro de Validação',
        description: 'Por favor, selecione o condomínio.',
        variant: 'destructive'
      });
      return;
    }

    // Verificar créditos antes de gerar
    const ESTIMATED_COST = 10;
    const hasCredits = await checkCredits(ESTIMATED_COST);
    
    if (!hasCredits) {
      toast({
        title: 'Créditos Insuficientes',
        description: `Você precisa de pelo menos ${ESTIMATED_COST} créditos AI para gerar uma cotação.`,
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-quote-generator-administradora', {
        body: {
          description: formData.description,
          administradoraId: administradoraId,
          targetType: formData.targetType,
          targetCondominioId: formData.targetCondominioId || null,
          clientInfo: {
            client_id: administradoraId,
            name: administradoraName,
            type: 'administradora'
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
        await refetch();

        toast({
          title: 'Cotação Gerada com Sucesso!',
          description: `Foram usados ${data.credits_used} créditos AI. Restam ${data.credits_remaining} créditos.`
        });

        handleReset();
        onOpenChange(false);
      } else {
        throw new Error('Erro ao gerar cotação');
      }
    } catch (error: any) {
      console.error('Error generating AI quote:', error);
      toast({
        title: 'Erro ao Gerar Cotação',
        description: error.message || 'Não foi possível gerar a cotação. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
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
            Créditos AI disponíveis: <strong>{credits?.available_credits || 0}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selecionar tipo */}
          <div className="space-y-2">
            <Label htmlFor="target-type">Criar cotação para *</Label>
            <Select
              value={formData.targetType}
              onValueChange={(v: 'self' | 'condominio') =>
                setFormData(prev => ({ ...prev, targetType: v, targetCondominioId: '' }))
              }
            >
              <SelectTrigger id="target-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>Administradora ({administradoraName})</span>
                  </div>
                </SelectItem>
                <SelectItem value="condominio">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Condomínio Vinculado</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selecionar condomínio */}
          {formData.targetType === 'condominio' && (
            <div className="space-y-2">
              <Label htmlFor="condominio">Selecione o Condomínio *</Label>
              <Select
                value={formData.targetCondominioId}
                onValueChange={(v) => setFormData(prev => ({ ...prev, targetCondominioId: v }))}
              >
                <SelectTrigger id="condominio">
                  <SelectValue placeholder="Escolha um condomínio..." />
                </SelectTrigger>
                <SelectContent>
                  {condominios.map(cond => (
                    <SelectItem key={cond.id} value={cond.id}>
                      {cond.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição da Necessidade *</Label>
            <Textarea
              id="description"
              placeholder="Ex: Materiais de limpeza para condomínio de 200 apartamentos, incluindo produtos para áreas comuns..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              disabled={isGenerating}
            />
          </div>

          {/* Prazo e Prioridades */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline">Prazo Desejado</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priorities">Prioridades</Label>
              <Select
                value={formData.priorities}
                onValueChange={(v) => setFormData(prev => ({ ...prev, priorities: v }))}
                disabled={isGenerating}
              >
                <SelectTrigger id="priorities">
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
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={isGenerating}
          >
            Limpar
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isGenerating}
            >
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
}
