import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SupplierQuoteViewModal } from '@/components/supplier/SupplierQuoteViewModal';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SupplierQuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    if (!id || !user?.supplierId) return;

    const fetchQuote = async () => {
      try {
        const { data, error } = await supabase
          .from('quotes')
          .select(`
            *,
            quote_items (*),
            quote_invitations!inner (
              id,
              supplier_id,
              status,
              token,
              suppliers (id, name)
            ),
            clients_condos (
              id,
              name,
              address,
              cnpj
            )
          `)
          .eq('id', id)
          .eq('quote_invitations.supplier_id', user.supplierId)
          .single();

        if (error) throw error;

        if (!data) {
          toast({
            title: 'Cotação não encontrada',
            description: 'Você não tem acesso a esta cotação.',
            variant: 'destructive'
          });
          navigate('/supplier/quotes');
          return;
        }

        // Verificar se está cancelada
        if (data.status === 'cancelled') {
          setIsCancelled(true);
        }

        setQuote(data);
      } catch (error) {
        console.error('Error fetching quote:', error);
        toast({
          title: 'Erro ao carregar cotação',
          description: 'Não foi possível carregar os detalhes da cotação.',
          variant: 'destructive'
        });
        navigate('/supplier/quotes');
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [id, user?.supplierId, navigate, toast]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    navigate('/supplier/quotes');
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando cotação...</p>
        </div>
      </div>
    );
  }

  // Tela especial para cotação cancelada
  if (isCancelled && !isModalOpen) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-red-900">Cotação Cancelada</h2>
              <p className="text-muted-foreground">
                Esta cotação foi cancelada pelo cliente. Todas as cobranças e entregas associadas foram automaticamente canceladas.
              </p>
              <Button onClick={() => navigate('/supplier/quotes')} variant="outline">
                Voltar para Cotações
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SupplierQuoteViewModal
      quote={quote}
      open={isModalOpen}
      onOpenChange={(open) => {
        if (!open) handleModalClose();
      }}
      onProposalSent={() => {
        // Atualizar dados após envio
        navigate('/supplier/quotes');
      }}
    />
  );
}
