import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertCircle, FileText } from "lucide-react";
import { useLetterDocuments } from "@/hooks/useLetterDocuments";
import { Skeleton } from "@/components/ui/skeleton";

interface DocumentValidationSnapshotProps {
  letterId: string;
}

export default function DocumentValidationSnapshot({ letterId }: DocumentValidationSnapshotProps) {
  const { suppliers, isLoading } = useLetterDocuments(letterId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'missing':
        return <FileText className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      validated: "default",
      pending: "secondary",
      rejected: "destructive",
      expired: "destructive",
      missing: "outline"
    };
    const labels: Record<string, string> = {
      validated: "Validado",
      pending: "Pendente",
      rejected: "Rejeitado",
      expired: "Expirado",
      missing: "Faltando"
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const getEligibilityBadge = (status: string) => {
    if (status === 'eligible') return <Badge className="bg-green-100 text-green-800">✅ Elegível</Badge>;
    if (status === 'pending') return <Badge className="bg-yellow-100 text-yellow-800">⏳ Pendente</Badge>;
    return <Badge className="bg-red-100 text-red-800">❌ Não Elegível</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="text-sm text-muted-foreground mb-4">
        Snapshot da documentação no momento do envio (somente leitura)
      </div>

      {suppliers.map(supplier => (
        <Card key={supplier.supplierId} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">{supplier.supplierName}</h3>
              {getEligibilityBadge(supplier.status)}
            </div>
            <div className="text-sm text-muted-foreground">
              {supplier.summary.validated}/{supplier.summary.total} validados no envio
            </div>
          </div>

          <div className="space-y-3">
            {supplier.documents.map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {getStatusIcon(doc.status)}
                  <div>
                    <div className="font-medium">{doc.label}</div>
                    {doc.reason && (
                      <div className="text-sm text-muted-foreground">{doc.reason}</div>
                    )}
                    {doc.validated_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Validado em: {new Date(doc.validated_at).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(doc.status)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
