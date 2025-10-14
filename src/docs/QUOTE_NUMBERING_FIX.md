# Correção: Numeração de Cotações (RFQ)

**Data:** 2025-10-14  
**Status:** ✅ Resolvido

## Resumo

- **Sintoma:** Numeração de cotações (RFQ) pulava de 2 em 2 ao invés de sequencial.
- **Causa raiz:** O campo `id` estava sendo usado tanto como identificador técnico (UUID) quanto como código visual (RFQ). O trigger estava gerando ambos, mas o código frontend usava `id` para exibição.
- **Solução:** Separar claramente:
  - `id` = UUID técnico interno (nunca mostrado ao usuário)
  - `local_code` = RFQ01, RFQ02... (código visual sequencial por cliente)

## Mudanças Implementadas

### 1. Migration SQL
```sql
-- Arquivo: supabase/migrations/[timestamp]_separate_id_and_local_code.sql

-- Tornar local_code obrigatório
ALTER TABLE public.quotes 
ALTER COLUMN local_code SET NOT NULL;

-- Trigger atualizado para gerar UUID em id e RFQ em local_code
CREATE OR REPLACE FUNCTION public.trg_quotes_set_id_and_local_code()
RETURNS TRIGGER AS $$
BEGIN
  -- SEMPRE gerar UUID para id (técnico, interno)
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  
  -- SEMPRE gerar local_code sequencial (visual, para usuário)
  IF NEW.local_code IS NULL OR btrim(NEW.local_code) = '' THEN
    NEW.local_code := public.next_local_quote_code_by_client(NEW.client_id, 'RFQ');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### 2. TypeScript Interface
```typescript
// src/hooks/useSupabaseQuotes.ts
export interface Quote {
  id: string; // UUID técnico interno (gerado pelo banco)
  local_code?: string; // RFQ01, RFQ02... (código visual, gerado pelo banco)
  title: string;
  // ... outros campos
}
```

### 3. Exibição no Frontend

**Antes (ERRADO):**
```tsx
<p>#{quote.id}</p> // Mostrava UUID
```

**Depois (CORRETO):**
```tsx
<p>#{quote.local_code}</p> // Mostra RFQ01, RFQ02...
// OU com fallback:
<p>#{quote.local_code || quote.id}</p>
```

**Arquivos atualizados:**
- ✅ `src/pages/Quotes.tsx` - Busca e exibição de cards
- ✅ `src/components/quotes/QuoteDetailModal.tsx` - Cabeçalho do modal
- ✅ `src/components/quotes/DeleteConfirmationModal.tsx` - Mensagem de confirmação
- ✅ `src/components/payments/ApprovedQuotesSection.tsx` - Lista de pagamentos
- ✅ `src/components/payments/CreatePaymentModal.tsx` - Seleção de cotação
- ✅ `supabase/functions/send-quote-to-suppliers/index.ts` - Mensagens WhatsApp

### 4. Edge Function (WhatsApp)
```typescript
// Usar local_code nas mensagens enviadas para fornecedores
const templateVariables = {
  quote_id: quote.local_code || quote.id, // RFQ01 ao invés de UUID
  // ... outros campos
};
```

## Validação

### Como testar:
1. Criar nova cotação no painel
2. Verificar que aparece como RFQ01, RFQ02, etc. (não UUID)
3. Criar segunda cotação
4. Confirmar que a numeração é sequencial (RFQ02, RFQ03...)
5. Testar busca por número RFQ
6. Verificar mensagens WhatsApp (devem mostrar RFQ, não UUID)

### Queries de verificação:
```sql
-- Verificar separação de id e local_code
SELECT id, local_code, title, client_id
FROM public.quotes
ORDER BY created_at DESC
LIMIT 5;

-- Verificar contadores por cliente
SELECT client_id, current_counter
FROM public.client_quote_counters;
```

## Benefícios

✅ Numeração sequencial previsível (RFQ01, RFQ02...)  
✅ IDs técnicos (UUID) permanecem únicos e imutáveis  
✅ Cada cliente tem sua própria sequência  
✅ Mensagens WhatsApp mostram códigos amigáveis  
✅ Busca por RFQ funciona corretamente  

## Pontos de Atenção

⚠️ **Não criar cotações manualmente com `id` no código** - Sempre deixar o trigger gerar  
⚠️ **Sempre usar `local_code` para exibição** - Nunca mostrar UUID ao usuário  
⚠️ **Cast de tipo pode ser necessário** - TypeScript pode reclamar de campos gerados pelo banco

## Histórico de Correções

| Data | Versão | Descrição |
|------|--------|-----------|
| 2025-10-13 | v1 | Tentativa inicial - trigger gerando UUID em id |
| 2025-10-14 | v2 | Correção final - separação clara de id (UUID) e local_code (RFQ) |

---

**Documentação protegida** - Não modificar sem consultar equipe técnica
