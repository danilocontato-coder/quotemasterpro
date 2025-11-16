import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Award } from "lucide-react";

interface QuoteCompetitiveContextProps {
  supplierCount: number;
  isExclusive?: boolean;
}

export function QuoteCompetitiveContext({ supplierCount, isExclusive }: QuoteCompetitiveContextProps) {
  if (isExclusive || supplierCount === 1) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="default" className="bg-primary/10 text-primary border-primary/20 gap-1">
              <Award className="h-3 w-3" />
              Exclusiva
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">Você é o único fornecedor convidado!</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const isHighCompetition = supplierCount >= 5;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`gap-1 ${isHighCompetition ? 'border-orange-500/50 text-orange-700 bg-orange-50' : ''}`}
          >
            <Users className="h-3 w-3" />
            {supplierCount} {supplierCount === 1 ? 'fornecedor' : 'fornecedores'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {isHighCompetition 
              ? '⚠️ Alta concorrência - considere ser competitivo no preço'
              : `Você compete com ${supplierCount - 1} outro${supplierCount > 2 ? 's' : ''} fornecedor${supplierCount > 2 ? 'es' : ''}`
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
