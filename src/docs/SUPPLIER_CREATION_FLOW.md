# Fluxo Completo de Criação de Fornecedores

## Visão Geral

O sistema Cotiz implementa um fluxo completo de criação de fornecedores que garante:
- ✅ Cadastro no banco de dados
- ✅ Associação com cliente
- ✅ Criação de usuário de autenticação
- ✅ Envio de notificações (email, WhatsApp, in-app)
- ✅ Auditoria completa

---

## Responsabilidades por Módulo

### `supplierCreationService.ts`
**Serviço centralizado de criação**

- Cria ou busca fornecedor existente no banco
- Associa fornecedor ao cliente via RPC
- Cria usuário de autenticação (auth.users + profiles)
- Aguarda sincronização do profile com backoff exponencial
- Envia notificações de boas-vindas
- Retorna resultado completo com status de cada etapa

**Quando usar:**
- Admin criando fornecedor e associando a cliente
- Qualquer fluxo que precise garantir autenticação + notificações

### `useSupplierForm.ts`
**Hook de gerenciamento de formulário**

- Validação de dados (Zod schemas)
- Chamada ao serviço de criação (`supplierCreationService`)
- Feedback visual ao usuário (toasts)
- Atualização de estado da UI
- Suporte a 3 cenários:
  1. Associar fornecedor existente ao cliente
  2. Criar novo fornecedor (com auth + notificações)
  3. Atualizar fornecedor existente

### `sendSupplierWelcomeNotifications`
**Serviço de notificações**

- Email de boas-vindas com credenciais temporárias
- WhatsApp (se número fornecido)
- Notificação in-app para acesso à plataforma
- Log de todas as tentativas de envio

---

## Sequência de Operações

### 1️⃣ Validação de Dados
```typescript
// useSupplierForm.ts - Validação com Zod
supplierFormSchema.parse(formData);
```

**Campos obrigatórios:**
- name, email, document_number
- state, city
- specialties (array vazio aceito)

### 2️⃣ Criação/Busca de Fornecedor
```sql
-- RPC: find_or_create_supplier_by_cnpj
-- Busca por CNPJ normalizado ou cria novo
-- Retorna: { supplier_id, is_new }
```

**Deduplicação automática:** Evita fornecedores duplicados pelo CNPJ.

### 3️⃣ Associação com Cliente
```sql
-- RPC: associate_supplier_to_client
-- Valida status do fornecedor
-- Cria registro em client_suppliers
-- Gera audit_log
```

**Validações:**
- Cliente existe e está ativo
- Fornecedor está ativo
- Associação não duplicada

### 4️⃣ Criação de Usuário de Autenticação
```typescript
// Edge Function: create-auth-user
{
  email: string,
  password: string (gerada automaticamente),
  name: string,
  role: 'supplier',
  supplierId: string,
  temporaryPassword: true
}
```

**Senha temporária:** 10 caracteres aleatórios (sem caracteres confusos).

**Resultado:**
- Criação em `auth.users`
- Trigger automático cria registro em `profiles`
- Profile recebe `supplier_id` e `role='supplier'`

### 5️⃣ Sincronização de Profile
```typescript
// Backoff exponencial: 300ms, 600ms, 1200ms, 2400ms, 4800ms
// Total: ~9.3 segundos
// Retorna: boolean (sucesso ou timeout)
```

**Por que aguardar?**
- Evita race conditions
- Garante que notificações encontrem o profile
- Permite rollback em caso de falha crítica

### 6️⃣ Envio de Notificações
**Email (via Edge Function `send-email`):**
- Template de boas-vindas
- Credenciais de acesso (email + senha temporária)
- Link para primeiro login

**WhatsApp (via Edge Function `send-whatsapp`):**
- Apenas se número fornecido
- Mensagem de boas-vindas
- Link para acesso rápido

**In-app (direto no banco):**
```sql
INSERT INTO notifications (
  user_id,     -- profile.id do fornecedor
  type,        -- 'supplier_welcome'
  title,
  message,
  data         -- JSONB com informações extras
)
```

### 7️⃣ Auditoria
```sql
INSERT INTO audit_logs (
  user_id,
  action,           -- 'SUPPLIER_CREATED'
  entity_type,      -- 'suppliers'
  entity_id,        -- supplier.id
  panel_type,       -- 'admin'
  details           -- JSONB com dados completos
)
```

### 8️⃣ Atualização de UI
```typescript
// useSupplierForm.ts
toast({
  title: 'Fornecedor criado com sucesso! 🎉',
  description: 'Email ✅ | WhatsApp ✅ | In-app ✅'
});
onSuccess?.(); // Fecha modal, recarrega lista
```

---

## Cenários de Uso

### Cenário A: Admin Criando Fornecedor para Cliente
```typescript
// Admin seleciona cliente no formulário
formData.client_id = 'uuid-do-cliente';

// Fluxo: COMPLETO (1-8)
// Resultado: Fornecedor criado, autenticado e notificado
```

### Cenário B: Manager Criando Fornecedor Local
```typescript
// client_id vem do profile do manager
formData.client_id = profile.client_id;

// Fluxo: COMPLETO (1-8)
// Resultado: Idem ao cenário A
```

### Cenário C: Associar Fornecedor Existente
```typescript
// Usuário busca CNPJ e seleciona fornecedor
existingSupplierId = 'uuid-do-fornecedor';

// Fluxo: PARCIAL (apenas 3, 6-email opcional, 7)
// Resultado: Associação sem criar novo auth
```

