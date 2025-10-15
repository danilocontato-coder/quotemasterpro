import { supabase } from '@/integrations/supabase/client';

export interface BrandAnalysis {
  brandReputation: string;
  marketPresence: string;
  reliability: number;
  warrantyQuality: string;
  afterSalesSupport: string;
}

export interface ProductQuality {
  durability: string;
  specifications: string;
  techComparison: string;
  certifications: string[];
}

export interface PriceJustification {
  isPriceJustified: boolean;
  reasons: string[];
  costBenefit: string;
}

export interface RiskAnalysis {
  level: 'low' | 'medium' | 'high';
  factors: string[];
}

export interface Recommendations {
  shouldApprove: boolean;
  confidence: number;
  mainReasons: string[];
  concerns: string[];
  negotiationPoints: string[];
}

export interface ProposalQualitativeAnalysis {
  supplierName: string;
  overallScore: number;
  brandAnalysis: BrandAnalysis;
  productQuality: ProductQuality;
  priceJustification: PriceJustification;
  risks: RiskAnalysis;
  recommendations: Recommendations;
  consultantOpinion: string;
}

export interface BestChoice {
  supplierId: string;
  reasons: string[];
}

export interface RiskWarning {
  supplierId: string;
  warning: string;
  severity: 'low' | 'medium' | 'high';
}

export interface NegotiationStrategy {
  primaryChoice: string;
  backupChoice: string;
  negotiationPoints: string[];
  expectedDiscount: string;
}

export interface ComparativeConsultantAnalysis {
  bestOverall: BestChoice;
  bestValueForMoney: BestChoice;
  bestQuality: BestChoice;
  riskWarnings: RiskWarning[];
  negotiationStrategy: NegotiationStrategy;
  executiveSummary: string;
}

export interface ProposalItem {
  productName: string;
  brand?: string;
  specifications?: string;
  quantity: number;
  unitPrice: number;
}

export interface ProposalForAnalysis {
  id: string;
  supplierName: string;
  items: ProposalItem[];
  totalPrice: number;
  deliveryTime: number;
  warrantyMonths: number;
  shippingCost: number;
}

