import { useState } from "react";
import { Plus, Search, Filter, Eye, Edit, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FilterMetricCard } from "@/components/ui/filter-metric-card";
import { ProductSelector, QuickAddProduct } from "@/components/products/ProductSelector";
import { QuickAddSupplier } from "@/components/suppliers/QuickAddSupplier";
import { mockQuotes, mockProducts, getStatusColor, getStatusText, Product, Supplier } from "@/data/mockData";

export default function Quotes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newQuoteProducts, setNewQuoteProducts] = useState<Array<{product: Product, quantity: number}>>([]);

  const filteredQuotes = mockQuotes.filter(quote => {
    const matchesSearch = quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.description.toLowerCase().includes(searchTerm.toLowerCase());
    
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
  const activeQuotes = mockQuotes.filter(q => q.status !== 'trash');
  const totalActive = activeQuotes.length;
  const draftQuotes = mockQuotes.filter(q => q.status === 'draft').length;
  const receivingQuotes = mockQuotes.filter(q => q.status === 'receiving').length;
  const approvedQuotes = mockQuotes.filter(q => q.status === 'approved').length;
  const finalizedQuotes = mockQuotes.filter(q => q.status === 'finalized').length;
  const trashQuotes = mockQuotes.filter(q => q.status === 'trash').length;

  // Additional metrics
  const totalRFQs = mockQuotes.length;
  const inProgress = receivingQuotes;
  const dueSoon = mockQuotes.filter(q => {
    if (!q.deadline) return false;
    const deadline = new Date(q.deadline);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
  }).length;
  const responseRate = totalActive > 0 ? Math.round((finalizedQuotes / totalActive) * 100) : 0;

  const handleProductSelect = (product: Product, quantity: number) => {
    const existingIndex = newQuoteProducts.findIndex(item => item.product.id === product.id);
    if (existingIndex >= 0) {
      const updated = [...newQuoteProducts];
      updated[existingIndex].quantity = quantity;
      setNewQuoteProducts(updated);
    } else {
      setNewQuoteProducts(prev => [...prev, { product, quantity }]);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setNewQuoteProducts(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleProductAdd = (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...productData,
      id: `new-${Date.now()}`
    };
    // In a real app, this would be saved to the database
    console.log('New product created:', newProduct);
  };

  const handleSupplierAdd = (supplierData: Omit<Supplier, 'id' | 'createdAt'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `new-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    // In a real app, this would be saved to the database
    console.log('New supplier created:', newSupplier);
  };

  const calculateQuoteTotal = () => {
    // Since products don't have prices, return 0 - prices will be filled by suppliers
    return 0;
  };

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
        <Button 
          className="btn-corporate flex items-center gap-2"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Nova Cotação
        </Button>
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
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
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

      {/* Create Quote Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Cotação</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium">Título da Cotação</label>
                <Input placeholder="Ex: Materiais de Construção, Equipamentos de Limpeza..." />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <Input placeholder="Descreva detalhes adicionais da cotação..." />
              </div>
              <div>
                <label className="text-sm font-medium">Prazo para Respostas</label>
                <Input type="date" />
              </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Produtos e Itens</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProductSelector 
                  onProductSelect={handleProductSelect}
                  selectedProducts={newQuoteProducts.map(item => item.product.id)}
                />
                <QuickAddProduct onProductAdd={handleProductAdd} />
              </div>

              <QuickAddSupplier onSupplierAdd={handleSupplierAdd} />

              {/* Selected Products */}
              {newQuoteProducts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Produtos Selecionados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {newQuoteProducts.map(({ product, quantity }) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.code} • {product.category}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="text-sm font-medium">{quantity}x</p>
                              <p className="text-xs text-muted-foreground">
                                {product.category}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                Aguardando cotação
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveProduct(product.id)}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      <div className="border-t pt-3 flex justify-between items-center">
                        <span className="font-semibold">Total de Itens:</span>
                        <span className="text-lg font-bold text-primary">
                          {newQuoteProducts.reduce((total, item) => total + item.quantity, 0)} itens
                        </span>
                      </div>
                      <div className="text-center pt-2">
                        <p className="text-sm text-muted-foreground">
                          Valores serão preenchidos pelos fornecedores
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewQuoteProducts([]);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button variant="outline" className="flex-1">
                Salvar Rascunho
              </Button>
              <Button className="flex-1">
                Enviar Cotação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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