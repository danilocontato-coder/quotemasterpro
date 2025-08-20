import { useState } from "react";
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
import { useApprovals } from "@/hooks/useApprovals";

export function Approvals() {
  const { approvals, searchTerm, setSearchTerm } = useApprovals();
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pending");

  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = approval.quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         approval.quote.client.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "pending") return matchesSearch && approval.status === "pending";
    if (activeTab === "approved") return matchesSearch && approval.status === "approved";
    if (activeTab === "rejected") return matchesSearch && approval.status === "rejected";
    return matchesSearch;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

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

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: "bg-destructive text-destructive-foreground",
      medium: "bg-warning text-warning-foreground",
      low: "bg-success text-white"
    };
    return colors[priority as keyof typeof colors] || "bg-secondary";
  };

  const getPriorityText = (priority: string) => {
    const priorityText = {
      high: "Alta",
      medium: "Média", 
      low: "Baixa"
    };
    return priorityText[priority as keyof typeof priorityText] || priority;
  };

  const handleViewDetails = (approval: any) => {
    setSelectedApproval(approval);
    setDetailModalOpen(true);
  };

  const pendingCount = approvals.filter(a => a.status === "pending").length;
  const approvedCount = approvals.filter(a => a.status === "approved").length;
  const rejectedCount = approvals.filter(a => a.status === "rejected").length;

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
                <p className="text-sm text-muted-foreground">Rejeitadas</p>
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
                placeholder="Buscar por cotação ou cliente..."
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
                Rejeitadas ({rejectedCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cotação</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Solicitado em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovals.map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{approval.quote.title}</div>
                            <div className="text-sm text-muted-foreground">
                              #{approval.quote.id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{approval.quote.client}</TableCell>
                        <TableCell>{formatCurrency(approval.quote.total)}</TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(approval.priority)}>
                            {getPriorityText(approval.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {approval.requestedAt}
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
                              <QuoteMarkAsReceivedButton
                                quoteId={approval.quote.id}
                                supplierName="Fornecedor Mock" // In real app, would come from approval data
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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