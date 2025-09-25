import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const StarRating = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: number; 
    onChange: (rating: number) => void; 
    label: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`w-5 h-5 ${
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
          rating: ratings.overall,
          quality_rating: ratings.quality || null,
          delivery_rating: ratings.delivery || null,
          communication_rating: ratings.communication || null,
          price_rating: ratings.price || null,
          comments: comments || null,
          would_recommend: wouldRecommend
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Avaliação enviada com sucesso."
      });

      onRatingSubmitted?.();
      onClose();
      
      // Reset form
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Avaliar Fornecedor</DialogTitle>
          <p className="text-muted-foreground">
            Avalie sua experiência com {supplierName}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avaliação Geral */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Avaliação Geral *</CardTitle>
            </CardHeader>
            <CardContent>
              <StarRating
                label="Como você avalia este fornecedor no geral?"
                value={ratings.overall}
                onChange={(rating) => setRatings(prev => ({ ...prev, overall: rating }))}
              />
            </CardContent>
          </Card>

          {/* Critérios Específicos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Critérios Específicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StarRating
                label="Qualidade dos Produtos/Serviços"
                value={ratings.quality}
                onChange={(rating) => setRatings(prev => ({ ...prev, quality: rating }))}
              />
              
              <StarRating
                label="Prazo de Entrega"
                value={ratings.delivery}
                onChange={(rating) => setRatings(prev => ({ ...prev, delivery: rating }))}
              />
              
              <StarRating
                label="Comunicação"
                value={ratings.communication}
                onChange={(rating) => setRatings(prev => ({ ...prev, communication: rating }))}
              />
              
              <StarRating
                label="Preço/Custo-Benefício"
                value={ratings.price}
                onChange={(rating) => setRatings(prev => ({ ...prev, price: rating }))}
              />
            </CardContent>
          </Card>

          {/* Recomendação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recomendação *</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Você recomendaria este fornecedor para outros clientes?
              </p>
              <div className="flex gap-4">
                <Button
                  variant={wouldRecommend === true ? "default" : "outline"}
                  onClick={() => setWouldRecommend(true)}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Sim, recomendo
                </Button>
                <Button
                  variant={wouldRecommend === false ? "destructive" : "outline"}
                  onClick={() => setWouldRecommend(false)}
                  className="flex items-center gap-2"
                >
                  <ThumbsDown className="w-4 h-4" />
                  Não recomendo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Comentários */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comentários Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Compartilhe detalhes sobre sua experiência com este fornecedor..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>
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