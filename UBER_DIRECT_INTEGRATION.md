# 🚕 Guia de Integração Uber Direct

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Configuração Inicial](#configuração-inicial)
3. [Webhooks](#webhooks)
4. [Uso pelo Fornecedor](#uso-pelo-fornecedor)
5. [Rastreamento pelo Cliente](#rastreamento-pelo-cliente)
6. [Testes](#testes)
7. [Solução de Problemas](#solução-de-problemas)

---

## 🎯 Visão Geral

A integração Uber Direct permite que fornecedores agendem entregas via Uber diretamente pela plataforma Cotiz, com rastreamento em tempo real para clientes.

### Recursos Implementados

- ✅ Obtenção de cotações de entrega em tempo real
- ✅ Criação de entregas via Uber
- ✅ Rastreamento em tempo real com localização do entregador
- ✅ Notificações automáticas de mudança de status
- ✅ Interface dual: entrega própria ou via Uber
- ✅ Webhooks para atualizações automáticas

---

## ⚙️ Configuração Inicial

### 1. Credenciais Uber Direct

No painel Admin do Cotiz:

1. Vá para **Admin → Integrações e APIs → Chaves de API**
2. Clique na aba **🚕 Uber Direct (Entregas)**
3. Preencha:
   - `UBER_CUSTOMER_ID`: ID do cliente (encontrado no dashboard Uber)
   - `UBER_CLIENT_ID`: Client ID da aplicação
   - `UBER_CLIENT_SECRET`: Client Secret da aplicação
   - `UBER_API_URL`: 
     - Sandbox: `https://sandbox-api.uber.com`
     - Produção: `https://api.uber.com`
4. Clique em **Salvar**

### 2. Edge Functions

As seguintes Edge Functions foram criadas automaticamente:

- `uber-delivery-quote`: Obter cotações
- `uber-delivery-create`: Criar entregas
- `uber-delivery-webhook`: Receber webhooks

---

## 🔔 Webhooks

### Configurar Webhook no Dashboard Uber

1. Acesse **https://direct.uber.com**
2. Vá para **Management → Developer → Webhooks**
3. Clique em **Add Webhook**
4. Configure:

```
URL: https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/uber-delivery-webhook
Events: Selecione todos os eventos de delivery
```

5. Clique em **Save**

### Eventos Suportados

O webhook escuta os seguintes eventos:

| Evento Uber | Status Interno | Notificação |
|------------|---------------|------------|
| `deliveries.delivery.created` | `scheduled` | Entrega Criada |
| `deliveries.delivery_status.en_route_to_pickup` | `in_transit` | Entregador a Caminho |
| `deliveries.delivery_status.at_pickup` | `in_transit` | Entregador no Local |
| `deliveries.delivery_status.en_route_to_dropoff` | `in_transit` | A Caminho do Destino |
| `deliveries.delivery_status.at_dropoff` | `in_transit` | Entregador no Destino |
| `deliveries.delivery_status.completed` | `delivered` | Entrega Concluída |
| `deliveries.delivery_status.canceled` | `cancelled` | Entrega Cancelada |
| `deliveries.delivery_status.returned` | `returned` | Entrega Devolvida |

---

## 📦 Uso pelo Fornecedor

### Agendar Entrega via Uber

1. Vá para **Entregas** no menu lateral
2. Localize uma entrega com status **"Aguardando"**
3. Clique em **"Agendar Entrega"**
4. Selecione a aba **"Entrega via Uber"**
5. Preencha:
   - **Origem (Coleta)**:
     - Endereço completo
     - Nome do responsável
     - Telefone
     - Instruções (opcional)
   - **Destino (Entrega)**:
     - Endereço completo
     - Nome do destinatário
     - Telefone
     - Instruções (opcional)
   - **Tamanho do Pacote**: Pequeno, Médio ou Grande
6. Clique em **"Obter Cotação"**
7. Revise o valor e tempo estimado
8. Clique em **"Confirmar Entrega"**

### Fluxo de Estados

```
[Aguardando] → [Cotação] → [Agendada] → [Em Trânsito] → [Entregue]
```

---

## 👁️ Rastreamento pelo Cliente

### Visualizar Entrega Uber

Clientes veem automaticamente o rastreamento Uber quando uma entrega é feita via Uber:

1. Vá para **Minhas Entregas**
2. Localize a entrega
3. O card mostrará:
   - Status em tempo real
   - Nome do entregador
   - Telefone do entregador
   - Botão para rastrear no site da Uber
   - Localização em tempo real (via link Uber)

### Atualizações em Tempo Real

O sistema usa **Supabase Realtime** para atualizar automaticamente:
- Status da entrega
- Informações do entregador
- Localização

Não é necessário recarregar a página.

---

## 🧪 Testes

### Sandbox (Recomendado para Testes)

1. Configure `UBER_API_URL` como `https://sandbox-api.uber.com`
2. Use endereços de teste da Uber:
   - **Pickup**: `1455 Market St, San Francisco, CA 94103, US`
   - **Dropoff**: `333 O'Farrell St, San Francisco, CA 94102, US`
3. Todas as entregas são simuladas
4. Webhooks funcionam normalmente
5. **Não há cobrança**

### Produção

1. Configure `UBER_API_URL` como `https://api.uber.com`
2. Use endereços reais
3. **Entregas são cobradas**
4. Certifique-se de ter saldo na conta Uber

---

## 🔧 Solução de Problemas

### "Credenciais Uber não configuradas"

**Solução**: Verifique se salvou as 4 credenciais no painel Admin

### "Falha na autenticação Uber"

**Solução**: 
- Verifique se o `Client Secret` está correto
- Certifique-se de que não há espaços extras

### "Falha ao obter cotação Uber"

**Possíveis causas**:
- Endereços inválidos ou incompletos
- Serviço Uber não disponível na região
- Formato incorreto do telefone

**Solução**:
- Use endereços completos com CEP
- Telefones no formato `+55 71 99999-0000`
- Verifique disponibilidade da Uber na região

### Webhook não está atualizando

**Solução**:
1. Verifique se o webhook está configurado corretamente no dashboard Uber
2. Confirme que a URL está acessível: `https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/uber-delivery-webhook`
3. Verifique logs da Edge Function:
   ```
   Admin → Ver Logs da Edge Function uber-delivery-webhook
   ```

### Entrega criada mas sem rastreamento

**Solução**:
- Aguarde alguns segundos, o webhook pode demorar
- Verifique se o webhook foi recebido nos logs
- Confirme que os eventos estão habilitados no dashboard Uber

---

## 📞 Suporte

### Logs e Debugging

Para investigar problemas, verifique os logs das Edge Functions:

1. Acesse o Supabase Dashboard
2. Vá para **Edge Functions**
3. Selecione a função:
   - `uber-delivery-quote` (cotações)
   - `uber-delivery-create` (criação)
   - `uber-delivery-webhook` (webhooks)
4. Clique em **Logs**

### Contatos Úteis

- **Documentação Uber Direct**: https://developer.uber.com/docs/deliveries
- **Suporte Uber**: https://help.uber.com/partners/direct
- **Suporte Cotiz**: Abra um ticket no menu de Suporte

---

## 🚀 Próximos Passos

### Recursos Futuros (Planejados)

- [ ] Cancelamento de entregas via Uber
- [ ] Reprogramação de entregas
- [ ] Histórico completo de rastreamento
- [ ] Mapa integrado no painel (Google Maps)
- [ ] Estimativa de custo antes de criar cotação
- [ ] Relatórios de custos de entregas Uber
- [ ] Múltiplos pacotes por entrega

---

## ✅ Checklist de Go-Live

Antes de ativar em produção:

- [ ] Testado com múltiplas entregas em Sandbox
- [ ] Webhooks funcionando corretamente
- [ ] Credenciais de produção configuradas
- [ ] Saldo disponível na conta Uber
- [ ] Equipe treinada para usar a funcionalidade
- [ ] Clientes notificados sobre nova opção de entrega
- [ ] Monitoramento de custos configurado

---

**Última atualização**: 2025-10-17  
**Versão**: 1.0.0
