interface MarketAnalysisResult {
  productName: string;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  marketTrend: 'rising' | 'falling' | 'stable';
  confidence: number;
  analysis: string;
  sources: string[];
  recommendations: string[];
}

interface SupplierAnalysis {
  supplierName: string;
  proposedPrice: number;
  marketPosition: 'below_market' | 'market_average' | 'above_market';
  priceVariation: number; // % diferença da média de mercado
  competitiveness: 'excellent' | 'good' | 'fair' | 'poor';
}

export class MarketAnalysisService {
  private static API_KEY_STORAGE_KEY = 'perplexity_api_key';
  private static MODEL_CANDIDATES = [
    // Newer short names
    'sonar-small-online',
    'sonar-large-online',
    // Older explicit names (fallbacks)
    'llama-3.1-sonar-small-128k-online',
    'llama-3.1-sonar-large-128k-online'
  ];

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    console.log('Perplexity API key saved successfully');
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  private static async chatWithFallback(apiKey: string, messages: any[], extraOptions: Record<string, any> = {}) {
    const url = 'https://api.perplexity.ai/chat/completions';
    for (const model of this.MODEL_CANDIDATES) {
      const body = JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1000,
        return_images: false,
        return_related_questions: false,
        frequency_penalty: 1,
        presence_penalty: 0,
        ...extraOptions,
      });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      let json: any = null;
      try { json = await res.json(); } catch {}

      if (res.ok && json?.choices?.[0]?.message?.content) {
        return { ok: true, content: json.choices[0].message.content, modelUsed: model } as const;
      }

      const errCode = json?.error?.type || json?.error?.code;
      if (errCode && String(errCode).toLowerCase().includes('invalid_model')) {
        // Try next model
        continue;
      }

