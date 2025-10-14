# 🔐 Padrão de Autorização QuoteMaster Pro

## ⚠️ Regra de Ouro
**NUNCA confie em dados do frontend para decisões de segurança**

## Camadas de Segurança

### 1️⃣ Frontend (UI apenas)
- **Objetivo:** Melhorar experiência do usuário
- **Ferramenta:** Hook `usePermissions()`
- **Uso:** Mostrar/esconder botões e elementos da interface
- **⚠️ Importante:** Pode ser bypassado por atacantes (e está tudo bem!)

```typescript
// ✅ USO CORRETO - Apenas para UI
const { hasPermission } = usePermissions();

{hasPermission('quotes.delete') && (
  <Button onClick={handleDelete}>
    Deletar Cotação
  </Button>
)}
```

```typescript
// ❌ USO ERRADO - Não confie para lógica de negócio
const { hasPermission } = usePermissions();

if (hasPermission('quotes.delete')) {
  // ❌ NUNCA faça isso! Atacante pode bypassar
  await supabase.from('quotes').delete().eq('id', quoteId);
}
```

---

### 2️⃣ Edge Functions (Validação)
- **Objetivo:** Validar ações críticas ANTES de executar
- **Ferramenta:** Edge Function `validate-action`
- **Uso:** Ações que modificam dados sensíveis
- **✅ Seguro:** Executa no servidor, não pode ser bypassado

```typescript
// ✅ USO CORRETO - Validar no backend
const deleteQuote = async (quoteId: string) => {
  // 1. Validar permissão no backend
  const { data, error } = await supabase.functions.invoke('validate-action', {
    body: { 
      action: 'delete_quote', 
      resourceId: quoteId 
    }
  });

  if (error || !data?.allowed) {
    toast({
      title: "Acesso Negado",
      description: data?.reason || "Você não tem permissão",
      variant: "destructive"
    });
    return;
  }

  // 2. Se backend permitiu, tentar deletar
  // RLS policy vai validar novamente
  const { error: deleteError } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId);

  if (deleteError) {
    toast({
      title: "Erro",
      description: "Não foi possível deletar a cotação",
      variant: "destructive"
    });
    return;
  }

  toast({
    title: "Sucesso",
    description: "Cotação deletada com sucesso",
  });
};
```

---

### 3️⃣ RLS Policies (Última linha de defesa)
- **Objetivo:** Garantir isolamento de dados no banco
- **Ferramenta:** Políticas RLS no PostgreSQL
- **Uso:** Sempre ativas, protegem contra qualquer falha
- **✅ Infalível:** Mesmo que frontend/edge falhem, RLS protege

```sql
-- ✅ EXEMPLO DE RLS POLICY SEGURA
CREATE POLICY "users_own_quotes" ON quotes
FOR SELECT USING (
  auth.uid() = created_by 
  OR 
  has_role_text(auth.uid(), 'admin')
);

CREATE POLICY "admins_delete_quotes" ON quotes
FOR DELETE USING (
  has_role_text(auth.uid(), 'admin')
  OR
  (auth.uid() = created_by AND has_role_text(auth.uid(), 'admin_cliente'))
);
```

---

## 📋 Fluxo Completo de Uma Ação Crítica

### Exemplo: Deletar Cotação

```typescript
// 1️⃣ FRONTEND - UI decide mostrar botão
const { hasPermission } = usePermissions();

{hasPermission('quotes.delete') && (
  <Button onClick={() => handleDeleteQuote(quote.id)}>
    🗑️ Deletar
  </Button>
)}

// 2️⃣ FUNÇÃO - Validar no backend
const handleDeleteQuote = async (quoteId: string) => {
  // Validar via Edge Function
  const { data: validation } = await supabase.functions.invoke('validate-action', {
    body: { action: 'delete_quote', resourceId: quoteId }
  });

  if (!validation?.allowed) {
    toast({
      title: "Acesso Negado",
      description: validation?.reason,
      variant: "destructive"
    });
    return;
  }

  // 3️⃣ DATABASE - RLS policy valida novamente
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId);

  // RLS policy bloqueará se usuário não tiver permissão
  // Mesmo que edge function tenha falhado
};
```

