import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send } from 'lucide-react';
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
      toast({ title: 'Erro', description: 'Cliente não identificado', variant: 'destructive' });
      return;
    }
    
    if (!generatedContent) {
      toast({ title: 'Erro', description: 'Gere o conteúdo primeiro', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const campaign = await createCampaign({
        client_id: user?.role === 'admin' ? selectedClientId! : client!.id,
        name: campaignName || 'Nova Campanha',
        from_name: fromName,
        subject_line: generatedContent.subject_lines?.[0] || '',
        html_content: generatedContent.html_body || '',
        plain_text_content: generatedContent.plain_text_body || '',
        target_segment: segmentFilters,
        status: sendNow ? 'sending' : 'draft'
      });

      if (sendNow && campaign?.id) {
        await sendCampaign(campaign.id);
      }
      
      toast({ title: sendNow ? 'Enviando...' : 'Salvo!', description: 'Campanha processada' });
      navigate('/admin/email-marketing');
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({ 
        title: 'Erro', 
        description: 'Falha ao salvar campanha', 
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
                disabled={saving || (user?.role === 'admin' && !selectedClientId)}
              >
                Salvar Rascunho
              </LoadingButton>
              <LoadingButton 
                onClick={() => handleSave(true)} 
                className="flex-1"
                isLoading={saving}
                disabled={saving || (user?.role === 'admin' && !selectedClientId)}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </LoadingButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
