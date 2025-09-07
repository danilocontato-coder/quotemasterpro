import React, { useState, useEffect } from 'react';
import { Eye, Calendar, User, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { usePagination } from '@/hooks/usePagination';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

interface CouponUsagesModalProps {
  couponId: string;
  open: boolean;
  onClose: () => void;
}

interface CouponUsageWithDetails {
  id: string;
  coupon_id: string;
  user_id: string;
  client_id?: string;
  subscription_plan_id?: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  used_at: string;
  user_profile?: {
    name: string;
    email: string;
  };
  client?: {
    name: string;
  };
}

export const CouponUsagesModal = ({ couponId, open, onClose }: CouponUsagesModalProps) => {
  const [usages, setUsages] = useState<CouponUsageWithDetails[]>([]);
  const [couponDetails, setCouponDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const pagination = usePagination(usages, { initialPageSize: 10 });

  useEffect(() => {
    if (open && couponId) {
      fetchCouponUsages();
      fetchCouponDetails();
    }
  }, [open, couponId]);

  const fetchCouponDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', couponId)
        .single();

      if (error) throw error;
      setCouponDetails(data);
    } catch (error) {
      console.error('Erro ao carregar detalhes do cupom:', error);
    }
  };

  const fetchCouponUsages = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('coupon_usages')
        .select(`
          *,
          clients (
            name
          )
        `)
        .eq('coupon_id', couponId)
        .order('used_at', { ascending: false });

      if (error) throw error;

      // Buscar perfis dos usuários separadamente
      const userIds = data?.map(usage => usage.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const formattedUsages = data?.map(usage => ({
        ...usage,
        user_profile: profiles?.find(p => p.id === usage.user_id) || null,
        client: usage.clients
      })) || [];

      setUsages(formattedUsages);
    } catch (error) {
      console.error('Erro ao carregar usos do cupom:', error);
    } finally {
      setIsLoading(false);
    }
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

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const totalDiscount = usages.reduce((sum, usage) => sum + usage.discount_amount, 0);
  const totalSavings = usages.reduce((sum, usage) => sum + (usage.original_amount - usage.final_amount), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Usos do Cupom: {couponDetails?.code}
          </DialogTitle>
        </DialogHeader>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usos</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usages.length}</div>
              <p className="text-xs text-muted-foreground">
                {couponDetails?.usage_limit ? 
                  `de ${couponDetails.usage_limit} permitidos` : 
                  'usos ilimitados'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Desconto Total</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalDiscount)}</div>
              <p className="text-xs text-muted-foreground">
                concedido em descontos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Economia Total</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSavings)}</div>
              <p className="text-xs text-muted-foreground">
                economizada pelos clientes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Usos */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Carregando usos...</p>
          </div>
        ) : usages.length === 0 ? (
          <div className="text-center py-8">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum uso registrado</h3>
            <p className="text-muted-foreground">
              Este cupom ainda não foi utilizado por nenhum usuário
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor Original</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Valor Final</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Data de Uso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedData.map((usage) => (
                  <TableRow key={usage.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {usage.user_profile?.name || 'Nome não disponível'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {usage.user_profile?.email || 'Email não disponível'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {usage.client?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(usage.original_amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-green-600">
                          -{formatCurrency(usage.discount_amount)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {((usage.discount_amount / usage.original_amount) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(usage.final_amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {usage.subscription_plan_id ? (
                        <Badge variant="outline">
                          {usage.subscription_plan_id}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {formatDate(usage.used_at)}
                        </span>
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
      </DialogContent>
    </Dialog>
  );
};