# Padrões de Dados do Cotiz

## 📋 Especialidades de Fornecedores

### Fonte Canônica
**Arquivo:** `src/components/common/SpecialtiesInput.tsx`  
**Constante:** `STANDARD_SPECIALTIES`

### Lista Oficial (28 categorias)
1. Materiais de Construção
2. Produtos de Limpeza
3. Elétrica e Iluminação
4. Ferramentas
5. Jardinagem e Paisagismo
6. Serviços de Manutenção
7. Segurança Patrimonial
8. Alimentação e Bebidas
9. Móveis e Decoração
10. Pintura e Acabamento
11. Hidráulica e Saneamento
12. Climatização
13. Equipamentos de Proteção
14. Materiais de Escritório
15. Tecnologia e Informática
16. Marcenaria
17. Alvenaria
18. Serviços Gerais

### ⚠️ IMPORTANTE - Regras de Uso

#### ✅ SEMPRE FAZER:
- **Importar** `STANDARD_SPECIALTIES` de `@/components/common/SpecialtiesInput`
- **Usar** o componente `SpecialtiesInput` para seleção de especialidades
- **Validar** que especialidades customizadas sejam claras e específicas
- **Revisar** novas categorias com equipe de UX/Produto antes de adicionar

#### ❌ NUNCA FAZER:
- **Criar** listas duplicadas em outros arquivos
- **Hardcodar** especialidades diretamente em componentes
- **Modificar** `STANDARD_SPECIALTIES` sem aprovação da equipe
- **Adicionar** especialidades genéricas ou redundantes

### Uso Correto

#### ✅ Correto - Importar lista padrão
```typescript
import { STANDARD_SPECIALTIES } from '@/components/common/SpecialtiesInput';

// Usar em select, filters, etc.
const options = STANDARD_SPECIALTIES.map(s => ({ label: s, value: s }));
```

#### ✅ Correto - Usar componente dedicado
```typescript
import { SpecialtiesInput } from '@/components/common/SpecialtiesInput';

<SpecialtiesInput
  value={selectedSpecialties}
  onChange={setSelectedSpecialties}
  maxSelections={10}
  allowCustom={true}
/>
```

#### ❌ Errado - Criar arrays locais
```typescript
// NÃO FAZER ISSO!
const mySpecialties = ['Limpeza', 'Jardinagem'];
```

#### ❌ Errado - Especialidades hardcoded
```typescript
// NÃO FAZER ISSO!
{['Limpeza', 'Elétrica', 'Pintura'].map(s => <Option key={s}>{s}</Option>)}
```

### Validação e Qualidade

#### Frontend
- **Componente:** `SpecialtiesInput` limita seleção a `STANDARD_SPECIALTIES` + customizações controladas
- **Validação:** Campo obrigatório em cadastros de fornecedores
- **Limite:** Máximo de 10 especialidades por fornecedor

#### Backend (Supabase)
- **Coluna:** `suppliers.specialties` (tipo: `text[]`)
- **Validação:** Trigger `validate_specialties()` loga especialidades não-padrão para análise
- **RLS:** Políticas garantem isolamento multi-tenant

#### Testes Automatizados
Arquivo: `tests/data-consistency.test.ts`
- Verifica que `supplierSpecialties` aponta para `STANDARD_SPECIALTIES`
- Detecta duplicatas na lista canônica
- Valida quantidade de especialidades (10-50)

### Adicionando Novas Especialidades

**Processo obrigatório:**

1. **Discussão com Produto/UX**
   - Validar necessidade real
   - Evitar redundância com categorias existentes
   - Garantir nomenclatura clara

2. **Modificação do código**
   ```typescript
   // src/components/common/SpecialtiesInput.tsx
   export const STANDARD_SPECIALTIES = [
     // ... especialidades existentes
     'Nova Especialidade',  // Adicionar aqui
   ];
   ```

3. **Atualizar documentação**
   - Atualizar este arquivo (DATA_STANDARDS.md)
   - Registrar no CHANGELOG.md

4. **Migração de dados (se necessário)**
   ```sql
   -- Exemplo: renomear especialidade antiga
   UPDATE public.suppliers
   SET specialties = array_replace(specialties, 'Nome Antigo', 'Nome Novo')
   WHERE 'Nome Antigo' = ANY(specialties);
   ```

5. **Comunicação ao time**
   - Informar desenvolvedores
   - Atualizar treinamento de usuários

### Diagnóstico de Inconsistências

#### Query: Especialidades órfãs (não-padrão)
```sql
WITH standard_list AS (
  SELECT unnest(ARRAY[
    'Materiais de Construção',
    'Produtos de Limpeza',
    -- ... (lista completa)
  ]) as standard_specialty
)
SELECT DISTINCT unnest(s.specialties) as orphan_specialty,
       COUNT(*) as supplier_count
FROM public.suppliers s
WHERE s.specialties IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM standard_list 
    WHERE standard_list.standard_specialty = ANY(s.specialties)
  )
GROUP BY orphan_specialty
ORDER BY supplier_count DESC;
```

#### Query: Distribuição de uso
```sql
SELECT 
  unnest(specialties) as specialty,
  COUNT(*) as supplier_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM suppliers WHERE specialties IS NOT NULL), 1) as percentage
FROM public.suppliers
WHERE specialties IS NOT NULL
GROUP BY unnest(specialties)
ORDER BY supplier_count DESC;
```

### Multi-Tenant e Segurança

- **Isolamento:** Especialidades são visíveis por escopo (cliente/administradora)
- **RLS:** Políticas garantem que fornecedores vejam apenas seus dados
- **Logging:** Sistema rastreia distribuição de especialidades por `clientId`
- **Auditoria:** Mudanças em especialidades são registradas em `audit_logs`

### Histórico de Alterações

| Data | Versão | Alteração | Autor |
|------|--------|-----------|-------|
| 2025-01-20 | 1.0 | Criação do documento | Sistema |
| 2025-01-20 | 1.1 | Unificação com `STANDARD_SPECIALTIES` | Sistema |

---

## 📚 Outros Padrões de Dados

### Status de Fornecedores
Enum: `'active' | 'inactive' | 'pending' | 'suspended'`

### Tipos de Fornecedores
Enum: `'local' | 'global' | 'certified'`

### Visibilidade
Enum: `'region' | 'global'`

---

**Última atualização:** 2025-01-20  
**Próxima revisão:** 2025-04-20
