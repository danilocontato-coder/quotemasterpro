# 🧪 PLANO DE TESTES - Consolidação de Roles

## 📋 Checklist Completo de Validação

### ✅ PRÉ-APLICAÇÃO (Executar ANTES da migration)

#### 1. Backup Completo
```bash
[ ] Backup do banco criado
[ ] Backup salvo localmente
[ ] Testado restore do backup
[ ] Tempo de restore: _____ minutos
```

#### 2. Ambiente de Teste
```bash
[ ] Ambiente de staging criado
[ ] Banco de staging idêntico ao prod
[ ] Migration testada em staging
[ ] Sem erros em staging
```

#### 3. Documentação
```bash
[ ] CRITICAL_ROLLBACK_PLAN.md revisado
[ ] rollback_get_user_role.sql testado
[ ] Equipe treinada no rollback
```

---

### 🔍 PÓS-APLICAÇÃO (Executar IMEDIATAMENTE após migration)

#### 1. Validação de Funções

```sql
-- ✅ Teste 1: get_user_role() retorna valor
SELECT get_user_role();
-- Esperado: Retorna seu role atual (ex: 'admin', 'manager', etc)

-- ✅ Teste 2: has_role_text() funciona
SELECT has_role_text('admin');
-- Esperado: true se você for admin, false caso contrário

-- ✅ Teste 3: has_any_role() funciona
SELECT has_any_role(ARRAY['admin', 'manager']);
-- Esperado: true se você for admin OU manager

-- ✅ Teste 4: Performance
EXPLAIN ANALYZE SELECT get_user_role();
-- Esperado: < 5ms de execução
```

**Status:** [ ] Passou [ ] Falhou

---

#### 2. Validação de Dados

```sql
-- ✅ Teste 5: Todos os users têm role em user_roles
SELECT 
  COUNT(*) as users_sem_role
FROM profiles p
WHERE p.role IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id
  );
-- Esperado: 0 (zero usuários sem role)

-- ✅ Teste 6: Contagem de roles
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE role IS NOT NULL) as profiles_count,
  (SELECT COUNT(*) FROM user_roles) as user_roles_count;
-- Esperado: Números iguais ou user_roles_count >= profiles_count

-- ✅ Teste 7: Roles válidos
SELECT DISTINCT role FROM user_roles 
WHERE role NOT IN ('admin', 'manager', 'collaborator', 'supplier');
-- Esperado: Resultado vazio (nenhum role inválido)
```

**Status:** [ ] Passou [ ] Falhou

---

#### 3. Teste de Permissões por Role

##### 3.1 ADMIN

```sql
-- Login como admin e executar:
SELECT COUNT(*) FROM quotes;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM clients;
SELECT COUNT(*) FROM suppliers;
-- Esperado: Retorna todos os registros (sem filtro de client_id)
```

**Status:** [ ] Passou [ ] Falhou

##### 3.2 MANAGER

```sql
-- Login como manager e executar:
SELECT COUNT(*) FROM quotes;
-- Esperado: Retorna APENAS cotações do seu client_id

SELECT COUNT(*) FROM products;
-- Esperado: Retorna APENAS produtos do seu client_id

-- Tentar ver cotação de outro cliente:
SELECT * FROM quotes WHERE client_id != (
  SELECT client_id FROM profiles WHERE id = auth.uid()
) LIMIT 1;
-- Esperado: Resultado vazio (não pode ver)
```

**Status:** [ ] Passou [ ] Falhou

##### 3.3 SUPPLIER

```sql
-- Login como supplier e executar:
SELECT COUNT(*) FROM quote_responses;
-- Esperado: Retorna APENAS respostas onde supplier_id é o seu

SELECT COUNT(*) FROM quotes;
-- Esperado: Retorna APENAS cotações enviadas para você

-- Tentar ver resposta de outro supplier:
SELECT * FROM quote_responses WHERE supplier_id != (
  SELECT supplier_id FROM profiles WHERE id = auth.uid()
) LIMIT 1;
-- Esperado: Resultado vazio (não pode ver)
```

**Status:** [ ] Passou [ ] Falhou

##### 3.4 COLLABORATOR

```sql
-- Login como collaborator e executar:
SELECT COUNT(*) FROM quotes;
-- Esperado: Retorna cotações do seu cliente

-- Tentar aprovar cotação:
UPDATE approvals SET status = 'approved' WHERE id = 'algum_id';
-- Esperado: ERRO de permissão (collaborator não pode aprovar)
```

**Status:** [ ] Passou [ ] Falhou

---

#### 4. Testes de Performance

```sql
-- ✅ Teste: Query complexa com get_user_role()
EXPLAIN ANALYZE
SELECT q.id, q.description, q.total, c.name as client_name
FROM quotes q
JOIN clients c ON c.id = q.client_id
WHERE get_user_role() = 'admin' 
   OR q.client_id IN (
     SELECT client_id FROM profiles WHERE id = auth.uid()
   )
LIMIT 100;
-- Esperado: < 100ms total, <5ms para get_user_role()

-- ✅ Teste: Query em loop
DO $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration INTERVAL;
BEGIN
  start_time := clock_timestamp();
  
  FOR i IN 1..1000 LOOP
    PERFORM get_user_role();
  END LOOP;
  
  end_time := clock_timestamp();
  duration := end_time - start_time;
  
  RAISE NOTICE 'Executou 1000x get_user_role() em: %', duration;
  -- Esperado: < 1 segundo
END;
$$;
```

