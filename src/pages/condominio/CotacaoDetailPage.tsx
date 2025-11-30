import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  ArrowLeft, 
  Clock, 
  CheckCircle,
  AlertCircle,
  XCircle,
  Package,
  Calendar,
  User,
  Building2,
  Truck,
  DollarSign,
  Shield,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { useCondominioQuoteDetail, QuoteResponse, QuoteApproval, QuoteItem } from '@/hooks/useCondominioQuotes';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; icon: React.ReactNode }> = {
  draft: { label: 'Rascunho', bgColor: 'bg-gray-100 text-gray-700 border-gray-300', icon: <FileText className="h-4 w-4" /> },
  sent: { label: 'Enviada', bgColor: 'bg-blue-50 text-blue-700 border-blue-300', icon: <Clock className="h-4 w-4" /> },
  awaiting_approval: { label: 'Aguardando Aprovação', bgColor: 'bg-yellow-50 text-yellow-700 border-yellow-300', icon: <AlertCircle className="h-4 w-4" /> },
  pending_approval: { label: 'Pendente Aprovação', bgColor: 'bg-yellow-50 text-yellow-700 border-yellow-300', icon: <AlertCircle className="h-4 w-4" /> },
  approved: { label: 'Aprovada', bgColor: 'bg-green-50 text-green-700 border-green-300', icon: <CheckCircle className="h-4 w-4" /> },
  rejected: { label: 'Rejeitada', bgColor: 'bg-red-50 text-red-700 border-red-300', icon: <XCircle className="h-4 w-4" /> },
  finalized: { label: 'Finalizada', bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: <Package className="h-4 w-4" /> },
  cancelled: { label: 'Cancelada', bgColor: 'bg-gray-100 text-gray-600 border-gray-400', icon: <XCircle className="h-4 w-4" /> },
};

function QuoteStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, bgColor: 'bg-gray-100', icon: null };
  
  return (
    <Badge variant="outline" className={`${config.bgColor} flex items-center gap-1 text-sm px-3 py-1`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function ItemsTable({ items }: { items: QuoteItem[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum item na cotação</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium text-sm">Item</th>
            <th className="text-center p-3 font-medium text-sm">Qtd</th>
            <th className="text-right p-3 font-medium text-sm">Preço Unit.</th>
            <th className="text-right p-3 font-medium text-sm">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b last:border-0">
              <td className="p-3">
                <p className="font-medium">{item.product_name}</p>
                {item.specifications && (
                  <p className="text-xs text-muted-foreground">{item.specifications}</p>
                )}
              </td>
              <td className="text-center p-3">
                {item.quantity} {item.unit || 'un'}
              </td>
              <td className="text-right p-3">
                {formatCurrency(item.unit_price)}
              </td>
              <td className="text-right p-3 font-medium">
                {formatCurrency(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResponseCard({ response }: { response: QuoteResponse }) {
  const isApproved = response.status === 'approved';
  
  return (
    <Card className={`${isApproved ? 'border-green-300 bg-green-50/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-medium">{response.supplier_name}</span>
              {isApproved && (
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Selecionada
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-medium">{formatCurrency(response.total_amount)}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Truck className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Prazo:</span>
                <span className="font-medium">{response.delivery_time} dias</span>
              </div>
              
              {response.shipping_cost !== null && (
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Frete:</span>
                  <span className="font-medium">
                    {response.shipping_cost === 0 ? 'Grátis' : formatCurrency(response.shipping_cost)}
                  </span>
                </div>
              )}
              
              {response.warranty_months !== null && response.warranty_months > 0 && (
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Garantia:</span>
                  <span className="font-medium">{response.warranty_months} meses</span>
                </div>
              )}
            </div>
            
            {response.notes && (
              <p className="text-sm text-muted-foreground mt-2 italic">"{response.notes}"</p>
            )}
          </div>
          
          <div className="text-right">
            <p className="text-lg font-bold text-primary">{formatCurrency(response.total_amount)}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(response.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalTimeline({ approvals }: { approvals: QuoteApproval[] }) {
  if (approvals.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum registro de aprovação</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {approvals.map((approval) => (
        <div key={approval.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <div className={`p-2 rounded-full ${
            approval.status === 'approved' ? 'bg-green-100' : 
            approval.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
          }`}>
            {approval.status === 'approved' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : approval.status === 'rejected' ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Clock className="h-4 w-4 text-yellow-600" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {approval.approver_name || 'Aprovador'}
              </span>
              <Badge variant="outline" className={`text-xs ${
                approval.status === 'approved' ? 'bg-green-50 text-green-700' :
                approval.status === 'rejected' ? 'bg-red-50 text-red-700' :
                'bg-yellow-50 text-yellow-700'
              }`}>
                {approval.status === 'approved' ? 'Aprovado' :
                 approval.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
              </Badge>
            </div>
            
            {approval.comments && (
              <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1">
                <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                {approval.comments}
              </p>
            )}
            
            <p className="text-xs text-muted-foreground mt-1">
              {approval.approved_at 
                ? format(new Date(approval.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                : format(new Date(approval.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              }
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CotacaoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { quote, isLoading, error, refetch } = useCondominioQuoteDetail(id);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !quote) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/condominio/cotacoes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
            <h3 className="font-medium text-lg mb-2">Cotação não encontrada</h3>
            <p className="text-muted-foreground mb-4">{error || 'A cotação solicitada não existe ou você não tem permissão para visualizá-la.'}</p>
            <Button onClick={() => navigate('/condominio/cotacoes')} variant="outline">
              Voltar para cotações
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalItems = quote.items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/condominio/cotacoes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                #{quote.local_code}
              </h1>
              <QuoteStatusBadge status={quote.status} />
            </div>
            <p className="text-lg text-muted-foreground">{quote.title}</p>
          </div>
        </div>
        
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(quote.total || totalItems)}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">Data de Criação</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {format(new Date(quote.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            
            {quote.deadline && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Prazo Limite</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(quote.deadline), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
            
            {quote.supplier_name && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Fornecedor Selecionado</p>
                <p className="font-medium flex items-center gap-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {quote.supplier_name}
                </p>
              </div>
            )}
          </div>
          
          {quote.description && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                <p className="text-foreground">{quote.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens da Cotação
            <Badge variant="secondary">{quote.items.length}</Badge>
          </CardTitle>
          <CardDescription>
            Lista de produtos e serviços solicitados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ItemsTable items={quote.items} />
          
          {quote.items.length > 0 && (
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Subtotal dos itens</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalItems)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responses */}
      {quote.responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Propostas Recebidas
              <Badge variant="secondary">{quote.responses.length}</Badge>
            </CardTitle>
            <CardDescription>
              Propostas enviadas pelos fornecedores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quote.responses.map((response) => (
              <ResponseCard key={response.id} response={response} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Histórico de Aprovações
            <Badge variant="secondary">{quote.approvals.length}</Badge>
          </CardTitle>
          <CardDescription>
            Registro de aprovações e decisões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApprovalTimeline approvals={quote.approvals} />
        </CardContent>
      </Card>
    </div>
  );
}
