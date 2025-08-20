import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Send, MessageSquare, Search, FileText } from "lucide-react";
import { useSupplierQuotes } from "@/hooks/useSupplierQuotes";
import { QuoteProposalModal } from "@/components/supplier/QuoteProposalModal";

export default function SupplierQuotes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  
  const { supplierQuotes } = useSupplierQuotes();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Aguardando Proposta</Badge>;
      case 'proposal_sent':
        return <Badge variant="default">Proposta Enviada</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredQuotes = supplierQuotes.filter(quote => {
    const matchesSearch = 
      quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = supplierQuotes.reduce((acc, quote) => {
    acc[quote.status] = (acc[quote.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleViewQuote = (quote: any) => {
    setSelectedQuote(quote);
    setIsProposalModalOpen(true);
  };

  const handleSendProposal = (quote: any) => {
    setSelectedQuote(quote);
    setIsProposalModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Minhas Cotações</h1>
        <p className="text-muted-foreground">
          Gerencie suas solicitações de cotação e propostas
        </p>
      </div>

      {/* Filters and Search */}
      <Card className="card-corporate">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por título, cliente, ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Aguardando ({statusCounts.pending || 0})</SelectItem>
                <SelectItem value="proposal_sent">Proposta Enviada ({statusCounts.proposal_sent || 0})</SelectItem>
                <SelectItem value="approved">Aprovado ({statusCounts.approved || 0})</SelectItem>
                <SelectItem value="rejected">Rejeitado ({statusCounts.rejected || 0})</SelectItem>
                <SelectItem value="expired">Expirado ({statusCounts.expired || 0})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card className="card-corporate">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Cotações ({filteredQuotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Valor Estimado</TableHead>
                  <TableHead>Proposta</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-mono text-sm">{quote.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{quote.title}</p>
                        <p className="text-sm text-muted-foreground">{quote.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>{quote.client}</TableCell>
                    <TableCell>{getStatusBadge(quote.status)}</TableCell>
                    <TableCell>
                      <span className={quote.status === 'expired' ? 'text-red-600' : ''}>
                        {new Date(quote.deadline).toLocaleDateString('pt-BR')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {quote.estimatedValue ? (
                        <span className="font-medium text-green-600">
                          R$ {quote.estimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {quote.proposal ? (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">
                            R$ {quote.proposal.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <Badge variant={quote.proposal.status === 'sent' ? 'default' : 'secondary'}>
                            {quote.proposal.status === 'sent' ? 'Enviada' : 'Rascunho'}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewQuote(quote)}
                          title="Ver detalhes e proposta"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {quote.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleSendProposal(quote)}
                            title="Enviar proposta"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" title="Mensagens">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredQuotes.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma cotação encontrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <QuoteProposalModal
        quote={selectedQuote}
        open={isProposalModalOpen}
        onOpenChange={setIsProposalModalOpen}
      />
    </div>
  );
}