**Status:** [ ] Passou [ ] Falhou

---

#### 5. Testes de Sincronização (Trigger)

```sql
-- ✅ Teste: Atualizar role em profiles
UPDATE profiles 
SET role = 'manager' 
WHERE id = auth.uid();

-- Verificar se sincronizou:
SELECT * FROM user_roles WHERE user_id = auth.uid();
-- Esperado: role = 'manager'

-- ✅ Teste: Voltar ao role original
UPDATE profiles 
SET role = '[SEU_ROLE_ORIGINAL]' 
WHERE id = auth.uid();

-- Verificar novamente:
SELECT * FROM user_roles WHERE user_id = auth.uid();
-- Esperado: role voltou ao original
```

**Status:** [ ] Passou [ ] Falhou

---

### 🖥️ TESTES DE FRONTEND

#### 1. Autenticação

```bash
[ ] Login como admin - Dashboard carrega
[ ] Login como manager - Dashboard carrega
[ ] Login como supplier - Dashboard carrega
[ ] Login como collaborator - Dashboard carrega
[ ] Logout funciona para todos
[ ] Token refresh funciona (esperar 5min logado)
```

#### 2. Navegação

```bash
[ ] Admin vê menu completo (todas as opções)
[ ] Manager NÃO vê menu de admin
[ ] Supplier vê APENAS suas seções
[ ] Collaborator NÃO vê aprovações
```

#### 3. CRUD de Cotações

```bash
[ ] Admin pode criar cotação
[ ] Manager pode criar cotação
[ ] Supplier NÃO pode criar cotação (apenas responder)
[ ] Collaborator pode criar cotação
[ ] Admin pode ver TODAS as cotações
[ ] Manager vê APENAS cotações do seu cliente
[ ] Supplier vê APENAS cotações enviadas para ele
```

#### 4. Aprovações

```bash
[ ] Manager pode aprovar cotações
[ ] Collaborator NÃO pode aprovar
[ ] Admin pode aprovar qualquer cotação
```

#### 5. Uploads e Anexos

```bash
[ ] Upload de arquivo funciona
[ ] Anexo é visível após upload
[ ] Download do anexo funciona
[ ] Apenas usuários com permissão veem anexos
```

---

### 📊 MONITORAMENTO (24h após aplicação)

#### Métricas de Sucesso

```sql
-- ✅ Contagem de erros (deve ser 0)
SELECT COUNT(*) as erros_24h
FROM postgres_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
  AND parsed.error_severity IN ('ERROR', 'FATAL')
  AND event_message LIKE '%role%';
-- Esperado: 0

-- ✅ Tempo médio de get_user_role()
SELECT 
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration,
  COUNT(*) as executions
FROM pg_stat_statements
WHERE query LIKE '%get_user_role%';
-- Esperado: avg < 5ms, max < 20ms

-- ✅ Usuarios sem role em user_roles (deve ser 0)
SELECT COUNT(*) as users_sem_role
FROM profiles p
WHERE p.role IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = p.id
  );
-- Esperado: 0
```

#### Alertas Críticos

```bash
[ ] Sem aumento de latência no dashboard
[ ] Sem erros 500 em produção
[ ] Sem reclamações de usuários sobre permissões
[ ] Logs não mostram "permission denied" inesperado
```

---

### ⚠️ CRITÉRIOS DE ROLLBACK

**Execute rollback IMEDIATAMENTE se:**

1. ❌ Qualquer teste de validação falhar
2. ❌ Erros de permissão aumentarem >5%
3. ❌ Tempo de resposta aumentar >20%
4. ❌ Usuários não conseguirem fazer login
5. ❌ Admin não conseguir acessar recursos
6. ❌ Queries retornarem vazias quando deveriam ter dados

---

### ✅ APROVAÇÃO FINAL

**Após 7 dias estáveis:**

```bash
[ ] Todos os testes passaram por 7 dias consecutivos
[ ] Sem erros relacionados a roles nos logs
[ ] Performance estável (sem degradação)
[ ] Usuários não reportaram problemas
[ ] Pronto para remover profiles.role na próxima fase
```

**Data de Aplicação:** ____/____/______  
**Responsável:** _______________________  
**Status Final:** [ ] ✅ Sucesso [ ] ❌ Rollback Executado

---

## 📞 SUPORTE

**Em caso de dúvidas ou problemas:**

1. Verificar `CRITICAL_ROLLBACK_PLAN.md`
2. Executar testes de validação novamente
3. Verificar logs: Supabase Dashboard > Logs > Database
4. Se necessário, executar rollback imediato

**Contato:** [SEU EMAIL/TELEFONE]
