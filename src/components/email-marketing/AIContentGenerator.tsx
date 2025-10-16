import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAIEmailGeneration } from '@/hooks/useAIEmailGeneration';
import { Sparkles, RefreshCw } from 'lucide-react';

interface AIContentGeneratorProps {
  onGenerated: (content: any) => void;
}

export function AIContentGenerator({ onGenerated }: AIContentGeneratorProps) {
  const { generateContent, isGenerating } = useAIEmailGeneration();
  
  const [config, setConfig] = useState({
    objective: 'engagement',
    tone: 'professional',
    keyPoints: '',
    includeImages: false,
    generateVariants: true
  });

  const handleGenerate = async () => {
    const result = await generateContent({
      objective: config.objective,
      tone: config.tone,
      key_points: config.keyPoints.split('\n').filter(Boolean),
      include_images: config.includeImages,
      generate_variants: config.generateVariants
    });

    if (result.success && result.content) {
      onGenerated(result.content);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Gerador de Conteúdo com IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Objetivo da Campanha</Label>
          <Select value={config.objective} onValueChange={(v) => setConfig({ ...config, objective: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="engagement">Engajamento</SelectItem>
              <SelectItem value="promotional">Promocional</SelectItem>
              <SelectItem value="informational">Informativo</SelectItem>
              <SelectItem value="welcome">Boas-vindas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tom de Voz</Label>
          <Select value={config.tone} onValueChange={(v) => setConfig({ ...config, tone: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Profissional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="friendly">Amigável</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Pontos Principais (um por linha)</Label>
          <Textarea
            value={config.keyPoints}
            onChange={(e) => setConfig({ ...config, keyPoints: e.target.value })}
            placeholder="Digite os pontos principais que deseja comunicar...&#10;Novos recursos&#10;Oferta especial&#10;Case de sucesso"
            rows={6}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Gerar Imagens com IA</Label>
            <p className="text-xs text-muted-foreground">Criar imagens automaticamente</p>
          </div>
          <Switch
            checked={config.includeImages}
            onCheckedChange={(checked) => setConfig({ ...config, includeImages: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Gerar Variantes (A/B Testing)</Label>
            <p className="text-xs text-muted-foreground">Criar múltiplas versões do assunto</p>
          </div>
          <Switch
            checked={config.generateVariants}
            onCheckedChange={(checked) => setConfig({ ...config, generateVariants: checked })}
          />
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || !config.keyPoints.trim()}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Conteúdo
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          A IA pode levar alguns segundos para gerar o conteúdo
        </p>
      </CardContent>
    </Card>
  );
}