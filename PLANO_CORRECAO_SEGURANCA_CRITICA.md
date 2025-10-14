# 🔒 PLANO DE CORREÇÃO - PROBLEMAS CRÍTICOS DE SEGURANÇA

**Projeto:** QuoteMaster Pro  
**Data:** 14/10/2025  
**Prioridade:** 🔴 CRÍTICA - Bloqueador de lançamento  
**Tempo Estimado:** 4-6 dias (2 devs trabalhando em paralelo)

---

## 📋 ÍNDICE
1. [Problema 1: Autorização Client-Side](#problema-1-autorização-client-side)
2. [Problema 2: Tokens Admin em localStorage](#problema-2-tokens-admin-em-localstorage)
3. [Ordem de Execução](#ordem-de-execução)
4. [Testes de Validação](#testes-de-validação)
5. [Checklist Final](#checklist-final)

---

## 🚨 PROBLEMA 1: Autorização Client-Side

### Situação Atual (VULNERÁVEL)
```typescript
// ❌ INSEGURO - 75+ locais no código fazem isso
if (user?.role === 'admin') {
  // Mostra/permite ações sensíveis
  return <AdminPanel />
}
```

**Por que é perigoso:**
- Atacante pode abrir DevTools
- Modificar `user.role` no objeto em memória
- Ganhar acesso admin sem autenticação real
- Bypassar controles de UI e lógica de negócio

### Status RLS (✅ JÁ PROTEGIDO)
```sql
-- ✅ Database está seguro
CREATE POLICY "admins_only" ON quotes
FOR ALL USING (
  has_role_text(auth.uid(), 'admin')
);
```

**O problema não é RLS**, é a lógica frontend que confia cegamente em `user.role`.

---

## 🎯 SOLUÇÃO COMPLETA - PROBLEMA 1

### Fase 1.1: Criar Hook Centralizado de Permissões (2h)

**Arquivo:** `src/hooks/usePermissions.ts`

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Permission = 
  | 'quotes.create'
  | 'quotes.view_all'
  | 'quotes.approve'
  | 'suppliers.manage'
  | 'users.manage'
  | 'admin.access'
  | 'reports.view'
  | 'payments.process';

interface PermissionCheck {
  hasPermission: (permission: Permission) => boolean;
  isLoading: boolean;
  userRoles: string[];
}

/**
 * Hook seguro para verificar permissões
 * SEMPRE valida no backend via RLS
 * Frontend usa APENAS para UI (mostrar/esconder botões)
 */
export const usePermissions = (): PermissionCheck => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return { roles: [] };
      
      // Buscar roles via RLS (só retorna se usuário tem acesso)
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching roles:', error);
        return { roles: [] };
      }
      
      return { roles: roles?.map(r => r.role) || [] };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache 5 minutos
  });

  const hasPermission = (permission: Permission): boolean => {
    if (!data?.roles || data.roles.length === 0) return false;
    
    const [module, action] = permission.split('.');
    const userRoles = data.roles;
    
    // Admin tem todas as permissões
    if (userRoles.includes('admin')) return true;
    
    // Mapeamento permission -> roles permitidas
    const permissionMap: Record<Permission, string[]> = {
      'quotes.create': ['admin', 'manager', 'collaborator', 'admin_cliente'],
      'quotes.view_all': ['admin', 'admin_cliente'],
      'quotes.approve': ['admin', 'manager', 'admin_cliente'],
      'suppliers.manage': ['admin', 'admin_cliente'],
      'users.manage': ['admin', 'admin_cliente'],
      'admin.access': ['admin'],
      'reports.view': ['admin', 'manager', 'admin_cliente'],
      'payments.process': ['admin', 'admin_cliente'],
    };
    
    const allowedRoles = permissionMap[permission] || [];
    return userRoles.some(role => allowedRoles.includes(role));
  };

  return {
    hasPermission,
    isLoading,
    userRoles: data?.roles || [],
  };
};
```

---

### Fase 1.2: Refatorar Verificações Existentes (6-8h)

#### Locais Críticos Identificados (75+ ocorrências)

**Arquivo:** `src/components/layout/AuthenticatedLayout.tsx`
```typescript
// ❌ ANTES (linha 92)
switch (user.role) {
  case 'admin':
    return <SuperAdminLayout />;
  // ...
}

// ✅ DEPOIS
const { hasPermission, isLoading } = usePermissions();

if (isLoading) return <LoadingSpinner />;

if (hasPermission('admin.access')) {
  return <SuperAdminLayout />;
}
// ...
```

**Arquivo:** `src/components/auth/ProtectedRoute.tsx`
```typescript
// ❌ ANTES (linha 45)
if (adminOnly && user.role !== 'admin') {
  return <Navigate to="/dashboard" />;
}

// ✅ DEPOIS
const { hasPermission } = usePermissions();

if (adminOnly && !hasPermission('admin.access')) {
  return <Navigate to="/dashboard" />;
}
```

**Arquivo:** `src/pages/Quotes.tsx`
```typescript
// ❌ ANTES (múltiplos locais)
{user?.role === 'admin' && (
  <Button onClick={deleteQuote}>Deletar</Button>
)}

// ✅ DEPOIS
const { hasPermission } = usePermissions();

{hasPermission('quotes.view_all') && (
  <Button onClick={deleteQuote}>Deletar</Button>
)}
```

**Arquivo:** `src/pages/admin/Users.tsx`
```typescript
// ❌ ANTES (linha ~30)
if (user?.role !== 'admin') {
  return <Navigate to="/dashboard" />;
}

// ✅ DEPOIS
const { hasPermission } = usePermissions();

if (!hasPermission('users.manage')) {
  return <Navigate to="/dashboard" />;
}
```

---

### Fase 1.3: Proteger Edge Functions (4h)

**Criar:** `supabase/functions/validate-action/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateActionRequest {
  action: 'delete_quote' | 'approve_payment' | 'manage_user' | 'create_supplier';
  resourceId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { action, resourceId } = await req.json() as ValidateActionRequest;

    // Buscar roles do usuário via RLS
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const userRoles = roles?.map(r => r.role) || [];
    const isAdmin = userRoles.includes('admin');

    // Validar ação específica
    let allowed = false;
    let reason = '';

    switch (action) {
      case 'delete_quote':
        // Verificar se é admin OU criador da cotação
        if (isAdmin) {
          allowed = true;
        } else if (resourceId) {
          const { data: quote } = await supabaseClient
            .from('quotes')
            .select('created_by')
            .eq('id', resourceId)
            .single();
          
          allowed = quote?.created_by === user.id;
          reason = allowed ? '' : 'Você não é o criador desta cotação';
        }
        break;

      case 'approve_payment':
        allowed = isAdmin || userRoles.includes('admin_cliente');
        reason = allowed ? '' : 'Apenas admins podem aprovar pagamentos';
        break;

      case 'manage_user':
        allowed = isAdmin || userRoles.includes('admin_cliente');
        reason = allowed ? '' : 'Apenas admins podem gerenciar usuários';
        break;

      case 'create_supplier':
        allowed = isAdmin || userRoles.includes('admin_cliente');
        reason = allowed ? '' : 'Apenas admins podem criar fornecedores';
        break;

      default:
        allowed = false;
        reason = 'Ação não reconhecida';
    }

    return new Response(
      JSON.stringify({ 
        allowed,
        reason,
        userRoles,
      }),
      { 
        status: allowed ? 200 : 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in validate-action:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

**Usar em ações críticas:**

```typescript
// Exemplo: Deletar cotação
const deleteQuote = async (quoteId: string) => {
  // Validar no backend ANTES de tentar deletar
  const { data, error } = await supabase.functions.invoke('validate-action', {
    body: { 
      action: 'delete_quote', 
      resourceId: quoteId 
    }
  });

  if (error || !data?.allowed) {
    toast({
      title: "Acesso Negado",
      description: data?.reason || "Você não tem permissão para esta ação",
      variant: "destructive"
    });
    return;
  }

  // Se chegou aqui, backend validou - pode prosseguir
  // RLS vai validar novamente no banco
  const { error: deleteError } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId);

  // ... resto da lógica
};
```

---

### Fase 1.4: Documentar Padrões (1h)

**Criar:** `docs/AUTHORIZATION_PATTERN.md`

```markdown
# 🔐 Padrão de Autorização QuoteMaster Pro

## Regra de Ouro
**NUNCA confie em dados do frontend para decisões de segurança**

## Camadas de Segurança

### 1️⃣ Frontend (UI apenas)
- Usa `usePermissions()` para mostrar/esconder elementos
- NÃO toma decisões de segurança
- Pode ser bypassado por atacantes (e está tudo bem!)

### 2️⃣ Edge Functions (Validação)
- Valida ações críticas ANTES de executar
- Retorna 403 se não autorizado
- Usa service role key para verificar roles reais

### 3️⃣ RLS Policies (Última linha de defesa)
- Sempre ativas no banco
- Protegem dados mesmo se frontend/edge falharem
- Usam `has_role_text(auth.uid(), 'role')`

## Exemplos de Uso

### ✅ CORRETO
```typescript
const { hasPermission } = usePermissions();

// UI decide mostrar botão
{hasPermission('quotes.delete') && (
  <Button onClick={async () => {
    // Backend valida permissão
    await supabase.functions.invoke('validate-action', {
      body: { action: 'delete_quote', resourceId: quoteId }
    });
    
    // RLS policy valida no banco
    await supabase.from('quotes').delete().eq('id', quoteId);
  }}>
    Deletar
  </Button>
)}
```

### ❌ ERRADO
```typescript
const { user } = useAuth();

// NÃO confie em user.role!
if (user.role === 'admin') {
  await supabase.from('quotes').delete().eq('id', quoteId);
}
```
```

---

## 🚨 PROBLEMA 2: Tokens Admin em localStorage

### Situação Atual (VULNERÁVEL)

**Arquivo:** `src/hooks/useAdminAccess.ts` (linha 41)
```typescript
// ❌ VULNERÁVEL
localStorage.setItem(`adminAccess_${adminToken}`, JSON.stringify({
  isAdminMode: true,
  originalRole: 'admin',
  targetClientId: clientId
}));
```

**Por que é perigoso:**
- Qualquer script XSS pode ler `localStorage`
- Atacante rouba token e se passa por admin
- Pode acessar dados de TODOS os clientes

---

## 🎯 SOLUÇÃO COMPLETA - PROBLEMA 2

### Opção A: Remover Sistema Completamente (RECOMENDADO - 2h)

**Justificativa:**
- Feature complexa, pouco usada
- Risco alto vs benefício baixo
- Admins podem fazer login direto nas contas

**Implementação:**

1. **Deletar arquivo:** `src/hooks/useAdminAccess.ts`

2. **Remover referências:**
```bash
# Buscar todos os lugares que usam
grep -r "useAdminAccess" src/
```

3. **Criar funcionalidade alternativa:**
```typescript
// Arquivo: src/hooks/useAdminViewClient.ts

/**
 * Permite admin visualizar dados de cliente
 * SEM impersonation - sempre mantém identidade de admin
 */
export const useAdminViewClient = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const viewClientData = async (clientId: string) => {
    if (!hasPermission('admin.access')) {
      throw new Error('Acesso negado');
    }

    // Admin vê dados via query parameter
    // Nunca muda sua identidade
    const url = new URL(window.location.href);
    url.searchParams.set('viewAsClient', clientId);
    url.searchParams.set('adminView', 'true');
    window.open(url.toString(), '_blank');
  };

  return { viewClientData };
};
```

4. **Atualizar UI:**
```typescript
// Em vez de "Acessar como cliente"
const { viewClientData } = useAdminViewClient();

<Button onClick={() => viewClientData(client.id)}>
  Ver Dados do Cliente
</Button>
```

---

### Opção B: Implementar Server-Side (COMPLEXO - 8h)

**Somente se realmente necessário**

**Criar:** `supabase/functions/admin-impersonate/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ImpersonateRequest {
  targetClientId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar que usuário é admin
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error } = await supabaseClient.auth.getUser(
      authHeader?.replace('Bearer ', '') ?? ''
    );

    if (error || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verificar role admin via RLS
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: corsHeaders }
      );
    }

    const { targetClientId } = await req.json() as ImpersonateRequest;

    // Criar sessão temporária com claims customizados
    const { data: impersonationToken, error: tokenError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
      options: {
        data: {
          impersonating_client_id: targetClientId,
          original_admin_id: user.id,
          impersonation_expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hora
        },
      },
    });

    if (tokenError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar token' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Log de auditoria
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'ADMIN_IMPERSONATION_START',
      entity_type: 'clients',
      entity_id: targetClientId,
      panel_type: 'admin',
      details: {
        target_client_id: targetClientId,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        redirectUrl: impersonationToken.properties.hashed_token,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in admin-impersonate:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

**⚠️ Complexidade Alta:** Requer configurar JWT claims, expiração, auditoria completa

---

## 📅 ORDEM DE EXECUÇÃO

### Dia 1-2: Problema 1 - Autorização
- ✅ **Manhã:** Criar `usePermissions` hook (2h)
- ✅ **Tarde:** Refatorar AuthenticatedLayout e ProtectedRoute (3h)
- ✅ **Noite:** Refatorar pages críticas (Quotes, Users, Suppliers) (3h)

### Dia 3: Problema 1 - Edge Functions
- ✅ **Manhã:** Criar `validate-action` edge function (2h)
- ✅ **Tarde:** Integrar edge function em ações críticas (4h)
- ✅ **Noite:** Documentar padrões (1h)

### Dia 4: Problema 2 - Tokens Admin
- ✅ **Manhã:** Decisão: Remover ou Reimplementar (reunião 1h)
- ✅ **Tarde:** Implementar solução escolhida (4-8h)
- ✅ **Noite:** Remover código antigo e limpar localStorage (2h)

### Dia 5-6: Testes e Validação
- ✅ Executar plano de testes completo
- ✅ Testar bypass de autenticação
- ✅ Validar logs de auditoria
- ✅ Code review cruzado

---

## 🧪 TESTES DE VALIDAÇÃO

### Teste 1: Bypass de Role Frontend
```typescript
// No DevTools Console:
// ❌ ANTES (vulnerável)
user.role = 'admin'; // Ganhava acesso

// ✅ DEPOIS (protegido)
user.role = 'admin'; // UI muda mas backend rejeita
```

### Teste 2: Manipulação de localStorage
```typescript
// No DevTools Console:
localStorage.setItem('adminAccess_fake', JSON.stringify({
  isAdminMode: true,
  originalRole: 'admin',
}));

// ✅ Sistema deve ignorar e retornar 403
```

### Teste 3: Direct API Call sem Role
```bash
# Tentar deletar cotação sem ser admin
curl -X DELETE \
  https://bpsqyaxdhqejozmlejcb.supabase.co/rest/v1/quotes?id=eq.RFQ01 \
  -H "apikey: <anon_key>" \
  -H "Authorization: Bearer <user_token>"

# ✅ Deve retornar 403 ou row não encontrado (RLS)
```

### Teste 4: Edge Function Validation
```typescript
// Usuário comum tentando aprovar pagamento
const { data } = await supabase.functions.invoke('validate-action', {
  body: { action: 'approve_payment', resourceId: 'PAY123' }
});

// ✅ data.allowed deve ser false
// ✅ data.reason deve explicar o motivo
```

### Teste 5: Audit Logs
```sql
-- Verificar que todas as ações críticas foram logadas
SELECT * FROM audit_logs 
WHERE action LIKE 'ADMIN_%' 
ORDER BY created_at DESC 
LIMIT 10;

-- ✅ Deve ter log de cada tentativa de acesso admin
```

---

## ✅ CHECKLIST FINAL

### Problema 1: Autorização ✅
- [ ] `usePermissions` hook criado e testado
- [ ] 75+ verificações `user.role` substituídas
- [ ] Edge function `validate-action` funcionando
- [ ] Testes de bypass executados e falhando corretamente
- [ ] Documentação criada (`AUTHORIZATION_PATTERN.md`)
- [ ] Code review aprovado
- [ ] Logs de auditoria validados

### Problema 2: Tokens Admin ✅
- [ ] Decisão: Remover OU Reimplementar documentada
- [ ] Sistema antigo removido completamente
- [ ] Alternativa implementada (view-only OU server-side)
- [ ] localStorage limpo (verificar em produção)
- [ ] Testes de XSS executados
- [ ] Documentação atualizada
- [ ] Feature flag ativada (se server-side)

### Testes Gerais ✅
- [ ] Usuário comum NÃO consegue virar admin
- [ ] Admin consegue realizar ações normalmente
- [ ] RLS policies bloqueando acessos indevidos
- [ ] Edge functions retornando 403 corretamente
- [ ] Audit logs capturando todas as tentativas
- [ ] Performance não degradou (< 200ms extra)
- [ ] Zero erros no console em produção

### Deployment ✅
- [ ] Edge functions deployed no Supabase
- [ ] Variáveis de ambiente configuradas
- [ ] Database functions atualizadas (se necessário)
- [ ] Frontend buildando sem erros
- [ ] Testes E2E passando
- [ ] Rollback plan documentado

---

## 🚀 CRITÉRIOS DE SUCESSO

### Obrigatório ✅
1. **Zero** verificações `user.role` para decisões de segurança
2. **Zero** tokens sensíveis em localStorage
3. **100%** das ações críticas validadas via edge function
4. **100%** das tentativas de bypass logadas em audit_logs

### Desejável 🎯
1. Performance < 100ms para validações
2. Cobertura de testes > 80%
3. Documentação completa e atualizada
4. Zero alertas de segurança no linter

---

## 📞 SUPORTE

**Dúvidas técnicas:**
- Revisar `docs/AUTHORIZATION_PATTERN.md`
- Consultar exemplos em `src/hooks/usePermissions.ts`
- Verificar logs no Supabase Dashboard

**Problemas de implementação:**
- Abrir issue detalhada no repositório
- Incluir logs de erro completos
- Descrever passos para reproduzir

**Emergências:**
- Rollback imediato usando git
- Desabilitar feature flag se aplicável
- Notificar equipe via canal prioritário

---

## 📊 MÉTRICAS PÓS-IMPLEMENTAÇÃO

### Monitorar (primeiros 7 dias)
- Taxa de tentativas de bypass (audit_logs)
- Tempo de resposta das validações
- Erros 403 (esperado aumento inicial)
- Feedback dos usuários sobre UX

### Alertas Críticos
- Spike de tentativas de bypass > 10/min
- Edge function com erro rate > 1%
- RLS policy bloqueando usuários legítimos
- Audit logs não sendo gerados

---

**Preparado por:** Plano de Segurança QuoteMaster Pro  
**Última atualização:** 14/10/2025  
**Versão:** 1.0  
**Status:** Aguardando aprovação para execução
