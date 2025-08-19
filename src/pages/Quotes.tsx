import { useState } from "react";
import { Plus, Search, Filter, Eye, Edit, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockQuotes, getStatusColor, getStatusText } from "@/data/mockData";

export default function Quotes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredQuotes = mockQuotes.filter(quote => {
    const matchesSearch = quote.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: "all", label: "Todas" },
    { value: "draft", label: "Rascunho" },
    { value: "pending", label: "Pendente" },
    { value: "approved", label: "Aprovado" },
    { value: "completed", label: "Concluído" },
    { value: "rejected", label: "Rejeitado" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cotações</h1>
          <p className="text-muted-foreground">
            Gerencie todas as cotações e solicitações de orçamento
          </p>
        </div>
        <Button className="btn-corporate flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Cotação
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="card-corporate">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por descrição ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card className="card-corporate">
        <CardHeader>
          <CardTitle>
            Lista de Cotações ({filteredQuotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="table-corporate">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Descrição</th>
                  <th>Cliente</th>
                  <th>Fornecedor</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id}>
                    <td className="font-mono text-sm">#{quote.id}</td>
                    <td>
                      <div className="max-w-xs truncate">
                        <p className="font-medium">{quote.description}</p>
                      </div>
                    </td>
                    <td>
                      <p className="text-sm">{quote.clientName}</p>
                    </td>
                    <td>
                      <p className="text-sm">
                        {quote.supplierName || "-"}
                      </p>
                    </td>
                    <td>
                      <p className="font-semibold">
                        R$ {quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td>
                      <Badge className={getStatusColor(quote.status)}>
                        {getStatusText(quote.status)}
                      </Badge>
                    </td>
                    <td>
                      <p className="text-sm">
                        {new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredQuotes.length === 0 && (
        <Card className="card-corporate">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma cotação encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all" 
                ? "Tente ajustar os filtros de busca"
                : "Comece criando sua primeira cotação"
              }
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button className="btn-corporate">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Cotação
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}