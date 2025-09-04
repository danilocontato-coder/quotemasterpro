import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);

  const handleFinalize = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await updateQuote(quoteId, { status: 'finalized' });
      toast({
        title: "Cotação finalizada",
        description: "A cotação foi marcada como finalizada. Avalie sua experiência!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao finalizar cotação. Tente novamente.",
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
      onClick={handleFinalize}
      disabled={disabled || isLoading}
      className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50 disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      {isLoading ? 'Finalizando...' : 'Finalizar Cotação'}
    </Button>
  );
}