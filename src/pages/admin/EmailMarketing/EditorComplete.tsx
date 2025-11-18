import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AIContentGenerator } from '@/components/email-marketing/AIContentGenerator';
import { EmailPreview } from '@/components/email-marketing/EmailPreview';
import { MergeTagsPanel } from '@/components/email-marketing/MergeTagsPanel';
import { useEmailCampaigns } from '@/hooks/useEmailCampaigns';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseCurrentClient } from '@/hooks/useSupabaseCurrentClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function EditorComplete() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createCampaign, sendCampaign } = useEmailCampaigns();
  const { client } = useSupabaseCurrentClient();
  
  const [campaignName, setCampaignName] = useState('');
  const [fromName, setFromName] = useState('Cotiz');
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  const handleSave = async (sendNow = false) => {
    if (!client?.id) {
      toast({ title: 'Erro', description: 'Cliente não identificado', variant: 'destructive' });
      return;
    }
    
    if (!generatedContent) {
      toast({ title: 'Erro', description: 'Gere o conteúdo primeiro', variant: 'destructive' });
      return;
    }

    const campaign = await createCampaign({
      client_id: client.id,
      name: campaignName || 'Nova Campanha',
      from_name: fromName,
      subject_line: generatedContent.subject_lines?.[0] || '',
      html_content: generatedContent.html_body || '',
      plain_text_content: generatedContent.plain_text_body || '',
      status: sendNow ? 'sending' : 'draft'
    });

    if (sendNow && campaign?.id) {
      await sendCampaign(campaign.id);
    }
    
    toast({ title: sendNow ? 'Enviando...' : 'Salvo!', description: 'Campanha processada' });
    navigate('/admin/email-marketing');
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AIContentGenerator onGenerated={setGeneratedContent} />
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
              <Button variant="outline" onClick={() => handleSave(false)} className="flex-1">
                Salvar Rascunho
              </Button>
              <Button onClick={() => handleSave(true)} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
