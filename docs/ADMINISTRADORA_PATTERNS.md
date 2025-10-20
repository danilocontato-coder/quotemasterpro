# Padrões de Implementação - Módulo Administradora

## 📋 Índice

1. [Conceitos Fundamentais](#conceitos-fundamentais)
2. [Tipos e Interfaces Padrão](#tipos-e-interfaces-padrão)
3. [Regras de Negócio](#regras-de-negócio)
4. [Padrões de Hooks](#padrões-de-hooks)
5. [Padrões de Formulários](#padrões-de-formulários)
6. [Edge Functions - Adaptações](#edge-functions-adaptações)
7. [Componentes de UI - Adaptações](#componentes-de-ui-adaptações)
8. [Queries Supabase - Padrões](#queries-supabase-padrões)
9. [Checklist de Adaptação](#checklist-de-adaptação)
10. [Exemplos Completos](#exemplos-completos)

---

## 1. Conceitos Fundamentais

### O que é uma Administradora?

Uma **administradora** é uma empresa que gerencia múltiplos condomínios. No sistema Cotiz, ela possui capacidades especiais:

- Pode criar cotações **em nome próprio** (para a administradora)
- Pode criar cotações **em nome de condomínios vinculados**
- Visualiza cotações da administradora + todos os condomínios vinculados
- Possui sistema de créditos AI próprio e separado

### Diferença vs Cliente Regular

| Aspecto | Cliente Regular | Administradora |
|---------|----------------|----------------|
| Cotações | Apenas próprias | Próprias + condomínios vinculados |
| Campo `on_behalf_of_client_id` | Sempre `null` | Pode ter ID de condomínio |
| Créditos AI | Tabela `user_credits` | Tabela `ai_credits` |
| Fornecedores | Apenas próprios | Próprios + de condomínios vinculados |

### Campo `on_behalf_of_client_id`

Este campo indica **em nome de quem** a cotação foi criada:

```typescript
// Cotação para a própria administradora
{
  client_id: 'admin-123',           // ID da administradora
  on_behalf_of_client_id: null,     // null = para si mesma
  on_behalf_of_client_name: null
}

// Cotação em nome de condomínio vinculado
{
  client_id: 'admin-123',                    // ID da administradora
  on_behalf_of_client_id: 'cond-456',        // ID do condomínio
  on_behalf_of_client_name: 'Condomínio Azul' // Resolvido via query
}
```

### Sistema de Créditos AI

Administradoras usam a tabela `ai_credits`, **não** `user_credits`:

```sql
-- Tabela correta para administradoras
ai_credits (
  client_id,           -- ID da administradora
  available_credits,   -- Créditos disponíveis
  total_earned,        -- Total ganho
  total_spent          -- Total gasto
)

-- Transações
ai_credits_transactions (
  client_id,
  amount,              -- Negativo para débito
  reason,              -- 'ai_quote_generation', 'ai_analysis', etc.
  reference_id,        -- ID da cotação/análise
  metadata             -- Dados contextuais
)
```

---

## 2. Tipos e Interfaces Padrão

### AdministradoraQuote

```typescript
export interface AdministradoraQuote {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'sent' | 'under_review' | 'approved' | 'rejected' | 'cancelled';
  total_value: number;
  client_id: string;                      // ID da administradora
  on_behalf_of_client_id: string | null;  // ID do condomínio (se aplicável)
  on_behalf_of_client_name?: string;      // Nome do condomínio (resolvido via query)
  local_code: string;                     // Código identificador local
  created_at: string;
  deadline?: string;
  items_count?: number;
  responses_count?: number;
}
```

### AICredits

```typescript
export interface AICredits {
  client_id: string;
  available_credits: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}
```

### QuoteFormData (Administradora)

```typescript
export interface AdministradoraQuoteFormData {
  // Campos obrigatórios do contexto
  targetType: 'self' | 'condominio';      // OBRIGATÓRIO
  targetCondominioId: string;              // Obrigatório se targetType = 'condominio'
  
  // Campos regulares da cotação
  title: string;
  description: string;
  local_code: string;
  deadline?: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit: string;
    description?: string;
  }>;
}
```

---

## 3. Regras de Negócio

### Cotações

#### Criação

1. **Em nome próprio** (`targetType: 'self'`):
   - `client_id` = ID da administradora
   - `on_behalf_of_client_id` = `null`
   - Aparece como cotação da administradora

2. **Em nome de condomínio** (`targetType: 'condominio'`):
   - `client_id` = ID da administradora
   - `on_behalf_of_client_id` = ID do condomínio selecionado
   - `on_behalf_of_client_name` = Nome do condomínio (resolvido)
   - Aparece como cotação do condomínio

#### Visualização

- Administradora vê:
  - Todas as cotações onde `client_id` = ID da administradora
  - Todas as cotações onde `client_id` = ID de condomínio vinculado
  
- O campo `on_behalf_of_client_name` **DEVE** ser resolvido via query adicional

#### Status e Transições

Mesmas transições que cotações regulares:
- `draft` → `sent` → `under_review` → `approved`/`rejected` → `paid`/`cancelled`

### Créditos AI

#### Regras

1. **Tabela exclusiva**: `ai_credits` (não `user_credits`)
2. **Client ID**: sempre da administradora (nunca do condomínio)
3. **Débito**: sempre que uma operação AI for executada
4. **Transação**: registrar em `ai_credits_transactions` com metadados

#### Custo Estimado (exemplo)

```typescript
const AI_COSTS = {
  quote_generation: 10,      // 10 créditos por geração
  proposal_analysis: 5,      // 5 créditos por análise
  comparative_analysis: 15,  // 15 créditos por comparação
  predictive_insights: 20    // 20 créditos por insights
};
```

#### Fluxo de Débito

```typescript
// 1. Verificar créditos disponíveis
const hasCredits = await checkCredits(cost);
if (!hasCredits) throw new Error('Créditos insuficientes');

// 2. Executar operação AI
const result = await executeAIOperation();

// 3. Debitar créditos
await debitCredits(cost, 'ai_quote_generation', quoteId);

// 4. Registrar transação
await logTransaction({
  client_id: administradoraId,
  amount: -cost,
  reason: 'ai_quote_generation',
  reference_id: quoteId,
  metadata: { targetType, targetCondominioId }
});
```

### Fornecedores

#### Inclusão

Ao listar fornecedores para uma administradora, incluir:

1. Fornecedores **locais** da administradora (`client_id` = administradora)
2. Fornecedores **globais** (`is_global` = true)
3. Fornecedores dos **condomínios vinculados** (opcional, dependendo do contexto)

#### Sugestões AI

Ao gerar sugestões de fornecedores com IA:
- Considerar região/estado da administradora
- Considerar região/estado do condomínio (se `targetType` = 'condominio')
- Priorizar fornecedores com histórico na plataforma

---

## 4. Padrões de Hooks

### ✅ Hooks Específicos para Administradora

```typescript
// Hook para buscar cotações (administradora + condomínios)
export function useAdministradoraQuotes(administradoraId?: string) {
  // - Busca cotações da administradora
  // - Busca cotações de condomínios vinculados
  // - Resolve on_behalf_of_client_name
  // - Retorna AdministradoraQuote[]
}

// Hook para buscar créditos AI
export function useAdministradoraAICredits(clientId?: string) {
  // - Usa tabela ai_credits
  // - Retorna available_credits, total_earned, total_spent
  // - Provê funções: checkCredits, debitCredits, refetch
}

// Hook para buscar condomínios vinculados
export function useCondominiosVinculados(administradoraId?: string) {
  // - Busca clients onde parent_client_id = administradoraId
  // - Filtra por client_type = 'condominio_vinculado'
  // - Retorna array de condomínios
}

// Hook para detalhe de cotação
export function useAdministradoraQuoteDetail(quoteId?: string) {
  // - Busca quote com todos os relacionamentos
  // - Resolve on_behalf_of_client_name
  // - Retorna AdministradoraQuoteDetail
}
```

### ❌ Evitar

```typescript
// ERRADO - Usar hooks regulares sem adaptação
export function useQuotes() { ... }         // Não inclui condomínios vinculados
export function useUserCredits() { ... }    // Tabela errada
```

---

## 5. Padrões de Formulários

### Props de Formulário

```typescript
interface AdministradoraQuoteFormProps {
  administradoraId: string;        // ID da administradora (obrigatório)
  administradoraName: string;      // Nome da administradora (obrigatório)
  onSuccess?: () => void;          // Callback de sucesso
  editingQuote?: AdministradoraQuote; // Para edição
}
```

### Estado do Formulário

```typescript
const [formData, setFormData] = useState<AdministradoraQuoteFormData>({
  targetType: 'self',           // Padrão: para a própria administradora
  targetCondominioId: '',       // Vazio inicialmente
  title: '',
  description: '',
  local_code: '',
  deadline: '',
  items: []
});
```

### Validação

```typescript
const validateForm = () => {
  if (!formData.title) return 'Título obrigatório';
  if (!formData.description) return 'Descrição obrigatória';
  if (!formData.local_code) return 'Código local obrigatório';
  
  // Validação específica de administradora
  if (formData.targetType === 'condominio' && !formData.targetCondominioId) {
    return 'Selecione o condomínio';
  }
  
  if (formData.items.length === 0) return 'Adicione pelo menos 1 item';
  
  return null;
};
```

### Submissão

```typescript
const handleSubmit = async () => {
  const error = validateForm();
  if (error) {
    toast({ title: 'Erro', description: error, variant: 'destructive' });
    return;
  }
  
  const payload = {
    ...formData,
    client_id: administradoraId,
    on_behalf_of_client_id: formData.targetType === 'condominio' 
      ? formData.targetCondominioId 
      : null
  };
  
  const { data, error: dbError } = await supabase
    .from('quotes')
    .insert(payload)
    .select()
    .single();
  
  if (dbError) throw dbError;
  
  toast({ title: 'Sucesso', description: 'Cotação criada!' });
  onSuccess?.();
};
```

---

## 6. Edge Functions - Adaptações

### Template de Adaptação

Ao adaptar uma edge function existente para administradora:

```typescript
// supabase/functions/[function-name]-administradora/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Parse body com campos adicionais
    const { 
      // Campos específicos de administradora
      administradoraId,
      targetType,           // 'self' | 'condominio'
      targetCondominioId,   // Se targetType = 'condominio'
      
      // Campos regulares
      description,
      clientInfo,
      ...otherParams
    } = await req.json();

    // 2. Determinar client_id efetivo para créditos
    const effectiveClientId = administradoraId || clientInfo.client_id;
    const isCotacaoParaCondominio = targetType === 'condominio';

    // 3. Buscar contexto adicional (se necessário)
    let condominioContext = '';
    if (isCotacaoParaCondominio && targetCondominioId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: condominio } = await supabase
        .from('clients')
        .select('name, address, cnpj')
        .eq('id', targetCondominioId)
        .single();

      condominioContext = `

Esta cotação está sendo criada EM NOME DO CONDOMÍNIO:
- Nome: ${condominio.name}
- Endereço: ${condominio.address}
- CNPJ: ${condominio.cnpj || 'Não informado'}

Adapte os itens e quantidades para as necessidades específicas deste condomínio.`;
    }

    // 4. Construir prompt com contexto
    const systemPrompt = `Você é um assistente especializado em administradoras de condomínios.
    
${condominioContext}

Gere uma cotação detalhada considerando:
- Tipo de propriedade (residencial/comercial)
- Quantidade de unidades
- Necessidades de manutenção
- Conformidade com normas

Responda em JSON:
{
  "title": "...",
  "description": "...",
  "items": [{"product_name": "...", "quantity": N, "unit": "..."}],
  "considerations": ["..."]
}`;

    // 5. Chamar AI (OpenAI, Lovable AI, etc.)
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: description }
        ],
        max_tokens: 2000,
      }),
    });

    const aiData = await aiResponse.json();
    const parsedResult = JSON.parse(aiData.choices[0].message.content);

    // 6. Calcular custo
    const tokensUsed = aiData.usage.total_tokens;
    const cost = Math.ceil(tokensUsed / 1000); // 1 crédito por 1000 tokens

    // 7. Verificar créditos disponíveis (tabela ai_credits)
    const { data: currentCredits } = await supabase
      .from('ai_credits')
      .select('available_credits')
      .eq('client_id', effectiveClientId)
      .single();

    if (!currentCredits || currentCredits.available_credits < cost) {
      return new Response(
        JSON.stringify({ 
          error: 'Créditos AI insuficientes',
          required: cost,
          available: currentCredits?.available_credits || 0
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Debitar créditos
    await supabase
      .from('ai_credits')
      .update({ 
        available_credits: currentCredits.available_credits - cost,
        total_spent: currentCredits.total_spent + cost
      })
      .eq('client_id', effectiveClientId);

    // 9. Registrar transação
    await supabase
      .from('ai_credits_transactions')
      .insert({
        client_id: effectiveClientId,
        amount: -cost,
        reason: 'ai_quote_generation',
        reference_id: null, // Será atualizado após criar a cotação
        metadata: {
          target_type: targetType,
          target_condominio_id: targetCondominioId || null,
          tokens_used: tokensUsed
        }
      });

    // 10. Retornar resultado com contexto de administradora
    return new Response(
      JSON.stringify({
        success: true,
        result: {
          ...parsedResult,
          on_behalf_of_client_id: targetCondominioId || null,
          administradora_id: effectiveClientId
        },
        credits_used: cost,
        credits_remaining: currentCredits.available_credits - cost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in edge function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Checklist de Adaptação de Edge Function

- [ ] Aceitar `administradoraId`, `targetType`, `targetCondominioId` no body
- [ ] Buscar contexto do condomínio (se `targetType` = 'condominio')
- [ ] Incluir contexto no prompt da IA
- [ ] Usar tabela `ai_credits` (não `user_credits`)
- [ ] Debitar créditos usando `effectiveClientId`
- [ ] Registrar transação em `ai_credits_transactions`
- [ ] Incluir `on_behalf_of_client_id` no resultado
- [ ] Retornar `credits_used` e `credits_remaining`
- [ ] Tratar erros 402 (créditos insuficientes)

---

## 7. Componentes de UI - Adaptações

### Modal AI - Template

```typescript
// src/components/administradora/AIQuoteGeneratorModal.tsx
import { useAdministradoraAICredits } from '@/hooks/useAdministradoraAICredits';
import { useCondominiosVinculados } from '@/hooks/useCondominiosVinculados';

interface AIQuoteGeneratorModalProps {
  administradoraId: string;
  administradoraName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuoteGenerated: (quote: any) => void;
}

export function AIQuoteGeneratorModal({ 
  administradoraId, 
  administradoraName,
  open, 
  onOpenChange, 
  onQuoteGenerated 
}: AIQuoteGeneratorModalProps) {
  const { credits, checkCredits, refetch } = useAdministradoraAICredits(administradoraId);
  const { condominios } = useCondominiosVinculados(administradoraId);
  const { toast } = useToast();
  const supabase = useSupabaseClient();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    targetType: 'self' as 'self' | 'condominio',
    targetCondominioId: '',
    deadline: '',
    priorities: 'qualidade_prazo'
  });

  const handleGenerate = async () => {
    // Validações
    if (!formData.description.trim()) {
      toast({ title: 'Erro', description: 'Descreva a necessidade', variant: 'destructive' });
      return;
    }

    if (formData.targetType === 'condominio' && !formData.targetCondominioId) {
      toast({ title: 'Erro', description: 'Selecione o condomínio', variant: 'destructive' });
      return;
    }

    // Verificar créditos
    const ESTIMATED_COST = 10;
    if (!(await checkCredits(ESTIMATED_COST))) {
      toast({ 
        title: 'Créditos Insuficientes', 
        description: `Você precisa de pelo menos ${ESTIMATED_COST} créditos.`,
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-quote-generator-administradora', {
        body: {
          description: formData.description,
          administradoraId: administradoraId,
          targetType: formData.targetType,
          targetCondominioId: formData.targetCondominioId || null,
          clientInfo: {
            client_id: administradoraId,
            name: administradoraName,
            type: 'administradora'
          },
          preferences: {
            deadline: formData.deadline,
            priorities: formData.priorities
          }
        }
      });

      if (error) throw error;

      if (data.success && data.result) {
        onQuoteGenerated(data.result);
        await refetch();
        
        toast({
          title: 'Cotação Gerada!',
          description: `Usados ${data.credits_used} créditos. Restam ${data.credits_remaining}.`
        });
        
        onOpenChange(false);
      }

    } catch (error: any) {
      console.error('Error generating quote:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Cotação com IA
          </DialogTitle>
          <DialogDescription>
            Créditos disponíveis: <strong>{credits?.available_credits || 0}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seletor de tipo */}
          <div className="space-y-2">
            <Label>Criar para</Label>
            <Select 
              value={formData.targetType}
              onValueChange={(v: 'self' | 'condominio') => 
                setFormData(prev => ({ ...prev, targetType: v, targetCondominioId: '' }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Administradora ({administradoraName})</SelectItem>
                <SelectItem value="condominio">Condomínio Vinculado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Seletor de condomínio */}
          {formData.targetType === 'condominio' && (
            <div className="space-y-2">
              <Label>Condomínio</Label>
              <Select 
                value={formData.targetCondominioId}
                onValueChange={(v) => setFormData(prev => ({ ...prev, targetCondominioId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {condominios.map(cond => (
                    <SelectItem key={cond.id} value={cond.id}>
                      {cond.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Ex: Materiais de limpeza para condomínio de 200 unidades..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 8. Queries Supabase - Padrões

### Buscar Cotações (Administradora + Condomínios)

```typescript
async function fetchAdministradoraQuotes(administradoraId: string) {
  // 1. Buscar IDs de condomínios vinculados
  const { data: condominios } = await supabase
    .from('clients')
    .select('id')
    .eq('parent_client_id', administradoraId)
    .eq('client_type', 'condominio_vinculado');

  const condominioIds = condominios?.map(c => c.id) || [];

  // 2. Buscar cotações (administradora + condomínios)
  const { data: quotes } = await supabase
    .from('quotes')
    .select('*')
    .or(`client_id.eq.${administradoraId},client_id.in.(${condominioIds.join(',')})`);

  // 3. Resolver on_behalf_of_client_name
  const quotesWithNames = await Promise.all(
    (quotes || []).map(async (quote) => {
      if (quote.on_behalf_of_client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', quote.on_behalf_of_client_id)
          .single();
        
        return { ...quote, on_behalf_of_client_name: client?.name };
      }
      return quote;
    })
  );

  return quotesWithNames;
}
```

### Buscar Créditos AI

```typescript
async function fetchAICredits(administradoraId: string) {
  const { data: credits, error } = await supabase
    .from('ai_credits')
    .select('*')
    .eq('client_id', administradoraId)
    .single();

  if (error) {
    console.error('Error fetching AI credits:', error);
    return null;
  }

  return credits;
}
```

### Buscar Condomínios Vinculados

```typescript
async function fetchCondominiosVinculados(administradoraId: string) {
  const { data: condominios, error } = await supabase
    .from('clients')
    .select('id, name, cnpj, address')
    .eq('parent_client_id', administradoraId)
    .eq('client_type', 'condominio_vinculado')
    .eq('active', true)
    .order('name');

  if (error) {
    console.error('Error fetching condominios:', error);
    return [];
  }

  return condominios || [];
}
```

---

## 9. Checklist de Adaptação

Ao adaptar uma funcionalidade para administradora, verificar:

### Frontend

- [ ] Criar tipos específicos (`AdministradoraQuote`, etc.)
- [ ] Criar hooks específicos (`useAdministradoraXxx`)
- [ ] Formulário: incluir `targetType` e `targetCondominioId`
- [ ] Validação: campo condomínio obrigatório se `targetType` = 'condominio'
- [ ] Queries: incluir cotações de condomínios vinculados
- [ ] Resolver `on_behalf_of_client_name` via query adicional
- [ ] UI: mostrar se cotação é para administradora ou condomínio
- [ ] Créditos AI: usar `useAdministradoraAICredits`
- [ ] Modal AI: incluir seletor de condomínio

### Backend (Edge Functions)

- [ ] Aceitar `administradoraId`, `targetType`, `targetCondominioId`
- [ ] Buscar contexto do condomínio (se aplicável)
- [ ] Incluir contexto no prompt AI
- [ ] Usar tabela `ai_credits` (não `user_credits`)
- [ ] Debitar créditos do `administradoraId`
- [ ] Registrar transação em `ai_credits_transactions`
- [ ] Incluir `on_behalf_of_client_id` no resultado
- [ ] Retornar `credits_used` e `credits_remaining`
- [ ] Tratar erro 402 (créditos insuficientes)

### Database

- [ ] RLS: administradora vê dados dos condomínios vinculados
- [ ] Índices: adicionar índices em `parent_client_id` e `on_behalf_of_client_id`
- [ ] Constraints: garantir integridade referencial

---

## 10. Exemplos Completos

### Exemplo 1: Hook Completo - useAdministradoraQuotes

```typescript
// src/hooks/useAdministradoraQuotes.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdministradoraQuote {
  id: string;
  title: string;
  description: string;
  status: string;
  total_value: number;
  client_id: string;
  on_behalf_of_client_id: string | null;
  on_behalf_of_client_name?: string;
  local_code: string;
  created_at: string;
  deadline?: string;
  items_count?: number;
  responses_count?: number;
}

export function useAdministradoraQuotes(administradoraId?: string) {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<AdministradoraQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let effectiveAdminId = administradoraId;

      if (!effectiveAdminId && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user.id)
          .single();
        
        effectiveAdminId = profile?.client_id;
      }

      if (!effectiveAdminId) {
        setQuotes([]);
        return;
      }

      // Buscar condomínios vinculados
      const { data: condominios } = await supabase
        .from('clients')
        .select('id')
        .eq('parent_client_id', effectiveAdminId)
        .eq('client_type', 'condominio_vinculado');

      const condominioIds = condominios?.map(c => c.id) || [];

      // Construir query
      let query = supabase
        .from('quotes')
        .select(`
          *,
          quote_items (count),
          quote_responses (count)
        `);

      if (condominioIds.length > 0) {
        query = query.or(`client_id.eq.${effectiveAdminId},client_id.in.(${condominioIds.join(',')})`);
      } else {
        query = query.eq('client_id', effectiveAdminId);
      }

      const { data: quotesData, error: quotesError } = await query.order('created_at', { ascending: false });

      if (quotesError) throw quotesError;

      // Resolver on_behalf_of_client_name
      const quotesWithNames = await Promise.all(
        (quotesData || []).map(async (quote) => {
          if (quote.on_behalf_of_client_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('name')
              .eq('id', quote.on_behalf_of_client_id)
              .single();
            
            return {
              ...quote,
              on_behalf_of_client_name: client?.name,
              items_count: quote.quote_items?.[0]?.count || 0,
              responses_count: quote.quote_responses?.[0]?.count || 0
            };
          }
          
          return {
            ...quote,
            items_count: quote.quote_items?.[0]?.count || 0,
            responses_count: quote.quote_responses?.[0]?.count || 0
          };
        })
      );

      setQuotes(quotesWithNames);

    } catch (err: any) {
      console.error('Error fetching administradora quotes:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [administradoraId, user]);

  return { quotes, isLoading, error, refetch: fetchQuotes };
}
```

### Exemplo 2: Hook Completo - useAdministradoraAICredits

```typescript
// src/hooks/useAdministradoraAICredits.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AICredits {
  client_id: string;
  available_credits: number;
  total_earned: number;
  total_spent: number;
}

export function useAdministradoraAICredits(clientId?: string) {
  const [credits, setCredits] = useState<AICredits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCredits = async () => {
    if (!clientId) {
      setCredits(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ai_credits')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error) throw error;
      setCredits(data);
    } catch (err) {
      console.error('Error fetching AI credits:', err);
      setCredits(null);
    } finally {
      setIsLoading(false);
    }
  };

  const checkCredits = async (required: number): Promise<boolean> => {
    if (!credits) await fetchCredits();
    return (credits?.available_credits || 0) >= required;
  };

  const debitCredits = async (amount: number, reason: string, referenceId?: string) => {
    if (!clientId) return;

    try {
      // Atualizar créditos
      const { error: updateError } = await supabase
        .from('ai_credits')
        .update({
          available_credits: (credits?.available_credits || 0) - amount,
          total_spent: (credits?.total_spent || 0) + amount
        })
        .eq('client_id', clientId);

      if (updateError) throw updateError;

      // Registrar transação
      await supabase
        .from('ai_credits_transactions')
        .insert({
          client_id: clientId,
          amount: -amount,
          reason: reason,
          reference_id: referenceId
        });

      // Atualizar estado local
      await fetchCredits();
    } catch (err) {
      console.error('Error debiting credits:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [clientId]);

  return {
    credits,
    isLoading,
    checkCredits,
    debitCredits,
    refetch: fetchCredits
  };
}
```

---

## Resumo

Este documento estabelece os padrões obrigatórios para o módulo de administradora. **Sempre consulte este documento antes de implementar novas funcionalidades** para garantir consistência e aderência às regras de negócio.

**Regras de ouro:**

1. ✅ Sempre usar hooks específicos (`useAdministradoraXxx`)
2. ✅ Sempre usar tabela `ai_credits` para créditos AI
3. ✅ Sempre incluir `targetType` e `targetCondominioId` em formulários
4. ✅ Sempre resolver `on_behalf_of_client_name` via query
5. ✅ Sempre adaptar edge functions para contexto de administradora
6. ✅ Sempre debitar créditos do `administradoraId`, nunca do condomínio

**Dúvidas?** Consulte os exemplos completos na Seção 10.
