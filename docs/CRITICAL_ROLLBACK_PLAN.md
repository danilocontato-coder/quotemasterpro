# 🚨 PLANO DE ROLLBACK CRÍTICO - Consolidação de Roles

## ⚠️ ATENÇÃO: LEIA ANTES DE APLICAR QUALQUER MUDANÇA

Este documento contém **instruções críticas de segurança** para reverter mudanças em caso de problemas.

---

## 📸 SNAPSHOT DO ESTADO ATUAL (PRÉ-MUDANÇA)

### Data do Snapshot
**Data:** 2025-11-16  
**Responsável:** Sistema Cotiz  
**Objetivo:** Consolidar roles em `user_roles` table

---

## 🔍 ESTADO ATUAL DAS FUNÇÕES

### 1. `get_user_role()` - VERSÃO ORIGINAL

```sql
-- ❌ VERSÃO ANTIGA (consulta profiles.role - INSEGURO)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Problemas:**
- ✗ Consulta `profiles.role` (vulnerável a privilege escalation)
- ✗ Não usa `user_roles` table (duplicação de dados)
- ✗ Falta `STABLE` keyword (performance ruim)

---

### 2. Tabelas que Armazenam Roles

```sql
-- ❌ PROBLEMA: Roles em 3 lugares diferentes!
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'role' AND table_schema = 'public';

-- Resultado:
-- 1. user_roles.role       ✅ CORRETO (fonte única de verdade)
-- 2. profiles.role          ❌ DUPLICADO (deve ser removido)
-- 3. users.role             ❌ DUPLICADO (deve ser removido)
```

---

### 3. Locais Que Usam `get_user_role()`

**Total:** 712 ocorrências em 173 arquivos

**Principais migrations afetadas:**
- `20250820112043_*.sql` - RLS policies principais
- `20250820112143_*.sql` - Quote responses policies
- `20250820113111_*.sql` - Storage policies
- `20250822001243_*.sql` - Products/Categories policies

---

## 🛡️ NOVA IMPLEMENTAÇÃO SEGURA

### 1. `get_user_role()` - VERSÃO NOVA (SEGURA)

```sql
-- ✅ NOVA VERSÃO (usa user_roles - SEGURO)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role::text 
    FROM user_roles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
```

**Melhorias:**
- ✓ Usa `user_roles` table (fonte única)
- ✓ Keyword `STABLE` (melhor performance)
- ✓ `SET search_path = public` (previne injection)
- ✓ `LIMIT 1` (previne múltiplos roles)

---

### 2. `has_role_text()` - NOVA FUNÇÃO

```sql
-- ✅ NOVA FUNÇÃO: Verifica se usuário tem role específico
CREATE OR REPLACE FUNCTION has_role_text(_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role::text = _role
  );
$$;
```

---

## 🔄 INSTRUÇÕES DE ROLLBACK

### Se der QUALQUER problema, execute IMEDIATAMENTE:

#### Passo 1: Reverter Função no Banco

```sql
-- 1. Conectar ao banco como superuser
-- 2. Executar:

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Verificar:
SELECT get_user_role(); -- Deve retornar seu role atual
```

#### Passo 2: Reverter Migration

```bash
# No terminal do Supabase CLI:
supabase db reset --linked

# Ou aplicar migration de rollback:
supabase db push --db-url YOUR_DB_URL < docs/rollback_migrations/rollback_get_user_role.sql
```

#### Passo 3: Verificar Sistema

```sql
-- Testar queries críticas:
SELECT * FROM profiles WHERE id = auth.uid(); -- Deve funcionar
SELECT * FROM quotes LIMIT 5; -- Deve retornar dados
SELECT * FROM products LIMIT 5; -- Deve retornar dados

-- Verificar logs de erro:
SELECT * FROM postgres_logs 
WHERE event_message LIKE '%permission%' 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## 📋 CHECKLIST DE VALIDAÇÃO PÓS-MUDANÇA

### ✅ Executar ANTES de considerar a mudança bem-sucedida:

#### 1. Testes de Autenticação
```bash
[ ] Login como admin funciona
[ ] Login como manager funciona
[ ] Login como supplier funciona
[ ] Login como collaborator funciona
[ ] Logout funciona
```

#### 2. Testes de Permissões
```bash
[ ] Admin pode ver todas as cotações
[ ] Manager só vê cotações do seu cliente
[ ] Supplier só vê suas próprias cotações
[ ] Collaborator não pode aprovar cotações
```

#### 3. Testes de Performance
```sql
-- Executar e verificar que termina em <100ms:
EXPLAIN ANALYZE SELECT get_user_role();

-- Resultado esperado: < 5ms
```

#### 4. Verificar Logs
```sql
-- Não deve ter erros nos últimos 5 minutos:
SELECT COUNT(*) FROM postgres_logs 
WHERE timestamp > NOW() - INTERVAL '5 minutes'
  AND parsed.error_severity IN ('ERROR', 'FATAL');

-- Resultado esperado: 0
```

#### 5. Smoke Tests no Frontend
```bash
[ ] Dashboard carrega sem erros
[ ] Listagem de cotações funciona
[ ] Criação de cotação funciona
[ ] Upload de arquivo funciona
[ ] Notificações aparecem
```

---

## 🚨 SINAIS DE ALERTA (EXECUTE ROLLBACK IMEDIATO)

Execute rollback SE QUALQUER UM ocorrer:

1. **Erro 500 no login**
2. **Mensagem "permission denied" para admin**
3. **Queries que antes funcionavam retornam vazio**
4. **Aumento de >10% nos erros do backend**
5. **Timeout em queries simples (>1s)**
6. **Usuários não conseguem acessar seus próprios dados**

---

## 📞 CONTATO DE EMERGÊNCIA

**Responsável Técnico:** [SEU NOME]  
**Data de Aplicação:** [SERÁ PREENCHIDO NA EXECUÇÃO]  
**Ambiente:** [staging/production]

---

## 📝 LOG DE MUDANÇAS

| Data | Ação | Status | Observações |
|------|------|--------|-------------|
| 2025-11-16 | Criação do plano | ⏸️ Pendente | Aguardando aprovação |
| - | Aplicação em staging | ⏸️ Pendente | - |
| - | Testes em staging | ⏸️ Pendente | - |
| - | Aplicação em produção | ⏸️ Pendente | - |

---

## ✅ APROVAÇÃO

**Antes de aplicar, confirmar:**

```bash
[ ] Li e entendi todo o plano de rollback
[ ] Tenho backup completo do banco
[ ] Tenho acesso ao Supabase Dashboard
[ ] Sei executar os comandos de rollback
[ ] Estou monitorando logs em tempo real
[ ] Tenho >30min disponíveis para monitorar
```

**Assinatura:** ________________________  
**Data:** ____/____/______

---

## 🔗 PRÓXIMOS PASSOS

Depois que esta fase estiver 100% estável:

1. **Fase 2:** Remover `profiles.role` column (CUIDADO!)
2. **Fase 3:** Adicionar audit logs para mudanças de role
3. **Fase 4:** Implementar rate limiting em Edge Functions

**⚠️ NÃO PULAR ETAPAS! Cada fase precisa de 1 semana de estabilidade.**
