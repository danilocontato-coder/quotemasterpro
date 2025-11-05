import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, Calendar, FileText, Users, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { useSupabaseInvitationLetters, InvitationLetter, InvitationLetterSupplier } from '@/hooks/useSupabaseInvitationLetters';
import { formatLocalDate } from '@/utils/dateUtils';
import { OptimizedSkeleton } from '@/components/ui/optimized-components';
import { supabase } from '@/integrations/supabase/client';

interface InvitationLetterDetailModalProps {
  letter: InvitationLetter;
  open: boolean;
  onClose: () => void;
}

export default function InvitationLetterDetailModal({ letter, open, onClose }: InvitationLetterDetailModalProps) {
  const [suppliers, setSuppliers] = useState<InvitationLetterSupplier[]>([]);
  const [suppliersData, setSuppliersData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getLetterSuppliers } = useSupabaseInvitationLetters();

  useEffect(() => {
    if (open && letter) {
      loadSuppliers();
    }
  }, [open, letter]);

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const letterSuppliers = await getLetterSuppliers(letter.id);
      setSuppliers(letterSuppliers);

      // Buscar dados completos dos fornecedores
      if (letterSuppliers.length > 0) {
        const supplierIds = letterSuppliers.map(s => s.supplier_id);
        const { data, error } = await supabase
          .from('suppliers')
          .select('id, name, email, cnpj')
          .in('id', supplierIds);

        if (!error && data) {
          setSuppliersData(data);
        }
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliersData.find(s => s.id === supplierId);
    return supplier?.name || 'Carregando...';
  };

  const getSupplierEmail = (supplierId: string) => {
    const supplier = suppliersData.find(s => s.id === supplierId);
    return supplier?.email || '-';
  };

  const getResponseStatusBadge = (status: string | null) => {
    if (!status || status === 'pending') {
      return <Badge variant="secondary">Pendente</Badge>;
    }
    if (status === 'accepted') {
      return <Badge variant="default" className="bg-green-500">Aceito</Badge>;
    }
    if (status === 'declined') {
      return <Badge variant="destructive">Recusado</Badge>;
    }
    if (status === 'no_interest') {
      return <Badge variant="outline">Sem Interesse</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { variant: 'secondary', label: 'Rascunho' },
      sent: { variant: 'default', label: 'Enviada' },
      cancelled: { variant: 'destructive', label: 'Cancelada' }
    };
    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const responsesCount = suppliers.filter(s => s.response_status && s.response_status !== 'pending').length;
  const acceptedCount = suppliers.filter(s => s.response_status === 'accepted').length;
  const declinedCount = suppliers.filter(s => s.response_status === 'declined').length;
  const pendingCount = suppliers.filter(s => !s.response_status || s.response_status === 'pending').length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Detalhes da Carta Convite
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações principais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{letter.title}</span>
                {getStatusBadge(letter.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número</p>
                  <p className="font-medium">{letter.letter_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prazo de Resposta</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatLocalDate(letter.deadline)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Criada em</p>
                  <p className="font-medium">{formatLocalDate(letter.created_at)}</p>
                </div>
                {letter.sent_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Enviada em</p>
                    <p className="font-medium">{formatLocalDate(letter.sent_at)}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Descrição</p>
                <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
                  {letter.description}
                </p>
              </div>

              {letter.attachments && letter.attachments.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Anexos</p>
                  <div className="space-y-2">
                    {letter.attachments.map((att: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{att.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(att.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={att.url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Métricas de respostas */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{suppliers.length}</p>
                  <p className="text-sm text-muted-foreground">Total Convidados</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{acceptedCount}</p>
                  <p className="text-sm text-muted-foreground">Aceitaram</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <p className="text-2xl font-bold">{declinedCount}</p>
                  <p className="text-sm text-muted-foreground">Recusaram</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de fornecedores */}
          <Card>
            <CardHeader>
              <CardTitle>Fornecedores Convidados</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <OptimizedSkeleton className="h-40" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Enviado</TableHead>
                      <TableHead>Visualizado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Resposta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">
                          {getSupplierName(supplier.supplier_id)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getSupplierEmail(supplier.supplier_id)}
                        </TableCell>
                        <TableCell>
                          {supplier.sent_at ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          {supplier.viewed_at ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          {getResponseStatusBadge(supplier.response_status)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {supplier.response_date ? formatLocalDate(supplier.response_date) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
