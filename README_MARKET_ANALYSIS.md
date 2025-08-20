# Comparador Inteligente com Análise de Mercado IA

## Funcionalidade

O **Comparador Inteligente** do QuoteMaster Pro agora inclui análise de preços de mercado usando IA (Perplexity) para comparar propostas de fornecedores com preços reais do mercado brasileiro.

## Como Usar

### 1. Acessar o Comparador
- Vá para a página de **Cotações**
- Encontre uma cotação com status "Recebendo" ou "Aprovada" que tenha pelo menos 2 propostas
- Clique no botão **"Comparar (X)"** na linha da cotação

### 2. Comparação Básica
O comparador oferece análise multicritério baseada em:
- **Preço** (peso padrão: 25%)
- **Prazo de Entrega** (peso padrão: 20%)
- **Frete** (peso padrão: 15%)
- **SLA** (peso padrão: 15%)
- **Garantia** (peso padrão: 15%)
- **Reputação** (peso padrão: 10%)

### 3. Análise Inteligente de Mercado
Clique no botão **"Analisar Mercado"** para:
- Comparar preços com a média de mercado brasileiro
- Identificar fornecedores com preços competitivos
- Receber recomendações baseadas em IA
- Ver tendências de preço do produto

## Configuração da API Perplexity

### Opção 1: Configuração Temporária (Desenvolvimento)
1. No modal de análise, digite sua chave da API Perplexity
2. Clique em "Validar" para testar a conexão
3. A chave será salva no localStorage do navegador

### Opção 2: Integração com Supabase (Recomendado)
1. Conecte seu projeto ao Supabase clicando no botão verde no canto superior direito
2. Configure a chave da API Perplexity nos secrets do Supabase
3. A funcionalidade será automaticamente integrada

## Recursos da Análise IA

### Métricas de Mercado
- **Preço Médio**: Média atual do mercado brasileiro
- **Faixa de Preços**: Valores mínimo e máximo encontrados
- **Tendência**: Se os preços estão subindo, descendo ou estáveis

### Análise Competitiva
Para cada fornecedor, você verá:
- **Posição no Mercado**: Abaixo, na média ou acima do mercado
- **Variação %**: Diferença percentual em relação à média
- **Competitividade**: Classificação de excelente a ruim

### Alertas Inteligentes
- 🟢 **Excelente oportunidade**: Preços 15%+ abaixo do mercado
- 🟡 **Preço razoável**: Variação entre -15% e +15%
- 🔴 **Preço elevado**: Preços 15%+ acima do mercado

## Funcionalidades Adicionais

### Matriz de Decisão
- Salve configurações de pesos personalizadas
- Reutilize critérios para análises futuras
- Compare diferentes cenários de priorização

### Exportação
- **PDF**: Relatório completo com análise e recomendações
- **Excel**: Dados estruturados para análise adicional
- **JSON**: Dados técnicos para integração

## Exemplos de Uso

### Cenário 1: Materiais de Construção
```
Produto: Cimento Portland 50kg
Propostas: 4 fornecedores
Análise IA: Preço médio R$ 32,50, tendência estável
Recomendação: Fornecedor com preço 12% abaixo do mercado
```

### Cenário 2: Produtos de Limpeza
```
Produto: Detergente Neutro 5L
Propostas: 3 fornecedores
Análise IA: Preço médio R$ 28,90, tendência de alta
Recomendação: Compra imediata devido à tendência de alta
```

## Limitações Atuais

1. **Mock Data**: Sistema usando dados simulados para demonstração
2. **API Key Local**: Chaves armazenadas localmente (temporário)
3. **Categorias**: Sistema genérico, categorização pode ser melhorada

## Roadmap

### Próximas Funcionalidades
- [ ] Integração completa com Supabase
- [ ] Histórico de análises de mercado
- [ ] Alertas de mudança de preços
- [ ] Análise por região geográfica
- [ ] Comparação com cotações históricas
- [ ] API própria para análise de mercado

### Melhorias Planejadas
- [ ] Categorização automática de produtos
- [ ] Análise de sazonalidade
- [ ] Previsão de preços
- [ ] Scores de fornecedores mais sofisticados
- [ ] Integração com marketplaces

## Suporte

Para usar completamente esta funcionalidade:

1. **Obtenha uma chave API Perplexity**: [https://perplexity.ai](https://perplexity.ai)
2. **Conecte ao Supabase**: Use o botão verde na interface
3. **Configure secrets**: Adicione a chave no Supabase Edge Functions

## Arquivos Relacionados

- `src/services/MarketAnalysisService.ts` - Serviço principal da análise
- `src/components/quotes/MarketAnalysisModal.tsx` - Interface de análise
- `src/components/quotes/QuoteComparison.tsx` - Comparador principal
- `src/data/mockProposals.ts` - Dados de exemplo

---

**Nota**: Esta é uma versão de demonstração. Para uso em produção, conecte ao Supabase e configure adequadamente as chaves API.