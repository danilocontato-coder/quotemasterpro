import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, MessageSquare, Brain, Clock } from "lucide-react";
import { QuoteUpdate } from "@/hooks/useQuoteUpdates";

interface QuoteUpdateBadgeProps {
  updates: QuoteUpdate | null;
  variant?: 'compact' | 'detailed';
  onClick?: () => void;
}

export function QuoteUpdateBadge({ updates, variant = 'compact', onClick }: QuoteUpdateBadgeProps) {
  if (!updates) return null;

  const hasAnyUpdate = updates.newProposalsCount > 0 || 
                       updates.unreadMessagesCount > 0 || 
                       updates.hasNewAIAnalysis;

  if (!hasAnyUpdate && !updates.isUrgent) return null;

  // Total de atualizações (excluindo urgente)
  const totalUpdates = updates.newProposalsCount + updates.unreadMessagesCount + (updates.hasNewAIAnalysis ? 1 : 0);

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              className="bg-red-500 text-white hover:bg-red-600 cursor-pointer animate-pulse"
              onClick={onClick}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {totalUpdates}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1 text-sm">
              {updates.newProposalsCount > 0 && (
                <p>✨ {updates.newProposalsCount} nova(s) proposta(s)</p>
              )}
              {updates.unreadMessagesCount > 0 && (
                <p>💬 {updates.unreadMessagesCount} mensagem(ns) não lida(s)</p>
              )}
              {updates.hasNewAIAnalysis && (
                <p>🤖 Nova análise AI disponível</p>
              )}
              {updates.isUrgent && (
                <p>⏰ Prazo expira em breve!</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Variant detailed - mostrar badges separados
  return (
    <div className="flex items-center gap-1">
      {updates.newProposalsCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-blue-500 text-white hover:bg-blue-600 cursor-pointer">
                <Sparkles className="h-3 w-3 mr-1" />
                {updates.newProposalsCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{updates.newProposalsCount} nova(s) proposta(s)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {updates.unreadMessagesCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-green-500 text-white hover:bg-green-600 cursor-pointer">
                <MessageSquare className="h-3 w-3 mr-1" />
                {updates.unreadMessagesCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{updates.unreadMessagesCount} mensagem(ns) não lida(s)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {updates.hasNewAIAnalysis && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-purple-500 text-white hover:bg-purple-600 cursor-pointer">
                <Brain className="h-3 w-3" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Nova análise AI disponível</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {updates.isUrgent && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-orange-500 text-white hover:bg-orange-600 cursor-pointer animate-pulse">
                <Clock className="h-3 w-3" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>⏰ Prazo expira em breve!</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
