import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProposalDetailsTooltipProps {
  proposal: {
    supplierName: string;
    sla: string;
    warranty: string;
    reputation: number;
    shippingCost: number;
  };
  children: React.ReactNode;
}

export function ProposalDetailsTooltip({ 
  proposal, 
  children 
}: ProposalDetailsTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <div>
              <span className="font-semibold">Fornecedor:</span> {proposal.supplierName}
            </div>
            <div>
              <span className="font-semibold">SLA:</span> {proposal.sla}
            </div>
            <div>
              <span className="font-semibold">Garantia:</span> {proposal.warranty}
            </div>
            <div>
              <span className="font-semibold">Reputação:</span> {proposal.reputation}/5 ⭐
            </div>
            <div>
              <span className="font-semibold">Frete:</span> R$ {proposal.shippingCost.toFixed(2)}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
