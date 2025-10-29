/**
 * Mapeamento entre categorias de produtos e especialidades de fornecedores
 * 
 * Este mapeamento é necessário porque:
 * - Produtos têm categorias (ex: "Material de Limpeza")
 * - Fornecedores têm especialidades (ex: "Produtos de Limpeza")
 * - Precisamos fazer o match entre eles para calcular compatibilidade
 */

export const CATEGORY_TO_SPECIALTY_MAP: Record<string, string[]> = {
  'Material de Limpeza': ['Produtos de Limpeza', 'Materiais de Limpeza', 'Limpeza'],
  'Alimentação': ['Alimentação e Bebidas', 'Restaurante e Alimentação'],
  'Materiais de Construção': ['Construção Civil', 'Materiais de Construção'],
  'Material Elétrico': ['Elétrica e Iluminação', 'Materiais Elétricos'],
  'Ferramentas': ['Ferramentas', 'Equipamentos', 'Ferramentas e Equipamentos'],
  'Manutenção': ['Serviços de Manutenção', 'Manutenção Predial'],
  'Segurança': ['Segurança Patrimonial', 'Segurança'],
  'Jardinagem': ['Jardinagem e Paisagismo', 'Paisagismo'],
  'Hidráulica': ['Materiais Hidráulicos', 'Hidráulica'],
  'Pintura': ['Tintas e Pintura', 'Pintura'],
  'Escritório': ['Material de Escritório', 'Suprimentos de Escritório'],
  'TI': ['Tecnologia da Informação', 'TI e Telecomunicações'],
  'Móveis': ['Móveis e Decoração', 'Mobiliário'],
  'Eletrodomésticos': ['Eletrodomésticos', 'Equipamentos Domésticos'],
};

/**
 * Expande uma lista de categorias para incluir especialidades equivalentes
 * 
 * @param categories - Lista de categorias de produtos
 * @returns Lista expandida incluindo especialidades mapeadas
 * 
 * @example
 * mapCategoriesToSpecialties(['Material de Limpeza'])
 * // Retorna: ['Material de Limpeza', 'Produtos de Limpeza', 'Materiais de Limpeza', 'Limpeza']
 */
export function mapCategoriesToSpecialties(categories: string[]): string[] {
  const specialties = new Set<string>();
  
  categories.forEach(category => {
    // Adicionar categoria original
    specialties.add(category);
    
    // Adicionar especialidades mapeadas
    const mapped = CATEGORY_TO_SPECIALTY_MAP[category];
    if (mapped) {
      mapped.forEach(s => specialties.add(s));
    }
  });
  
  return Array.from(specialties);
}

/**
 * Verifica se uma especialidade de fornecedor é compatível com uma categoria de produto
 * 
 * @param productCategory - Categoria do produto
 * @param supplierSpecialty - Especialidade do fornecedor
 * @returns true se houver compatibilidade
 */
export function isSpecialtyCompatible(productCategory: string, supplierSpecialty: string): boolean {
  // Match exato
  if (productCategory === supplierSpecialty) return true;
  
  // Verificar se a especialidade está no mapeamento da categoria
  const mappedSpecialties = CATEGORY_TO_SPECIALTY_MAP[productCategory] || [];
  return mappedSpecialties.includes(supplierSpecialty);
}
