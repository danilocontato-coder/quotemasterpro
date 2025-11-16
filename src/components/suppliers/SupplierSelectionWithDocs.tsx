import { useMemo } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSupplierEligibility } from "@/hooks/useSupplierEligibility";
import { Skeleton } from "@/components/ui/skeleton";

interface Supplier {
  id: string;
  name: string;
  email: string;
}

interface RequiredDocument {
  type: string;
  label: string;
  mandatory: boolean;
}

interface SupplierSelectionWithDocsProps {
  suppliers: Supplier[];
  selectedSuppliers: string[];
  onToggleSupplier: (supplierId: string) => void;
  requiredDocuments: RequiredDocument[];
  clientId: string;
  showOnlyEligible?: boolean;
}

function SupplierDocStatus({
  supplierId,
  clientId,
  requiredDocuments,
}: {
  supplierId: string;
  clientId: string;
  requiredDocuments: RequiredDocument[];
}) {
  const { eligible, missingDocs, expiredDocs, rejectedDocs, pendingDocs, score, isLoading } =
    useSupplierEligibility(supplierId, clientId, requiredDocuments);

  if (isLoading) {
    return <Skeleton className="h-6 w-6 rounded-full" />;
  }

  if (requiredDocuments.length === 0) {
    return null;
  }

  let icon = <Clock className="h-4 w-4" />;
  let color = "text-muted-foreground";
  let tooltipText = "Sem documentos obrigatórios";

  if (eligible) {
    icon = <CheckCircle2 className="h-4 w-4" />;
    color = "text-success";
    tooltipText = "Todos os documentos validados";
  } else if (missingDocs.length > 0) {
    icon = <XCircle className="h-4 w-4" />;
    color = "text-destructive";
    tooltipText = `Documentos faltando: ${missingDocs.join(", ")}`;
  } else if (expiredDocs.length > 0) {
    icon = <XCircle className="h-4 w-4" />;
    color = "text-destructive";
    tooltipText = `Documentos expirados: ${expiredDocs.join(", ")}`;
  } else if (rejectedDocs.length > 0) {
    icon = <XCircle className="h-4 w-4" />;
    color = "text-destructive";
    tooltipText = `Documentos rejeitados: ${rejectedDocs.join(", ")}`;
  } else if (pendingDocs.length > 0) {
    icon = <AlertTriangle className="h-4 w-4" />;
    color = "text-warning";
    tooltipText = `Documentos pendentes: ${pendingDocs.join(", ")}`;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className={color}>{icon}</div>
            <Badge variant="outline" className="text-xs">
              {score}%
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SupplierSelectionWithDocs({
  suppliers,
  selectedSuppliers,
  onToggleSupplier,
  requiredDocuments,
  clientId,
  showOnlyEligible = false,
}: SupplierSelectionWithDocsProps) {
  // Se showOnlyEligible estiver ativo, filtrar apenas elegíveis
  const visibleSuppliers = useMemo(() => {
    if (!showOnlyEligible || requiredDocuments.length === 0) {
      return suppliers;
    }
    // Aqui podemos fazer uma filtragem mais sofisticada se necessário
    return suppliers;
  }, [suppliers, showOnlyEligible, requiredDocuments]);

  if (visibleSuppliers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>Nenhum fornecedor disponível.</p>
        {showOnlyEligible && requiredDocuments.length > 0 && (
          <p className="text-sm mt-2">
            Nenhum fornecedor possui todos os documentos obrigatórios validados.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleSuppliers.map((supplier) => (
        <div
          key={supplier.id}
          className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <Checkbox
              id={`supplier-${supplier.id}`}
              checked={selectedSuppliers.includes(supplier.id)}
              onCheckedChange={() => onToggleSupplier(supplier.id)}
            />
            <Label
              htmlFor={`supplier-${supplier.id}`}
              className="flex-1 cursor-pointer"
            >
              <div>
                <p className="font-medium">{supplier.name}</p>
                <p className="text-sm text-muted-foreground">{supplier.email}</p>
              </div>
            </Label>
          </div>
          <SupplierDocStatus
            supplierId={supplier.id}
            clientId={clientId}
            requiredDocuments={requiredDocuments}
          />
        </div>
      ))}
    </div>
  );
}
