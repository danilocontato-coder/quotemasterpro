import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Eye,
  ThumbsUp,
  ThumbsDown,
  Timer,
  FileText
} from "lucide-react";
import { ApprovalDetailModal } from "@/components/approvals/ApprovalDetailModal";
import { QuoteMarkAsReceivedButton } from "@/components/quotes/QuoteMarkAsReceivedButton";
import { useSupabaseApprovals, type Approval } from "@/hooks/useSupabaseApprovals";
import { PageLoader } from "@/components/ui/page-loader";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";

export function Approvals() {
  const { approvals, isLoading, refetch } = useSupabaseApprovals();
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  
  const [approverNames, setApproverNames] = useState<Record<string, string>>({});

  // Load approvals on component mount
  useEffect(() => {
    refetch();
  }, []);

  // Fetch approver names only (quotes data now comes from the hook)
  useEffect(() => {
    const fetchApproverNames = async () => {
      if (approvals.length === 0) return;

      // Fetch approver names
      const approverIds = [...new Set(approvals.map(a => a.approver_id).filter(Boolean))];
      if (approverIds.length > 0) {
        try {
          const { data: users } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', approverIds);
          
          const namesMap = users?.reduce((acc, user) => {
            acc[user.id] = user.name;
            return acc;
          }, {} as Record<string, string>) || {};
          
          setApproverNames(namesMap);
        } catch (error) {
          console.error('Error fetching approver names:', error);
        }
      }
    };

    fetchApproverNames();
  }, [approvals]);

  const filteredApprovals = approvals.filter(approval => {
    const quote = approval.quotes;
    const matchesSearch = approval.quote_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote?.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "pending") return matchesSearch && approval.status === "pending";
    if (activeTab === "approved") return matchesSearch && approval.status === "approved";
    if (activeTab === "rejected") return matchesSearch && approval.status === "rejected";
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-warning text-warning-foreground",
      approved: "bg-success text-white",
      rejected: "bg-destructive text-destructive-foreground"
    };
    return colors[status as keyof typeof colors] || "bg-secondary";
  };

  const getStatusText = (status: string) => {
    const statusText = {
      pending: "Pendente",
      approved: "Aprovado",
      rejected: "Rejeitado"
    };
    return statusText[status as keyof typeof statusText] || status;
  };

  const handleViewDetails = (approval: Approval) => {
    setSelectedApproval(approval);
    setDetailModalOpen(true);
  };

  const pendingCount = approvals.filter(a => a.status === "pending").length;
  const approvedCount = approvals.filter(a => a.status === "approved").length;
  const rejectedCount = approvals.filter(a => a.status === "rejected").length;

  if (isLoading) {
    return (
      <PageLoader
        hasHeader={true}
        hasMetrics={true}
        hasSearch={true}
        hasTable={true}
        metricsCount={4}
        tableRows={8}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aprovações</h1>
          <p className="text-muted-foreground">
            Gerencie aprovações de cotações e compras
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Timer className="h-8 w-8 text-warning" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <ThumbsUp className="h-8 w-8 text-success" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-sm text-muted-foreground">Aprovadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <ThumbsDown className="h-8 w-8 text-destructive" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-sm text-muted-foreground">Reprovadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-info" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{approvals.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Aprovações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cotação, título ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pendentes ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Aprovadas ({approvedCount})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Reprovadas ({rejectedCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cotação</TableHead>
                      <TableHead>Cliente / Fornecedor</TableHead>
                      <TableHead>Valor / Itens</TableHead>
                      <TableHead>Aprovador</TableHead>
                      <TableHead>Prazos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                   <TableBody>
                     {filteredApprovals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              {activeTab === "pending" ? "Nenhuma aprovação pendente" :
                               activeTab === "approved" ? "Nenhuma aprovação aprovada" :
                               "Nenhuma aprovação reprovada"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredApprovals.map((approval) => {
                        const quote = approval.quotes;
                        return (
                          <TableRow key={approval.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">#{approval.quote_id}</div>
                                {quote?.title && (
                                  <div className="text-sm text-muted-foreground">
                                    {quote.title}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {quote?.client_name || 'Carregando...'}
                                </div>
                                {quote?.supplier_name && (
                                  <div className="text-sm text-muted-foreground">
                                    Fornecedor: {quote.supplier_name}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-semibold">
                                  {quote ? formatCurrency(quote.total || 0) : 'Carregando...'}
                                </div>
                                {quote?.items_count && (
                                  <div className="text-sm text-muted-foreground">
                                    {quote.items_count} {quote.items_count === 1 ? 'item' : 'itens'}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {approval.approver_id ? 
                                  (approverNames[approval.approver_id] || approval.approver_id) : 
                                  'Não atribuído'
                                }
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>
                                  Solicitado: {new Date(approval.created_at).toLocaleDateString('pt-BR')}
                                </div>
                                {quote?.deadline && (
                                  <div className="text-muted-foreground">
                                    Prazo: {new Date(quote.deadline).toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                                {quote?.created_at && (
                                  <div className="text-muted-foreground">
                                    Cotação: {new Date(quote.created_at).toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(approval.status)}>
                                {getStatusText(approval.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleViewDetails(approval)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Detalhes
                                </Button>
                                {approval.status === 'approved' && (
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Cotação
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedApproval && (
        <ApprovalDetailModal 
          open={detailModalOpen} 
          onClose={() => setDetailModalOpen(false)}
          approval={selectedApproval}
        />
      )}
    </div>
  );
}