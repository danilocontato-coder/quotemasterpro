import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Users, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AIContentGenerator } from '@/components/email-marketing/AIContentGenerator';
import { EmailPreview } from '@/components/email-marketing/EmailPreview';
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

export default function EditorComplete() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createCampaign, sendCampaign } = useEmailCampaigns();
  const { client } = useSupabaseCurrentClient();
  const { user } = useAuth();
  
  const [campaignName, setCampaignName] = useState('');
  const [fromName, setFromName] = useState('Cotiz');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
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

  // Carregar preview de destinatários quando cliente selecionado ou filtros mudam
  useEffect(() => {
    const fetchRecipientPreview = async () => {
      const targetClientId = user?.role === 'admin' ? selectedClientId : client?.id;
      if (!targetClientId) {
        setRecipientCount(0);
        setRecipientPreview([]);
        return;
      }

      setLoadingRecipients(true);
      try {
        // Buscar clientes ativos como destinatários (mesmo comportamento do send-campaign-batch)
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
  }, [selectedClientId, client?.id, user?.role, segmentFilters]);

  const handleSave = async (sendNow = false) => {
    // Validação para admin: precisa selecionar cliente
    if (user?.role === 'admin' && !selectedClientId) {
      toast({ 
        title: 'Erro', 
        description: 'Selecione um cliente para salvar a campanha', 
        variant: 'destructive' 
      });
      return;
    }
    
    // Validação para não-admin: precisa ter client.id
    if (user?.role !== 'admin' && !client?.id) {
      toast({ title: 'Erro', description: 'Cliente não identificado. Faça login novamente.', variant: 'destructive' });
      return;
    }
    
    if (!generatedContent) {
      toast({ title: 'Erro', description: 'Gere o conteúdo primeiro usando a IA', variant: 'destructive' });
      return;
    }

    if (!campaignName.trim()) {
      toast({ title: 'Erro', description: 'Informe um nome para a campanha', variant: 'destructive' });
      return;
    }

    if (recipientCount === 0) {
      toast({ title: 'Erro', description: 'Nenhum destinatário encontrado. Verifique os filtros de segmentação.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const campaign = await createCampaign({
        client_id: user?.role === 'admin' ? selectedClientId! : client!.id,
        name: campaignName,
        from_name: fromName,
        subject_line: generatedContent.subject_lines?.[0] || '',
        html_content: generatedContent.html_body || '',
        plain_text_content: generatedContent.plain_text_body || '',
        target_segment: segmentFilters,
        status: sendNow ? 'sending' : 'draft'
      });

      if (!campaign) {
        throw new Error('Falha ao criar campanha');
      }

      if (sendNow && campaign?.id) {
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
      console.error('Error saving campaign:', error);
      toast({ 
        title: 'Erro ao salvar campanha', 
        description: error?.message || 'Ocorreu um erro ao salvar. Tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
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
          <Label>Nome da Campanha</Label>
          <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
        </div>
        <div>
          <Label>Nome do Remetente</Label>
          <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
        </div>
      </div>

      {user?.role === 'admin' && (
        <div className="space-y-2">
          <Label>Cliente (obrigatório) *</Label>
          <Select value={selectedClientId || ''} onValueChange={setSelectedClientId} disabled={loadingClients}>
            <SelectTrigger>
              <SelectValue placeholder={loadingClients ? 'Carregando clientes...' : 'Selecione um cliente'} />
            </SelectTrigger>
            <SelectContent>
              {clientsOptions.length === 0 && !loadingClients ? (
                <div className="p-2 text-sm text-muted-foreground">Nenhum cliente ativo encontrado</div>
              ) : (
                clientsOptions.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {!selectedClientId && (
            <p className="text-sm text-muted-foreground">
              Selecione o cliente para o qual esta campanha será criada
            </p>
          )}
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
                {user?.role === 'admin' && !selectedClientId 
                  ? 'Selecione um cliente primeiro'
                  : 'Nenhum cliente ativo encontrado com os filtros atuais'}
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
          <AIContentGenerator onGenerated={setGeneratedContent} />
          <SegmentBuilder onSegmentChange={setSegmentFilters} />
          <MergeTagsPanel />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <EmailPreview
            htmlContent={generatedContent?.html_body || ''}
            plainTextContent={generatedContent?.plain_text_body || ''}
            subjectLine={generatedContent?.subject_lines?.[0] || ''}
          />

          {generatedContent && (
            <div className="flex gap-2">
              <LoadingButton 
                variant="outline" 
                onClick={() => handleSave(false)} 
                className="flex-1"
                isLoading={saving}
                disabled={saving || (user?.role === 'admin' && !selectedClientId) || recipientCount === 0}
              >
                Salvar Rascunho
              </LoadingButton>
              <LoadingButton 
                onClick={() => handleSave(true)} 
                className="flex-1"
                isLoading={saving}
                disabled={saving || (user?.role === 'admin' && !selectedClientId) || recipientCount === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar para {recipientCount} destinatários
              </LoadingButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
