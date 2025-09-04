import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalSuppliersManager } from "@/components/suppliers/GlobalSuppliersManager";
import { useSupabaseAdminSuppliers } from "@/hooks/useSupabaseAdminSuppliers";
import { SupplierLimitsSettings } from "@/components/admin/SupplierLimitsSettings";
import { Shield, Globe, Users, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSuppliers() {
  const { suppliers, isLoading } = useSupabaseAdminSuppliers();

  // Estatísticas otimizadas com useMemo
  const stats = useMemo(() => {
    const allSuppliers = suppliers || [];
    const certifiedSuppliers = allSuppliers.filter(s => s.type === 'certified');
    const localSuppliers = allSuppliers.filter(s => s.type === 'local');
    const activeSuppliers = allSuppliers.filter(s => s.status === 'active');
    
    return {
      certifiedSuppliers,
      localSuppliers,
      activeSuppliers,
      totalSuppliers: allSuppliers.length,
      activationRate: allSuppliers.length > 0 ? Math.round((activeSuppliers.length / allSuppliers.length) * 100) : 0
    };
  }, [suppliers]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

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
              <p className="text-purple-100 text-sm">Fornecedores Certificados</p>
              <p className="text-3xl font-bold">{stats.certifiedSuppliers.length}</p>
            </div>
            <Globe className="h-8 w-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Fornecedores Locais</p>
              <p className="text-3xl font-bold">{stats.localSuppliers.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Fornecedores Ativos</p>
              <p className="text-3xl font-bold">{stats.activeSuppliers.length}</p>
            </div>
            <Award className="h-8 w-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Taxa de Ativação</p>
              <p className="text-3xl font-bold">{stats.activationRate}%</p>
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
          <GlobalSuppliersManager suppliers={suppliers} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Distribuição por Região</h3>
              <div className="space-y-3">
                 {Array.from(new Set(stats.certifiedSuppliers.map(s => s.region).filter(Boolean))).map(region => {
                   const count = stats.certifiedSuppliers.filter(s => s.region === region).length;
                   const percentage = stats.certifiedSuppliers.length > 0 ? (count / stats.certifiedSuppliers.length) * 100 : 0;
                  
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
                {stats.certifiedSuppliers
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
          <SupplierLimitsSettings />
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Configurações Gerais</h3>
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