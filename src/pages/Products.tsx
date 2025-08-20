import { useState, useEffect } from "react";
import { Plus, Search, Filter, Eye, Edit, Package, AlertTriangle, Wrench, Leaf, Zap, Upload, TrendingUp, Trash2, History, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterMetricCard } from "@/components/ui/filter-metric-card";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { CreateItemModal } from "@/components/items/CreateItemModal";
import { EditItemModal } from "@/components/items/EditItemModal";
import { ViewItemModal } from "@/components/items/ViewItemModal";
import { DeleteItemModal } from "@/components/items/DeleteItemModal";
import { StockMovementModal } from "@/components/items/StockMovementModal";
import { InvoiceImportModal } from "@/components/items/InvoiceImportModal";
import { StockMovementLogModal } from "@/components/items/StockMovementLogModal";
import { useItems } from "@/hooks/useItems";
import { getStatusColor, getStatusText } from "@/data/mockData";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 9 itens por página (grid 3x3 confortável)

  const {
    items,
    stockMovements,
    auditLogs,
    createItem,
    updateItem,
    deleteItem,
    createStockMovement,
    importItems,
    getLowStockItems,
  } = useItems();

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === "products") {
      matchesFilter = item.type === "product";
    } else if (activeFilter === "services") {
      matchesFilter = item.type === "service";
    } else if (activeFilter === "normal") {
      matchesFilter = item.type === "product" && item.stockQuantity > 10;
    } else if (activeFilter === "low") {
      matchesFilter = item.type === "product" && item.stockQuantity > 5 && item.stockQuantity <= 10;
    } else if (activeFilter === "critical") {
      matchesFilter = item.type === "product" && item.stockQuantity <= 5;
    }
    
    return matchesSearch && matchesFilter;
  });

  // Calculate metrics
  const totalItems = items.length;
  const totalProducts = items.filter(i => i.type === "product").length;
  const totalServices = items.filter(i => i.type === "service").length;
  const normalStockItems = items.filter(i => i.type === "product" && i.stockQuantity > 10).length;
  const lowStockItems = items.filter(i => i.type === "product" && i.stockQuantity > 5 && i.stockQuantity <= 10).length;
  const criticalStockItems = items.filter(i => i.type === "product" && i.stockQuantity <= 5).length;

  // Cálculos de paginação
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, endIndex);

  // Reset da página quando filtros mudam
  const resetPage = () => {
    setCurrentPage(1);
  };

  // Resetar página quando filtros mudam
  useEffect(() => {
    resetPage();
  }, [searchTerm, activeFilter]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Materiais de Construção":
        return <Package className="h-4 w-4" />;
      case "Produtos de Limpeza":
        return <Package className="h-4 w-4" />;
      case "Elétrica e Iluminação":
        return <Zap className="h-4 w-4" />;
      case "Jardinagem":
        return <Leaf className="h-4 w-4" />;
      case "Ferramentas":
        return <Wrench className="h-4 w-4" />;
      case "Serviços":
        return <Wrench className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const handleViewItem = (item: any) => {
    setSelectedItem(item);
    setViewModalOpen(true);
  };

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setEditModalOpen(true);
  };

  const handleDeleteItem = (item: any) => {
    setSelectedItem(item);
    setDeleteModalOpen(true);
  };

  const handleStockMovement = (item: any) => {
    setSelectedItem(item);
    setStockModalOpen(true);
  };

  const handleDeleteConfirm = (item: any, reason?: string) => {
    deleteItem(item.id, reason);
    setDeleteModalOpen(false);
    setSelectedItem(null);
  };

  const handleItemUpdate = (itemId: string, updates: any) => {
    updateItem(itemId, updates);
    setEditModalOpen(false);
    setSelectedItem(null);
  };

  const handleStockMovementCreate = (movement: any) => {
    createStockMovement(movement);
    setStockModalOpen(false);
    setSelectedItem(null);
  };

  const handleImportComplete = (importedItems: any[]) => {
    importItems(importedItems);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity <= 5) return { label: "Crítico", color: "text-red-600 bg-red-50 border-red-200" };
    if (quantity <= 10) return { label: "Baixo", color: "text-orange-600 bg-orange-50 border-orange-200" };
    return { label: "Normal", color: "text-green-600 bg-green-50 border-green-200" };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Itens</h1>
          <p className="text-muted-foreground">
            Gerencie produtos e serviços para facilitar cotações e controle de estoque
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setLogModalOpen(true)}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            Logs
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar NF
          </Button>
          <CategoryManager />
          <CreateItemModal onItemCreate={createItem} />
        </div>
      </div>

      {/* Filter Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <FilterMetricCard
          title="Total"
          value={totalItems}
          isActive={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
          colorClass="text-foreground"
        />
        <FilterMetricCard
          title="Produtos"
          value={totalProducts}
          isActive={activeFilter === "products"}
          onClick={() => setActiveFilter("products")}
          colorClass="text-primary"
        />
        <FilterMetricCard
          title="Serviços"
          value={totalServices}
          isActive={activeFilter === "services"}
          onClick={() => setActiveFilter("services")}
          colorClass="text-success"
        />
        <FilterMetricCard
          title="Normal"
          value={normalStockItems}
          isActive={activeFilter === "normal"}
          onClick={() => setActiveFilter("normal")}
          colorClass="text-success"
        />
        <FilterMetricCard
          title="Baixo"
          value={lowStockItems}
          isActive={activeFilter === "low"}
          onClick={() => setActiveFilter("low")}
          colorClass="text-warning"
        />
        <FilterMetricCard
          title="Crítico"
          value={criticalStockItems}
          isActive={activeFilter === "critical"}
          onClick={() => setActiveFilter("critical")}
          colorClass="text-destructive"
        />
      </div>

      {/* Search and Filters */}
      <Card className="card-corporate">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por RFQ, nome, código ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentItems.map((item) => {
          const stockStatus = getStockStatus(item.stockQuantity);
          const isService = item.type === 'service';
          return (
            <Card key={item.id} className="card-corporate hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {isService ? <Wrench className="h-4 w-4" /> : getCategoryIcon(item.category)}
                    <div className="flex-1">
                      <CardTitle className="text-base leading-tight">{item.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {item.code}
                      </p>
                      {item.imported && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Importado
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!isService && item.stockQuantity <= 10 && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Item Info */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Categoria:</span>
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                  </div>
                </div>

                {/* Stock and Availability */}
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {isService ? 'Disponível' : 'Quantidade'}:
                    </span>
                    <div className="flex items-center gap-2">
                      {isService ? (
                        <Badge className="badge-success">Disponível</Badge>
                      ) : (
                        <>
                          <span className="font-semibold">{item.stockQuantity}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${stockStatus.color}`}>
                            {stockStatus.label}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tipo:</span>
                    <Badge variant="outline" className="text-xs">
                      {isService ? 'Serviço' : 'Produto'}
                    </Badge>
                  </div>
                  {item.unitPrice && item.unitPrice > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {isService ? 'Preço Ref.' : 'Preço Unit.'}:
                      </span>
                      <span className="text-sm font-medium text-primary">
                        R$ {item.unitPrice.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewItem(item)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEditItem(item)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {!isService && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => handleStockMovement(item)}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Movimentar
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={!isService ? "flex-1" : "w-full"}
                      onClick={() => handleDeleteItem(item)}
                      disabled={item.status === 'inactive'}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredItems.length)} de {filteredItems.length} itens
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-10"
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <Card className="card-corporate">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum item encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || activeFilter !== "all" 
                ? "Tente ajustar os filtros de busca"
                : "Comece cadastrando seu primeiro produto ou serviço"
              }
            </p>
            {!searchTerm && activeFilter === "all" && (
              <CreateItemModal 
                onItemCreate={createItem}
                trigger={
                  <Button className="btn-corporate">
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Primeiro Item
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      )}


      {/* Modals */}
      <ViewItemModal
        item={selectedItem}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
      />

      <EditItemModal
        item={selectedItem}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onItemUpdate={handleItemUpdate}
      />

      <DeleteItemModal
        item={selectedItem}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
      />

      <StockMovementModal
        item={selectedItem}
        open={stockModalOpen}
        onOpenChange={setStockModalOpen}
        onMovementCreate={handleStockMovementCreate}
      />

      <InvoiceImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportComplete={handleImportComplete}
      />

      <StockMovementLogModal
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
        movements={stockMovements}
        auditLogs={auditLogs}
      />
    </div>
  );
}