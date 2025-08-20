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
  private static CACHE_KEY_PREFIX = 'market_analysis_cache';
  private static CACHE_EXPIRY_HOURS = 24; // Cache por 24 horas
  private static MAX_CONCURRENT_REQUESTS = 3;

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    console.log('Perplexity API key saved successfully');
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'user',
              content: 'Responda apenas "OK" para testar a conexão.'
            }
          ],
        }),
      });

      return response.ok;
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

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em análise de preços de mercado brasileiro. Forneça informações precisas e atualizadas sobre preços de produtos comerciais e industriais no Brasil.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Erro na API Perplexity: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

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

  // Cache management
  private static getCacheKey(productName: string, category: string, specifications?: string): string {
    const key = `${productName}_${category}_${specifications || ''}`.toLowerCase().replace(/\s+/g, '_');
    return `${this.CACHE_KEY_PREFIX}_${key}`;
  }

  private static getCachedAnalysis(cacheKey: string): MarketAnalysisResult | null {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      const expiryTime = timestamp + (this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000);

      if (now > expiryTime) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  private static setCachedAnalysis(cacheKey: string, analysis: MarketAnalysisResult): void {
    try {
      const cacheData = {
        data: analysis,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  // Item-specific analysis
  static async analyzeItemPrice(
    productName: string,
    category: string,
    specifications?: string,
    brand?: string,
    unit?: string
  ): Promise<MarketAnalysisResult | null> {
    const cacheKey = this.getCacheKey(productName, category, specifications);
    
    // Check cache first
    const cached = this.getCachedAnalysis(cacheKey);
    if (cached) {
      console.log(`Using cached analysis for ${productName}`);
      return cached;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API key não encontrada. Configure sua chave da Perplexity primeiro.');
    }

    try {
      const prompt = this.buildItemAnalysisPrompt(productName, category, specifications, brand, unit);

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em análise de preços de mercado brasileiro. Analise apenas o produto solicitado de forma específica e precisa.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Erro na API Perplexity: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      let analysis: MarketAnalysisResult;

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResult = JSON.parse(jsonMatch[0]);
          analysis = {
            productName,
            ...parsedResult
          };
        } else {
          analysis = this.parseTextResponse(productName, content);
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON response, using fallback parsing');
        analysis = this.parseTextResponse(productName, content);
      }

      // Cache the result
      this.setCachedAnalysis(cacheKey, analysis);
      
      return analysis;

    } catch (error) {
      console.error('Error analyzing item price:', error);
      throw error;
    }
  }

  private static buildItemAnalysisPrompt(
    productName: string,
    category: string,
    specifications?: string,
    brand?: string,
    unit?: string
  ): string {
    return `
Analise especificamente o preço de mercado no Brasil para:

PRODUTO: "${productName}"
CATEGORIA: ${category}
${specifications ? `ESPECIFICAÇÕES: ${specifications}` : ''}
${brand ? `MARCA PREFERENCIAL: ${brand}` : ''}
${unit ? `UNIDADE: ${unit}` : ''}

Forneça uma análise específica deste item incluindo:
1. Preço médio atual no mercado brasileiro (R$)
2. Faixa de preços (mínimo e máximo)
3. Tendência de preços (rising/falling/stable)
4. Fatores que influenciam o preço deste produto específico
5. Recomendações de compra para este item

IMPORTANTE: Analise apenas este produto específico, não produtos similares ou categoria geral.

Responda EXCLUSIVAMENTE em JSON:
{
  "averagePrice": número,
  "priceRange": {"min": número, "max": número},
  "marketTrend": "rising|falling|stable",
  "confidence": número entre 0 e 1,
  "analysis": "análise específica do produto",
  "sources": ["fontes consultadas"],
  "recommendations": ["recomendações específicas"]
}`;
  }

  // Batch analysis for multiple items with concurrency control
  static async analyzeMultipleItems(
    items: Array<{
      productName: string;
      category: string;
      specifications?: string;
      brand?: string;
      unit?: string;
    }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<MarketAnalysisResult | null>> {
    const results: Array<MarketAnalysisResult | null> = new Array(items.length).fill(null);
    const semaphore = new Array(this.MAX_CONCURRENT_REQUESTS).fill(true);
    let completed = 0;

    const processItem = async (index: number): Promise<void> => {
      try {
        const item = items[index];
        const result = await this.analyzeItemPrice(
          item.productName,
          item.category,
          item.specifications,
          item.brand,
          item.unit
        );
        results[index] = result;
      } catch (error) {
        console.error(`Error analyzing item ${items[index].productName}:`, error);
        results[index] = null;
      } finally {
        completed++;
        onProgress?.(completed, items.length);
      }
    };

    // Process items with concurrency control
    const promises = items.map(async (_, index) => {
      // Wait for a semaphore slot
      await new Promise<void>((resolve) => {
        const checkSlot = () => {
          const slotIndex = semaphore.findIndex(slot => slot);
          if (slotIndex !== -1) {
            semaphore[slotIndex] = false;
            resolve();
          } else {
            setTimeout(checkSlot, 100);
          }
        };
        checkSlot();
      });

      try {
        await processItem(index);
      } finally {
        // Release semaphore slot
        const slotIndex = semaphore.findIndex(slot => !slot);
        if (slotIndex !== -1) {
          semaphore[slotIndex] = true;
        }
      }
    });

    await Promise.all(promises);
    return results;
  }

  // Clear cache
  static clearCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      console.log('Market analysis cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Get cache statistics
  static getCacheStats(): { totalItems: number, totalSize: number } {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_KEY_PREFIX));
      
      let totalSize = 0;
      cacheKeys.forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length;
        }
      });

      return {
        totalItems: cacheKeys.length,
        totalSize: Math.round(totalSize / 1024) // Size in KB
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalItems: 0, totalSize: 0 };
    }
  }
}