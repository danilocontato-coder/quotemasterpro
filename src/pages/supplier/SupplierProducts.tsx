import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Package, AlertTriangle, MoreHorizontal, Eye, Power, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useSupplierProducts, SupplierProduct } from "@/hooks/useSupplierProducts";
import { CreateProductModal } from "@/components/supplier/CreateProductModal";
import { EditProductModal } from "@/components/supplier/EditProductModal";
import { StockManagementModal } from "@/components/supplier/StockManagementModal";
import { toast } from "@/hooks/use-toast";

export default function SupplierProducts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SupplierProduct | null>(null);

  const { 
    products, 
    deleteProduct, 
    toggleProductStatus, 
    getCategories,
    getLowStockProducts,
    getOutOfStockProducts,
    isLoading 
  } = useSupplierProducts();

  const categories = getCategories();

  const getStockStatus = (quantity: number, minLevel: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">Sem Estoque</Badge>;
    } else if (quantity <= minLevel) {
      return <Badge variant="secondary" className="text-orange-600 border-orange-600">Estoque Baixo</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Em Estoque</Badge>;
    }
  };

  const getStatusBadge = (status: SupplierProduct['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleEditProduct = (product: SupplierProduct) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleManageStock = (product: SupplierProduct) => {
    setSelectedProduct(product);
    setIsStockModalOpen(true);
  };

  const handleToggleStatus = async (product: SupplierProduct) => {
    try {
      await toggleProductStatus(product.id);
      const newStatus = product.status === 'active' ? 'inativo' : 'ativo';
      toast({
        title: "Status atualizado",
        description: `Produto ${product.name} foi marcado como ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do produto.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (product: SupplierProduct) => {
    if (window.confirm(`Tem certeza que deseja excluir "${product.name}"? Esta ação não pode ser desfeita.`)) {
      try {
        await deleteProduct(product.id);
        toast({
          title: "Produto excluído",
          description: `${product.name} foi removido do seu catálogo.`,
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível excluir o produto.",
          variant: "destructive",
        });
      }
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const lowStockProducts = getLowStockProducts();
  const outOfStockProducts = getOutOfStockProducts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie seu catálogo de produtos e estoque
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Stock Alerts */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-medium">Atenção aos Estoques</p>
                <p className="text-sm">
                  {outOfStockProducts.length > 0 && `${outOfStockProducts.length} produto(s) sem estoque`}
                  {outOfStockProducts.length > 0 && lowStockProducts.length > 0 && ' • '}
                  {lowStockProducts.length > 0 && `${lowStockProducts.length} produto(s) com estoque baixo`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                placeholder="Buscar por nome, código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="card-corporate">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Produtos ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Preço Unitário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">{product.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.stockQuantity}</span>
                        {getStockStatus(product.stockQuantity, product.minStockLevel)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        R$ {product.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleManageStock(product)}>
                            <Package className="mr-2 h-4 w-4" />
                            Gerenciar Estoque
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleStatus(product)}>
                            <Power className="mr-2 h-4 w-4" />
                            {product.status === 'active' ? 'Desativar' : 'Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProduct(product)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum produto encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateProductModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />
      
      <EditProductModal 
        product={selectedProduct}
        open={isEditModalOpen} 
        onOpenChange={setIsEditModalOpen} 
      />

      <StockManagementModal
        product={selectedProduct}
        open={isStockModalOpen}
        onOpenChange={setIsStockModalOpen}
      />
    </div>
  );
}