# Vinculação Automática de Fornecedor à Cotação

## Visão Geral

Este documento explica como funciona o sistema de vinculação automática de fornecedores às cotações quando uma proposta é selecionada ou aprovada.

## Fluxo de Vinculação

### 1. Seleção de Proposta

Quando um cliente seleciona uma proposta de fornecedor:

```typescript
import { useQuoteResponseSelection } from '@/services/quoteResponseService';

const { selectResponse } = useQuoteResponseSelection();

await selectResponse({
  responseId: 'resp-123',
  quoteId: 'quote-456',
  supplierId: 'supp-789',
  status: 'selected' // ou 'approved'
});
```

### 2. Trigger Automático (Banco de Dados)

O trigger `trg_quote_response_selection` automaticamente:
- Atualiza `quotes.supplier_id` com o fornecedor da proposta selecionada
- Registra log de auditoria com ação `QUOTE_SUPPLIER_AUTO_LINKED`

**Código SQL do Trigger:**
```sql
CREATE TRIGGER trg_quote_response_selection
AFTER UPDATE ON quote_responses
FOR EACH ROW
EXECUTE FUNCTION trg_update_quote_supplier_on_selection();
```

### 3. Criação Automática de Pagamento

Quando uma cotação é aprovada (`status = 'approved'`):
- O hook `useAutomaticPayments` escuta mudanças via realtime
- Valida se `quotes.supplier_id` existe
- Se existir, cria pagamento automaticamente
- Se não existir, exibe erro e não cria pagamento

## Validações Implementadas

### No Código (useAutomaticPayments.ts)

```typescript
// ✅ VALIDAÇÃO 1: Garantir que cotação tem fornecedor
if (!updatedQuote.supplier_id) {
  console.error('❌ Cotação sem fornecedor:', {
    quote_id: updatedQuote.id,
    quote_title: updatedQuote.title,
    quote_status: updatedQuote.status,
    hint: 'Verifique se existe quote_response com status=selected ou approved'
  });
  toast({
    title: 'Erro ao Criar Pagamento',
    description: `Cotação não tem fornecedor vinculado. Selecione uma proposta antes de aprovar.`,
    variant: 'destructive'
  });
  return;
}
```

### No Banco de Dados (Trigger)

- Atualiza `quotes.supplier_id` automaticamente quando `quote_responses.status` muda para `'selected'` ou `'approved'`
- Registra auditoria no `audit_logs`

## Correção de Dados Históricos

Durante a implementação, foi executada uma migration para corrigir cotações aprovadas antigas que não tinham fornecedor vinculado:

```sql
-- Priorizar respostas selected/approved
-- Se não houver, usar a resposta mais recente
UPDATE quotes q
SET supplier_id = COALESCE(
  (SELECT qr.supplier_id FROM quote_responses qr 
   WHERE qr.quote_id = q.id AND qr.status IN ('selected', 'approved') LIMIT 1),
  (SELECT qr.supplier_id FROM quote_responses qr 
   WHERE qr.quote_id = q.id ORDER BY qr.created_at DESC LIMIT 1)
)
WHERE q.supplier_id IS NULL AND q.status = 'approved';
```

## Como Usar no Frontend

### Opção 1: Usando o Hook

```tsx
import { useQuoteResponseSelection } from '@/services/quoteResponseService';

function ProposalCard({ response, quoteId }) {
  const { selectResponse } = useQuoteResponseSelection();
  
  const handleSelect = async () => {
    await selectResponse({
      responseId: response.id,
      quoteId: quoteId,
      supplierId: response.supplier_id
    });
  };

  return (
    <button onClick={handleSelect}>
      Selecionar Proposta
    </button>
  );
}
```

### Opção 2: Usando Diretamente o Serviço

```typescript
import { selectQuoteResponse } from '@/services/quoteResponseService';

const result = await selectQuoteResponse({
  responseId: 'resp-123',
  quoteId: 'quote-456',
  supplierId: 'supp-789'
});

if (result.success) {
  // Sucesso!
} else {
  console.error(result.error);
}
```

## Troubleshooting

### Pagamento não é criado automaticamente

**Problema:** Cotação aprovada mas pagamento não foi criado

**Causas possíveis:**
1. `quotes.supplier_id` está NULL
2. Nenhuma proposta foi marcada como 'selected' ou 'approved'
3. Valor da cotação é zero ou NULL

**Solução:**
1. Verificar logs no console do navegador
2. Verificar se existe `quote_response` vinculada
3. Marcar manualmente uma proposta como 'selected' antes de aprovar

### Trigger não funciona

**Problema:** `quotes.supplier_id` não é atualizado automaticamente

**Diagnóstico:**
```sql
-- Verificar se trigger existe
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trg_quote_response_selection';

-- Verificar logs de auditoria
SELECT * FROM audit_logs 
WHERE action = 'QUOTE_SUPPLIER_AUTO_LINKED' 
ORDER BY created_at DESC LIMIT 10;
```

**Solução:**
- Re-executar a migration que cria o trigger
- Verificar se há erros de permissão no banco

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND                                                     │
│                                                              │
│  ┌────────────────┐       ┌─────────────────────┐          │
│  │ ProposalCard   │──────▶│ selectQuoteResponse │          │
│  │ (UI)           │       │ (Service)           │          │
│  └────────────────┘       └─────────────────────┘          │
│                                     │                        │
└─────────────────────────────────────┼────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────┐
│ SUPABASE                                                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ UPDATE quote_responses SET status = 'selected'       │  │
│  └──────────────────────────────────────────────────────┘  │
│                      │                                      │
│                      ▼                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ TRIGGER: trg_quote_response_selection                │  │
│  │   • UPDATE quotes SET supplier_id = NEW.supplier_id  │  │
│  │   • INSERT INTO audit_logs                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                      │                                      │
│                      ▼                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ REALTIME: quotes UPDATE event                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                      │                                      │
└──────────────────────┼──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (useAutomaticPayments)                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Detecta quotes.status = 'approved'                │  │
│  │ 2. Valida quotes.supplier_id IS NOT NULL             │  │
│  │ 3. Calcula total_amount (quote_responses > quote)    │  │
│  │ 4. INSERT INTO payments                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Logs e Monitoramento

### Console do Navegador

```
🔄 Selecionando resposta de cotação: { responseId, quoteId, supplierId }
✅ Resposta atualizada com sucesso. Trigger do banco atualizará quotes.supplier_id
✅ Fornecedor vinculado automaticamente
```

### Banco de Dados (audit_logs)

```sql
SELECT 
  action,
  entity_type,
  entity_id,
  details->>'supplier_id' as supplier_id,
  details->>'auto_linked' as auto_linked,
  created_at
FROM audit_logs
WHERE action = 'QUOTE_SUPPLIER_AUTO_LINKED'
ORDER BY created_at DESC;
```

## Conclusão

O sistema garante que:
1. ✅ Toda proposta selecionada vincula automaticamente o fornecedor à cotação
2. ✅ Pagamentos só são criados se houver fornecedor vinculado
3. ✅ Dados históricos foram corrigidos
4. ✅ Todas as ações são auditadas
5. ✅ Logs detalhados facilitam debugging
