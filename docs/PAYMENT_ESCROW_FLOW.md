# Fluxo de Pagamento com Escrow (Custódia)

## 📋 Visão Geral

O sistema Cotiz implementa um fluxo de pagamento seguro com **custódia (escrow)**, onde os fundos ficam retidos até a confirmação da entrega pelo cliente. Isso protege ambas as partes: o cliente só libera o pagamento após receber o produto/serviço, e o fornecedor tem garantia de que o pagamento foi confirmado.

---

## 🔄 Fluxo Completo de Pagamento

### **1️⃣ Cliente Aprova Cotação**
- **Status da Cotação**: `draft` → `approved`
- **Status do Pagamento**: (ainda não criado)
- **Ação**: Cliente aprova a proposta do fornecedor

### **2️⃣ Cliente Realiza Pagamento (Asaas)**
- **Status do Pagamento**: `pending` → `in_escrow` ✅
- **Status da Cotação**: `approved` (mantém)
- **Status da Entrega**: (criada automaticamente como `pending`)
- **Ação**: Cliente paga via Asaas (boleto, cartão, PIX, etc.)
- **Webhook**: `PAYMENT_RECEIVED` ou `PAYMENT_CONFIRMED`
- **Sistema**: 
  - Pagamento vai para **custódia (in_escrow)**
  - **Trigger automático cria entrega placeholder** (status `pending`, sem data agendada)
  - Fornecedor recebe **notificação de alta prioridade** 🔔
  - Cotação permanece `approved` (não vai direto para `paid`)
  - Entrega aparece no módulo de entregas do fornecedor

### **3️⃣ Fornecedor Recebe Notificação**
- **Notificação**: "💰 Pagamento Confirmado! O pagamento de R$ X foi confirmado e está em custódia. Agende a entrega!"
- **Prioridade**: Alta (badge vermelho no sino de notificações)
- **Entrega Placeholder**: Aparece automaticamente em `/supplier/deliveries` com status "Aguardando Agendamento"
- **Ação**: Fornecedor clica em "Agendar Entrega" no módulo de entregas ou de cotações

### **4️⃣ Fornecedor Agenda Entrega**
- **Status do Pagamento**: `in_escrow` (mantém)
- **Status da Cotação**: `approved` → `delivering`
- **Status da Entrega**: `pending` → `scheduled` ✅
- **Ação**: Fornecedor preenche data, endereço e observações da entrega
- **Sistema**: Atualiza o registro placeholder existente (não cria novo)
- **Validação**: Edge function valida que pagamento está em `in_escrow`
- **Notificação**: Cliente recebe notificação de entrega agendada

### **5️⃣ Fornecedor Realiza Entrega**
- **Status do Pagamento**: `in_escrow` (mantém)
- **Status da Cotação**: `delivering` (mantém)
- **Status da Entrega**: `scheduled` → `in_transit` (opcional)
- **Ação**: Fornecedor entrega o produto/serviço fisicamente

### **6️⃣ Cliente Confirma Entrega**
- **Status do Pagamento**: `in_escrow` → `completed` ✅
- **Status da Cotação**: `delivering` → `paid` ✅
- **Status da Entrega**: `scheduled` → `delivered`
- **Ação**: Cliente insere código de confirmação recebido
- **Sistema**: Libera fundos da custódia para o fornecedor

### **7️⃣ Fundos Liberados**
- **Status Final do Pagamento**: `completed`
- **Status Final da Cotação**: `paid`
- **Status Final da Entrega**: `delivered`
- **Ação**: Fornecedor recebe os fundos na conta Asaas

---

## 🛡️ Segurança do Fluxo

### **Por que usar Escrow?**

1. **Proteção ao Cliente**: Pagamento só é liberado após confirmação de entrega
2. **Garantia ao Fornecedor**: Fundos confirmados antes de iniciar a entrega
3. **Rastreabilidade**: Toda transação é auditada e registrada
4. **Redução de Fraudes**: Código de confirmação impede liberações indevidas

### **Validações Implementadas**

- ✅ Apenas fornecedor designado pode agendar entrega
- ✅ Pagamento deve estar em `in_escrow` para permitir agendamento
- ✅ Código de confirmação válido e não expirado
- ✅ Cliente autorizado para confirmar entrega
- ✅ Logs de auditoria em todas as transições

---

## 📊 Diagrama de Estados

```
PAGAMENTO:
pending → in_escrow → completed
   ↑          ↑            ↑
   |          |            |
Cliente     Asaas      Cliente
 paga     confirma    confirma
          pagamento    entrega

COTAÇÃO:
draft → approved → delivering → paid
  ↑        ↑           ↑         ↑
  |        |           |         |
Criada  Cliente    Fornecedor  Entrega
       aprova      agenda     confirmada
```

---

## 🔧 Implementação Técnica

### **Edge Functions**

1. **`asaas-webhook`**: Recebe confirmação de pagamento do Asaas
   - Muda payment de `pending` → `in_escrow`
   - Mantém quote em `approved`
   - Notifica fornecedor (prioridade alta)

