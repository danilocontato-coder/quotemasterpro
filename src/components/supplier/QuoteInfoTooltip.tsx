import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuoteInfoTooltipProps {
  itemCount: number;
  estimatedValue?: number;
  createdAt: string;
  supplierCount: number;
}

export function QuoteInfoTooltip({ 
  itemCount, 
  estimatedValue, 
  createdAt,
  supplierCount 
}: QuoteInfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Itens:</span>
              <span className="font-medium">{itemCount}</span>
            </div>
            {estimatedValue && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Valor estimado:</span>
                <span className="font-medium">
                  {estimatedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Criada em:</span>
              <span className="font-medium">
                {format(parseISO(createdAt), "dd 'de' MMM, yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Fornecedores:</span>
              <span className="font-medium">{supplierCount}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
