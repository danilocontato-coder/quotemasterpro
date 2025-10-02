# Validação de Módulos no Backend - QuoteMaster Pro

## 📋 Visão Geral

Este documento detalha como implementar validação de módulos no **backend Supabase**, garantindo que apenas usuários com módulos habilitados no plano possam acessar/manipular dados.

---

## 🛠️ Funções SQL Disponíveis

### 1. `get_user_enabled_modules()`

**Retorna**: `text[]` - Array com os módulos habilitados no plano do usuário atual.

```sql
SELECT public.get_user_enabled_modules();
-- Resultado: ['quotes', 'suppliers', 'payments', 'ai_negotiation']
```

**Uso**: Descobrir quais módulos o usuário tem acesso.

---

### 2. `user_has_module_access(_module_key text)`

**Retorna**: `boolean` - `true` se o usuário tem acesso ao módulo.

```sql
SELECT public.user_has_module_access('payments');
-- Resultado: true ou false
```

**Regras**:
- Admins **SEMPRE** retornam `true`
- Outros usuários: verifica se o módulo está em `enabled_modules` do plano

**Uso em RLS Policies**:
```sql
CREATE POLICY "payments_select_with_module"
ON public.payments
FOR SELECT
USING (
  public.user_has_module_access('payments')
  AND client_id = get_current_user_client_id()
);
```

---

### 3. `user_has_any_module_access(_module_keys text[])`

**Retorna**: `boolean` - `true` se o usuário tem acesso a **PELO MENOS UM** dos módulos listados.

```sql
SELECT public.user_has_any_module_access(ARRAY['payments', 'delivery_management']);
-- Resultado: true se tiver 'payments' OU 'delivery_management'
```

**Uso**: Quando uma feature pode ser acessada por múltiplos módulos (OR lógico).

**Exemplo em RLS**:
```sql
-- Entregas podem ser vistas se tiver módulo 'payments' OU 'delivery_management'
CREATE POLICY "deliveries_select_flexible"
ON public.deliveries
FOR SELECT
USING (
  public.user_has_any_module_access(ARRAY['payments', 'delivery_management'])
  AND client_id = get_current_user_client_id()
);
```

---

### 4. `user_has_all_modules_access(_module_keys text[])`

**Retorna**: `boolean` - `true` se o usuário tem acesso a **TODOS** os módulos listados.

```sql
SELECT public.user_has_all_modules_access(ARRAY['quotes', 'ai_negotiation']);
-- Resultado: true apenas se tiver AMBOS os módulos
```

**Uso**: Quando uma feature requer múltiplos módulos simultaneamente (AND lógico).

**Exemplo em RLS**:
```sql
-- Negociações IA requerem TANTO 'quotes' quanto 'ai_negotiation'
CREATE POLICY "ai_negotiations_require_both_modules"
ON public.ai_negotiations
FOR ALL
USING (
  public.user_has_all_modules_access(ARRAY['quotes', 'ai_negotiation'])
  AND client_id = get_current_user_client_id()
);
```

---

## 🔒 Exemplos de RLS Policies por Módulo

### Módulo: `payments`

```sql
-- Tabela: payments
DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_update" ON public.payments;

-- SELECT: Ver pagamentos do próprio cliente + ter módulo habilitado
CREATE POLICY "payments_select"
ON public.payments
FOR SELECT
USING (
  public.user_has_module_access('payments')
  AND (
    client_id = get_current_user_client_id()
    OR supplier_id = get_current_user_supplier_id()
  )
);

-- INSERT: Criar pagamento + ter módulo
CREATE POLICY "payments_insert"
ON public.payments
FOR INSERT
WITH CHECK (
  public.user_has_module_access('payments')
  AND client_id = get_current_user_client_id()
);

-- UPDATE: Atualizar + módulo
CREATE POLICY "payments_update"
ON public.payments
FOR UPDATE
USING (
  public.user_has_module_access('payments')
  AND client_id = get_current_user_client_id()
);
```

---

### Módulo: `approvals`

```sql
-- Tabela: approvals
DROP POLICY IF EXISTS "approvals_select" ON public.approvals;

CREATE POLICY "approvals_select"
ON public.approvals
FOR SELECT
USING (
  public.user_has_module_access('approvals')
  AND (
    approver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = approvals.quote_id
        AND q.client_id = get_current_user_client_id()
    )
  )
);
```

---

### Módulo: `ai_negotiation` (depende de `quotes`)

```sql
-- Tabela: ai_negotiations
DROP POLICY IF EXISTS "ai_negotiations_select" ON public.ai_negotiations;

CREATE POLICY "ai_negotiations_select"
ON public.ai_negotiations
FOR SELECT
USING (
  -- Requer AMBOS os módulos
  public.user_has_all_modules_access(ARRAY['quotes', 'ai_negotiation'])
  AND client_id = get_current_user_client_id()
);
```

---

### Módulo: `cost_centers`

```sql
-- Tabela: cost_centers
DROP POLICY IF EXISTS "cost_centers_all" ON public.cost_centers;

CREATE POLICY "cost_centers_all"
ON public.cost_centers
FOR ALL
USING (
  public.user_has_module_access('cost_centers')
  AND client_id = get_current_user_client_id()
)
WITH CHECK (
  public.user_has_module_access('cost_centers')
  AND client_id = get_current_user_client_id()
);
```

