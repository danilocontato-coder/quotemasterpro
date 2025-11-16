import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileCheck } from "lucide-react";

interface SupplierStatus {
  id: string;
  name: string;
  status: 'eligible' | 'pending' | 'ineligible';
  missingDocs: string[];
}

interface PreSendDocumentCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterId: string;
  eligibleSuppliers: SupplierStatus[];
  pendingSuppliers: SupplierStatus[];
  ineligibleSuppliers: SupplierStatus[];
  onValidateNow: () => void;
  onSendToEligible: () => void;
  onSendToAll: () => void;
}

export default function PreSendDocumentCheckModal({
  open,
  onOpenChange,
  eligibleSuppliers,
  pendingSuppliers,
  ineligibleSuppliers,
  onValidateNow,
  onSendToEligible,
  onSendToAll
}: PreSendDocumentCheckModalProps) {
  const hasIssues = pendingSuppliers.length > 0 || ineligibleSuppliers.length > 0;

  if (!hasIssues) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <AlertDialogTitle>Atenção: Documentação Pendente</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Alguns fornecedores possuem documentação pendente ou não validada.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 my-4">
          {/* Fornecedores Elegíveis */}
          {eligibleSuppliers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-100 text-green-800">
                  ✅ {eligibleSuppliers.length} Elegível{eligibleSuppliers.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <ul className="text-sm space-y-1 ml-4">
                {eligibleSuppliers.map(s => (
                  <li key={s.id} className="text-muted-foreground">• {s.name}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Fornecedores Pendentes */}
          {pendingSuppliers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-yellow-100 text-yellow-800">
                  ⏳ {pendingSuppliers.length} Pendente{pendingSuppliers.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <ul className="text-sm space-y-2 ml-4">
                {pendingSuppliers.map(s => (
                  <li key={s.id} className="text-muted-foreground">
                    <span className="font-medium">• {s.name}</span>
                    {s.missingDocs.length > 0 && (
                      <span className="text-xs block ml-3 mt-1">
                        Documentos pendentes: {s.missingDocs.join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fornecedores Não Elegíveis */}
          {ineligibleSuppliers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-red-100 text-red-800">
                  ❌ {ineligibleSuppliers.length} Não Elegível{ineligibleSuppliers.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <ul className="text-sm space-y-2 ml-4">
                {ineligibleSuppliers.map(s => (
                  <li key={s.id} className="text-muted-foreground">
                    <span className="font-medium">• {s.name}</span>
                    {s.missingDocs.length > 0 && (
                      <span className="text-xs block ml-3 mt-1 text-red-600">
                        Documentos faltando/rejeitados: {s.missingDocs.join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onValidateNow();
            }}
          >
            <FileCheck className="h-4 w-4 mr-2" />
            Validar Documentos Agora
          </Button>
          {eligibleSuppliers.length > 0 && (
            <Button
              onClick={() => {
                onOpenChange(false);
                onSendToEligible();
              }}
            >
              Enviar para Elegíveis ({eligibleSuppliers.length})
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              onSendToAll();
            }}
          >
            Enviar para Todos Mesmo Assim
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