### Cenário D: Atualizar Fornecedor
```typescript
// Edição de fornecedor já cadastrado
editingSupplier.id = 'uuid-do-fornecedor';

// Fluxo: UPDATE (apenas atualiza campos)
// Resultado: Sem notificações (fornecedor já tem acesso)
```

---

## Tratamento de Erros

### Erro Crítico (Bloqueia Fluxo)
```typescript
// Exemplos:
// - Falha ao criar fornecedor no DB
// - Falha ao associar ao cliente
// - Dados inválidos (validação Zod)

// Ação: toast.error() + rollback automático + throw
```

### Erro Não-Crítico (Continua Fluxo)
```typescript
// Exemplos:
// - Falha ao criar auth user
// - Falha ao enviar email/WhatsApp
// - Timeout na sincronização de profile

// Ação: console.warn() + continua + notifica usuário
```

**Motivo:** Fornecedor já está no banco e pode ser configurado manualmente.

---

## Debugging

### Se fornecedor não aparecer na lista:

**1. Verificar `type` do fornecedor**
```sql
SELECT id, name, type FROM suppliers WHERE id = 'uuid';
-- Deve ser 'local' ou 'certified'
```

**2. Verificar filtros ativos na UI**
- AdminSuppliers.tsx tem aba "Locais" e "Globais"
- GlobalSuppliersManager tem filtro de tipo (se `showTypeFilter=true`)

**3. Verificar RLS policies**
```sql
-- Usuário tem permissão?
SELECT * FROM suppliers WHERE id = 'uuid';
-- Se vazio: problema de RLS
```

### Se notificações não chegarem:

**1. Verificar logs de auditoria**
```sql
SELECT * FROM audit_logs 
WHERE entity_id = 'supplier-id' 
AND action LIKE 'SUPPLIER%'
ORDER BY created_at DESC;
```

**2. Verificar Edge Function logs**
- Dashboard Supabase → Functions → send-email/send-whatsapp
- Buscar por email/telefone do fornecedor

**3. Verificar configuração de SMTP/Twilio**
```sql
SELECT * FROM api_integrations 
WHERE type IN ('email', 'whatsapp') 
AND status = 'active';
```

### Se profile não sincronizar:

**1. Verificar trigger `on_auth_user_created`**
```sql
-- Deve existir em auth.users
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

**2. Verificar função `handle_new_user`**
```sql
-- Deve criar profile automaticamente
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
```

**3. Forçar criação manual (último recurso)**
```sql
INSERT INTO profiles (id, role, supplier_id, email)
VALUES (
  'auth-user-id',
  'supplier',
  'supplier-id',
  'email@example.com'
);
```

---

## Checklist de Testes

### ✅ Teste 1: Criação Completa
- [ ] Fornecedor inserido em `suppliers`
- [ ] Associação criada em `client_suppliers`
- [ ] Profile criado em `profiles` com `supplier_id`
- [ ] Email recebido no inbox
- [ ] WhatsApp recebido (se fornecido)
- [ ] Notificação in-app criada
- [ ] Audit log registrado

### ✅ Teste 2: Deduplicação
- [ ] Criar fornecedor com CNPJ existente
- [ ] Verificar que não duplicou
- [ ] Verificar que associou ao novo cliente

### ✅ Teste 3: Visibilidade
- [ ] Fornecedor `type='local'` aparece na aba "Locais"
- [ ] Fornecedor `type='certified'` aparece na aba "Globais"
- [ ] Filtros funcionam corretamente

### ✅ Teste 4: Rollback
- [ ] Simular falha na associação
- [ ] Verificar que fornecedor não aparece para cliente
- [ ] Verificar mensagem de erro clara

---

## Query de Validação Completa

```sql
-- Verificar fornecedores criados nas últimas 24h
SELECT 
  s.id AS supplier_id,
  s.name AS supplier_name,
  s.email AS supplier_email,
  s.type AS supplier_type,
  s.status AS supplier_status,
  s.created_at AS supplier_created_at,
  
  p.id AS profile_id,
  p.role AS profile_role,
  p.supplier_id AS profile_supplier_link,
  
  cs.client_id AS associated_client_id,
  cs.status AS association_status,
  cs.created_at AS associated_at,
  
  (SELECT COUNT(*) FROM notifications WHERE user_id = p.id) AS notifications_count,
  (SELECT COUNT(*) FROM audit_logs WHERE entity_id = s.id::text) AS audit_logs_count
  
FROM suppliers s
LEFT JOIN profiles p ON p.supplier_id = s.id
LEFT JOIN client_suppliers cs ON cs.supplier_id = s.id
WHERE s.created_at > NOW() - INTERVAL '24 hours'
ORDER BY s.created_at DESC;
```

**Resultado esperado para criação completa:**
- ✅ `profile_id` preenchido
- ✅ `profile_supplier_link` = `supplier_id`
- ✅ `associated_client_id` preenchido
- ✅ `notifications_count` >= 1
- ✅ `audit_logs_count` >= 2 (criação + associação)

---

## Extensões Futuras

### 1. Confirmação de Email
- Enviar link de verificação
- Bloquear acesso até confirmar

### 2. Onboarding Interativo
- Wizard de configuração inicial
- Upload de documentos
- Treinamento na plataforma

### 3. Notificações Assíncronas
- Fila de envio (Redis/BullMQ)
- Retry automático em falhas
- Dashboard de status de envio

### 4. Multi-idioma
- Templates em PT/EN/ES
- Detecção automática por região

---

## Contato

Para dúvidas ou sugestões sobre este fluxo:
- Consultar `src/services/supplierCreationService.ts`
- Consultar `src/hooks/useSupplierForm.ts`
- Revisar logs em `audit_logs` e Edge Functions
