import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/systemLogger';
import { Loader2 } from 'lucide-react';
import { useTermsOfUse } from '@/hooks/useTermsOfUse';

interface TermsOfUseModalProps {
  open: boolean;
  userId: string;
  onTermsAccepted: () => void;
}

export const TermsOfUseModal: React.FC<TermsOfUseModalProps> = ({
  open,
  userId,
  onTermsAccepted,
}) => {
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { terms, isLoading } = useTermsOfUse();

  const handleAccept = async () => {
    if (!accepted) {
      toast({
        title: "Atenção",
        description: "Você precisa aceitar os termos para continuar.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      logger.info('auth', 'Aceitando termos de uso', { userId });

      // Atualizar profiles com aceitação dos termos
      const { error } = await supabase
        .from('profiles')
        .update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Log de auditoria
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'TERMS_ACCEPTED',
        entity_type: 'profiles',
        entity_id: userId,
        panel_type: 'auth',
        details: {
          accepted_at: new Date().toISOString(),
          terms_version: terms?.version || '1.0'
        }
      });

      logger.info('auth', 'Termos aceitos com sucesso', {
        userId,
        terms_version: terms?.version || '1.0',
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Termos aceitos",
        description: "Você aceitou os termos de uso da plataforma.",
      });

      // Disparar evento para o AuthContext
      console.log('[TERMS-MODAL] 🎉 Disparando evento terms-accepted', { userId });
      window.dispatchEvent(new CustomEvent('terms-accepted'));
      
      onTermsAccepted();
    } catch (error: any) {
      logger.error('auth', 'Erro ao aceitar termos', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível aceitar os termos. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isLoading ? "Carregando termos..." : (terms?.title || "Termos de Uso")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 max-h-[50vh]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <div 
                className="whitespace-pre-wrap text-sm leading-relaxed"
                style={{ fontFamily: 'inherit' }}
              >
                {terms?.content?.split('\n').map((line, i) => {
                  // Parse markdown headings
                  if (line.startsWith('### ')) {
                    return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.replace('### ', '')}</h3>;
                  }
                  if (line.startsWith('## ')) {
                    return <h2 key={i} className="text-xl font-bold mt-6 mb-3">{line.replace('## ', '')}</h2>;
                  }
                  if (line.startsWith('- ')) {
                    return <li key={i} className="ml-4">{line.replace('- ', '')}</li>;
                  }
                  if (line.startsWith('---')) {
                    return <hr key={i} className="my-4" />;
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={i} className="font-bold mt-2">{line.replace(/\*\*/g, '')}</p>;
                  }
                  if (line.trim() === '') {
                    return <br key={i} />;
                  }
                  return <p key={i} className="mb-2">{line}</p>;
                })}
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-col gap-4 mt-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms-accept"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
              disabled={isLoading || isSubmitting}
            />
            <label
              htmlFor="terms-accept"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Li e aceito os Termos de Uso da Plataforma Cotiz
            </label>
          </div>
          
          <Button
            onClick={handleAccept}
            disabled={!accepted || isSubmitting || isLoading}
            className="w-full"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aceitar e Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
