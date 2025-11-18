// Helper para substituir variáveis no template
export function replaceVariables(template: string, variables: Record<string, any>): string {
  if (!template) return '';
  
  let result = template;
  
  // Substituir variáveis simples {{variable}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value || ''));
  }
  
  // Remover blocos condicionais vazios {{#if variable}}...{{/if}}
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
    return variables[varName] ? content : '';
  });
  
  return result;
}
