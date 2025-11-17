# 🧪 Guia de Testes - Fluxo de Escrow

## 📋 Pré-requisitos

- Conta no Asaas (sandbox ou produção)
- Chave API do Asaas configurada
- Webhook do Asaas configurado e ativo
- Cliente e Fornecedor criados no sistema
- Produto/serviço cadastrado

---

## 🔄 Teste 1: Fluxo Completo (Happy Path)

### **Objetivo**: Testar o fluxo completo de pagamento com escrow

### **Passos**:

#### **1. Preparação**
```sql
-- Criar cliente de teste (se não existir)
INSERT INTO clients (name, cnpj, email, status)
VALUES ('Cliente Teste Escrow', '12345678000190', 'cliente@test.com', 'active');

-- Criar fornecedor de teste (se não existir)
INSERT INTO suppliers (name, cnpj, email, status)
VALUES ('Fornecedor Teste Escrow', '98765432000110', 'fornecedor@test.com', 'active');
```

#### **2. Criar Cotação (Cliente)**
- Login como cliente
- Dashboard → "Nova Cotação"
- Preencher:
  - Título: "Teste Fluxo Escrow"
  - Descrição: "Teste completo do fluxo de pagamento"
  - Adicionar item: "Produto Teste", Qtd: 1, Preço: R$ 100,00
- Salvar cotação

**✅ Verificação**:
```sql
SELECT id, local_code, status FROM quotes WHERE title LIKE '%Teste Fluxo Escrow%';
-- Esperado: status = 'draft'
```

#### **3. Enviar para Fornecedor**
- Na cotação criada → "Enviar para Fornecedores"
- Selecionar "Fornecedor Teste Escrow"
- Confirmar envio

**✅ Verificação**:
```sql
SELECT status FROM quotes WHERE title LIKE '%Teste Fluxo Escrow%';
-- Esperado: status = 'sent'
```

#### **4. Fornecedor Cria Proposta**
- Login como fornecedor
- Cotações → Selecionar cotação recebida
- "Criar Proposta"
- Preencher valores e enviar

**✅ Verificação**:
```sql
SELECT id, status FROM quote_responses WHERE quote_id = 'quote-id-aqui';
-- Esperado: status = 'pending'
```

#### **5. Cliente Aprova Proposta**
- Login como cliente
- Cotações → Ver propostas
- Selecionar proposta do fornecedor
- "Aprovar Proposta"

**✅ Verificação**:
```sql
SELECT status FROM quotes WHERE id = 'quote-id-aqui';
-- Esperado: status = 'approved'

SELECT id, status, amount FROM payments WHERE quote_id = 'quote-id-aqui';
-- Esperado: 1 registro com status = 'pending'
```

#### **6. Cliente Paga via Asaas (Sandbox)**
- Usar ambiente sandbox do Asaas
- Gerar link de pagamento ou boleto
- Simular pagamento no painel Asaas

**Dados de Teste Asaas (Sandbox)**:
```
Cartão de Crédito:
- Número: 5162306219378829
- Validade: qualquer data futura
- CVV: qualquer 3 dígitos
- Nome: TESTE APROVADO

PIX:
- Usar QR Code gerado
- No sandbox, pagar via painel Asaas
```

**✅ Verificação** (aguardar 5-30 segundos para webhook):
```sql
-- Verificar pagamento
SELECT id, status, asaas_payment_id FROM payments WHERE quote_id = 'quote-id-aqui';
-- Esperado: status = 'in_escrow', asaas_payment_id preenchido

-- Verificar cotação
SELECT status FROM quotes WHERE id = 'quote-id-aqui';
-- Esperado: status = 'approved' (não 'paid' ainda!)

-- Verificar notificação do fornecedor
SELECT * FROM notifications 
WHERE type = 'payment' 
AND priority = 'high'
AND user_id IN (SELECT id FROM profiles WHERE supplier_id = 'supplier-id-aqui')
ORDER BY created_at DESC LIMIT 1;
-- Esperado: 1 notificação recente "Pagamento Confirmado!"
```

#### **7. Fornecedor Verifica Notificação**
- Login como fornecedor
- Verificar sino de notificações → **Badge vermelho de alta prioridade**
- Clicar na notificação "💰 Pagamento Confirmado!"

**✅ Verificação Visual**:
- Badge vermelho no sino deve estar visível
- Notificação deve aparecer no topo da lista
- Ao clicar, deve redirecionar para `/supplier/deliveries`

#### **8. Fornecedor Agenda Entrega**
- Dashboard Fornecedor → "Entregas" ou "Agendar Agora"
- Selecionar cotação
- Preencher:
  - Data da entrega: (data futura)
  - Endereço: "Rua Teste, 123"
  - Observações: "Teste de entrega escrow"
