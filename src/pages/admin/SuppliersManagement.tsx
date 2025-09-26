import { useState, useEffect } from "react";
import { Plus, Search, Filter, Edit, Trash2, Star, Shield, CheckCircle, XCircle, AlertTriangle, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateSupplierModal } from "@/components/suppliers/CreateSupplierModal";
import { useSupabaseAdminSuppliers } from "@/hooks/useSupabaseAdminSuppliers";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SupplierStats {
  total: number;
  active: number;
  inactive: number;
  certified: number;
  local: number;
  avgRating: number;
}

export const SuppliersManagement = () => {
  const { suppliers, isLoading, refetch, createSupplierWithUser, updateSupplier, deleteSupplier, resetSupplierPassword } = useSupabaseAdminSuppliers();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<any>(null);
  const [certifyingSupplier, setCertifyingSupplier] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toggleStatusLoading, setToggleStatusLoading] = useState<string | null>(null);
  const { toast } = useToast();

  // Filter suppliers based on search and filters
  const filteredSuppliers = (suppliers || []).filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.cnpj.includes(searchTerm) ||
                         supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || supplier.status === statusFilter;
    const matchesType = typeFilter === "all" || supplier.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Simple pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, startIndex + itemsPerPage);

  // Statistics
  const getSupplierStats = (): SupplierStats => {
    const suppliersList = suppliers || [];
    const total = suppliersList.length;
    const active = suppliersList.filter(s => s.status === 'active').length;
    const inactive = suppliersList.filter(s => s.status !== 'active').length;
    const certified = suppliersList.filter(s => s.type === 'certified').length;
    const local = suppliersList.filter(s => s.type === 'local').length;
    const totalRating = suppliersList.reduce((sum, s) => sum + (s.rating || 0), 0);
    const avgRating = total > 0 ? totalRating / total : 0;

    return { total, active, inactive, certified, local, avgRating };
  };

  const stats = getSupplierStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatResponseTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${Math.round(hours)} h`;
    return `${Math.round(hours / 24)} dias`;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">
          ({rating.toFixed(1)})
        </span>
      </div>
    );
  };

  const handleEditSupplier = (supplier: any) => {
    console.log('🔧 Abrindo editor para fornecedor:', supplier.name);
    setEditingSupplier(supplier);
    setShowCreateModal(true);
  };

  const handleToggleStatus = async (supplier: any) => {
    if (toggleStatusLoading === supplier.id) return;
    
    setToggleStatusLoading(supplier.id);
    try {
      const newStatus = supplier.status === 'active' ? 'inactive' : 'active';
      await updateSupplier(supplier.id, { status: newStatus });
      
      // If reactivating a supplier, also reactivate its client associations
      if (newStatus === 'active') {
        console.log('Reativando associações do fornecedor:', supplier.name);
        
        // Reactivate all inactive client-supplier associations for this supplier
        const { error: associationError } = await supabase
          .from('client_suppliers')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('supplier_id', supplier.id)
          .eq('status', 'inactive');

        if (associationError) {
          console.warn('Erro ao reativar associações:', associationError);
        } else {
          console.log('Associações reativadas com sucesso');
        }
      }
      
      toast({
        title: "Status Atualizado",
        description: newStatus === 'active' 
          ? `Fornecedor ativado com sucesso. Associações com clientes foram restauradas.`
          : `Fornecedor desativado com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do fornecedor.",
        variant: "destructive"
      });
    } finally {
      setToggleStatusLoading(null);
    }
  };

  const handleCertifySupplier = async (supplier: any, certify: boolean) => {
    setIsProcessing(true);
    try {
      // Update supplier type
      await updateSupplier(supplier.id, {
        type: certify ? 'certified' : 'local',
        is_certified: certify
      });

      if (certify) {
        // Send notification to supplier about certification
        try {
          await supabase.functions.invoke('notify', {
            body: {
              type: 'certification',
              supplier_id: supplier.id,
              supplier_name: supplier.name,
              supplier_email: supplier.email,
              supplier_whatsapp: supplier.whatsapp
            }
          });
        } catch (notifyError) {
          console.error('Erro ao enviar notificação:', notifyError);
          // Don't fail the whole operation if notification fails
        }
      }

      toast({
        title: certify ? "Fornecedor Certificado" : "Certificação Removida",
        description: certify 
          ? `${supplier.name} foi certificado e está disponível globalmente. Notificação enviada.`
          : `${supplier.name} voltou a ser um fornecedor local.`
      });

      setCertifyingSupplier(null);
    } catch (error) {
      console.error('Erro ao certificar fornecedor:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do fornecedor.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Fornecedores</h1>
          <p className="text-muted-foreground">
            Gerencie todos os fornecedores da plataforma
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Certificados</p>
                <p className="text-2xl font-bold text-purple-600">{stats.certified}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Locais</p>
                <p className="text-2xl font-bold text-blue-600">{stats.local}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avaliação Média</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.avgRating.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome, CNPJ ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo (Prospects)</option>
              <option value="pending">Pendente</option>
              <option value="suspended">Suspenso</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">Todos os tipos</option>
              <option value="certified">Certificados</option>
              <option value="local">Locais</option>
            </select>
          </div>
          
          {stats.inactive > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Oportunidades de Prospecção</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Existem <strong>{stats.inactive}</strong> fornecedores inativos que foram desativados por clientes. 
                <br />
                <strong>Ao reativar:</strong> As associações com os clientes anteriores serão automaticamente restauradas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fornecedores ({filteredSuppliers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Região</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {supplier.cnpj}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{supplier.email}</div>
                          {supplier.phone && (
                            <div className="text-sm text-muted-foreground">{supplier.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {supplier.type === 'certified' ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <Shield className="h-3 w-3 mr-1" />
                            Certificado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Local
                          </Badge>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getStatusColor(supplier.status)}>
                          {supplier.status === 'active' ? 'Ativo' : 
                           supplier.status === 'inactive' ? 'Inativo' :
                           supplier.status === 'pending' ? 'Pendente' : 'Suspenso'}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        {supplier.rating ? (
                          renderStars(supplier.rating)
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem avaliação</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm">{supplier.region || 'Não definida'}</span>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <Filter className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditSupplier(supplier)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={() => setCertifyingSupplier({ supplier, action: supplier.type === 'certified' ? 'remove' : 'certify' })}
                              className={supplier.type === 'certified' ? 'text-yellow-600' : 'text-purple-600'}
                            >
                              {supplier.type === 'certified' ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Remover Certificação
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Certificar
                                </>
                              )}
                            </DropdownMenuItem>
                            
                             <DropdownMenuItem 
                               onClick={() => handleToggleStatus(supplier)}
                               disabled={toggleStatusLoading === supplier.id}
                               className={supplier.status === 'active' ? 'text-red-600' : 'text-green-600'}
                             >
                               {supplier.status === 'active' ? (
                                 <>
                                   <XCircle className="h-4 w-4 mr-2" />
                                   {toggleStatusLoading === supplier.id ? 'Desativando...' : 'Desativar'}
                                 </>
                               ) : (
                                 <>
                                   <CheckCircle className="h-4 w-4 mr-2" />
                                   {toggleStatusLoading === supplier.id ? 'Reativando...' : 'Reativar'}
                                 </>
                               )}
                              </DropdownMenuItem>

                             <DropdownMenuItem 
                               onClick={async () => {
                                 await resetSupplierPassword(supplier.id, supplier.email);
                               }}
                             >
                               <Key className="h-4 w-4 mr-2" />
                               Resetar Senha
                             </DropdownMenuItem>
                             
                             <DropdownMenuItem 
                               onClick={() => setDeletingSupplier(supplier)}
                               className="text-red-600"
                             >
                               <Trash2 className="h-4 w-4 mr-2" />
                               Excluir
                             </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Simple Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredSuppliers.length)} de {filteredSuppliers.length} fornecedores
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <CreateSupplierModal
        open={showCreateModal}
        editingSupplier={editingSupplier}
        onClose={() => {
          setShowCreateModal(false);
          setEditingSupplier(null);
        }}
        onCreateSupplier={async (supplierData, credentials) => {
          try {
            if (editingSupplier) {
              await updateSupplier(editingSupplier.id, supplierData);
            } else {
              await createSupplierWithUser(supplierData, credentials);
            }
            setShowCreateModal(false);
            setEditingSupplier(null);
          } catch (error) {
            console.error('Error saving supplier:', error);
          }
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSupplier} onOpenChange={() => setDeletingSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fornecedor "{deletingSupplier?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingSupplier) {
                  await deleteSupplier(deletingSupplier.id, deletingSupplier.name);
                  setDeletingSupplier(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Certification Confirmation */}
      <AlertDialog open={!!certifyingSupplier} onOpenChange={() => setCertifyingSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {certifyingSupplier?.action === 'certify' ? 'Certificar Fornecedor' : 'Remover Certificação'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {certifyingSupplier?.action === 'certify' ? (
                <>
                  Tem certeza que deseja certificar o fornecedor "{certifyingSupplier?.supplier?.name}"?
                  <br /><br />
                  Fornecedores certificados:
                  <br />• Ficam disponíveis para todos os clientes
                  <br />• Recebem prioridade no envio de cotações
                  <br />• Podem ter maior visibilidade na plataforma
                  <br />• Receberão uma notificação sobre a certificação
                </>
              ) : (
                <>
                  Tem certeza que deseja remover a certificação do fornecedor "{certifyingSupplier?.supplier?.name}"?
                  <br /><br />
                  O fornecedor voltará a ser local e perderá os benefícios da certificação.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (certifyingSupplier) {
                  handleCertifySupplier(
                    certifyingSupplier.supplier, 
                    certifyingSupplier.action === 'certify'
                  );
                }
              }}
              disabled={isProcessing}
              className={certifyingSupplier?.action === 'certify' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-yellow-600 hover:bg-yellow-700'}
            >
              {isProcessing ? 'Processando...' : (
                certifyingSupplier?.action === 'certify' ? 'Certificar' : 'Remover Certificação'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuppliersManagement;