import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Users, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AIContentGenerator } from '@/components/email-marketing/AIContentGenerator';
import { EmailPreview } from '@/components/email-marketing/EmailPreview';
import { EmailContentEditor } from '@/components/email-marketing/EmailContentEditor';
import { MergeTagsPanel } from '@/components/email-marketing/MergeTagsPanel';
import { SegmentBuilder } from '@/components/email-marketing/SegmentBuilder';
import { useEmailCampaigns } from '@/hooks/useEmailCampaigns';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseCurrentClient } from '@/hooks/useSupabaseCurrentClient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface EmailContent {
  subject: string;
  htmlBody: string;
  plainTextBody: string;
}

export default function EditorComplete() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createCampaign, sendCampaign } = useEmailCampaigns();
  const { client } = useSupabaseCurrentClient();
  const { user } = useAuth();
  
  const [campaignName, setCampaignName] = useState('');
  const [fromName, setFromName] = useState('Cotiz');
  const [emailContent, setEmailContent] = useState<EmailContent>({
    subject: '',
    htmlBody: '',
    plainTextBody: ''
  });
  const [segmentFilters, setSegmentFilters] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientsOptions, setClientsOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Preview de destinatários
  const [recipientCount, setRecipientCount] = useState(0);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientPreview, setRecipientPreview] = useState<Array<{ email: string; name: string }>>([]);

  // Carregar clientes para admins
  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchClients = async () => {
        setLoadingClients(true);
        try {
          const { data, error } = await supabase
            .from('clients')
            .select('id, name')
            .eq('status', 'active')
            .order('name', { ascending: true });

          if (error) throw error;
          setClientsOptions(data || []);
        } catch (error) {
          console.error('Error loading clients:', error);
          toast({ title: 'Erro', description: 'Falha ao carregar clientes', variant: 'destructive' });
        } finally {
          setLoadingClients(false);
        }
      };
      fetchClients();
    }
  }, [user?.role, toast]);

  // Carregar preview de destinatários - CORRIGIDO: busca todos os clientes ativos
  useEffect(() => {
    const fetchRecipientPreview = async () => {
      setLoadingRecipients(true);
      try {
        // Buscar todos os clientes ativos como destinatários
        let query = supabase
          .from('clients')
          .select('id, name, email')
          .eq('status', 'active');

        // Aplicar filtros de segmento se existirem
        if (segmentFilters?.group_id) {
          query = query.eq('group_id', segmentFilters.group_id);
        }
        if (segmentFilters?.client_type) {
          query = query.eq('client_type', segmentFilters.client_type);
        }
        if (segmentFilters?.state) {
          query = query.eq('state', segmentFilters.state);
        }
        if (segmentFilters?.region) {
          query = query.eq('region', segmentFilters.region);
        }

        const { data, error } = await query.limit(100);

        if (error) throw error;

        setRecipientCount(data?.length || 0);
        setRecipientPreview((data || []).slice(0, 5).map(c => ({ email: c.email, name: c.name })));
      } catch (error) {
        console.error('Error fetching recipient preview:', error);
        setRecipientCount(0);
        setRecipientPreview([]);
      } finally {
        setLoadingRecipients(false);
      }
    };

    fetchRecipientPreview();
  }, [segmentFilters]);

  // Handler para quando a IA gera conteúdo
  const handleAIGenerated = (content: any) => {
    setEmailContent({
      subject: content.subject_lines?.[0] || '',
      htmlBody: content.html_body || '',
      plainTextBody: content.plain_text_body || ''
    });
  };

  const handleSave = async (sendNow = false) => {
    console.log('📧 handleSave called', { 
      sendNow, 
      campaignName, 
      subject: emailContent.subject,
      hasHtmlBody: !!emailContent.htmlBody,
      recipientCount,
      selectedClientId,
      userRole: user?.role,
      clientId: client?.id
    });

    // Validação para admin: precisa selecionar cliente
    if (user?.role === 'admin' && !selectedClientId) {
      console.log('❌ Admin sem cliente selecionado');
      toast({ 
        title: 'Erro', 
        description: 'Selecione um cliente para salvar a campanha', 
        variant: 'destructive' 
      });
      return;
    }
    
    // Validação para não-admin: precisa ter client.id
    if (user?.role !== 'admin' && !client?.id) {
      console.log('❌ Não-admin sem client.id');
      toast({ title: 'Erro', description: 'Cliente não identificado. Faça login novamente.', variant: 'destructive' });
      return;
    }

    if (!campaignName.trim()) {
      console.log('❌ campaignName vazio');
      toast({ title: 'Erro', description: 'Informe um nome para a campanha', variant: 'destructive' });
      return;
    }

    if (!emailContent.subject.trim()) {
      console.log('❌ subject vazio');
      toast({ title: 'Erro', description: 'Informe o assunto do e-mail', variant: 'destructive' });
      return;
    }

    if (!emailContent.htmlBody.trim()) {
      console.log('❌ htmlBody vazio');
      toast({ title: 'Erro', description: 'Informe o conteúdo HTML do e-mail', variant: 'destructive' });
      return;
    }

    if (sendNow && recipientCount === 0) {
      console.log('❌ Tentando enviar sem destinatários');
      toast({ title: 'Erro', description: 'Nenhum destinatário encontrado. Verifique os filtros de segmentação.', variant: 'destructive' });
      return;
    }

    console.log('✅ Validações passaram, iniciando save...');
    setSaving(true);
    try {
      console.log('📤 Criando campanha...');
      const campaign = await createCampaign({
        client_id: user?.role === 'admin' ? selectedClientId! : client!.id,
        name: campaignName,
        from_name: fromName,
        subject_line: emailContent.subject,
        html_content: emailContent.htmlBody,
        plain_text_content: emailContent.plainTextBody,
        target_segment: segmentFilters && Object.keys(segmentFilters).length > 0 
          ? segmentFilters 
          : { type: 'all_active_clients' },
        status: sendNow ? 'sending' : 'draft'
      });

      console.log('📥 Campanha criada:', campaign);

      if (!campaign) {
        throw new Error('Falha ao criar campanha');
      }

      if (sendNow && campaign?.id) {
        console.log('📨 Enviando campanha...', campaign.id);
        await sendCampaign(campaign.id);
        toast({ 
          title: 'Campanha enviada!', 
          description: `Enviando para ${recipientCount} destinatários` 
        });
      } else {
        toast({ 
          title: 'Rascunho salvo!', 
          description: 'A campanha foi salva como rascunho' 
        });
      }
      
      navigate('/admin/email-marketing');
    } catch (error: any) {
      console.error('❌ Error saving campaign:', error);
      toast({ 
        title: 'Erro ao salvar campanha', 
        description: error?.message || 'Ocorreu um erro ao salvar. Tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
      console.log('🏁 handleSave finalizado, saving=false');
    }
  };

  const canSaveDraft = campaignName.trim() && emailContent.subject.trim() && emailContent.htmlBody.trim();
  const canSend = canSaveDraft && recipientCount > 0;

  // Debug: log estado dos botões
  console.log('🔘 Button states:', { 
    canSaveDraft, 
    canSend, 
    saving, 
    recipientCount,
    selectedClientId,
    isAdmin: user?.role === 'admin',
    sendButtonDisabled: saving || !canSend || (user?.role === 'admin' && !selectedClientId)
  });

  // Helper para mensagem de desabilitado
  const getDisabledReason = (forSend = false) => {
    if (saving) return 'Salvando...';
    if (user?.role === 'admin' && !selectedClientId) return 'Selecione um cliente';
    if (!campaignName.trim()) return 'Informe o nome da campanha';
    if (!emailContent.subject.trim()) return 'Informe o assunto';
    if (!emailContent.htmlBody.trim()) return 'Informe o conteúdo HTML';
    if (forSend && recipientCount === 0) return 'Nenhum destinatário encontrado';
    return '';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/email-marketing')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Editor de Campanha</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Nome da Campanha *</Label>
          <Input 
            value={campaignName} 
            onChange={(e) => setCampaignName(e.target.value)} 
            placeholder="Ex: Newsletter Junho 2024"
          />
        </div>
        <div>
          <Label>Nome do Remetente</Label>
          <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
        </div>
      </div>

      {user?.role === 'admin' && (
        <div className="space-y-2">
          <Label>Cliente (obrigatório para salvar) *</Label>
          <Select value={selectedClientId || ''} onValueChange={setSelectedClientId} disabled={loadingClients}>
            <SelectTrigger>
              <SelectValue placeholder={loadingClients ? 'Carregando clientes...' : 'Selecione um cliente'} />
            </SelectTrigger>
            <SelectContent>
              {clientsOptions.length === 0 && !loadingClients ? (
                <div className="p-2 text-sm text-muted-foreground">Nenhum cliente ativo encontrado</div>
              ) : (
                clientsOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Preview de Destinatários */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Destinatários da Campanha
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecipients ? (
            <p className="text-sm text-muted-foreground">Calculando destinatários...</p>
          ) : recipientCount === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Nenhum destinatário</AlertTitle>
              <AlertDescription>
                Nenhum cliente ativo encontrado com os filtros atuais
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {recipientCount} {recipientCount === 1 ? 'destinatário' : 'destinatários'}
                </Badge>
              </div>
              {recipientPreview.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Exemplos:</p>
                  <ul className="space-y-1">
                    {recipientPreview.map((r, i) => (
                      <li key={i} className="truncate">
                        {r.name} ({r.email})
                      </li>
                    ))}
                  </ul>
                  {recipientCount > 5 && (
                    <p className="mt-1 text-xs">... e mais {recipientCount - 5} outros</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AIContentGenerator onGenerated={handleAIGenerated} />
          <SegmentBuilder onSegmentChange={setSegmentFilters} />
          <MergeTagsPanel />
        </div>

        <div className="lg:col-span-3 space-y-6">
          {/* Editor de Conteúdo Editável */}
          <EmailContentEditor
            content={emailContent}
            onChange={setEmailContent}
          />

          {/* Preview do E-mail */}
          <EmailPreview
            htmlContent={emailContent.htmlBody}
            plainTextContent={emailContent.plainTextBody}
            subjectLine={emailContent.subject}
          />

          {/* Botões sempre visíveis */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <LoadingButton 
                type="button"
                variant="outline" 
                onClick={() => {
                  console.log('🖱️ Salvar Rascunho clicked');
                  handleSave(false);
                }} 
                className="flex-1"
                isLoading={saving}
                loadingText="Salvando..."
                disabled={saving || !canSaveDraft || (user?.role === 'admin' && !selectedClientId)}
                title={getDisabledReason(false) || 'Salvar como rascunho'}
              >
                Salvar Rascunho
              </LoadingButton>
              <LoadingButton 
                type="button"
                onClick={() => {
                  console.log('🖱️ Enviar clicked');
                  handleSave(true);
                }} 
                className="flex-1"
                isLoading={saving}
                loadingText="Enviando..."
                disabled={saving || !canSend || (user?.role === 'admin' && !selectedClientId)}
                title={getDisabledReason(true) || 'Enviar campanha'}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar para {recipientCount} destinatários
              </LoadingButton>
            </div>
            {/* Feedback visual de estado desabilitado */}
            {(getDisabledReason(true)) && (
              <p className="text-sm text-muted-foreground text-center">
                ⚠️ {getDisabledReason(true)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
