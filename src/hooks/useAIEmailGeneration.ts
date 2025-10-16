import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AIEmailGenerationRequest {
  objective?: string;
  tone?: string;
  target_audience?: string;
  key_points?: string[];
  brand_voice?: string;
  include_images?: boolean;
  generate_variants?: boolean;
  max_length?: number;
}

export interface AIEmailGenerationResponse {
  success: boolean;
  content?: {
    subject_lines: string[];
    preview_text: string;
    html_body: string;
    plain_text_body: string;
    suggested_cta: {
      text: string;
      url: string;
    };
    images?: Array<{
      prompt: string;
      base64: string;
    }>;
    metadata: {
      model: string;
      tokens_used: number;
      spam_score_estimate: number;
      generated_at: string;
    };
  };
  error?: string;
}

export function useAIEmailGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<AIEmailGenerationResponse['content'] | null>(null);
  const { toast } = useToast();

  const generateContent = async (request: AIEmailGenerationRequest): Promise<AIEmailGenerationResponse> => {
    try {
      setIsGenerating(true);
      console.log('🤖 Generating email content with AI...', request);

      const { data, error } = await supabase.functions.invoke('generate-email-content', {
        body: request
      });

      if (error) throw error;

      if (data.success) {
        setGeneratedContent(data.content);
        
        toast({
          title: '✨ Conteúdo Gerado',
          description: `Spam Score: ${data.content.metadata.spam_score_estimate}/100 (quanto menor, melhor)`
        });

        return data;
      } else {
        throw new Error(data.error || 'Failed to generate content');
      }

    } catch (error) {
      console.error('❌ Error generating content:', error);
      toast({
        title: 'Erro na Geração',
        description: error instanceof Error ? error.message : 'Falha ao gerar conteúdo com IA',
        variant: 'destructive'
      });
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setIsGenerating(false);
    }
  };

  const clearGenerated = () => {
    setGeneratedContent(null);
  };

  return {
    isGenerating,
    generatedContent,
    generateContent,
    clearGenerated
  };
}