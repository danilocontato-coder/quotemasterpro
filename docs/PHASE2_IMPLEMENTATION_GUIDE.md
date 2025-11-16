# 🚀 GUIA DE IMPLEMENTAÇÃO - Fase 2: Consolidação de Roles

## 📍 VOCÊ ESTÁ AQUI

```
[✅ Fase 1: Auditoria] → [📍 Fase 2: Consolidar Roles] → [ Fase 3: Edge Functions] → [ Fase 4: Frontend]
```

---

## 🎯 OBJETIVO DA FASE 2

**Migrar `get_user_role()` para usar APENAS `user_roles` table, mantendo fallback temporário para `profiles.role`**

### Por que é seguro?

1. ✅ **Fallback ativo:** Se user_roles estiver vazio, consulta profiles.role
2. ✅ **Sync automático:** Trigger mantém profiles.role e user_roles sincronizados
3. ✅ **Rollback instantâneo:** Script de rollback pronto para uso
4. ✅ **Zero downtime:** Mudança não quebra código existente
5. ✅ **Testado:** Checklist completo de validação

---

## 📋 REQUISITOS PRÉ-APLICAÇÃO

### ✅ Checklist Obrigatório

```bash
[ ] Li e entendi CRITICAL_ROLLBACK_PLAN.md
[ ] Li e entendi CONSOLIDATE_ROLES_TESTING.md
[ ] Tenho backup completo do banco de dados
[ ] Tenho acesso ao Supabase Dashboard
[ ] Sei executar o script de rollback
[ ] Tenho >30min disponíveis para monitorar
[ ] Ambiente de staging testado (recomendado)
```

---

## 🔧 PASSO A PASSO DE IMPLEMENTAÇÃO

### Passo 1: Criar Backup

```bash
# Via Supabase Dashboard:
1. Ir em Database > Backups
2. Clicar em "Create Backup"
3. Nomear: "pre-consolidate-roles-[DATA]"
4. Aguardar conclusão
5. ✅ Confirmar backup criado
```

### Passo 2: Aplicar Migration

Você tem 2 opções:

#### Opção A: Via Interface da Lovable (RECOMENDADO)

```
1. Copiar o conteúdo de docs/migrations/consolidate_roles_secure.sql
2. Usar a ferramenta de migration no chat
3. Aguardar confirmação
```

#### Opção B: Via Supabase Dashboard

```
1. Ir em SQL Editor no Supabase Dashboard
2. Copiar conteúdo de docs/migrations/consolidate_roles_secure.sql
3. Colar no editor
4. Clicar em "Run"
5. Verificar mensagens de sucesso
```

### Passo 3: Validação Imediata (5 minutos)

Execute os testes em `CONSOLIDATE_ROLES_TESTING.md` seção "PÓS-APLICAÇÃO"

```sql
-- ✅ Teste Rápido 1: Função funciona
SELECT get_user_role();

-- ✅ Teste Rápido 2: Dados migraram
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE role IS NOT NULL) as profiles,
  (SELECT COUNT(*) FROM user_roles) as user_roles;
-- Esperado: Números iguais

-- ✅ Teste Rápido 3: Performance OK
EXPLAIN ANALYZE SELECT get_user_role();
-- Esperado: < 5ms
```

**Status:** [ ] ✅ Todos passaram → Continue  
**Status:** [ ] ❌ Algum falhou → EXECUTE ROLLBACK

### Passo 4: Testes de Permissões (10 minutos)

Faça login com cada tipo de usuário e verifique:

```bash
[ ] Admin - Dashboard carrega, vê todas cotações
[ ] Manager - Vê apenas cotações do seu cliente
[ ] Supplier - Vê apenas suas cotações
[ ] Collaborator - Não pode aprovar cotações
```

**Status:** [ ] ✅ Todos passaram → Continue  
**Status:** [ ] ❌ Algum falhou → EXECUTE ROLLBACK

### Passo 5: Monitoramento (24h)

