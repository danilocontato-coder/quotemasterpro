import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CreditCard, AlertCircle } from "lucide-react";
import { useSupabaseQuotes } from "@/hooks/useSupabaseQuotes";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreatePaymentModalProps {
  onPaymentCreate: (quoteId: string, amount: number) => Promise<string>;
  trigger?: React.ReactNode;
}

export function CreatePaymentModal({ onPaymentCreate, trigger }: CreatePaymentModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { quotes, isLoading: quotesLoading } = useSupabaseQuotes();

  // Filter only approved quotes that don't have payments yet and have value > 0
  const approvedQuotes = quotes.filter(quote => 
    quote.status === 'approved' && 
    quote.total !== null && 
    quote.total > 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteId || !amount) return;

    setIsLoading(true);
    try {
      const paymentId = await onPaymentCreate(selectedQuoteId, parseFloat(amount));
      
      // Reset form
      setSelectedQuoteId("");
      setAmount("");
      setOpen(false);
      
      // In a real implementation, this would redirect to Stripe
      console.log("Payment created:", paymentId);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedQuote = approvedQuotes.find(q => q.id === selectedQuoteId);

  // Auto-fill amount when quote is selected
  const handleQuoteSelect = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    const quote = approvedQuotes.find(q => q.id === quoteId);
    if (quote && quote.total) {
      setAmount(quote.total.toString());
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pagamento
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Criar Novo Pagamento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quote">Cotação Aprovada</Label>
            {quotesLoading ? (
              <div className="text-sm text-muted-foreground p-3 border rounded-md">
                Carregando cotações...
              </div>
            ) : approvedQuotes.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Nenhuma cotação aprovada disponível</p>
                    <p className="text-xs">
                      Para criar um pagamento, você precisa primeiro aprovar uma cotação com valor maior que zero.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedQuoteId} onValueChange={handleQuoteSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma cotação aprovada" />
                </SelectTrigger>
                <SelectContent>
                  {approvedQuotes.map((quote) => (
                    <SelectItem key={quote.id} value={quote.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">#{quote.id} - {quote.title}</span>
                        <span className="text-sm text-muted-foreground">
                          Valor: R$ {quote.total?.toFixed(2) || '0,00'} | Cliente: {quote.client_name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedQuote && (
            <div className="p-3 bg-muted/30 rounded-md">
              <h4 className="font-medium text-sm mb-2">Detalhes da Cotação</h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><span className="font-medium">ID:</span> {selectedQuote.id}</p>
                <p><span className="font-medium">Título:</span> {selectedQuote.title}</p>
                <p><span className="font-medium">Cliente:</span> {selectedQuote.client_name}</p>
                <p><span className="font-medium">Fornecedor:</span> {selectedQuote.supplier_name || 'Não especificado'}</p>
                <p><span className="font-medium">Status:</span> Aprovada</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Valor do Pagamento (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              disabled={!selectedQuoteId}
            />
            {selectedQuote && (
              <p className="text-xs text-muted-foreground">
                Valor sugerido: R$ {selectedQuote.total?.toFixed(2) || '0,00'}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !selectedQuoteId || !amount || quotesLoading || approvedQuotes.length === 0}
              className="flex-1"
            >
              {isLoading ? "Criando..." : "Criar Pagamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}