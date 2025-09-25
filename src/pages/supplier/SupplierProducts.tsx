import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Package, Edit, Trash2, AlertTriangle } from "lucide-react";
import { useSupabaseSupplierProducts } from "@/hooks/useSupabaseSupplierProducts";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateProductModal } from "@/components/supplier/CreateProductModal";

export default function SupplierProducts() {
  const { 
    products, 
    isLoading, 
    createProduct, 
    updateProduct, 
    deleteProduct 
  } = useSupabaseSupplierProducts();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleCreateProduct = async (productData: any) => {
    try {
      await createProduct(productData);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const getStockStatus = (quantity: number, minStock: number = 0) => {
    if (quantity === 0) return { label: "Sem estoque", color: "destructive" as const };
    if (quantity <= minStock) return { label: "Estoque baixo", color: "secondary" as const };
    return { label: "Em estoque", color: "default" as const };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Produtos & Estoque</h1>
          <p className="text-muted-foreground">
            Gerencie seu catálogo de produtos e controle de estoque
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
          
          <CreateProductModal 
            open={isCreateModalOpen} 
            onOpenChange={setIsCreateModalOpen}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Separator />

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? "Nenhum produto corresponde aos filtros aplicados." 
                : "Comece criando seu primeiro produto no catálogo."}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Produto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.stock_quantity || 0, 0);
            
            return (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{product.code}</p>
                    </div>
                    <Badge variant={stockStatus.color}>
                      {stockStatus.label}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Categoria:</span> {product.category || 'Sem categoria'}</p>
                      <p><span className="font-medium">Preço:</span> R$ {product.unit_price?.toFixed(2) || '0,00'}</p>
                      <p><span className="font-medium">Estoque:</span> {product.stock_quantity || 0} unidades</p>
                    </div>
                    
                    {product.stock_quantity === 0 && (
                      <div className="flex items-center gap-2 text-amber-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Estoque baixo</span>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => console.log('Edit product:', product.id)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => console.log('Manage stock:', product.id)}
                        className="flex-1"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Estoque
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteProduct(product.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}