import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Search, Download, CheckCircle, XCircle, MousePointerClick, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Campaign {
  id: string;
  name: string;
  subject_line: string;
  sent_count: number;
  sent_at: string;
}

interface Recipient {
  id: string;
  recipient_email: string;
  recipient_name: string;
  send_status: string;
  delivered_at: string;
  opened_at: string;
  first_click_at: string;
  bounced_at: string;
  open_count: number;
  click_count: number;
  error_message: string;
}

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [filteredRecipients, setFilteredRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    let filtered = recipients;
    
    if (search) {
      filtered = filtered.filter(r => 
        r.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
        r.recipient_name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.send_status === statusFilter);
    }
    
    setFilteredRecipients(filtered);
  }, [search, statusFilter, recipients]);

  const loadData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const [campaignRes, recipientsRes] = await Promise.all([
        supabase
          .from('email_marketing_campaigns')
          .select('id, name, subject_line, sent_count, sent_at')
          .eq('id', id)
          .single(),
        supabase
          .from('email_campaign_recipients')
          .select('*')
          .eq('campaign_id', id)
          .order('delivered_at', { ascending: false })
      ]);

      if (campaignRes.data) setCampaign(campaignRes.data);
      if (recipientsRes.data) {
        setRecipients(recipientsRes.data);
        setFilteredRecipients(recipientsRes.data);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      delivered: { label: 'Entregue', variant: 'outline' },
      bounced: { label: 'Bounce', variant: 'destructive' },
      failed: { label: 'Falhou', variant: 'destructive' },
      pending: { label: 'Pendente', variant: 'secondary' }
    };
    const { label, variant } = config[status] || { label: status, variant: 'default' as const };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getStatusIcon = (recipient: Recipient) => {
    if (recipient.first_click_at) return <MousePointerClick className="h-4 w-4 text-primary" />;
    if (recipient.opened_at) return <Mail className="h-4 w-4 text-blue-500" />;
    if (recipient.send_status === 'delivered') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (recipient.send_status === 'bounced' || recipient.send_status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />;
    return null;
  };

  const exportCSV = () => {
    const headers = ['Email', 'Nome', 'Status', 'Entregue', 'Aberto', 'Clicou', 'Aberturas', 'Cliques'];
    const rows = filteredRecipients.map(r => [
      r.recipient_email,
      r.recipient_name || '',
      r.send_status,
      r.delivered_at ? format(new Date(r.delivered_at), 'dd/MM/yyyy HH:mm') : '',
      r.opened_at ? format(new Date(r.opened_at), 'dd/MM/yyyy HH:mm') : '',
      r.first_click_at ? format(new Date(r.first_click_at), 'dd/MM/yyyy HH:mm') : '',
      r.open_count || 0,
      r.click_count || 0
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campanha_${campaign?.name}_detalhes.csv`;
    a.click();
  };

  if (loading) {
    return <div className="container mx-auto p-6">Carregando...</div>;
  }

  if (!campaign) {
    return <div className="container mx-auto p-6">Campanha não encontrada</div>;
  }

  const stats = {
    total: recipients.length,
    delivered: recipients.filter(r => r.send_status === 'delivered').length,
    opened: recipients.filter(r => r.opened_at).length,
    clicked: recipients.filter(r => r.first_click_at).length,
    bounced: recipients.filter(r => r.send_status === 'bounced').length,
    failed: recipients.filter(r => r.send_status === 'failed').length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admin/email-marketing/campaigns')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{campaign.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Assunto: {campaign.subject_line}</p>
              {campaign.sent_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Enviado em {format(new Date(campaign.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Entregues</p>
            <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Abertos</p>
            <p className="text-2xl font-bold text-blue-600">{stats.opened}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Cliques</p>
            <p className="text-2xl font-bold text-primary">{stats.clicked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Bounces</p>
            <p className="text-2xl font-bold text-orange-600">{stats.bounced}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Falhas</p>
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por e-mail ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Todos
              </Button>
              <Button
                variant={statusFilter === 'delivered' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('delivered')}
              >
                Entregues
              </Button>
              <Button
                variant={statusFilter === 'bounced' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('bounced')}
              >
                Bounces
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Entregue</TableHead>
                <TableHead>Aberto</TableHead>
                <TableHead>Clicou</TableHead>
                <TableHead className="text-right">Aberturas</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecipients.map((recipient) => (
                <TableRow key={recipient.id}>
                  <TableCell>{getStatusIcon(recipient)}</TableCell>
                  <TableCell className="font-mono text-sm">{recipient.recipient_email}</TableCell>
                  <TableCell>{recipient.recipient_name || '-'}</TableCell>
                  <TableCell>{getStatusBadge(recipient.send_status)}</TableCell>
                  <TableCell className="text-xs">
                    {recipient.delivered_at ? format(new Date(recipient.delivered_at), 'dd/MM HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {recipient.opened_at ? format(new Date(recipient.opened_at), 'dd/MM HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {recipient.first_click_at ? format(new Date(recipient.first_click_at), 'dd/MM HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-right">{recipient.open_count || 0}</TableCell>
                  <TableCell className="text-right">{recipient.click_count || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredRecipients.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum destinatário encontrado</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
