import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SupplierRatingModalProps {
  open: boolean;
  onClose: () => void;
  quoteId: string;
  supplierId: string;
  supplierName: string;
  deliveryId?: string;
  paymentId?: string;
  notificationId?: string;
  onRatingSubmitted?: () => void;
}

interface RatingCriteria {
  overall: number;
  quality: number;
  delivery: number;
  communication: number;
  price: number;
}

const SupplierRatingModal: React.FC<SupplierRatingModalProps> = ({
  open,
  onClose,
  quoteId,
  supplierId,
  supplierName,
  deliveryId,
  paymentId,
  notificationId,
  onRatingSubmitted
}) => {
  const [ratings, setRatings] = useState<RatingCriteria>({
    overall: 0,
    quality: 0,
    delivery: 0,
    communication: 0,
    price: 0
  });
  const [comments, setComments] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Listener real-time para conquistas
  useEffect(() => {
    if (!open) return;

    const setupListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('achievements-listener')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_achievements',
            filter: `user_id=eq.${user.id}`
          },
          (payload: any) => {
            const achievement = payload.new;
            toast({
              title: "🎉 Nova Conquista Desbloqueada!",
              description: (
                <div className="flex items-center gap-3 mt-2">
                  <div className="text-3xl">{achievement.achievement_icon}</div>
                  <div>
                    <p className="font-semibold text-foreground">{achievement.achievement_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {achievement.achievement_description}
                    </p>
                  </div>
                </div>
              ),
              duration: 6000,
              className: "border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50",
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupListener();
    
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [open, toast]);

  const StarRating = ({ 
    value, 
    onChange, 
    label,
    size = "default"
  }: { 
    value: number; 
    onChange: (rating: number) => void; 
    label: string;
    size?: "default" | "sm";
  }) => {
    const starSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
    const labelSize = size === "sm" ? "text-xs" : "text-sm";
    
    return (
      <div className="space-y-1.5">
        <label className={`${labelSize} font-medium`}>{label}</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
            >
              <Star
                className={`${starSize} ${
                  star <= value 
                    ? 'fill-yellow-400 text-yellow-400' 
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  const handleSubmit = async () => {
    if (ratings.overall === 0) {
      toast({
        title: "Erro",
        description: "Por favor, forneça uma avaliação geral.",
        variant: "destructive"
      });
      return;
    }

    if (wouldRecommend === null) {
      toast({
        title: "Erro", 
        description: "Por favor, indique se recomendaria este fornecedor.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.client_id) {
        throw new Error('Cliente não encontrado');
      }

      const { error } = await supabase
        .from('supplier_ratings')
        .insert({
          quote_id: quoteId,
          supplier_id: supplierId,
          client_id: profile.client_id,
          rater_id: (await supabase.auth.getUser()).data.user?.id,
          delivery_id: deliveryId || null,
          payment_id: paymentId || null,
          rating: ratings.overall,
          quality_rating: ratings.quality || null,
          delivery_rating: ratings.delivery || null,
          communication_rating: ratings.communication || null,
          price_rating: ratings.price || null,
          comments: comments || null,
          would_recommend: wouldRecommend
        });

      if (error) throw error;

      if (notificationId) {
        try {
          await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);
        } catch (notifError) {
          console.error('Erro ao marcar notificação como lida:', notifError);
        }
      }

      toast({
        title: "Sucesso!",
        description: "Avaliação enviada com sucesso."
      });

      onRatingSubmitted?.();
      onClose();
      
      setRatings({
        overall: 0,
        quality: 0,
        delivery: 0,
        communication: 0,
        price: 0
      });
      setComments('');
      setWouldRecommend(null);

    } catch (error: any) {
      console.error('Erro ao enviar avaliação:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar avaliação.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliar Fornecedor</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Avalie sua experiência com {supplierName}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avaliação Geral */}
          <div className="space-y-2">
            <h3 className="font-semibold text-base">Avaliação Geral *</h3>
            <StarRating
              label="Como você avalia este fornecedor no geral?"
              value={ratings.overall}
              onChange={(rating) => setRatings(prev => ({ ...prev, overall: rating }))}
            />
          </div>

          <Separator />

          {/* Critérios Específicos */}
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-base">Critérios Específicos</h3>
              <p className="text-xs text-muted-foreground">(Opcional) Avalie aspectos específicos</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StarRating
                label="Qualidade"
                value={ratings.quality}
                onChange={(rating) => setRatings(prev => ({ ...prev, quality: rating }))}
                size="sm"
              />
              
              <StarRating
                label="Comunicação"
                value={ratings.communication}
                onChange={(rating) => setRatings(prev => ({ ...prev, communication: rating }))}
                size="sm"
              />
              
              <StarRating
                label="Entrega"
                value={ratings.delivery}
                onChange={(rating) => setRatings(prev => ({ ...prev, delivery: rating }))}
                size="sm"
              />
              
              <StarRating
                label="Custo-Benefício"
                value={ratings.price}
                onChange={(rating) => setRatings(prev => ({ ...prev, price: rating }))}
                size="sm"
              />
            </div>
          </div>

          <Separator />

          {/* Recomendação */}
          <div className="space-y-2">
            <h3 className="font-semibold text-base">Recomendação *</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Você recomendaria este fornecedor para outros clientes?
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={wouldRecommend === true ? "default" : "outline"}
                onClick={() => setWouldRecommend(true)}
                className="flex items-center gap-2"
              >
                <ThumbsUp className="w-4 h-4" />
                Sim, recomendo
              </Button>
              <Button
                type="button"
                variant={wouldRecommend === false ? "destructive" : "outline"}
                onClick={() => setWouldRecommend(false)}
                className="flex items-center gap-2"
              >
                <ThumbsDown className="w-4 h-4" />
                Não recomendo
              </Button>
            </div>
          </div>

          <Separator />

          {/* Comentários */}
          <div className="space-y-2">
            <h3 className="font-semibold text-base">Comentários Adicionais</h3>
            <Textarea
              placeholder="Compartilhe detalhes sobre sua experiência com este fornecedor..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || ratings.overall === 0 || wouldRecommend === null}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierRatingModal;
