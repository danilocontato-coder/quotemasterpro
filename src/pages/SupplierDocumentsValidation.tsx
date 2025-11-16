import { useState, useMemo } from "react";
import { FileText, Search, Download, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FilterMetricCard } from "@/components/ui/filter-metric-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "@/components/suppliers/DocumentStatusBadge";
import { DocumentValidationActions } from "@/components/suppliers/DocumentValidationActions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DOCUMENT_TYPES } from "@/hooks/useSupplierDocuments";

interface DocumentWithSupplier {
  id: string;
  supplier_id: string;
  supplier_name: string;
  document_type: string;
  file_name: string;
  file_path: string;
  status: 'pending' | 'validated' | 'rejected' | 'expired';
  expiry_date: string | null;
  created_at: string;
  rejection_reason: string | null;
}

export default function SupplierDocumentsValidation() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");

  // Buscar documentos de fornecedores do cliente atual
  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ["supplier-documents-validation", user?.clientId],
    queryFn: async () => {
      if (!user?.clientId) return [];

      const { data, error } = await supabase
        .from("supplier_documents")
        .select(`
          id,
          supplier_id,
          document_type,
          file_name,
          file_path,
          status,
          expiry_date,
          created_at,
          rejection_reason,
          suppliers!inner(name)
        `)
        .eq("client_id", user.clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((doc: any) => ({
        ...doc,
        supplier_name: doc.suppliers.name,
      })) as DocumentWithSupplier[];
    },
    enabled: !!user?.clientId,
  });

  // Filtrar documentos
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
      
      const matchesType = documentTypeFilter === "all" || doc.document_type === documentTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [documents, searchTerm, statusFilter, documentTypeFilter]);

  // KPIs
  const pendingCount = documents.filter(d => d.status === 'pending').length;
  const approvedThisWeek = documents.filter(d => {
    if (d.status !== 'validated') return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(d.created_at) >= weekAgo;
  }).length;
  
  const expiringSoon = documents.filter(d => {
    if (!d.expiry_date) return false;
    const daysUntilExpiry = Math.floor(
      (new Date(d.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }).length;

  // Calcular fornecedores com documentação completa
  const supplierIds = [...new Set(documents.map(d => d.supplier_id))];
  const suppliersComplete = supplierIds.filter(supplierId => {
    const supplierDocs = documents.filter(d => d.supplier_id === supplierId);
    const hasValidated = supplierDocs.some(d => d.status === 'validated');
    const hasNoPending = !supplierDocs.some(d => d.status === 'pending');
    const hasNoRejected = !supplierDocs.some(d => d.status === 'rejected');
    return hasValidated && hasNoPending && hasNoRejected && supplierDocs.length > 0;
  }).length;

  const handleValidate = async (documentId: string, status: 'validated' | 'rejected', reason?: string) => {
    const { error } = await supabase
      .from("supplier_documents")
      .update({
        status,
        rejection_reason: status === 'rejected' ? reason : null,
        validated_at: new Date().toISOString(),
        validated_by: user?.id,
      })
      .eq("id", documentId);

    if (error) throw error;
    
    // Registrar auditoria
    await supabase.from("supplier_validations").insert({
      supplier_id: documents.find(d => d.id === documentId)?.supplier_id,
      client_id: user?.clientId,
      validation_type: status === 'validated' ? 'document_approved' : 'document_rejected',
      validation_data: { document_id: documentId, reason },
      status: 'completed',
      performed_by: user?.id,
    });

    refetch();
  };

  const handleDownload = async (doc: DocumentWithSupplier) => {
    const { data, error } = await supabase.storage
      .from("supplier-documents")
      .createSignedUrl(doc.file_path, 3600);

    if (error || !data) {
      console.error("Erro ao baixar documento:", error);
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Validação de Documentos</h1>
          <p className="text-muted-foreground">
            Aprove ou rejeite documentos enviados pelos fornecedores
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FilterMetricCard
          title="Pendentes"
          value={pendingCount}
          icon={<AlertCircle />}
          variant="default"
          isActive={statusFilter === "pending"}
          onClick={() => setStatusFilter("pending")}
        />
        <FilterMetricCard
          title="Aprovados (7 dias)"
          value={approvedThisWeek}
          icon={<FileText />}
          variant="success"
          isActive={false}
          onClick={() => {}}
        />
        <FilterMetricCard
          title="Vencendo em 30 dias"
          value={expiringSoon}
          icon={<AlertCircle />}
          variant="default"
          isActive={false}
          onClick={() => {}}
        />
        <FilterMetricCard
          title="Fornec. Completos"
          value={suppliersComplete}
          icon={<FileText />}
          variant="success"
          isActive={false}
          onClick={() => {}}
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por fornecedor ou tipo de documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="validated">Validados</SelectItem>
                <SelectItem value="rejected">Rejeitados</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos para Validação</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando documentos...</p>
          ) : filteredDocuments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum documento encontrado com os filtros aplicados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.supplier_name}</TableCell>
                      <TableCell>{DOCUMENT_TYPES[doc.document_type] || doc.document_type}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {doc.file_name}
                      </TableCell>
                      <TableCell>
                        <DocumentStatusBadge
                          status={doc.status}
                          tooltipContent={doc.rejection_reason || undefined}
                        />
                      </TableCell>
                      <TableCell>
                        {doc.expiry_date ? (
                          <span
                            className={
                              new Date(doc.expiry_date) < new Date()
                                ? "text-destructive font-medium"
                                : ""
                            }
                          >
                            {format(new Date(doc.expiry_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {doc.status === 'pending' && (
                            <DocumentValidationActions
                              documentId={doc.id}
                              onValidate={handleValidate}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
