# 🎯 Funcionalidade Implementada: Filtro de Fornecedores Certificados

## ✅ **O que foi implementado:**

### 1. **Campo `supplier_scope` na tabela quotes**
- Adicionado campo que armazena a preferência do cliente: `'local'` ou `'all'`
- Valor padrão: `'local'` (apenas fornecedores cadastrados pelo cliente)

### 2. **Modificações no CreateQuoteModalSupabase**
- O campo `supplierScope` agora é salvo na cotação quando criada
- Permite ao cliente escolher entre:
  - **"Apenas Locais"**: Fornecedores cadastrados pelo próprio cliente
  - **"Locais + Certificados"**: Inclui fornecedores verificados pelo sistema

### 3. **Modificações no SendQuoteToSuppliersModal**
- Respeita a configuração `supplier_scope` da cotação
- Filtra fornecedores baseado na preferência salva
- Mostra aviso visual quando apenas fornecedores locais estão sendo exibidos

## 🔄 **Como funciona:**

### **Fluxo de Criação da Cotação:**
1. Cliente cria nova cotação
2. **Passo 3 - Seleção de Fornecedores:**
   - Cliente escolhe: "Apenas Locais" OU "Locais + Certificados"
3. Preferência é salva no campo `supplier_scope` da cotação

### **Fluxo de Envio da Cotação:**
1. Cliente clica em "Enviar para Fornecedores"
2. Sistema verifica o `supplier_scope` da cotação:
   - Se `'local'`: Mostra apenas fornecedores com `client_id != null`
   - Se `'all'`: Mostra todos os fornecedores ativos
3. Interface mostra aviso quando filtro está ativo

## 🎨 **Interface Visual:**

### **No Modal de Envio:**
- ⚠️ **Aviso amarelo**: "Mostrando apenas fornecedores locais conforme configuração da cotação"
- **Mensagem vazia**: "Nenhum fornecedor local encontrado para esta cotação"
- **Badges**: 🏆 Certificado (para fornecedores globais)

### **No Modal de Criação:**
- **Checkbox**: "Apenas Locais" vs "Locais + Certificados"
- **Descrição**: Explica a diferença entre os tipos

## 🧪 **Como testar:**

1. **Criar cotação com "Apenas Locais":**
   - Vá em /quotes → Nova Cotação
   - Preencha dados e itens
   - **No Passo 3**: Marque "Apenas Locais"
   - Finalize a cotação

2. **Tentar enviar:**
   - Clique em "Enviar para Fornecedores"
   - **Resultado**: Só aparecerão fornecedores locais (cadastrados pelo cliente)

3. **Criar cotação com "Locais + Certificados":**
   - Repita o processo
   - **No Passo 3**: Marque "Locais + Certificados"
   - **Resultado**: Aparecerão todos os fornecedores (locais + certificados)

## 📊 **Estados da Funcionalidade:**

| Configuração | Fornecedores Exibidos | Badge Visual |
|-------------|----------------------|--------------|
| `'local'` | Apenas locais (client_id != null) | ⚠️ Aviso amarelo |
| `'all'` | Locais + Certificados | Normal |
| Não definido | Todos (comportamento padrão) | Normal |

## ✨ **Benefícios:**

1. **Controle do Cliente**: Decide quais tipos de fornecedores quer incluir
2. **Transparência**: Vê claramente quando filtro está ativo
3. **Flexibilidade**: Pode mudar a preferência a cada cotação
4. **Retrocompatibilidade**: Cotações antigas funcionam normalmente

A funcionalidade está **100% operacional** e segue a regra solicitada: **apenas empresas certificadas aparecem se o cliente tiver selecionado essa opção anteriormente**.