      // Other error
      const msg = json?.error?.message || `Erro na API Perplexity (${res.status})`;
      return { ok: false, error: msg } as const;
    }
    return { ok: false, error: 'Nenhum modelo válido encontrado. Verifique a documentação da Perplexity.' } as const;
  }

  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const result = await this.chatWithFallback(apiKey, [
        { role: 'system', content: 'Responda apenas "OK" se você conseguir processar esta mensagem.' },
        { role: 'user', content: 'Teste de conexão' }
      ], { max_tokens: 5 });
      return result.ok;
    } catch (error) {
      console.error('Error testing Perplexity API key:', error);
      return false;
    }
  }

  static async analyzeMarketPrice(
    productName: string,
    category: string,
    specifications?: string
  ): Promise<MarketAnalysisResult | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API key não encontrada. Configure sua chave da Perplexity primeiro.');
    }

    try {
      const prompt = `
Analise o preço de mercado atual no Brasil para o produto: "${productName}"
Categoria: ${category}
${specifications ? `Especificações: ${specifications}` : ''}

Por favor, forneça uma análise detalhada incluindo:
1. Preço médio de mercado atual em reais (R$)
2. Faixa de preços (mínimo e máximo)
3. Tendência atual dos preços (subindo, descendo ou estável)
4. Análise do mercado e fatores que influenciam o preço
5. Recomendações para compra

Formate a resposta em JSON com a seguinte estrutura:
{
  "averagePrice": número,
  "priceRange": {"min": número, "max": número},
  "marketTrend": "rising|falling|stable",
  "confidence": número entre 0 e 1,
  "analysis": "texto da análise",
  "sources": ["lista de fontes mencionadas"],
  "recommendations": ["lista de recomendações"]
}
      `;

      const result = await this.chatWithFallback(apiKey, [
        {
          role: 'system',
          content: 'Você é um especialista em análise de preços de mercado brasileiro. Forneça informações precisas e atualizadas sobre preços de produtos comerciais e industriais no Brasil.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], { max_tokens: 1500, search_recency_filter: 'month' });

      if (!result.ok) {
        throw new Error(result.error || 'Falha ao consultar a Perplexity');
      }

      const content = result.content as string;

      try {
        // Try to parse JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResult = JSON.parse(jsonMatch[0]);
          return {
            productName,
            ...parsedResult
          };
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON response, using fallback parsing');
      }

      // Fallback parsing if JSON parsing fails
      return this.parseTextResponse(productName, content);

    } catch (error) {
      console.error('Error analyzing market price:', error);
      throw error;
    }
  }

  private static parseTextResponse(productName: string, content: string): MarketAnalysisResult {
    // Fallback method to extract information from text response
    const priceMatch = content.match(/R\$\s*(\d+(?:[\.,]\d+)*)/g);
    const prices = priceMatch ? priceMatch.map(p => {
      const num = p.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
      return parseFloat(num);
    }).filter(p => !isNaN(p)) : [];

    const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    let marketTrend: 'rising' | 'falling' | 'stable' = 'stable';
    if (content.toLowerCase().includes('subindo') || content.toLowerCase().includes('aumentando')) {
      marketTrend = 'rising';
    } else if (content.toLowerCase().includes('descendo') || content.toLowerCase().includes('diminuindo')) {
      marketTrend = 'falling';
    }

    return {
      productName,
      averagePrice,
      priceRange: { min: minPrice, max: maxPrice },
      marketTrend,
      confidence: 0.7,
      analysis: content,
      sources: [],
      recommendations: []
    };
  }

  static analyzeSupplierCompetitiveness(
    supplierPrice: number,
    marketAnalysis: MarketAnalysisResult
  ): SupplierAnalysis {
    if (!marketAnalysis || marketAnalysis.averagePrice === 0) {
      return {
        supplierName: '',
        proposedPrice: supplierPrice,
        marketPosition: 'market_average',
        priceVariation: 0,
        competitiveness: 'fair'
      };
    }

    const priceVariation = ((supplierPrice - marketAnalysis.averagePrice) / marketAnalysis.averagePrice) * 100;
    
    let marketPosition: 'below_market' | 'market_average' | 'above_market';
    let competitiveness: 'excellent' | 'good' | 'fair' | 'poor';

    if (priceVariation <= -15) {
      marketPosition = 'below_market';
      competitiveness = 'excellent';
    } else if (priceVariation <= -5) {
      marketPosition = 'below_market';
      competitiveness = 'good';
    } else if (priceVariation <= 5) {
      marketPosition = 'market_average';
      competitiveness = 'fair';
    } else if (priceVariation <= 15) {
      marketPosition = 'above_market';
      competitiveness = 'fair';
    } else {
      marketPosition = 'above_market';
      competitiveness = 'poor';
    }

    return {
      supplierName: '',
      proposedPrice: supplierPrice,
      marketPosition,
      priceVariation,
      competitiveness
    };
  }

  static getCompetitivenessLabel(competitiveness: string): string {
    const labels = {
      excellent: 'Excelente',
      good: 'Bom',
      fair: 'Razoável',
      poor: 'Ruim'
    };
    return labels[competitiveness as keyof typeof labels] || 'Desconhecido';
  }

  static getCompetitivenessColor(competitiveness: string): string {
    const colors = {
      excellent: 'text-green-600',
      good: 'text-blue-600',
      fair: 'text-yellow-600',
      poor: 'text-red-600'
    };
    return colors[competitiveness as keyof typeof colors] || 'text-gray-600';
  }

  static getMarketPositionLabel(position: string): string {
    const labels = {
      below_market: 'Abaixo do Mercado',
      market_average: 'Preço de Mercado',
      above_market: 'Acima do Mercado'
    };
    return labels[position as keyof typeof labels] || 'Desconhecido';
  }

  static getMarketTrendLabel(trend: string): string {
    const labels = {
      rising: 'Em Alta',
      falling: 'Em Baixa',
      stable: 'Estável'
    };
    return labels[trend as keyof typeof labels] || 'Desconhecido';
  }

  static getMarketTrendIcon(trend: string): string {
    const icons = {
      rising: '📈',
      falling: '📉',
      stable: '➡️'
    };
    return icons[trend as keyof typeof icons] || '➡️';
  }
}