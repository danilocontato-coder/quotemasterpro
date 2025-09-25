import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSupabaseQuotes } from "@/hooks/useSupabaseQuotes";
import { useSupabasePayments } from "@/hooks/useSupabasePayments";
import { CheckCircle, Clock, CreditCard } from "lucide-react";
import { CreatePaymentModal } from "./CreatePaymentModal";

export function ApprovedQuotesSection() {
  const { quotes } = useSupabaseQuotes();
  const { payments, createPaymentIntent } = useSupabasePayments();

  // Filter approved quotes that don't have payments yet and have value > 0
  const approvedQuotesWithoutPayments = quotes.filter(quote => {
    const hasPayment = payments.some(payment => payment.quote_id === quote.id);
    return quote.status === 'approved' && !hasPayment && quote.total && quote.total > 0;
  });

  if (approvedQuotesWithoutPayments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Cotações Aprovadas Pendentes de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {approvedQuotesWithoutPayments.map((quote) => (
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
              <CreatePaymentModal
                onPaymentCreate={createPaymentIntent}
                trigger={
                  <Button size="sm" className="ml-4">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pagar
                  </Button>
                }
              />
            </div>
          ))}
          {approvedQuotesWithoutPayments.length > 3 && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              E mais {approvedQuotesWithoutPayments.length - 3} cotações...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}