class ProposalConsultantService {
  async analyzeProposal(proposal: ProposalForAnalysis): Promise<ProposalQualitativeAnalysis> {
    const prompt = this.buildIndividualAnalysisPrompt(proposal);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-proposal-consultant', {
        body: {
          type: 'individual',
          prompt,
          proposal
        }
      });

      if (error) throw error;

      return data.analysis;
    } catch (error) {
      console.error('Erro ao analisar proposta:', error);
      throw error;
    }
  }

  async compareProposals(proposals: ProposalForAnalysis[]): Promise<ComparativeConsultantAnalysis> {
    const prompt = this.buildComparativeAnalysisPrompt(proposals);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-proposal-consultant', {
        body: {
          type: 'comparative',
          prompt,
          proposals
        }
      });

      if (error) throw error;

      return data.analysis;
    } catch (error) {
      console.error('Erro ao comparar propostas:', error);
      throw error;
    }
  }

  private buildIndividualAnalysisPrompt(proposal: ProposalForAnalysis): string {
    const itemsDescription = proposal.items.map(item => `
- ${item.productName}
  ${item.brand ? `Marca: ${item.brand}` : 'Marca: Não informado'}
  ${item.specifications ? `Especificações: ${item.specifications}` : 'Especificações: Não informado'}
  Quantidade: ${item.quantity}
  Preço unitário: R$ ${item.unitPrice.toFixed(2)}
`).join('\n');

    return `Você é um consultor especializado em compras corporativas. Analise esta proposta:

FORNECEDOR: ${proposal.supplierName}
PRODUTOS OFERTADOS:
${itemsDescription}

CONDIÇÕES:
- Prazo de entrega: ${proposal.deliveryTime} dias
- Garantia: ${proposal.warrantyMonths} meses
- Frete: R$ ${proposal.shippingCost.toFixed(2)}
- Valor total: R$ ${proposal.totalPrice.toFixed(2)}

ANÁLISE REQUERIDA (responda em JSON estruturado):
1. Reputação e confiabilidade das marcas oferecidas
2. Qualidade técnica dos produtos (durabilidade, especificações)
3. Justificativa de preço (o valor está condizente com a qualidade?)
4. Riscos potenciais (prazo, garantia, pós-venda)
5. Pontos fortes e fracos da proposta
6. Recomendação: aprovar/negociar/rejeitar
7. Pontos de negociação sugeridos

Forneça um parecer como se fosse um consultor experiente avaliando esta compra.

Responda EXCLUSIVAMENTE em JSON válido:
{
  "overallScore": número 0-100,
  "brandAnalysis": {
    "brandReputation": "texto",
    "marketPresence": "texto",
    "reliability": número 0-10,
    "warrantyQuality": "texto",
    "afterSalesSupport": "texto"
  },
  "productQuality": {
    "durability": "texto",
    "specifications": "texto",
    "techComparison": "texto",
    "certifications": ["cert1", "cert2"]
  },
  "priceJustification": {
    "isPriceJustified": boolean,
    "reasons": ["razão1", "razão2"],
    "costBenefit": "Excelente|Bom|Razoável|Ruim"
  },
  "risks": {
    "level": "low|medium|high",
    "factors": ["fator1", "fator2"]
  },
  "recommendations": {
    "shouldApprove": boolean,
    "confidence": número 0-100,
    "mainReasons": ["razão1", "razão2"],
    "concerns": ["preocupação1", "preocupação2"],
    "negotiationPoints": ["ponto1", "ponto2"]
  },
  "consultantOpinion": "texto do parecer detalhado"
}`;
  }

  private buildComparativeAnalysisPrompt(proposals: ProposalForAnalysis[]): string {
    const proposalsDescription = proposals.map((p, i) => `
PROPOSTA ${i+1} - ${p.supplierName}:
Produtos: ${p.items.map(item => `${item.productName}${item.brand ? ` (${item.brand})` : ''}`).join(', ')}
Valor: R$ ${p.totalPrice.toFixed(2)}
Prazo: ${p.deliveryTime} dias
Garantia: ${p.warrantyMonths} meses
`).join('\n');

    return `Você é um consultor de compras. Compare estas ${proposals.length} propostas recebidas:

${proposalsDescription}

MISSÃO:
Como consultor experiente, forneça uma análise comparativa focada em:
1. Qual proposta oferece MELHOR CUSTO-BENEFÍCIO?
2. Qual proposta tem MELHOR QUALIDADE?
3. Quais RISCOS cada proposta apresenta?
4. Qual sua RECOMENDAÇÃO FINAL?
5. Como NEGOCIAR para obter melhor valor?

Considere: marcas, especificações técnicas, prazos, garantias, reputação do fornecedor.

Responda EXCLUSIVAMENTE em JSON válido:
{
  "bestOverall": { 
    "supplierId": "id_do_fornecedor_recomendado",
    "reasons": ["razão1", "razão2"] 
  },
  "bestValueForMoney": { 
    "supplierId": "id",
    "reasons": ["razão1", "razão2"] 
  },
  "bestQuality": { 
    "supplierId": "id",
    "reasons": ["razão1", "razão2"] 
  },
  "riskWarnings": [
    {
      "supplierId": "id",
      "warning": "texto do alerta",
      "severity": "low|medium|high"
    }
  ],
  "negotiationStrategy": {
    "primaryChoice": "nome_fornecedor",
    "backupChoice": "nome_fornecedor",
    "negotiationPoints": ["ponto1", "ponto2"],
    "expectedDiscount": "texto com expectativa"
  },
  "executiveSummary": "resumo executivo com recomendação final detalhada"
}`;
  }
}

export const proposalConsultantService = new ProposalConsultantService();
