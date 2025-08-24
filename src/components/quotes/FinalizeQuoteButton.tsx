import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useSupabaseQuotes } from "@/hooks/useSupabaseQuotes";
import { useToast } from "@/hooks/use-toast";

interface FinalizeQuoteButtonProps {
  quoteId: string;
  disabled?: boolean;
}

export function FinalizeQuoteButton({ 
  quoteId, 
  disabled = false 
}: FinalizeQuoteButtonProps) {
  const { updateQuote } = useSupabaseQuotes();
  const { toast } = useToast();

  const handleFinalize = () => {
    updateQuote(quoteId, { status: 'finalized' });
    toast({
      title: "Cotação finalizada",
      description: "A cotação foi marcada como finalizada. Avalie sua experiência!",
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFinalize}
      disabled={disabled}
      className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
    >
      <CheckCircle className="h-4 w-4" />
      Finalizar Cotação
    </Button>
  );
}