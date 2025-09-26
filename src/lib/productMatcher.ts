// Utilitários para detecção e padronização de produtos similares
export interface ProductSuggestion {
  id: string;
  name: string;
  category: string;
  similarity: number;
  code: string;
}

export interface ProductAnalysis {
  isService: boolean;
  normalizedName: string;
  category: string;
  suggestions: ProductSuggestion[];
  confidence: number;
}

// Calcular similaridade entre strings usando Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Calcular similaridade como porcentagem (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}

// Detectar se é serviço baseado em palavras-chave
function detectServiceType(name: string): boolean {
  const serviceKeywords = [
    'serviço', 'servico', 'manutenção', 'manutencao', 'instalação', 'instalacao',
    'reparo', 'conserto', 'limpeza', 'pintura', 'reforma', 'montagem',
    'desmontagem', 'transporte', 'entrega', 'consultoria', 'assessoria',
    'treinamento', 'capacitação', 'capacitacao', 'auditoria', 'inspeção',
    'inspecao', 'certificação', 'certificacao', 'calibração', 'calibracao'
  ];
  
  const lowerName = name.toLowerCase();
  return serviceKeywords.some(keyword => lowerName.includes(keyword));
}

// Normalizar nome do produto (remover variações desnecessárias)
export function normalizeProductName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    // Remover artigos e preposições comuns
    .replace(/^(o|a|os|as|um|uma|de|da|do|dos|das|para|com|sem)\s+/g, '')
    // Padronizar unidades
    .replace(/\b(l|litro|litros)\b/g, 'l')
    .replace(/\b(kg|kilo|kilos|quilos?)\b/g, 'kg')
    .replace(/\b(g|grama|gramas)\b/g, 'g')
    .replace(/\b(m|metro|metros)\b/g, 'm')
    .replace(/\b(cm|centimetro|centimetros)\b/g, 'cm')
    .replace(/\b(un|unid|unidade|unidades|peça|peças|peca|pecas)\b/g, 'un')
    .replace(/\b(pct|pacote|pacotes|embalagem|embalagens)\b/g, 'pct')
    // Remover caracteres especiais extras
    .replace(/[^\w\s]/g, ' ')
    // Remover espaços duplos
    .replace(/\s+/g, ' ')
    .trim()
    // Capitalizar primeira letra de cada palavra
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Categorizar produto automaticamente
function categorizeProduct(name: string): string {
  const categories = {
    'Material de Limpeza': ['detergente', 'desinfetante', 'sabão', 'sabao', 'alvejante', 'amaciante', 'limpa', 'vassoura', 'rodo', 'pano', 'esponja'],
    'Material de Escritório': ['papel', 'caneta', 'lapis', 'grampeador', 'pasta', 'arquivo', 'tinta', 'impressora'],
    'Equipamentos': ['computador', 'monitor', 'teclado', 'mouse', 'impressora', 'scanner', 'telefone', 'celular'],
    'Ferramentas': ['chave', 'martelo', 'furadeira', 'parafuso', 'prego', 'alicate', 'broca'],
    'Material Elétrico': ['fio', 'cabo', 'lampada', 'lâmpada', 'tomada', 'interruptor', 'fusivel', 'disjuntor'],
    'Material Hidráulico': ['tubo', 'cano', 'conexão', 'conexao', 'registro', 'torneira', 'chuveiro', 'vaso'],
    'Descartáveis': ['copo', 'prato', 'guardanapo', 'saco', 'sacola', 'embalagem', 'papel toalha'],
    'EPIs': ['capacete', 'luva', 'óculos', 'oculos', 'máscara', 'mascara', 'bota', 'colete', 'protetor'],
    'Serviços': ['manutenção', 'manutencao', 'limpeza', 'pintura', 'instalação', 'instalacao', 'reparo', 'conserto']
  };
  
  const lowerName = name.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return category;
    }
  }
  
  return 'Geral';
}

// Analisar produto e encontrar similares
export function analyzeProduct(
  productName: string, 
  existingProducts: Array<{id: string, name: string, category?: string, code: string}>
): ProductAnalysis {
  const normalizedName = normalizeProductName(productName);
  const isService = detectServiceType(productName);
  const category = categorizeProduct(productName);
  
  // Encontrar produtos similares
  const suggestions: ProductSuggestion[] = existingProducts
    .map(product => ({
      ...product,
      similarity: calculateSimilarity(normalizedName, product.name),
      category: product.category || 'Geral'
    }))
    .filter(product => product.similarity > 0.6) // Apenas similaridades acima de 60%
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3); // Top 3 sugestões
  
  // Calcular confiança baseada na melhor similaridade
  const bestSimilarity = suggestions.length > 0 ? suggestions[0].similarity : 0;
  const confidence = bestSimilarity > 0.85 ? 0.9 : bestSimilarity > 0.7 ? 0.7 : 0.5;
  
  return {
    isService,
    normalizedName,
    category,
    suggestions,
    confidence
  };
}

// Criar sugestões inteligentes para a IA
export function createAISuggestions(analysis: ProductAnalysis): string[] {
  const suggestions: string[] = [];
  
  if (analysis.suggestions.length > 0) {
    const topSuggestion = analysis.suggestions[0];
    if (topSuggestion.similarity > 0.85) {
      suggestions.push(`Usar "${topSuggestion.name}" (${Math.round(topSuggestion.similarity * 100)}% similar)`);
    }
    
    if (analysis.suggestions.length > 1) {
      suggestions.push('Ver produtos similares');
    }
  }
  
  suggestions.push(`Criar novo ${analysis.isService ? 'serviço' : 'produto'}: "${analysis.normalizedName}"`);
  suggestions.push('Ajustar nome manualmente');
  
  return suggestions;
}