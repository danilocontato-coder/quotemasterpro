import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSupabaseQuotes } from "@/hooks/useSupabaseQuotes";
import { useSupabasePayments } from "@/hooks/useSupabasePayments";
import { CheckCircle, Clock, CreditCard } from "lucide-react";
import { CreatePaymentModal } from "./CreatePaymentModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ApprovedQuotesSection() {
  const { quotes } = useSupabaseQuotes();
  const { payments, createPaymentIntent } = useSupabasePayments();

  // Todas as cotações aprovadas (independente de valor)
  const approvedQuotes = quotes.filter(quote => quote.status === 'approved');

  // Handler local para criar pagamento a partir de uma cotação
  const handleCreatePayment = async (quoteId: string, amount: number) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Cotação não encontrada');

    const { data, error } = await supabase
      .from('payments')
      .insert({
        id: 'PAY-' + Date.now().toString(),
        quote_id: quoteId,
        client_id: quote.client_id,
        supplier_id: quote.supplier_id || null, // supplier opcional
        amount,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      toast.error('Erro ao criar pagamento');
      throw error;
    }

    toast.success('Pagamento criado com sucesso!');
    return data.id as string;
  };

  // Se não há cotações aprovadas, mostrar mensagem
  if (approvedQuotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Cotações Aprovadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="font-medium mb-1">Nenhuma cotação aprovada encontrada</p>
            <p className="text-sm">
              Aprove uma cotação para ver as opções de pagamento aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Cotações Aprovadas ({approvedQuotes.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {approvedQuotes.map((quote) => {
            const hasPayment = payments.some(p => p.quote_id === quote.id);
            const canPay = (quote.total || 0) > 0 && !hasPayment;
            return (
              <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">#{quote.id}</span>
                    <Badge variant="approved">Aprovada</Badge>
                  </div>
                  <p className="text-sm font-medium">{quote.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {quote.client_name} {quote.supplier_name && `• Fornecedor: ${quote.supplier_name}`}
                  </p>
                  <p className="text-sm font-medium text-green-600">
                    R$ {quote.total?.toFixed(2) || '0,00'}
                  </p>
                </div>
                {canPay ? (
                  <CreatePaymentModal
                    onPaymentCreate={handleCreatePayment}
                    trigger={
                      <Button size="sm" className="ml-4">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pagar
                      </Button>
                    }
                  />
                ) : hasPayment ? (
                  <Button size="sm" variant="outline" disabled className="ml-4">
                    Pagamento criado
                  </Button>
                ) : (quote.total || 0) === 0 ? (
                  <Button size="sm" variant="outline" disabled className="ml-4">
                    Valor R$ 0,00
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled className="ml-4">
                    Erro no valor
                  </Button>
                )}
              </div>
            );
          })}
          {approvedQuotes.length > 3 && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              E mais {approvedQuotes.length - 3} cotações...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}