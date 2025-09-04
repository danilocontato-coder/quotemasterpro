import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useApprovals } from "@/hooks/useApprovals";
import { useToast } from "@/hooks/use-toast";

interface QuoteMarkAsReceivedButtonProps {
  quoteId: string;
  supplierName: string;
  disabled?: boolean;
}

export function QuoteMarkAsReceivedButton({ 
  quoteId, 
  supplierName, 
  disabled = false 
}: QuoteMarkAsReceivedButtonProps) {
  const { markAsDelivered } = useApprovals();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkAsReceived = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await markAsDelivered(quoteId, supplierName);
      toast({
        title: "Entrega confirmada",
        description: "A entrega foi marcada como recebida. Avalie sua experiência!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao confirmar entrega. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMarkAsReceived}
      disabled={disabled || isLoading}
      className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50 disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      {isLoading ? 'Processando...' : 'Marcar como Recebido'}
    </Button>
  );
}