2. **Database Trigger `trg_create_placeholder_delivery_on_escrow`**: Cria entrega placeholder
   - Dispara automaticamente quando payment muda para `in_escrow`
   - Cria registro em `deliveries` com status `pending` e `scheduled_date = NULL`
   - Garante idempotência via índice único `(quote_id, supplier_id)`
   - Registra em `audit_logs` como `DELIVERY_PLACEHOLDER_CREATED`
   - **NÃO notifica o cliente** (notificação só após agendamento)

3. **`sync-asaas-payment-status`**: Sincroniza status manualmente
   - Consulta API Asaas
   - Aplica mesma lógica do webhook
   - Útil para sincronizações manuais

4. **`schedule-delivery`**: Agenda entrega
   - **ATUALIZA** a entrega placeholder existente (não insere nova)
   - Valida que payment está em `in_escrow`
   - Cria registro de delivery
   - Muda quote para `delivering`

4. **`confirm-delivery`**: Confirma entrega e libera pagamento
   - Valida código de confirmação
   - Muda payment de `in_escrow` → `completed`
   - Muda quote para `paid`
   - Muda delivery para `delivered`

5. **`release-escrow-payment`**: Função admin para liberar pagamento manualmente
   - Usado em casos excepcionais
   - Requer permissões de administrador

### **Triggers de Banco de Dados**

```sql
-- Notificar fornecedor quando pagamento entra em escrow
CREATE TRIGGER trg_notify_supplier_payment_in_escrow
AFTER UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION notify_supplier_payment_in_escrow();

-- Outras triggers relacionadas a cotações e entregas
```

---

## 🧪 Como Testar

### **Teste Completo do Fluxo**

1. **Criar Nova Cotação**
   ```
   Cliente → Dashboard → Nova Cotação → Preencher dados → Enviar
   ```

2. **Aprovar Cotação**
   ```
   Cliente → Cotações → Selecionar cotação → Aprovar
   ```

3. **Simular Pagamento (Sandbox Asaas)**
   ```
   - Gerar link de pagamento
   - Usar dados de teste do Asaas
   - Webhook será acionado automaticamente
   ```

4. **Verificar Status**
   ```sql
   SELECT id, status, asaas_payment_id 
   FROM payments 
   WHERE quote_id = 'your-quote-id';
   -- Deve retornar: status = 'in_escrow'
   ```

5. **Verificar Notificação do Fornecedor**
   ```
   Fornecedor → Sino de notificações → Badge vermelho
   ```

6. **Agendar Entrega**
   ```
   Fornecedor → Entregas → Agendar Agora → Preencher formulário
   ```

7. **Confirmar Entrega**
   ```
   Cliente → Recebe código → Confirmações → Inserir código
   ```

8. **Verificar Liberação**
   ```sql
   SELECT id, status FROM payments WHERE id = 'payment-id';
   -- Deve retornar: status = 'completed'
   ```

---

## 🚨 Mensagens de Erro Comuns

### **"O pagamento precisa estar em custódia para agendar a entrega"**

**Causa**: Pagamento não está no status `in_escrow`

**Soluções**:
- Aguardar confirmação do webhook Asaas (pode levar alguns segundos)
- Verificar se pagamento foi realmente confirmado no Asaas
- Sincronizar status manualmente via `/sync-asaas-payment-status`
- Verificar logs da edge function `asaas-webhook`

**Status esperado**: `in_escrow`

**Outros status possíveis**:
- `pending`: Pagamento ainda não confirmado
- `paid` ou `completed`: Entrega já foi confirmada
- `overdue`: Pagamento vencido
- `cancelled`: Pagamento cancelado

### **"Código de confirmação inválido ou expirado"**

**Causa**: Código incorreto, já usado ou expirou

**Soluções**:
- Verificar se digitou o código corretamente
- Código expira em 24 horas
- Código é de uso único
- Solicitar novo código ao fornecedor se necessário

---

## 📝 Logs e Auditoria

Todas as transições de status são registradas em `audit_logs`:

```sql
SELECT * FROM audit_logs 
WHERE entity_type IN ('payments', 'quotes', 'deliveries')
ORDER BY created_at DESC;
```

**Ações auditadas**:
- `PAYMENT_CONFIRMED` - Pagamento confirmado via webhook
- `PAYMENT_SYNC` - Status sincronizado manualmente
- `DELIVERY_SCHEDULED` - Entrega agendada
- `DELIVERY_CONFIRMED` - Entrega confirmada
- `ESCROW_RELEASED` - Pagamento liberado da custódia

---

## 🔗 Referências

- **Asaas Webhooks**: https://docs.asaas.com/docs/webhooks
- **Fluxo de Pagamentos Asaas**: https://docs.asaas.com/docs/pagamentos
- **Sistema de Notificações**: `src/utils/NotificationHelpers.ts`
- **Edge Functions**: `supabase/functions/`

---

## ✅ Checklist de Implementação

- [x] Webhook Asaas corrigido para usar `in_escrow`
- [x] Sync manual de status implementado
- [x] Validação de status na edge function `schedule-delivery`
- [x] Confirmação de entrega libera pagamento
- [x] Notificações de alta prioridade para fornecedores
- [x] Triggers de banco para automação
- [x] Logs de auditoria completos
- [x] Mensagens de erro detalhadas
- [x] Documentação do fluxo
- [x] Testes do fluxo completo

---

**Última atualização**: 2025-01-17
**Versão**: 1.0.0
