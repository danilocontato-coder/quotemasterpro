import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalSuppliersManager } from "@/components/suppliers/GlobalSuppliersManager";
import { Supplier, SupplierGroup } from "@/data/mockData";
import { Shield, Globe, Users } from "lucide-react";

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierGroups, setSupplierGroups] = useState<SupplierGroup[]>([]);

  const handleSupplierUpdate = (updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
  };

  const handleSupplierCreate = (newSupplier: Supplier) => {
    setSuppliers(prev => [...prev, newSupplier]);
  };

  const handleSupplierDelete = (supplierId: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== supplierId));
  };

  // Estatísticas
  const globalSuppliers = suppliers.filter(s => s.type === 'global');
  const localSuppliers = suppliers.filter(s => s.type === 'local');
  const activeGlobalSuppliers = globalSuppliers.filter(s => s.status === 'active');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administração de Fornecedores</h1>
          <p className="text-muted-foreground">
            Gerencie fornecedores globais e monitore a rede de fornecedores locais
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Fornecedores Globais</p>
              <p className="text-3xl font-bold">{globalSuppliers.length}</p>
            </div>
            <Globe className="h-8 w-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Fornecedores Locais</p>
              <p className="text-3xl font-bold">{localSuppliers.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Globais Ativos</p>
              <p className="text-3xl font-bold">{activeGlobalSuppliers.length}</p>
            </div>
            <div className="text-green-200">✓</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Taxa de Ativação</p>
              <p className="text-3xl font-bold">
                {globalSuppliers.length > 0 ? Math.round((activeGlobalSuppliers.length / globalSuppliers.length) * 100) : 0}%
              </p>
            </div>
            <div className="text-orange-200">📊</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="global" className="space-y-4">
        <TabsList>
          <TabsTrigger value="global">Fornecedores Globais</TabsTrigger>
          <TabsTrigger value="analytics">Análises & Relatórios</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4">
          <GlobalSuppliersManager
            suppliers={suppliers}
            supplierGroups={supplierGroups}
            onSupplierUpdate={handleSupplierUpdate}
            onSupplierCreate={handleSupplierCreate}
            onSupplierDelete={handleSupplierDelete}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Distribuição por Região</h3>
              <div className="space-y-3">
                {Array.from(new Set(globalSuppliers.map(s => s.region).filter(Boolean))).map(region => {
                  const count = globalSuppliers.filter(s => s.region === region).length;
                  const percentage = globalSuppliers.length > 0 ? (count / globalSuppliers.length) * 100 : 0;
                  
                  return (
                    <div key={region} className="flex items-center justify-between">
                      <span className="text-sm">{region}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Top Fornecedores por Rating</h3>
              <div className="space-y-3">
                {globalSuppliers
                  .filter(s => s.rating && s.rating > 0)
                  .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                  .slice(0, 5)
                  .map(supplier => (
                    <div key={supplier.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">{supplier.region}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{supplier.rating?.toFixed(1)}</span>
                        <span className="text-yellow-500">★</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Configurações do Sistema</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Aprovação automática de fornecedores globais</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Quando habilitado, novos fornecedores globais são automaticamente aprovados
                </p>
                <input type="checkbox" className="rounded" defaultChecked={false} />
              </div>
              
              <div>
                <label className="text-sm font-medium">Notificar clientes sobre novos fornecedores globais</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Clientes recebem notificação quando novos fornecedores globais são adicionados em sua região
                </p>
                <input type="checkbox" className="rounded" defaultChecked={true} />
              </div>
              
              <div>
                <label className="text-sm font-medium">Limite de fornecedores por região</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Número máximo de fornecedores globais ativos por região
                </p>
                <input type="number" className="w-20 px-2 py-1 border rounded" defaultValue={50} min={1} />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}