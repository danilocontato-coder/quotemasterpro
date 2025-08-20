import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, X, User } from "lucide-react";
import { RatingPrompt } from "@/hooks/useSupplierRatings";

interface RatingPromptCardProps {
  prompt: RatingPrompt;
  onRate: () => void;
  onDismiss: () => void;
}

export function RatingPromptCard({ prompt, onRate, onDismiss }: RatingPromptCardProps) {
  const getPromptMessage = () => {
    switch (prompt.type) {
      case 'payment_confirmed':
        return 'Seu pagamento foi confirmado! Que tal avaliar este fornecedor?';
      case 'quote_completed':
        return 'Cotação finalizada! Avalie a experiência com este fornecedor.';
      case 'delivery_received':
        return 'Entrega recebida! Compartilhe sua experiência com este fornecedor.';
      default:
        return 'Avalie este fornecedor.';
    }
  };

  const getPromptTitle = () => {
    switch (prompt.type) {
      case 'payment_confirmed':
        return 'Pagamento Confirmado';
      case 'quote_completed':
        return 'Cotação Finalizada';
      case 'delivery_received':
        return 'Entrega Recebida';
      default:
        return 'Avaliar Fornecedor';
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-blue-600" />
            {getPromptTitle()}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{prompt.supplierName}</span>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {getPromptMessage()}
        </p>

        {prompt.quoteId && (
          <p className="text-xs text-muted-foreground">
            Cotação: {prompt.quoteId}
          </p>
        )}

        {prompt.paymentId && (
          <p className="text-xs text-muted-foreground">
            Pagamento: {prompt.paymentId}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={onRate}
            className="flex-1"
          >
            <Star className="h-4 w-4 mr-1" />
            Avaliar Agora
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDismiss}
            className="flex-1"
          >
            Depois
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}