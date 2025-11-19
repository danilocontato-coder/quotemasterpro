import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, CheckCircle, AlertTriangle, XCircle, Edit, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EditBankDataModal } from '@/components/suppliers/EditBankDataModal';
import { toast } from 'sonner';

export function WalletStatusDashboard() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [stats, setStats] = useState({
    total: 0,
    withWalletComplete: 0,
    withWalletPending: 0,
    withoutWallet: 0,
  });

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, document_number, email, asaas_wallet_id, bank_data, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      const suppliers = data || [];
      
      // Calcular estatísticas
      const total = suppliers.length;
      const withWalletComplete = suppliers.filter(s => {
        const bankData = s.bank_data as any;
        return s.asaas_wallet_id && bankData?.bank_code && bankData?.account_number;
      }).length;
      const withWalletPending = suppliers.filter(s => {
        const bankData = s.bank_data as any;
        return s.asaas_wallet_id && (!bankData?.bank_code || !bankData?.account_number);
      }).length;
      const withoutWallet = suppliers.filter(s => !s.asaas_wallet_id).length;

      setStats({
        total,
        withWalletComplete,
        withWalletPending,
        withoutWallet,
      });

      setSuppliers(suppliers);
    } catch (error: any) {
      console.error('Erro ao buscar fornecedores:', error);
      toast.error('Erro ao carregar status das wallets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const getBankDataStatus = (supplier: any) => {
    if (!supplier.asaas_wallet_id) {
      return { status: 'no_wallet', label: 'Sem Wallet', variant: 'destructive', icon: XCircle };
    }
    
    const bankData = supplier.bank_data as any;
    const hasBankData = bankData?.bank_code && bankData?.account_number;
    
    if (hasBankData) {
      return { status: 'complete', label: 'Completo', variant: 'success', icon: CheckCircle };
    } else {
      return { status: 'pending', label: 'Pendente', variant: 'warning', icon: AlertTriangle };
    }
  };

  const handleValidateWallet = async (supplierId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-asaas-wallet', {
        body: { supplierId, force: false }
      });

      if (error) throw error;

      toast.success('Wallet validada com sucesso!');
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao validar wallet');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <CardTitle>Status de Wallets dos Fornecedores</CardTitle>
          </div>
          <CardDescription>
            Monitoramento centralizado das contas Asaas dos fornecedores ativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Estatísticas */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total de Fornecedores</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.withWalletComplete}</div>
              <div className="text-sm text-muted-foreground">
                Wallets Completas ({stats.total > 0 ? Math.round((stats.withWalletComplete / stats.total) * 100) : 0}%)
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{stats.withWalletPending}</div>
              <div className="text-sm text-muted-foreground">
                Dados Bancários Pendentes ({stats.total > 0 ? Math.round((stats.withWalletPending / stats.total) * 100) : 0}%)
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.withoutWallet}</div>
              <div className="text-sm text-muted-foreground">
                Sem Wallet ({stats.total > 0 ? Math.round((stats.withoutWallet / stats.total) * 100) : 0}%)
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Wallet ID</TableHead>
                  <TableHead>Dados Bancários</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum fornecedor ativo encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => {
                    const statusInfo = getBankDataStatus(supplier);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {supplier.document_number}
                          </code>
                        </TableCell>
                        <TableCell>
                          {supplier.asaas_wallet_id ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {supplier.asaas_wallet_id.slice(0, 8)}...
                            </code>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant as any} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingSupplier(supplier)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Configurar
                            </Button>
                            {supplier.asaas_wallet_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleValidateWallet(supplier.id)}
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingSupplier && (
        <EditBankDataModal
          open={!!editingSupplier}
          onClose={() => setEditingSupplier(null)}
          supplier={editingSupplier}
          onSuccess={() => {
            setEditingSupplier(null);
            fetchSuppliers();
          }}
        />
      )}
    </>
  );
}
