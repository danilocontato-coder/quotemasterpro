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
    return 'Avalie a qualidade do serviço prestado pelo fornecedor.';
  };

  const getPromptTitle = () => {
    return 'Avaliar Fornecedor';
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
          <span className="font-medium">{prompt.supplier_name}</span>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {getPromptMessage()}
        </p>

        {prompt.quote_id && (
          <p className="text-xs text-muted-foreground">
            Cotação: {prompt.quote_id}
          </p>
        )}

        {prompt.payment_id && (
          <p className="text-xs text-muted-foreground">
            Pagamento: {prompt.payment_id}
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