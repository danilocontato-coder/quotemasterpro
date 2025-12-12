import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAIEmailGeneration } from '@/hooks/useAIEmailGeneration';
import { useEmailCampaigns } from '@/hooks/useEmailCampaigns';
import { Sparkles, ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import DOMPurify from 'dompurify';

export default function EmailMarketingEditor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { generateContent, isGenerating, generatedContent } = useAIEmailGeneration();
  const { createCampaign } = useEmailCampaigns();

  const [formData, setFormData] = useState({
    name: '',
    from_name: '',
    key_points: '',
    objective: 'engagement',
    tone: 'professional'
  });

  const handleGenerate = async () => {
    await generateContent({
      objective: formData.objective,
      tone: formData.tone,
      key_points: formData.key_points.split('\n').filter(Boolean),
      include_images: false,
      generate_variants: true
    });
  };

  const handleSave = async () => {
    if (!generatedContent) return;

    await createCampaign({
      name: formData.name || 'Nova Campanha',
      from_name: formData.from_name || 'Cotiz',
      subject_line: generatedContent.subject_lines[0],
      preview_text: generatedContent.preview_text,
      html_content: generatedContent.html_body,
      plain_text_content: generatedContent.plain_text_body,
      ai_generated: true,
      ai_metadata: generatedContent.metadata,
      campaign_type: formData.objective,
      target_segment: {},
      status: 'draft'
    });

    toast({ title: 'Campanha salva como rascunho' });
    navigate('/admin/email-marketing');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admin/email-marketing')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuração da Campanha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome da Campanha</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Newsletter Outubro 2025"
              />
            </div>

            <div>
              <Label>De (nome)</Label>
              <Input
                value={formData.from_name}
                onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                placeholder="Ex: Equipe Cotiz"
              />
            </div>

            <div>
              <Label>Pontos Principais (um por linha)</Label>
              <Textarea
                value={formData.key_points}
                onChange={(e) => setFormData({ ...formData, key_points: e.target.value })}
                placeholder="Novos recursos&#10;Promoção especial&#10;Case de sucesso"
                rows={5}
              />
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating ? 'Gerando...' : 'Gerar Conteúdo com IA'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview do E-mail</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedContent ? (
              <div className="space-y-4">
                <div>
                  <Label>Assunto</Label>
                  <p className="text-sm font-semibold">{generatedContent.subject_lines[0]}</p>
                </div>
                <div>
                  <Label>Preview</Label>
                  <p className="text-sm text-muted-foreground">{generatedContent.preview_text}</p>
                </div>
                <div>
                  <Label>Conteúdo HTML</Label>
<div 
                    className="border rounded p-4 max-h-96 overflow-auto"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedContent.html_body) }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1">
                    <Send className="h-4 w-4 mr-2" />
                    Salvar Rascunho
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Gere o conteúdo com IA para visualizar
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}