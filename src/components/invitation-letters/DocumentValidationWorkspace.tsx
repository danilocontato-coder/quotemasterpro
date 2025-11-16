import { useState } from "react";
import { useLetterDocuments } from "@/hooks/useLetterDocuments";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Clock, AlertCircle, FileText, Eye, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface DocumentValidationWorkspaceProps {
  letterId: string;
  clientId: string;
  onValidationChange?: () => void;
}

export default function DocumentValidationWorkspace({
  letterId,
  clientId,
  onValidationChange
}: DocumentValidationWorkspaceProps) {
  const { suppliers, requiredDocuments, isLoading, recalculateEligibility } = useLetterDocuments(letterId);
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<{ supplierId: string; docType: string } | null>(null);

  const handleApprove = async (supplierId: string, docType: string) => {
    try {
      const { error } = await supabase
        .from('supplier_documents')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString()
        })
        .eq('supplier_id', supplierId)
        .eq('client_id', clientId)
        .eq('document_type', docType);

      if (error) throw error;

      toast({
        title: "Documento aprovado",
        description: "O documento foi validado com sucesso.",
      });

      await recalculateEligibility();
      onValidationChange?.();
    } catch (error: any) {
      toast({
        title: "Erro ao aprovar documento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectClick = (supplierId: string, docType: string) => {
    setSelectedDoc({ supplierId, docType });
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedDoc || !rejectReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('supplier_documents')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason,
          validated_at: new Date().toISOString()
        })
        .eq('supplier_id', selectedDoc.supplierId)
        .eq('client_id', clientId)
        .eq('document_type', selectedDoc.docType);

      if (error) throw error;

      toast({
        title: "Documento rejeitado",
        description: "O fornecedor será notificado.",
      });

      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedDoc(null);
      await recalculateEligibility();
      onValidationChange?.();
    } catch (error: any) {
      toast({
        title: "Erro ao rejeitar documento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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

  // Filtrar fornecedores
  const filteredSuppliers = suppliers.filter(supplier => {
    if (filterSupplier !== "all" && supplier.supplierId !== filterSupplier) return false;
    if (filterStatus !== "all" && supplier.status !== filterStatus) return false;
    if (searchTerm && !supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Calcular KPIs
  const totalDocs = suppliers.reduce((sum, s) => sum + s.summary.total, 0);
  const pendingDocs = suppliers.reduce((sum, s) => sum + s.summary.pending, 0);
  const rejectedDocs = suppliers.reduce((sum, s) => sum + s.summary.rejected, 0);
  const eligibleSuppliers = suppliers.filter(s => s.eligible).length;

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Fornecedores Elegíveis</div>
          <div className="text-2xl font-bold">{eligibleSuppliers}/{suppliers.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Documentos Pendentes</div>
          <div className="text-2xl font-bold text-yellow-600">{pendingDocs}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Documentos Rejeitados</div>
          <div className="text-2xl font-bold text-red-600">{rejectedDocs}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total de Documentos</div>
          <div className="text-2xl font-bold">{totalDocs}</div>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <Input
          placeholder="Buscar fornecedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="eligible">Elegíveis</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="ineligible">Não Elegíveis</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos fornecedores</SelectItem>
            {suppliers.map(s => (
              <SelectItem key={s.supplierId} value={s.supplierId}>
                {s.supplierName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de Documentos */}
      <div className="space-y-6">
        {filteredSuppliers.map(supplier => (
          <Card key={supplier.supplierId} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{supplier.supplierName}</h3>
                {getEligibilityBadge(supplier.status)}
              </div>
              <div className="text-sm text-muted-foreground">
                {supplier.summary.validated}/{supplier.summary.total} validados
              </div>
            </div>

            <div className="space-y-3">
              {supplier.documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(doc.status)}
                    <div>
                      <div className="font-medium">{doc.label}</div>
                      {doc.reason && (
                        <div className="text-sm text-muted-foreground">{doc.reason}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(doc.status)}
                    {doc.status === 'pending' && (
                      <>
                        {doc.file_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver PDF
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(supplier.supplierId, doc.type)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectClick(supplier.supplierId, doc.type)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                      </>
                    )}
                    {doc.status === 'validated' && doc.file_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Dialog de Rejeição */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Informe o motivo da rejeição..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleRejectConfirm}>
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
