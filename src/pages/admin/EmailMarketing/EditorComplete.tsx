import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AIContentGenerator } from '@/components/email-marketing/AIContentGenerator';
import { EmailPreview } from '@/components/email-marketing/EmailPreview';
import { SegmentBuilder } from '@/components/email-marketing/SegmentBuilder';
import { CampaignScheduler } from '@/components/email-marketing/CampaignScheduler';
import { SubjectLineScorer } from '@/components/email-marketing/SubjectLineScorer';
import { useEmailCampaigns } from '@/hooks/useEmailCampaigns';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function EditorComplete() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { createCampaign, sendCampaign } = useEmailCampaigns();
  
  const [campaignName, setCampaignName] = useState('');
  const [fromName, setFromName] = useState('Cotiz');
  const [replyTo, setReplyTo] = useState('');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [segment, setSegment] = useState<any>({});
  const [schedule, setSchedule] = useState<any>({});

  const handleSave = async (sendNow = false) => {
    if (!generatedContent) {
      toast({ title: 'Erro', description: 'Gere o conteúdo primeiro', variant: 'destructive' });
      return;
    }

    const campaign = await createCampaign({
      name: campaignName || 'Nova Campanha',
      from_name: fromName,
      reply_to_email: replyTo || undefined,
      subject_line: generatedContent.subject_lines[0],
      preview_text: generatedContent.preview_text,
      html_content: generatedContent.html_body,
      plain_text_content: generatedContent.plain_text_body,
      ai_generated: true,
      ai_metadata: generatedContent.metadata,
      campaign_type: 'newsletter',
      target_segment: segment,
      scheduled_send_at: schedule.scheduled_send_at || null,
      timezone: schedule.timezone || 'America/Sao_Paulo',
      ab_testing_enabled: schedule.ab_testing_enabled || false,
      ab_test_percentage: schedule.ab_test_percentage || 50,
      status: sendNow ? 'sending' : (schedule.scheduled_send_at ? 'scheduled' : 'draft')
    });

    if (sendNow && campaign) {
      await sendCampaign(campaign.id);
    }

    navigate('/admin/email-marketing');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admin/email-marketing')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <div className="space-y-2 mb-6">
        <Label>Nome da Campanha</Label>
        <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Ex: Newsletter Outubro 2025" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <AIContentGenerator onGenerated={setGeneratedContent} />
          {generatedContent && <SubjectLineScorer subjectLine={generatedContent.subject_lines[0]} />}
          <SegmentBuilder onSegmentChange={setSegment} />
          <CampaignScheduler onScheduleChange={setSchedule} />
        </div>

        <div className="space-y-6">
          {generatedContent && (
            <EmailPreview
              htmlContent={generatedContent.html_body}
              plainTextContent={generatedContent.plain_text_body}
              subjectLine={generatedContent.subject_lines[0]}
              previewText={generatedContent.preview_text}
            />
          )}
          
          {generatedContent && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave(false)} className="flex-1">
                Salvar Rascunho
              </Button>
              <Button onClick={() => handleSave(true)} className="flex-1">
                Enviar Agora
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}