import React, { useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Eye, Calendar, Users, Target, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useCoupons, type Coupon } from '@/hooks/useCoupons';
import { usePagination } from '@/hooks/usePagination';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { CreateCouponModal } from '@/components/admin/CreateCouponModal';
import { EditCouponModal } from '@/components/admin/EditCouponModal';
import { CouponUsagesModal } from '@/components/admin/CouponUsagesModal';
import { CouponAnalytics } from '@/components/admin/CouponAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const CouponsManagement = () => {
  const { 
    coupons, 
    couponUsages, 
    isLoading, 
    deleteCoupon, 
    toggleCouponStatus 
  } = useCoupons();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [viewingUsages, setViewingUsages] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('cupons');
  
  const pagination = usePagination(coupons, { initialPageSize: 10 });

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date();
    const startsAt = new Date(coupon.starts_at);
    const expiresAt = coupon.expires_at ? new Date(coupon.expires_at) : null;

    if (!coupon.active) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    if (startsAt > now) {
      return <Badge variant="outline">Agendado</Badge>;
    }
    if (expiresAt && expiresAt < now) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return <Badge variant="destructive">Esgotado</Badge>;
    }
    return <Badge variant="default">Ativo</Badge>;
  };

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return `R$ ${coupon.discount_value.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    await toggleCouponStatus(coupon.id, !coupon.active);
  };

  const handleDelete = async (couponId: string) => {
    await deleteCoupon(couponId);
  };

  // Estatísticas dos cupons
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.active).length;
  const totalUsages = coupons.reduce((sum, c) => sum + c.usage_count, 0);
  const totalDiscountGiven = couponUsages.reduce((sum, usage) => sum + usage.discount_amount, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Cupons</h1>
            <p className="text-muted-foreground">Gerencie cupons de desconto para planos</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Carregando cupons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Cupons</h1>
          <p className="text-muted-foreground">Gerencie cupons de desconto para planos</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cupom
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cupons">Cupons</TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cupons" className="space-y-6">

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cupons</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCoupons}</div>
            <p className="text-xs text-muted-foreground">
              {activeCoupons} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cupons Ativos</CardTitle>
            <ToggleRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCoupons}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((activeCoupons / totalCoupons) * 100) || 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usos Totais</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsages}</div>
            <p className="text-xs text-muted-foreground">
              Cupons utilizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desconto Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalDiscountGiven.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Em descontos concedidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Cupons */}
      <Card>
        <CardHeader>
          <CardTitle>Cupons</CardTitle>
          <CardDescription>
            Lista de todos os cupons criados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum cupom criado</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando seu primeiro cupom de desconto
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Cupom
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedData.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded">
                          {coupon.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{coupon.name}</div>
                          {coupon.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {coupon.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {getDiscountDisplay(coupon)}
                          </span>
                          {coupon.max_discount_amount && (
                            <span className="text-xs text-muted-foreground">
                              Máx: R$ {coupon.max_discount_amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {coupon.usage_count}
                            {coupon.usage_limit && `/${coupon.usage_limit}`}
                          </span>
                          {coupon.usage_limit && (
                            <div className="w-16 bg-muted rounded-full h-1 mt-1">
                              <div 
                                className="bg-primary rounded-full h-1 transition-all"
                                style={{ 
                                  width: `${Math.min(100, (coupon.usage_count / coupon.usage_limit) * 100)}%` 
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(coupon)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Inicia: {formatDate(coupon.starts_at)}</div>
                          {coupon.expires_at && (
                            <div className="text-muted-foreground">
                              Expira: {formatDate(coupon.expires_at)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingUsages(coupon.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCoupon(coupon)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(coupon)}
                          >
                            {coupon.active ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o cupom "{coupon.code}"? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(coupon.id)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4">
                <DataTablePagination {...pagination} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <CreateCouponModal 
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {editingCoupon && (
        <EditCouponModal
          coupon={editingCoupon}
          open={!!editingCoupon}
          onClose={() => setEditingCoupon(null)}
        />
      )}

      {viewingUsages && (
        <CouponUsagesModal
          couponId={viewingUsages}
          open={!!viewingUsages}
          onClose={() => setViewingUsages(null)}
        />
      )}
        </TabsContent>

        <TabsContent value="analytics">
          <CouponAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CouponsManagement;