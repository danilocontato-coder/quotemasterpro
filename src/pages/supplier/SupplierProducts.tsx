import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Package, AlertTriangle } from "lucide-react";

interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  stockQuantity: number;
  unitPrice: number;
  status: 'active' | 'inactive';
  lastUpdated: string;
}

export default function SupplierProducts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock data - In production this would come from hooks/API
  const products: Product[] = [
    {
      id: '1',
      code: 'MAT001',
      name: 'Cimento Portland 50kg',
      description: 'Cimento Portland comum para construção civil',
      category: 'Materiais de Construção',
      stockQuantity: 150,
      unitPrice: 32.50,
      status: 'active',
      lastUpdated: '2025-08-18T10:30:00Z'
    },
    {
      id: '2',
      code: 'MAT002',
      name: 'Areia Fina (m³)',
      description: 'Areia fina lavada para construção',
      category: 'Materiais de Construção',
      stockQuantity: 25,
      unitPrice: 85.00,
      status: 'active',
      lastUpdated: '2025-08-17T14:20:00Z'
    },
    {
      id: '3',
      code: 'MAT003',
      name: 'Brita 1 (m³)',
      description: 'Brita número 1 para concreto',
      category: 'Materiais de Construção',
      stockQuantity: 5,
      unitPrice: 95.00,
      status: 'active',
      lastUpdated: '2025-08-16T09:15:00Z'
    },
    {
      id: '4',
      code: 'MAT004',
      name: 'Tijolo Cerâmico 6 furos',
      description: 'Tijolo cerâmico estrutural 6 furos 14x19x29cm',
      category: 'Materiais de Construção',
      stockQuantity: 2000,
      unitPrice: 0.85,
      status: 'active',
      lastUpdated: '2025-08-15T16:45:00Z'
    },
    {
      id: '5',
      code: 'FER001',
      name: 'Furadeira de Impacto',
      description: 'Furadeira de impacto 1/2" 650W',
      category: 'Ferramentas',
      stockQuantity: 0,
      unitPrice: 280.00,
      status: 'inactive',
      lastUpdated: '2025-08-10T11:20:00Z'
    }
  ];

  const categories = [...new Set(products.map(p => p.category))];

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">Sem Estoque</Badge>;
    } else if (quantity <= 10) {
      return <Badge variant="secondary" className="text-orange-600 border-orange-600">Estoque Baixo</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Em Estoque</Badge>;
    }
  };

  const getStatusBadge = (status: Product['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  const lowStockCount = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 10).length;
  const outOfStockCount = products.filter(p => p.stockQuantity === 0).length;

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
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Stock Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-medium">Atenção aos Estoques</p>
                <p className="text-sm">
                  {outOfStockCount > 0 && `${outOfStockCount} produto(s) sem estoque`}
                  {outOfStockCount > 0 && lowStockCount > 0 && ' • '}
                  {lowStockCount > 0 && `${lowStockCount} produto(s) com estoque baixo`}
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
                        {getStockStatus(product.stockQuantity)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        R$ {product.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Package className="h-4 w-4" />
                        </Button>
                      </div>
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
    </div>
  );
}