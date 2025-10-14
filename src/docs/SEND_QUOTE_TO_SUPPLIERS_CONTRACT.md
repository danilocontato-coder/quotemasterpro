# Contrato Funcional: Envio de Cotação para Fornecedores

**Status**: ✅ PROTEGIDO  
**Data**: 2025-10-14  
**Módulos**: send-quote-to-suppliers, complete-supplier-registration, validate-quote-token

---

## 🎯 O Que SEMPRE Deve Funcionar

### 1. Envio de WhatsApp
- ✅ Mensagens WhatsApp devem ser enviadas via Evolution API
- ✅ Mensagens personalizadas do cliente devem aparecer corretamente
- ✅ Links de registro devem usar domínio `cotiz.com.br` (sistema_settings)
- ✅ Links curtos devem ser gerados e funcionais

### 2. Registro de Fornecedores
- ✅ Fornecedores já registrados recebem link de resposta rápida
- ✅ Fornecedores não registrados recebem link de registro + resposta
- ✅ Base URL deve sempre vir de `system_settings` (tabela: `base_url`)
- ✅ Tokens de acesso devem ter validade de 30 dias (padrão)

### 3. Templates de Mensagem
- ✅ Templates são buscados do banco (tabela `message_templates`)
- ✅ Variáveis `{client_name}`, `{supplier_name}`, `{quote_title}` são substituídas
- ✅ Mensagem customizada do cliente aparece no meio do template

### 4. Numeração de Produtos (IA)
- ✅ Produtos criados pela IA têm código por cliente: `PROD001`, `PROD002`...
- ✅ Cada cliente tem numeração independente (não global)
- ✅ Trigger `trg_products_set_code_before_insert` usa `next_product_id_by_client`

---

## 🔍 Pontos Críticos do Código

### Edge Function: `send-quote-to-suppliers/index.ts`

**Linha ~45-55**: Busca da base_url
```typescript
const { data: systemSettings } = await supabase
  .from('system_settings')
  .select('setting_value')
  .eq('setting_key', 'base_url')
  .single();

const systemBaseUrl = systemSettings?.setting_value?.url || 'https://cotiz.com.br';
```
⚠️ **NUNCA** usar `https://bpsqyaxdhqejozmlejcb.supabase.co` diretamente!

**Linha ~180-190**: Construção do link de registro
```typescript
const registrationLink = `${systemBaseUrl}/supplier-register/${token}`;
```
⚠️ Deve sempre usar `systemBaseUrl` (não hardcoded)

**Linha ~250-260**: Mensagem WhatsApp
```typescript
await sendEvolutionWhatsApp(
  evolutionConfig,
  supplier.whatsapp,
  finalMessage // Inclui systemBaseUrl nos links
);
```

### Database: `trg_products_set_code_before_insert`

**Função**: `public.trg_products_set_code()`
```sql
-- Gera código sequencial POR CLIENTE
NEW.code := public.next_product_id_by_client(NEW.client_id, 'PROD');
```
⚠️ **NUNCA** usar `next_product_code('PROD')` (global)

**Tabela de controle**: `client_product_counters`
- Armazena último número usado por cliente
- Incremento atômico (previne duplicação)

---

## 📋 Logs de Validação

### Edge Function Logs (Esperados)

```
✅ Base URL carregada: https://cotiz.com.br
✅ Registration link: https://cotiz.com.br/supplier-register/abc-123-token
✅ WhatsApp enviado com sucesso: +5571999990000
```

### Postgres Logs (Produtos - Esperados)

```
INSERT INTO products (name, client_id) VALUES ('Item X', 'uuid-cliente-1')
→ Trigger: code = 'PROD001' (cliente-1)

INSERT INTO products (name, client_id) VALUES ('Item Y', 'uuid-cliente-2')
→ Trigger: code = 'PROD001' (cliente-2)  ← Numeração independente!
```

---

## 🧪 Testes de Validação

### Teste 1: Envio de Cotação
1. Criar cotação no painel
2. Adicionar fornecedores (registrados + não registrados)
3. Enviar cotação
4. **Verificar**: Logs da edge function mostram `cotiz.com.br` nos links
5. **Verificar**: WhatsApp recebido com links corretos

### Teste 2: Link de Registro
1. Copiar link do log: `https://cotiz.com.br/supplier-register/...`
2. Abrir em navegador anônimo
3. **Verificar**: Página de registro carrega
4. **Verificar**: Após registro, redireciona para resposta rápida

### Teste 3: Numeração de Produtos (IA)
1. Cliente A: Criar produto via IA → Código `PROD001`
2. Cliente A: Criar outro produto via IA → Código `PROD002`
3. Cliente B: Criar produto via IA → Código `PROD001` (independente!)
4. **Verificar**: Query `SELECT code FROM products WHERE client_id = 'cliente-A'`

---

## 📝 Histórico de Correções

### 2025-10-13: Correção systemBaseUrl
**Problema**: Links usavam `bpsqyaxdhqejozmlejcb.supabase.co`  
**Causa**: `systemBaseUrl` não era passado para `substituirVariaveis`  
**Solução**: 
- Linha 252: Adicionar `systemBaseUrl` no contexto
- Substituir `{base_url}` em templates

**Arquivos Alterados**:
- `supabase/functions/send-quote-to-suppliers/index.ts`

### 2025-10-14: Numeração de Produtos por Cliente
**Problema**: Produtos tinham códigos globais (`PROD0001`, `PROD0002`...)`  
**Causa**: Migration mais recente sobrescreveu trigger correto  
**Solução**:
- Recriar trigger usando `next_product_id_by_client(client_id, 'PROD')`
- Garantir numeração independente por cliente

**Arquivos Alterados**:
- `supabase/migrations/20251014000631_*.sql`

---

## 🚨 Regras de Proteção

### NUNCA Fazer
1. ❌ Usar `https://bpsqyaxdhqejozmlejcb.supabase.co` em links públicos
2. ❌ Trocar `next_product_id_by_client` por `next_product_code` (global)
3. ❌ Remover busca de `system_settings.base_url`
4. ❌ Criar produtos sem `client_id` (causa TEMP-uuid)

### SEMPRE Fazer
1. ✅ Buscar base_url de `system_settings` antes de gerar links
2. ✅ Passar `systemBaseUrl` para todas as funções de substituição
3. ✅ Verificar logs da edge function após envio
4. ✅ Testar com fornecedores registrados E não registrados

---

## 🔗 Dependências Críticas

### Tabelas
- `system_settings` (key: `base_url`)
- `message_templates` (type: `quote_invitation`)
- `client_product_counters` (numeração produtos)
- `quote_tokens` (acesso temporário)

### Edge Functions
- `send-quote-to-suppliers`
- `complete-supplier-registration`
- `validate-quote-token`
- `resolve-short-link`

### Triggers
- `trg_products_set_code_before_insert` (produtos)
- `trg_quotes_set_id` (cotações)

---

## 📞 Suporte

**Quando Reportar Problema**:
- Links com domínio errado (não `cotiz.com.br`)
- Produtos com códigos duplicados no mesmo cliente
- WhatsApp não enviado (verificar Evolution API)
- Registro de fornecedor falha no token

**Como Verificar**:
1. Checar logs da edge function no Supabase
2. Consultar `SELECT * FROM system_settings WHERE setting_key = 'base_url'`
3. Verificar `SELECT * FROM client_product_counters WHERE client_id = 'xxx'`

---

**Última Validação**: 2025-10-14 ✅  
**Próxima Revisão**: Quando alterar fluxo de envio ou registro
