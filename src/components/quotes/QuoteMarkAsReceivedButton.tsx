import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseQuotes } from '@/hooks/useSupabaseQuotes';
import { CheckCircle, Clock } from 'lucide-react';

interface QuoteMarkAsReceivedButtonProps {
  quoteId: string;
  currentStatus: string;
  className?: string;
}

export function QuoteMarkAsReceivedButton({ 
  quoteId, 
  currentStatus, 
  className 
}: QuoteMarkAsReceivedButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { markQuoteAsUnderReview } = useSupabaseQuotes();

  const handleMarkAsReceived = async () => {
    setIsLoading(true);
    try {
      await markQuoteAsUnderReview(quoteId);
      toast({
        title: 'Status atualizado',
        description: 'Cotação marcada como "Em Análise"',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Only show for quotes that are receiving proposals and not yet approved
  if (currentStatus !== 'receiving' && currentStatus !== 'received') {
    return null;
  }

  return (
    <Button
      onClick={handleMarkAsReceived}
      disabled={isLoading}
      size="sm"
      variant="outline"
      className={className}
    >
      {isLoading ? (
        <Clock className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      Marcar como Recebida
    </Button>
  );
}