- Confirmar agendamento

**✅ Verificação**:
```sql
-- Verificar entrega criada
SELECT id, status, scheduled_date FROM deliveries WHERE quote_id = 'quote-id-aqui';
-- Esperado: status = 'scheduled'

-- Verificar código de confirmação gerado
SELECT confirmation_code, expires_at FROM delivery_confirmations 
WHERE delivery_id = 'delivery-id-aqui';
-- Esperado: código de 6 dígitos, expira em 24h

-- Verificar status da cotação
SELECT status FROM quotes WHERE id = 'quote-id-aqui';
-- Esperado: status = 'delivering'

-- Verificar status do pagamento (deve permanecer em escrow)
SELECT status FROM payments WHERE quote_id = 'quote-id-aqui';
-- Esperado: status = 'in_escrow'
```

#### **9. Cliente Recebe Código de Confirmação**
- Cliente deve receber código via e-mail/notificação
- Código tem 6 dígitos

**Para pegar código no DB (ambiente de teste)**:
```sql
SELECT confirmation_code FROM delivery_confirmations 
WHERE delivery_id = (
  SELECT id FROM deliveries WHERE quote_id = 'quote-id-aqui'
);
```

#### **10. Cliente Confirma Entrega**
- Login como cliente
- Dashboard → "Confirmações de Entrega"
- Inserir código de 6 dígitos
- Confirmar

**✅ Verificação Final**:
```sql
-- Pagamento deve ser liberado
SELECT id, status, completed_at FROM payments WHERE quote_id = 'quote-id-aqui';
-- Esperado: status = 'completed', completed_at preenchido

-- Cotação deve ser marcada como paga
SELECT status FROM quotes WHERE id = 'quote-id-aqui';
-- Esperado: status = 'paid'

-- Entrega deve ser marcada como entregue
SELECT status, delivered_at FROM deliveries WHERE quote_id = 'quote-id-aqui';
-- Esperado: status = 'delivered', delivered_at preenchido

-- Código de confirmação deve estar usado
SELECT is_used, confirmed_at, confirmed_by FROM delivery_confirmations 
WHERE delivery_id = 'delivery-id-aqui';
-- Esperado: is_used = true, confirmed_at preenchido

-- Verificar log de auditoria
SELECT action, details FROM audit_logs 
WHERE entity_type = 'deliveries' AND entity_id = 'delivery-id-aqui'
ORDER BY created_at DESC;
-- Esperado: 'DELIVERY_CONFIRMED'
```

---

## 🚨 Teste 2: Tentativa de Agendar Sem Escrow

### **Objetivo**: Validar que não é possível agendar entrega sem pagamento em escrow

### **Passos**:

1. Criar cotação e aprovar
2. **NÃO PAGAR** (deixar payment em `pending`)
3. Tentar agendar entrega como fornecedor

**✅ Resultado Esperado**:
- Erro: "Não é possível agendar a entrega. O pagamento ainda está pendente..."
- Status necessário: `in_escrow`
- Sugestão para aguardar confirmação

---

## 🔄 Teste 3: Sincronização Manual de Status

### **Objetivo**: Testar sincronização manual quando webhook falha

### **Passos**:

1. Criar pagamento no Asaas (fora do sistema)
2. No banco, criar payment com `asaas_payment_id` e status `pending`
3. Chamar edge function de sync:

```bash
curl -X POST \
  'https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/sync-asaas-payment-status' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"payment_id": "payment-id-aqui"}'
```

**✅ Verificação**:
```sql
SELECT status FROM payments WHERE id = 'payment-id-aqui';
-- Esperado: status mudou de 'pending' para 'in_escrow'
```

---

## ⏰ Teste 4: Expiração de Código de Confirmação

### **Objetivo**: Validar que código expirado não funciona

### **Passos**:

1. Agendar entrega (código gerado)
2. No banco, alterar expiração do código:

```sql
UPDATE delivery_confirmations 
SET expires_at = now() - interval '1 hour'
WHERE delivery_id = 'delivery-id-aqui';
```

3. Tentar confirmar com o código

**✅ Resultado Esperado**:
- Erro: "Este código expirou"
- `code: 'CODE_EXPIRED'`
- Mostrar data de expiração

---

## 🔁 Teste 5: Reutilização de Código

### **Objetivo**: Validar que código já usado não funciona novamente

### **Passos**:

1. Confirmar entrega normalmente
2. Tentar usar o mesmo código novamente

**✅ Resultado Esperado**:
- Erro: "Este código já foi utilizado anteriormente"
- `code: 'CODE_ALREADY_USED'`
- Mostrar data da confirmação anterior

---

## 📊 Teste 6: Logs e Auditoria