```sql
-- Execute a cada 2 horas nas próximas 24h:

-- ✅ Verificar erros
SELECT COUNT(*) as erros_recentes
FROM postgres_logs
WHERE timestamp > NOW() - INTERVAL '2 hours'
  AND parsed.error_severity IN ('ERROR', 'FATAL')
  AND event_message LIKE '%role%';
-- Esperado: 0

-- ✅ Verificar sincronia
SELECT COUNT(*) as dessincronia
FROM profiles p
WHERE p.role IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = p.id
  );
-- Esperado: 0
```

---

## 🚨 QUANDO EXECUTAR ROLLBACK

### Sinais de Alerta CRÍTICOS

Execute rollback IMEDIATAMENTE se ocorrer:

1. ❌ **Erro 500 em produção**
2. ❌ **Login não funciona**
3. ❌ **Admin não consegue acessar recursos**
4. ❌ **Queries retornam vazio quando deveriam ter dados**
5. ❌ **Aumento de >10% nos erros do backend**
6. ❌ **Timeout em queries simples (>1s)**

### Como Executar Rollback

```bash
# Via Supabase Dashboard - SQL Editor:

1. Abrir docs/rollback_migrations/rollback_get_user_role.sql
2. Copiar TODO o conteúdo
3. Colar no SQL Editor
4. Clicar em "Run"
5. Verificar mensagens de sucesso
6. Testar login novamente
```

**Tempo estimado de rollback:** ~2 minutos

---

## 📊 MÉTRICAS DE SUCESSO

### Após 24 horas estáveis:

```bash
[ ] Zero erros relacionados a roles nos logs
[ ] Performance estável (get_user_role < 5ms)
[ ] Todos os usuários conseguem fazer login
[ ] Permissões funcionando corretamente
[ ] Nenhuma reclamação de usuários
```

### Após 7 dias estáveis:

```bash
[ ] Tudo acima + monitoramento contínuo OK
[ ] Pronto para próxima fase: Remover profiles.role
```

---

## 🔄 PRÓXIMA FASE (após 7 dias)

**Fase 3: Remover profiles.role completamente**

```sql
-- ⚠️ NÃO EXECUTAR AINDA! Aguardar Fase 2 estabilizar

-- Remover coluna profiles.role
ALTER TABLE profiles DROP COLUMN role;

-- Remover trigger de sync
DROP TRIGGER IF EXISTS trg_sync_profile_role ON profiles;
DROP FUNCTION IF EXISTS sync_profile_role_to_user_roles();

-- Remover fallbacks das funções
-- (Re-criar get_user_role sem consulta a profiles)
```

---

## 📞 SUPORTE E DÚVIDAS

### Documentação de Referência

- `CRITICAL_ROLLBACK_PLAN.md` - Plano de rollback completo
- `CONSOLIDATE_ROLES_TESTING.md` - Checklist de testes
- `rollback_migrations/rollback_get_user_role.sql` - Script de rollback

### FAQ

**Q: E se eu não tiver ambiente de staging?**  
A: Pode aplicar direto em prod, pois tem fallback. Mas monitore ativamente por 1h.

**Q: Quanto tempo leva o rollback?**  
A: ~2 minutos para reverter completamente.

**Q: Posso fazer durante horário comercial?**  
A: Sim, é seguro. Mas recomendamos fora do horário de pico.

**Q: E se o rollback falhar?**  
A: Improvável, mas entre em contato com o suporte do Supabase.

---

## ✅ AUTORIZAÇÃO FINAL

**Antes de aplicar, confirmar:**

```
🔲 Li toda a documentação
🔲 Tenho backup do banco
🔲 Sei executar rollback
🔲 Tenho tempo para monitorar
🔲 Entendi os critérios de rollback
```

**Responsável:** _______________________  
**Data Planejada:** ____/____/______  
**Horário:** ________  

---

## 🎉 APÓS SUCESSO

Se tudo correr bem por 7 dias:

```bash
✅ Fase 2 completa
→ Agendar Fase 3: Proteger Edge Functions
→ Agendar Fase 4: Consolidar hooks do frontend
```

**BOA SORTE! 🚀**
