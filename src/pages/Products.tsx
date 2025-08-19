import { useState } from "react";
import { Plus, Search, Filter, Eye, Edit, Package, AlertTriangle, Wrench, Leaf, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterMetricCard } from "@/components/ui/filter-metric-card";
import { mockProducts, getStatusColor, getStatusText } from "@/data/mockData";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === "construction") {
      matchesFilter = product.category === "Materiais de Construção";
    } else if (activeFilter === "cleaning") {
      matchesFilter = product.category === "Produtos de Limpeza";
    } else if (activeFilter === "electrical") {
      matchesFilter = product.category === "Elétrica e Iluminação";
    } else if (activeFilter === "lowstock") {
      matchesFilter = product.stockQuantity <= 10;
    }
    
    return matchesSearch && matchesFilter;
  });

  // Calculate metrics by category
  const totalProducts = mockProducts.length;
  const constructionProducts = mockProducts.filter(p => p.category === "Materiais de Construção").length;
  const cleaningProducts = mockProducts.filter(p => p.category === "Produtos de Limpeza").length;
  const electricalProducts = mockProducts.filter(p => p.category === "Elétrica e Iluminação").length;
  const lowStockProducts = mockProducts.filter(p => p.stockQuantity <= 10).length;

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
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity <= 5) return { label: "Crítico", color: "badge-error" };
    if (quantity <= 10) return { label: "Baixo", color: "badge-warning" };
    return { label: "Normal", color: "badge-success" };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos e Estoque</h1>
          <p className="text-muted-foreground">
            Gerencie o catálogo de produtos e controle de estoque do condomínio
          </p>
        </div>
        <Button className="btn-corporate flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Filter Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <FilterMetricCard
          title="Total"
          value={totalProducts}
          isActive={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
          colorClass="text-foreground"
        />
        <FilterMetricCard
          title="Construção"
          value={constructionProducts}
          isActive={activeFilter === "construction"}
          onClick={() => setActiveFilter("construction")}
          colorClass="text-primary"
        />
        <FilterMetricCard
          title="Limpeza"
          value={cleaningProducts}
          isActive={activeFilter === "cleaning"}
          onClick={() => setActiveFilter("cleaning")}
          colorClass="text-success"
        />
        <FilterMetricCard
          title="Elétrica"
          value={electricalProducts}
          isActive={activeFilter === "electrical"}
          onClick={() => setActiveFilter("electrical")}
          colorClass="text-warning"
        />
        <FilterMetricCard
          title="Estoque Baixo"
          value={lowStockProducts}
          isActive={activeFilter === "lowstock"}
          onClick={() => setActiveFilter("lowstock")}
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
                placeholder="Buscar por nome, código ou categoria..."
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

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(product.stockQuantity);
          return (
            <Card key={product.id} className="card-corporate hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(product.category)}
                    <div className="flex-1">
                      <CardTitle className="text-base leading-tight">{product.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {product.code}
                      </p>
                    </div>
                  </div>
                  {product.stockQuantity <= 10 && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Info */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Categoria:</span>
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                  </div>
                </div>

                {/* Stock and Price */}
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estoque:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{product.stockQuantity}</span>
                      <Badge className={stockStatus.color}>
                        {stockStatus.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Preço unitário:</span>
                    <span className="font-bold text-primary">
                      R$ {product.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <Card className="card-corporate">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || activeFilter !== "all" 
                ? "Tente ajustar os filtros de busca"
                : "Comece cadastrando seu primeiro produto"
              }
            </p>
            {!searchTerm && activeFilter === "all" && (
              <Button className="btn-corporate">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Produto
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stock Alerts */}
      {lowStockProducts > 0 && (
        <Card className="card-corporate border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {lowStockProducts} produto(s) com estoque baixo ou crítico precisam de atenção
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockProducts
                .filter(p => p.stockQuantity <= 10)
                .slice(0, 4)
                .map(product => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">{product.stockQuantity}</p>
                      <p className="text-xs text-muted-foreground">unidades</p>
                    </div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}