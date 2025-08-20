import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Send, MessageSquare, Search } from "lucide-react";
import { Link } from "react-router-dom";

interface Quote {
  id: string;
  title: string;
  description: string;
  client: string;
  status: 'pending' | 'proposal_sent' | 'approved' | 'rejected' | 'expired';
  deadline: string;
  estimatedValue?: number;
  sentAt?: string;
  createdAt: string;
}

export default function SupplierQuotes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock data - In production this would come from hooks/API
  const quotes: Quote[] = [
    {
      id: 'RFQ009',
      title: 'Manutenção Elétrica',
      description: 'Manutenção do sistema elétrico predial',
      client: 'Condomínio Jardim das Flores',
      status: 'pending',
      deadline: '2025-08-28T23:59:59Z',
      estimatedValue: 3500.00,
      createdAt: '2025-08-18T16:45:00Z'
    },
    {
      id: 'RFQ008',
      title: 'Materiais de Construção',
      description: 'Materiais para reforma do bloco A',
      client: 'Residencial Vista Alegre',
      status: 'approved',
      deadline: '2025-08-25T23:59:59Z',
      estimatedValue: 8200.00,
      sentAt: '2025-08-20T10:30:00Z',
      createdAt: '2025-08-18T14:20:00Z'
    },
    {
      id: 'RFQ007',
      title: 'Equipamentos de Limpeza',
      description: 'Equipamentos para áreas comuns',
      client: 'Condomínio Jardim das Flores',
      status: 'proposal_sent',
      deadline: '2025-08-30T23:59:59Z',
      estimatedValue: 1200.00,
      sentAt: '2025-08-19T15:20:00Z',
      createdAt: '2025-08-17T09:10:00Z'
    },
    {
      id: 'RFQ006',
      title: 'Pintura Externa',
      description: 'Pintura da fachada do edifício',
      client: 'Condomínio Sol Nascente',
      status: 'rejected',
      deadline: '2025-08-22T23:59:59Z',
      estimatedValue: 15000.00,
      sentAt: '2025-08-15T11:00:00Z',
      createdAt: '2025-08-14T08:30:00Z'
    },
    {
      id: 'RFQ005',
      title: 'Jardinagem',
      description: 'Manutenção das áreas verdes',
      client: 'Residencial Primavera',
      status: 'expired',
      deadline: '2025-08-15T23:59:59Z',
      estimatedValue: 2500.00,
      createdAt: '2025-08-10T14:15:00Z'
    }
  ];

  const getStatusBadge = (status: Quote['status']) => {
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

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'pending': return 'text-blue-600';
      case 'proposal_sent': return 'text-yellow-600';
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'expired': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = quotes.reduce((acc, quote) => {
    acc[quote.status] = (acc[quote.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/supplier/quotes/${quote.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {quote.status === 'pending' && (
                          <Button variant="ghost" size="sm">
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
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
    </div>
  );
}