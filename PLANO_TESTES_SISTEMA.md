# 🧪 PLANO DE TESTES - QuoteMaster Pro
**Guia Completo para Validação Pré-Produção**

---

## 📋 ÍNDICE
1. [Preparação do Ambiente](#preparação)
2. [Testes de Autenticação](#autenticação)
3. [Testes de Isolamento de Dados](#isolamento)
4. [Testes Funcionais por Módulo](#funcionais)
5. [Testes de Segurança](#segurança)
6. [Testes de Performance](#performance)
7. [Checklist Final](#checklist)

---

## 🔧 1. PREPARAÇÃO DO AMBIENTE {#preparação}

### 1.1 Criar Dados de Teste

**Clientes de Teste:**
```
Cliente A - Condomínio Solar
- Email: cliente-a@teste.com
- CNPJ: 12.345.678/0001-90
- Plano: Professional

Cliente B - Edifício Luna
- Email: cliente-b@teste.com  
- CNPJ: 98.765.432/0001-10
- Plano: Basic
```

**Fornecedores de Teste:**
```
Fornecedor 1 - Materiais Alpha
- Email: fornecedor1@teste.com
- CNPJ: 11.222.333/0001-44
- Especialidades: [Materiais de Construção, Elétrica]

Fornecedor 2 - Serviços Beta
- Email: fornecedor2@teste.com
- CNPJ: 55.666.777/0001-88
- Especialidades: [Limpeza, Manutenção]
```

**Usuários de Teste:**
```
Admin: admin@teste.com
Manager Cliente A: manager-a@teste.com
Colaborador Cliente A: colab-a@teste.com
Manager Cliente B: manager-b@teste.com
Usuário Fornecedor 1: user-forn1@teste.com
```

### 1.2 Ferramentas Necessárias
- ✅ Navegador com DevTools aberto (F12)
- ✅ Janela anônima/privada para testes paralelos
- ✅ Supabase Dashboard aberto (para verificar dados)
- ✅ Planilha ou documento para anotar resultados

---

## 🔐 2. TESTES DE AUTENTICAÇÃO {#autenticação}

### 2.1 Login e Logout
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 1 | Login válido | Entrar com credenciais corretas | Redirecionar para dashboard do papel correto | ⬜ |
| 2 | Login inválido | Senha incorreta | Mensagem de erro clara | ⬜ |
| 3 | Login bloqueado | Cliente com status "inactive" | Alerta de conta inativa | ⬜ |
| 4 | Logout | Clicar em "Sair" | Retornar à tela de login | ⬜ |
| 5 | Sessão expirada | Esperar timeout | Redirecionar para login | ⬜ |

### 2.2 Controle de Acesso por Papel
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 6 | Admin acessa tudo | Login como admin → navegar em /admin/* | Acesso completo | ⬜ |
| 7 | Cliente tenta /admin | Login como manager → acessar /admin/clients | Bloqueado (403 ou redirect) | ⬜ |
| 8 | Fornecedor tenta cliente | Login como fornecedor → acessar /quotes | Bloqueado/redirect | ⬜ |
| 9 | Colaborador vs Manager | Comparar acessos entre papéis | Colaborador tem menos permissões | ⬜ |

---

## 🔒 3. TESTES DE ISOLAMENTO DE DADOS (RLS) {#isolamento}

### 3.1 Isolamento Entre Clientes
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 10 | Cotações isoladas | Login Cliente A → ver cotações | Só cotações do Cliente A | ⬜ |
| 11 | Produtos isolados | Login Cliente A → ver produtos | Só produtos do Cliente A | ⬜ |
| 12 | Usuários isolados | Login Manager A → ver usuários | Só usuários do Cliente A | ⬜ |
| 13 | Fornecedores vinculados | Login Cliente A → ver fornecedores | Só fornecedores vinculados ao Cliente A | ⬜ |

**Como testar:**
1. Crie 1 cotação para Cliente A
2. Crie 1 cotação para Cliente B
3. Faça login como Cliente A → deve ver apenas SUA cotação
4. Abra DevTools → Network → veja se API retorna só dados do Cliente A
5. Repita para Cliente B

### 3.2 Isolamento de Fornecedores
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 14 | Produtos isolados | Login Fornecedor 1 → ver produtos | Só produtos do Fornecedor 1 | ⬜ |
| 15 | Cotações atribuídas | Login Fornecedor 1 → ver cotações | Só cotações enviadas para ele | ⬜ |
| 16 | Respostas isoladas | Login Fornecedor 1 → histórico | Só suas respostas | ⬜ |

### 3.3 Teste de Manipulação de IDs (CRÍTICO 🚨)
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 17 | URL manipulation | Login Cliente A → alterar ID de cotação na URL para cotação do Cliente B | Erro 403 ou "Não encontrado" | ⬜ |
| 18 | API manipulation | DevTools → Network → copiar request de cotação → mudar client_id no body e reenviar | Erro 403 ou dados não salvos | ⬜ |

**Como testar #18:**
```javascript
// No DevTools Console:
// 1. Copie um request de POST/PUT
// 2. Modifique o payload:
fetch('/api/quotes', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer TOKEN_AQUI' },
  body: JSON.stringify({
    client_id: 'ID_DE_OUTRO_CLIENTE', // ⚠️ Tentar burlar
    title: 'Teste de Invasão'
  })
})
// Resultado esperado: 403 Forbidden ou dados NÃO criados
```

---

## ✅ 4. TESTES FUNCIONAIS POR MÓDULO {#funcionais}

### 4.1 Módulo de Cotações
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 19 | Criar cotação | Dashboard → Nova Cotação → preencher → salvar | Cotação criada com ID único | ⬜ |
| 20 | Adicionar itens | Na cotação → adicionar 3 itens | Itens aparecem na lista | ⬜ |
| 21 | Cálculo automático | Alterar quantidade/preço | Total recalcula automaticamente | ⬜ |
| 22 | Enviar para fornecedores | Selecionar 2 fornecedores → enviar | Status muda para "sent" | ⬜ |
| 23 | Receber propostas | Login como fornecedor → responder cotação | Proposta aparece no dashboard cliente | ⬜ |
| 24 | Aprovar cotação | Cliente aprova proposta | Status muda para "approved" | ⬜ |
| 25 | Filtros e busca | Pesquisar por ID/status | Resultados corretos | ⬜ |

### 4.2 Módulo de Fornecedores
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 26 | Cadastrar fornecedor | Fornecedores → Novo → preencher CNPJ/dados | Fornecedor criado | ⬜ |
| 27 | Sugestão inteligente | Criar cotação → sistema sugere fornecedores | Sugestões baseadas em especialidade/região | ⬜ |
| 28 | Avaliação de fornecedor | Após pagamento → avaliar fornecedor | Nota média atualizada | ⬜ |
| 29 | Desativar fornecedor | Ações → Desativar | Não aparece mais em sugestões | ⬜ |

### 4.3 Módulo de Produtos
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 30 | Cadastrar produto | Produtos → Novo → preencher | Produto criado | ⬜ |
| 31 | Auto-complete em cotações | Criar cotação → digitar nome do produto | Produto sugerido | ⬜ |
| 32 | Controle de estoque | Fornecedor altera estoque | Quantidade atualizada | ⬜ |
| 33 | Produtos isolados | Cliente A não vê produtos do Cliente B | Isolamento correto | ⬜ |

### 4.4 Módulo de Pagamentos
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 34 | Criação automática | Aprovar cotação | Pagamento criado automaticamente | ⬜ |
| 35 | Pagamento offline | Confirmar pagamento manual | Fornecedor aprova/rejeita | ⬜ |
| 36 | Status de pagamento | Pagar → confirmar | Status muda para "completed" | ⬜ |
| 37 | Escrow | Pagamento confirmado | Entrega criada automaticamente | ⬜ |

### 4.5 Módulo de Entregas
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 38 | Agendar entrega | Fornecedor agenda data/hora | Entrega registrada | ⬜ |
| 39 | Código de confirmação | Sistema gera código | Código único de 4 dígitos | ⬜ |
| 40 | Confirmar entrega | Cliente insere código | Status muda para "delivered" | ⬜ |

### 4.6 Módulo de Usuários e Permissões
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 41 | Criar usuário | Admin/Manager → Novo Usuário | Usuário criado e notificado | ⬜ |
| 42 | Grupos de permissão | Criar grupo "Aprovadores" → atribuir usuários | Usuários herdam permissões | ⬜ |
| 43 | Perfis de permissão | Criar perfil customizado → aplicar | Restrições aplicadas | ⬜ |
| 44 | Desativar usuário | Ações → Desativar | Login bloqueado | ⬜ |

### 4.7 Módulo de Comunicação
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 45 | Criar ticket | Suporte → Novo Ticket | Ticket criado com ID | ⬜ |
| 46 | Responder ticket | Admin responde → cliente vê | Mensagem aparece no histórico | ⬜ |
| 47 | Anúncios | Admin cria anúncio → publica | Clientes veem no dashboard | ⬜ |

### 4.8 Módulo de Relatórios
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 48 | Relatório de cotações | Relatórios → filtrar período | Dados corretos | ⬜ |
| 49 | Análise de economia | Ver economia gerada | Cálculos corretos | ⬜ |
| 50 | Performance de fornecedores | Ver ranking | Dados isolados por cliente | ⬜ |

---

## 🛡️ 5. TESTES DE SEGURANÇA {#segurança}

### 5.1 Validação de Entrada
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 51 | SQL Injection | Campo de busca: `'; DROP TABLE quotes; --` | Input sanitizado, sem efeito | ⬜ |
| 52 | XSS | Nome de produto: `<script>alert('XSS')</script>` | Script não executado | ⬜ |
| 53 | CNPJ inválido | Cadastrar fornecedor com CNPJ errado | Erro de validação | ⬜ |
| 54 | Email inválido | Email sem @ | Erro de validação | ⬜ |

### 5.2 Proteção de Dados Sensíveis
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 55 | Senhas | DevTools → Network → ver request de login | Senha NÃO aparece em logs | ⬜ |
| 56 | API Keys | Verificar código-fonte do frontend | Chaves sensíveis NÃO expostas | ⬜ |
| 57 | Dados financeiros | Ver valores de pagamento | Apenas usuários autorizados | ⬜ |

### 5.3 Proteção CSRF/CORS
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 58 | CORS | Tentar fazer request de outro domínio | Bloqueado (verificar console) | ⬜ |
| 59 | Token JWT | Copiar token → expirar → tentar usar | Request bloqueado (401) | ⬜ |

---

## ⚡ 6. TESTES DE PERFORMANCE {#performance}

### 6.1 Carregamento
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 60 | Dashboard inicial | Abrir dashboard → medir tempo | Carrega em < 2 segundos | ⬜ |
| 61 | Lista de cotações (50 itens) | Ver página com 50+ cotações | Carrega em < 3 segundos | ⬜ |
| 62 | Pesquisa com filtros | Pesquisar + 3 filtros ativos | Resultado instantâneo (< 1s) | ⬜ |

**Como medir:**
```javascript
// DevTools Console:
performance.mark('start');
// Realizar ação (ex: carregar página)
performance.mark('end');
performance.measure('tempo', 'start', 'end');
console.table(performance.getEntriesByType('measure'));
```

### 6.2 Concurrent Users
| # | Teste | Procedimento | Resultado Esperado | ✅ |
|---|-------|--------------|-------------------|---|
| 63 | 3 usuários simultâneos | 3 abas diferentes → ações simultâneas | Sem conflitos | ⬜ |
| 64 | Realtime updates | Usuário A cria cotação → Usuário B atualiza dashboard | Aparece instantaneamente | ⬜ |

---

## ✅ 7. CHECKLIST FINAL {#checklist}

### 7.1 Pré-Lançamento
- [ ] **Todos os testes acima passaram** (mínimo 90% de sucesso)
- [ ] **Dados de teste removidos** (se necessário)
- [ ] **Configurações de produção ativas:**
  - [ ] OTP expiry configurado (1 hora)
  - [ ] Leaked password protection habilitada
  - [ ] PostgreSQL atualizado
  - [ ] SSL/HTTPS ativo
- [ ] **Backups configurados** (automáticos diários)
- [ ] **Monitoramento ativo** (Supabase Dashboard)
- [ ] **Documentação atualizada** (manual do usuário)
- [ ] **Plano de rollback** (caso encontre bugs críticos)

### 7.2 Comunicação com Clientes de Teste
```markdown
📧 EMAIL MODELO PARA CLIENTES DE TESTE:

Assunto: Convite para Testes Beta - QuoteMaster Pro

Olá [Nome do Cliente],

Você foi selecionado para participar dos testes beta do QuoteMaster Pro!

**Suas credenciais de acesso:**
- URL: https://[seu-dominio].com
- Email: [email]
- Senha temporária: [senha] (altere no primeiro acesso)

**O que testar:**
✅ Criar cotações e enviar para fornecedores
✅ Gerenciar produtos e estoque
✅ Aprovar cotações e processar pagamentos
✅ Gerar relatórios

**Reporte bugs aqui:**
📩 Email: suporte@seudominio.com
💬 WhatsApp: (71) 99999-0000

**Período de testes:** [Data início] a [Data fim]

Obrigado pela parceria!
```

### 7.3 Monitoramento Pós-Lançamento
| O que | Como | Frequência |
|-------|------|-----------|
| Erros de autenticação | Supabase Auth Logs | Diário |
| Queries lentas | Supabase Performance | Diário |
| RLS violations | Supabase Security Logs | Diário |
| Edge functions errors | Functions Logs | A cada interação |
| Feedback dos usuários | Email/WhatsApp | Contínuo |

---

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

### Problema: "Usuário não consegue ver cotações"
**Diagnóstico:**
1. Verificar se `client_id` está correto no perfil do usuário
2. Abrir Supabase → Table Editor → `profiles` → verificar linha do usuário
3. Verificar RLS policies da tabela `quotes`

**Solução:**
```sql
-- Corrigir client_id manualmente se necessário:
UPDATE profiles 
SET client_id = 'UUID_CORRETO'
WHERE id = 'USER_ID';
```

### Problema: "Fornecedor vê cotações de outros fornecedores"
**Diagnóstico:**
1. Verificar política RLS de `quotes`
2. Verificar se `selected_supplier_ids` está preenchido

**Solução:** Revisar função `current_user_can_see_quote()` no banco

### Problema: "Performance lenta"
**Diagnóstico:**
1. DevTools → Network → ver requests lentos
2. Supabase → Performance → identificar queries lentas

**Solução:** Adicionar índices nas tabelas problemáticas

---

## 📊 TEMPLATE DE RELATÓRIO DE TESTES

```markdown
# RELATÓRIO DE TESTES - [Data]

**Testador:** [Seu Nome]
**Ambiente:** [Produção/Staging]
**Versão:** [1.0.0]

## Resumo Executivo
- Total de testes: X
- Testes passados: Y (Z%)
- Testes falhados: W
- Bugs críticos encontrados: N

## Bugs Críticos 🚨
1. [Descrição] - Severidade: Alta/Média/Baixa
2. [Descrição]

## Bugs Menores
1. [Descrição]
2. [Descrição]

## Melhorias Sugeridas
- [Sugestão 1]
- [Sugestão 2]

## Recomendação
[ ] ✅ APROVADO para lançamento com clientes de teste
[ ] ⚠️ APROVADO COM RESSALVAS (corrigir bugs menores)
[ ] ❌ NÃO APROVADO (corrigir bugs críticos antes)
```

---

## 🎯 PRÓXIMOS PASSOS

1. **Execute todos os testes deste plano** (estimativa: 4-6 horas)
2. **Documente os resultados** no template acima
3. **Corrija bugs críticos** encontrados
4. **Crie 3-5 contas de teste** para clientes
5. **Configure monitoramento** no Supabase Dashboard
6. **Envie convites** para clientes de teste
7. **Acompanhe diariamente** os primeiros 7 dias

---

**Boa sorte nos testes! 🚀**

*Dúvidas? Consulte a documentação ou entre em contato com o suporte.*