---

### Módulo: `advanced_reports`

```sql
-- Criar view protegida para relatórios avançados
CREATE OR REPLACE VIEW public.advanced_reports_view 
WITH (security_invoker = true) AS
SELECT 
  q.id,
  q.title,
  q.total,
  p.amount as payment_amount,
  p.status as payment_status
FROM quotes q
LEFT JOIN payments p ON p.quote_id = q.id
WHERE 
  -- Somente se tiver módulo de relatórios avançados
  public.user_has_module_access('advanced_reports')
  AND q.client_id = get_current_user_client_id();
```

---

## 🌐 Edge Function: `check-module-access`

### Endpoint
```
POST https://<PROJECT_ID>.supabase.co/functions/v1/check-module-access
```

### Request Body
```json
{
  "moduleKey": "payments"
}
```

### Response
```json
{
  "hasAccess": true,
  "enabledModules": ["quotes", "suppliers", "payments"],
  "userPlanId": "plan-pro",
  "isAdmin": false,
  "message": "Acesso concedido ao módulo 'payments'"
}
```

### Uso no Frontend
```typescript
import { supabase } from '@/integrations/supabase/client';

async function checkModuleAccess(moduleKey: string) {
  const { data, error } = await supabase.functions.invoke('check-module-access', {
    body: { moduleKey }
  });
  
  if (error) {
    console.error('Erro ao verificar módulo:', error);
    return false;
  }
  
  return data.hasAccess;
}

// Exemplo de uso
const canAccessPayments = await checkModuleAccess('payments');
if (!canAccessPayments) {
  toast.error('Você não tem acesso ao módulo de Pagamentos');
  navigate('/plans');
}
```

---

## ⚡ Performance e Cache

### Frontend (já implementado)
- Hook `useModuleAccess` faz cache de **5 minutos**
- Evita requests repetidos ao backend

### Backend (recomendação)
- As funções SQL são `STABLE` e `SECURITY DEFINER`
- Postgres faz cache automático dentro da mesma transação
- Para cache mais longo, considerar Redis/Memcached se necessário

---

## 🧪 Testes de Validação

### 1. Testar Função SQL
```sql
-- Conectar como usuário específico
SET LOCAL "request.jwt.claims" = '{"sub": "<USER_ID>"}';

-- Verificar módulos habilitados
SELECT public.get_user_enabled_modules();

-- Testar acesso individual
SELECT public.user_has_module_access('payments');
SELECT public.user_has_module_access('ai_negotiation');

-- Testar acesso múltiplo (OR)
SELECT public.user_has_any_module_access(ARRAY['payments', 'approvals']);

-- Testar acesso múltiplo (AND)
SELECT public.user_has_all_modules_access(ARRAY['quotes', 'ai_negotiation']);
```

### 2. Testar Edge Function
```bash
curl -X POST \
  https://<PROJECT_ID>.supabase.co/functions/v1/check-module-access \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"moduleKey": "payments"}'
```

---

## 📊 Checklist de Implementação

### Por Módulo
Para cada módulo opcional, implemente:

- [ ] **RLS Policy** usando `user_has_module_access()`
- [ ] **Validação de dependências** (ex: `delivery_management` requer `payments`)
- [ ] **Testes SQL** verificando acesso
- [ ] **Documentação** de qual policy foi criada
- [ ] **Frontend Guard** usando `<ModuleGuard>` ou `useModuleAccess`

### Exemplo Completo: Módulo "Delivery Management"

#### 1. RLS Policy
```sql
CREATE POLICY "deliveries_with_module"
ON public.deliveries
FOR ALL
USING (
  public.user_has_all_modules_access(ARRAY['payments', 'delivery_management'])
  AND client_id = get_current_user_client_id()
);
```

#### 2. Frontend Guard
```tsx
import { ModuleGuard } from '@/components/common/ModuleGuard';

<ModuleGuard requiredModule="delivery_management">
  <DeliveryConfirmationForm />
</ModuleGuard>
```

#### 3. Rota Protegida
```tsx
<Route 
  path="/deliveries" 
  element={
    <ProtectedRoute 
      allowedRoles={['client', 'manager']} 
      requiredModule="delivery_management"
    >
      <DeliveriesPage />
    </ProtectedRoute>
  } 
/>
```

---

## 🚨 Avisos de Segurança

### ⚠️ CRÍTICO
1. **Sempre validar no backend**: Não confiar apenas no frontend
2. **Admins têm acesso total**: `has_role_text(auth.uid(), 'admin')` sempre retorna `true`
3. **Não expor módulos em logs**: Evitar logar `enabled_modules` em produção

### ✅ Boas Práticas
- Use `SECURITY DEFINER` em funções de validação
- Combine validação de módulo + validação de escopo (client_id, supplier_id)
- Sempre testar com usuários de diferentes planos
- Documentar quais módulos são core vs. opcionais

---

**Última atualização**: 2025-10-02  
**Versão**: 1.0.0
