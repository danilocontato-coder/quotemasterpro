import { useState } from "react";
import { Plus, Search, Filter, Eye, Trash2, FileText, Edit, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterMetricCard } from "@/components/ui/filter-metric-card";
import { CreateQuoteModal } from "@/components/quotes/CreateQuoteModal";
import { DeleteConfirmationModal } from "@/components/quotes/DeleteConfirmationModal";
import { QuoteComparisonButton } from "@/components/quotes/QuoteComparisonButton";
import { DecisionMatrixManager } from "@/components/quotes/DecisionMatrixManager";
import { useQuotes } from "@/hooks/useQuotes";
import { getStatusColor, getStatusText, Quote } from "@/data/mockData";
import { toast } from "sonner";

export default function Quotes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMatrixManagerOpen, setIsMatrixManagerOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  
  const { quotes, addQuote, updateQuote, deleteQuote } = useQuotes();

  const handleQuoteCreate = (quoteData: any) => {
    const newQuote = addQuote(quoteData);
    toast.success(`Cotação ${newQuote.id} criada com sucesso!`);
    setIsCreateModalOpen(false);
  };

  const handleQuoteUpdate = (quoteData: any) => {
    if (editingQuote) {
      updateQuote(editingQuote.id, quoteData);
      toast.success(`Cotação ${editingQuote.id} atualizada com sucesso!`);
      setEditingQuote(null);
      setIsCreateModalOpen(false);
    }
  };

  const handleDeleteClick = (quote: Quote) => {
    setQuoteToDelete(quote);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = (reason?: string) => {
    if (quoteToDelete) {
      deleteQuote(quoteToDelete.id, reason);
      const action = quoteToDelete.status === 'draft' ? 'excluída' : 'cancelada';
      toast.success(`Cotação ${quoteToDelete.id} ${action} com sucesso!`);
      setQuoteToDelete(null);
    }
  };

  const handleEditClick = (quote: Quote) => {
    setEditingQuote(quote);
    setIsCreateModalOpen(true);
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === "active") {
      matchesFilter = quote.status === "active";
    } else if (activeFilter === "draft") {
      matchesFilter = quote.status === "draft";
    } else if (activeFilter === "receiving") {
      matchesFilter = quote.status === "receiving";
    } else if (activeFilter === "approved") {
      matchesFilter = quote.status === "approved";
    } else if (activeFilter === "finalized") {
      matchesFilter = quote.status === "finalized";
    } else if (activeFilter === "trash") {
      matchesFilter = quote.status === "trash";
    }
    
    return matchesSearch && matchesFilter;
  });

  // Calculate metrics - Based on all active quotes (not trash)
  const activeQuotes = quotes.filter(q => q.status !== 'trash');
  const totalActive = activeQuotes.length;
  const draftQuotes = quotes.filter(q => q.status === 'draft').length;
  const receivingQuotes = quotes.filter(q => q.status === 'receiving').length;
  const approvedQuotes = quotes.filter(q => q.status === 'approved').length;
  const finalizedQuotes = quotes.filter(q => q.status === 'finalized').length;
  const trashQuotes = quotes.filter(q => q.status === 'trash').length;

  // Additional metrics
  const totalRFQs = quotes.length;
  const inProgress = receivingQuotes;
  const dueSoon = quotes.filter(q => {
    if (!q.deadline) return false;
    const deadline = new Date(q.deadline);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
  }).length;
  const responseRate = totalActive > 0 ? Math.round((finalizedQuotes / totalActive) * 100) : 0;

  const statusOptions = [
    { value: "all", label: "Todas" },
    { value: "active", label: "Ativas" },
    { value: "draft", label: "Rascunho" },
    { value: "receiving", label: "Recebendo" },
    { value: "approved", label: "Aprovadas" },
    { value: "finalized", label: "Finalizadas" },
    { value: "trash", label: "Lixeira" },
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
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setIsMatrixManagerOpen(true)}
          >
            <Archive className="h-4 w-4" />
            Matrizes de Decisão
          </Button>
          <Button 
            className="btn-corporate flex items-center gap-2"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nova Cotação
          </Button>
        </div>
      </div>

      {/* Filter Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <FilterMetricCard
          title="Todas Ativas"
          value={totalActive}
          isActive={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
          colorClass="text-blue-600"
        />
        <FilterMetricCard
          title="Rascunhos"
          value={draftQuotes}
          isActive={activeFilter === "draft"}
          onClick={() => setActiveFilter("draft")}
          colorClass="text-gray-600"
        />
        <FilterMetricCard
          title="Recebendo"
          value={receivingQuotes}
          isActive={activeFilter === "receiving"}
          onClick={() => setActiveFilter("receiving")}
          colorClass="text-orange-600"
        />
        <FilterMetricCard
          title="Aprovadas"
          value={approvedQuotes}
          isActive={activeFilter === "approved"}
          onClick={() => setActiveFilter("approved")}
          colorClass="text-green-600"
        />
        <FilterMetricCard
          title="Finalizadas"
          value={finalizedQuotes}
          isActive={activeFilter === "finalized"}
          onClick={() => setActiveFilter("finalized")}
          colorClass="text-purple-600"
        />
        <FilterMetricCard
          title="Lixeira"
          value={trashQuotes}
          isActive={activeFilter === "trash"}
          onClick={() => setActiveFilter("trash")}
          colorClass="text-red-600"
        />
      </div>

      {/* Additional Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRFQs}</p>
              <p className="text-sm text-muted-foreground">Total de RFQs</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Eye className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgress}</p>
              <p className="text-sm text-muted-foreground">Em Andamento</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Filter className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dueSoon}</p>
              <p className="text-sm text-muted-foreground">Vencendo Hoje</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Plus className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{responseRate}%</p>
              <p className="text-sm text-muted-foreground">Taxa de Resposta</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="card-corporate">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por RFQ, título ou cliente..."
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
                  <th>Título</th>
                  <th>Status</th>
                  <th>Itens</th>
                  <th>Respostas</th>
                  <th>Prazo</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id}>
                    <td>
                      <div>
                        <p className="font-medium">{quote.title}</p>
                        <p className="text-sm text-muted-foreground font-mono">ID: {quote.id}</p>
                      </div>
                    </td>
                    <td>
                      <Badge className={getStatusColor(quote.status)}>
                        {getStatusText(quote.status)}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{quote.itemsCount} item(s)</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        {quote.responsesCount}/{quote.responseTotal}
                        <p className="text-xs text-muted-foreground">propostas</p>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        {quote.deadline ? (
                          <>
                            <p>{new Date(quote.deadline).toLocaleDateString('pt-BR')}</p>
                            <p className="text-xs text-orange-600">
                              {Math.ceil((new Date(quote.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias restantes
                            </p>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Sem prazo</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <p className="text-sm">
                        {new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEditClick(quote)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {/* Comparator button - only show for quotes with multiple proposals */}
                        {(quote.status === 'receiving' || quote.status === 'approved') && quote.responsesCount >= 1 && (
                          <QuoteComparisonButton
                            quoteId={quote.id}
                            quoteTitle={quote.title}
                            disabled={false}
                          />
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title={quote.status === 'draft' ? 'Excluir' : 'Cancelar'}
                          onClick={() => handleDeleteClick(quote)}
                        >
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

      {/* Create/Edit Quote Modal */}
      <CreateQuoteModal 
        open={isCreateModalOpen} 
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) {
            setEditingQuote(null);
          }
        }}
        onQuoteCreate={editingQuote ? handleQuoteUpdate : handleQuoteCreate}
        editingQuote={editingQuote}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        quote={quoteToDelete}
        onConfirm={handleDeleteConfirm}
      />

      {/* Decision Matrix Manager */}
      <DecisionMatrixManager
        open={isMatrixManagerOpen}
        onClose={() => setIsMatrixManagerOpen(false)}
      />

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