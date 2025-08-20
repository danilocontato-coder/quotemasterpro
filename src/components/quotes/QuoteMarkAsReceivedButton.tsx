import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
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

  const handleMarkAsReceived = () => {
    markAsDelivered(quoteId, supplierName);
    toast({
      title: "Entrega confirmada",
      description: "A entrega foi marcada como recebida. Avalie sua experiência!",
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMarkAsReceived}
      disabled={disabled}
      className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
    >
      <CheckCircle className="h-4 w-4" />
      Marcar como Recebido
    </Button>
  );
}