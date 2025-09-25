import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CreditCard } from "lucide-react";
import { useSupabaseQuotes } from "@/hooks/useSupabaseQuotes";

interface CreatePaymentModalProps {
  onPaymentCreate: (quoteId: string, amount: number) => Promise<string>;
  trigger?: React.ReactNode;
}

export function CreatePaymentModal({ onPaymentCreate, trigger }: CreatePaymentModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { quotes } = useSupabaseQuotes();

  // Filter only approved quotes for payment
  const approvedQuotes = quotes.filter(quote => quote.status === 'approved');

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
    if (quote) {
      setAmount((quote.total || 0).toString());
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
            <Select value={selectedQuoteId} onValueChange={handleQuoteSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma cotação aprovada" />
              </SelectTrigger>
              <SelectContent>
                {approvedQuotes.map((quote) => (
                  <SelectItem key={quote.id} value={quote.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{quote.title}</span>
                       <span className="text-sm text-muted-foreground">
                        {quote.id} • {(quote.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {approvedQuotes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma cotação aprovada disponível
              </p>
            )}
          </div>

          {selectedQuote && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="font-medium text-sm">Detalhes da Cotação:</p>
              <p className="text-sm">• Cliente: {selectedQuote.client_name}</p>
              <p className="text-sm">• Fornecedor: {selectedQuote.supplier_name || "Não definido"}</p>
              <p className="text-sm">• Itens: {selectedQuote.items_count || 0}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-900 mb-1">Sistema de Garantia</p>
                <p className="text-sm text-blue-800">
                  O pagamento será processado via Stripe e os valores ficarão retidos em 
                  segurança até a confirmação da entrega pelo cliente.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !selectedQuoteId || !amount}
              className="flex-1"
            >
              {isLoading ? "Processando..." : "Criar Pagamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}