---

## 🚫 Anti-Padrões (O que NÃO fazer)

### ❌ ERRADO 1: Confiar em `user.role` diretamente
```typescript
// ❌ NÃO FAÇA ISSO
if (user.role === 'admin') {
  await supabase.from('quotes').delete().eq('id', quoteId);
}
// Atacante pode manipular user.role no DevTools
```

### ❌ ERRADO 2: Usar localStorage para tokens sensíveis
```typescript
// ❌ NÃO FAÇA ISSO
localStorage.setItem('adminToken', token);
// Vulnerável a XSS
```

### ❌ ERRADO 3: Validar apenas no frontend
```typescript
// ❌ NÃO FAÇA ISSO
if (hasPermission('quotes.delete')) {
  await supabase.from('quotes').delete().eq('id', quoteId);
}
// Pode ser bypassado abrindo DevTools
```

### ❌ ERRADO 4: Confiar em parâmetros da URL
```typescript
// ❌ NÃO FAÇA ISSO
const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';
if (isAdmin) {
  // Executar ação sensível
}
// Qualquer um pode adicionar ?admin=true na URL
```

---

## ✅ Padrões Corretos

### ✅ CORRETO 1: Três camadas sempre
```typescript
// 1. Frontend decide mostrar
{hasPermission('action') && <Button />}

// 2. Edge Function valida
const { allowed } = await validateAction('action', resourceId);

// 3. RLS policy protege no banco
// Automático via políticas SQL
```

### ✅ CORRETO 2: Logs de auditoria
```typescript
// Sempre logar tentativas negadas
if (!allowed) {
  await supabase.from('audit_logs').insert({
    action: 'PERMISSION_DENIED',
    details: { action, reason, timestamp }
  });
}
```

### ✅ CORRETO 3: Mensagens de erro genéricas
```typescript
// ✅ BOM - Não revela estrutura interna
toast({
  description: "Você não tem permissão para esta ação"
});

// ❌ RUIM - Revela demais
toast({
  description: "Role 'collaborator' não tem permissão 'quotes.delete'"
});
```

---

## 🧪 Testes de Segurança

### Teste 1: Bypass de Frontend
```typescript
// No DevTools Console:
user.role = 'admin';
// ✅ UI pode mudar, mas backend deve rejeitar
```

### Teste 2: Manipulação de API
```bash
# Tentar deletar sem permissão
curl -X DELETE \
  https://<project>.supabase.co/rest/v1/quotes?id=eq.RFQ01 \
  -H "Authorization: Bearer <user_token>"

# ✅ Deve retornar 403 ou nenhum registro afetado
```

### Teste 3: SQL Injection
```typescript
// Tentar injetar SQL
await supabase.from('quotes').select().eq('id', "1' OR '1'='1");
// ✅ Supabase sanitiza automaticamente
```

---

## 📚 Referências Internas

- **Hook de Permissões:** `src/hooks/usePermissions.ts`
- **Edge Function:** `supabase/functions/validate-action/index.ts`
- **RLS Policies:** Ver documentação Supabase
- **Audit Logs:** Tabela `audit_logs`

---

## 🆘 FAQ

**Q: Por que não posso usar `user.role` para decisões?**  
A: Porque está no frontend e pode ser manipulado pelo atacante no DevTools.

**Q: O hook `usePermissions` não é seguro então?**  
A: É seguro para UI. Não use para lógica de negócio. Sempre valide no backend.

**Q: Preciso validar via Edge Function em TODAS as ações?**  
A: Apenas nas críticas (deletar, aprovar, criar usuários). Leituras podem confiar em RLS.

**Q: RLS policies não são suficientes?**  
A: São a última defesa. Edge Functions dão feedback melhor ao usuário.

**Q: Como sei se minha implementação está segura?**  
A: Se tem 3 camadas (UI + Edge + RLS) para ações críticas, está seguro.

---

**Última atualização:** 14/10/2025  
**Versão:** 1.0  
**Autor:** Equipe de Segurança QuoteMaster Pro
