import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [estimatedRecipients, setEstimatedRecipients] = useState(0);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    checkEmailConfig();
    estimateRecipients();
  }, [segment]);

  const checkEmailConfig = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'email_service_config')
      .maybeSingle();
    
    setEmailConfigured(!!(data?.setting_value as any)?.resend_api_key);
  };

  const estimateRecipients = async () => {
    setEstimatedRecipients(100); // Estimativa simplificada
  };

  const handleSave = async (sendNow = false) => {
    if (!generatedContent) {
      toast({ title: 'Erro', description: 'Gere o conteúdo primeiro', variant: 'destructive' });
      return;
    }

    if (sendNow) {
      if (!emailConfigured) {
        toast({
          title: 'Configuração Necessária',
          description: 'Configure o serviço de e-mail antes de enviar',
          variant: 'destructive'
        });
        return;
      }
      setShowConfirmDialog(true);
      return;
    }

    await saveAndSend(false);
  };

  const saveAndSend = async (sendNow: boolean) => {
    setIsSending(sendNow);
    
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
      const result = await sendCampaign(campaign.id);
      setIsSending(false);
      
      if (result) {
        toast({
          title: '✅ Campanha Enviada',
          description: (
            <div className="space-y-1">
              <p>Enviada com sucesso!</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate(`/admin/email-marketing/details/${campaign.id}`)}
                className="p-0 h-auto"
              >
                Ver Detalhes →
              </Button>
            </div>
          ),
          duration: 5000
        });
      }
    }

    if (!sendNow) {
      toast({
        title: 'Rascunho Salvo',
        description: 'Campanha salva como rascunho'
      });
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
            <>
              {!emailConfigured && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>Configure o serviço de e-mail para enviar campanhas</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate('/admin/email-settings')}
                    className="ml-auto"
                  >
                    Configurar
                  </Button>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleSave(false)} className="flex-1" disabled={isSending}>
                  Salvar Rascunho
                </Button>
                <Button onClick={() => handleSave(true)} className="flex-1" disabled={!emailConfigured || isSending}>
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Agora
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Confirmar Envio de Campanha
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Campanha: {campaignName || 'Nova Campanha'}</p>
                <p className="font-semibold text-foreground">Assunto: {generatedContent?.subject_lines[0]}</p>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                <p className="text-sm text-blue-900">
                  <strong>Destinatários estimados:</strong> {estimatedRecipients}
                </p>
                <p className="text-sm text-blue-900">
                  <strong>Tempo estimado:</strong> ~{Math.ceil(estimatedRecipients / 50)} minuto(s)
                </p>
              </div>

              <p className="text-sm">
                Esta ação iniciará o envio da campanha imediatamente. Não será possível cancelar após o início.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { 
              setShowConfirmDialog(false); 
              setTimeout(() => saveAndSend(true), 100);
            }}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar Envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}