### **Objetivo**: Verificar que todas as ações são auditadas

### **Passos**:

Após completar fluxo, verificar logs:

```sql
-- Logs de pagamento
SELECT action, details, created_at 
FROM audit_logs 
WHERE entity_type = 'payments' AND entity_id = 'payment-id-aqui'
ORDER BY created_at;

-- Logs de cotação
SELECT action, details, created_at 
FROM audit_logs 
WHERE entity_type = 'quotes' AND entity_id = 'quote-id-aqui'
ORDER BY created_at;

-- Logs de entrega
SELECT action, details, created_at 
FROM audit_logs 
WHERE entity_type = 'deliveries' AND entity_id = 'delivery-id-aqui'
ORDER BY created_at;
```

**✅ Ações Esperadas**:
- `PAYMENT_CONFIRMED` (webhook Asaas)
- `DELIVERY_SCHEDULED` (fornecedor agenda)
- `DELIVERY_CONFIRMED` (cliente confirma)
- `ESCROW_RELEASED` (pagamento liberado)

---

## 🔍 Teste 7: Logs das Edge Functions

### **Objetivo**: Verificar logs das funções serverless

### **Passos**:

1. Acessar painel Supabase
2. Edge Functions → Logs
3. Filtrar por função:
   - `asaas-webhook`
   - `schedule-delivery`
   - `confirm-delivery`
   - `sync-asaas-payment-status`

**✅ Logs Esperados**:
- `💰 Pagamento movido para custódia (in_escrow)`
- `📋 Cotação atualizada para approved`
- `✅ Fornecedor notificado sobre pagamento em escrow`
- `✅ [CONFIRM-DELIVERY] Entrega atualizada para delivered`
- `💰 [CONFIRM-DELIVERY] Pagamento liberado`

---

## 🛡️ Teste 8: Segurança e Permissões

### **Objetivo**: Validar que apenas usuários autorizados podem realizar ações

### **Cenários**:

#### **8.1 Fornecedor Errado Tenta Agendar**
- Criar 2 fornecedores
- Cotação para Fornecedor A
- Tentar agendar como Fornecedor B

**✅ Esperado**: Erro "Apenas o fornecedor designado pode agendar a entrega"

#### **8.2 Cliente Errado Tenta Confirmar**
- Criar 2 clientes
- Cotação para Cliente A
- Tentar confirmar como Cliente B

**✅ Esperado**: Erro de permissão ou código inválido

---

## 📱 Teste 9: Notificações de Alta Prioridade

### **Objetivo**: Verificar badge vermelho no sino de notificações

### **Passos**:

1. Completar pagamento (payment → `in_escrow`)
2. Login como fornecedor
3. Verificar componente `RoleBasedNotificationDropdown`

**✅ Verificações Visuais**:
- Sino deve ter **badge vermelho** (não azul/verde)
- Badge deve mostrar número de notificações de alta prioridade
- Ao abrir dropdown, notificação de pagamento deve ter ícone ⚠️
- Texto: "💰 Pagamento Confirmado!"

---

## 📋 Checklist Rápido

Após cada deploy/atualização, executar:

- [ ] Criar cotação → aprovar → pagar → verificar `in_escrow`
- [ ] Verificar notificação do fornecedor (badge vermelho)
- [ ] Agendar entrega → verificar código gerado
- [ ] Confirmar entrega → verificar liberação do pagamento
- [ ] Verificar logs de auditoria completos
- [ ] Testar erro: tentar agendar sem escrow
- [ ] Testar erro: código expirado
- [ ] Testar erro: código já usado

---

## 🐛 Debug de Problemas Comuns

### **Webhook não está funcionando**

```sql
-- Verificar configuração do webhook
SELECT * FROM system_settings WHERE setting_key = 'asaas_webhook_token';

-- Verificar logs de tentativas não autorizadas
SELECT * FROM audit_logs 
WHERE action = 'WEBHOOK_UNAUTHORIZED_ATTEMPT' 
ORDER BY created_at DESC LIMIT 10;
```

### **Pagamento ficou travado em 'pending'**

```sql
-- Verificar se asaas_payment_id está preenchido
SELECT id, status, asaas_payment_id FROM payments WHERE status = 'pending';

-- Se tiver asaas_payment_id, sincronizar manualmente
-- (usar curl do Teste 3)
```

### **Notificação não aparece**

```sql
-- Verificar se notificação foi criada
SELECT * FROM notifications 
WHERE type = 'payment' AND priority = 'high'
ORDER BY created_at DESC LIMIT 10;

-- Verificar se supplier_id está correto
SELECT supplier_id FROM profiles WHERE id = 'user-id-aqui';
```

---

**Última atualização**: 2025-01-17
**Versão**: 1.0.0
