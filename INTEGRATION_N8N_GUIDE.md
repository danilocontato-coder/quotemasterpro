# Guia de Integração N8N - Envio de Cotações

Este guia explica como configurar o N8N para receber cotações do QuoteMaster Pro e enviar via WhatsApp e E-mail para fornecedores.

## 🚀 Configuração Inicial

### 1. Webhook N8N
Crie um novo workflow no N8N e adicione um nó **Webhook**:

- **URL**: Copie a URL gerada (ex: `https://seu-n8n.app.n8n.cloud/webhook/quote-sender`)
- **Método**: POST
- **Autenticação**: Opcional

### 2. Estrutura dos Dados Recebidos

O webhook receberá um JSON com a seguinte estrutura:

```json
{
  "quote": {
    "id": "quote-123",
    "title": "Materiais de Construção Q1",
    "description": "Cotação para materiais básicos",
    "total": 1500.50,
    "deadline": "2024-02-15T10:00:00Z",
    "created_at": "2024-01-15T10:00:00Z",
    "items": [
      {
        "product_name": "Cimento Portland",
        "quantity": 10,
        "unit_price": 25.50,
        "total": 255.00
      }
    ]
  },
  "client": {
    "name": "Condomínio Azul",
    "email": "admin@condominioazul.com",
    "phone": "+55 11 99999-0000",
    "cnpj": "12.345.678/0001-90"
  },
  "suppliers": [
    {
      "id": "sup-1",
      "name": "Fornecedor Alpha",
      "email": "contato@alpha.com",
      "phone": "+55 11 88888-1111",
      "whatsapp": "+5511888881111"
    }
  ],
  "settings": {
    "send_whatsapp": true,
    "send_email": true,
    "custom_message": "Nova cotação disponível..."
  },
  "timestamp": "2024-01-15T10:00:00Z",
  "platform": "QuoteMaster Pro"
}
```

## 📧 Configuração do E-mail

### 1. Adicionar Nó Split In Batches
- **Batch Size**: 1
- **Conecte**: Webhook → Split In Batches

### 2. Adicionar Nó Function (Preparar E-mail)
```javascript
// Preparar dados do e-mail
const quote = $json.quote;
const client = $json.client;
const supplier = $json.suppliers[0]; // Batch processará um por vez
const settings = $json.settings;

// Criar template do e-mail
const emailContent = `
<h2>Nova Cotação Disponível</h2>
<p><strong>Fornecedor:</strong> ${supplier.name}</p>
<p><strong>Cliente:</strong> ${client.name}</p>

<h3>Detalhes da Cotação:</h3>
<p><strong>Título:</strong> ${quote.title}</p>
<p><strong>Descrição:</strong> ${quote.description}</p>
<p><strong>Total Estimado:</strong> R$ ${quote.total?.toFixed(2) || 'A calcular'}</p>
<p><strong>Prazo:</strong> ${quote.deadline ? new Date(quote.deadline).toLocaleDateString('pt-BR') : 'A definir'}</p>

<h3>Itens da Cotação:</h3>
<table border="1" style="border-collapse: collapse; width: 100%;">
  <tr>
    <th>Produto</th>
    <th>Quantidade</th>
    <th>Preço Unit.</th>
    <th>Total</th>
  </tr>
  ${quote.items.map(item => `
    <tr>
      <td>${item.product_name}</td>
      <td>${item.quantity}</td>
      <td>R$ ${item.unit_price?.toFixed(2) || '0,00'}</td>
      <td>R$ ${item.total?.toFixed(2) || '0,00'}</td>
    </tr>
  `).join('')}
</table>

<p><strong>Mensagem Personalizada:</strong></p>
<p>${settings.custom_message}</p>

<hr>
<p><em>Enviado via QuoteMaster Pro</em></p>
`;

return {
  to: supplier.email,
  subject: `Nova Cotação: ${quote.title}`,
  html: emailContent,
  supplier: supplier,
  quote: quote
};
```

### 3. Adicionar Nó Send Email
- **From Email**: seu-email@empresa.com
- **To Email**: `{{ $json.to }}`
- **Subject**: `{{ $json.subject }}`
- **Email Format**: HTML
- **HTML**: `{{ $json.html }}`

## 📱 Configuração do WhatsApp

### 1. Adicionar Nó IF (Verificar WhatsApp)
- **Condition**: `{{ $json.settings.send_whatsapp === true && $json.supplier.whatsapp }}`

### 2. Adicionar Nó Function (Preparar WhatsApp)
```javascript
const quote = $json.quote;
const client = $json.client;
const supplier = $json.supplier;
const settings = $json.settings;

// Criar mensagem do WhatsApp (mais concisa)
const whatsappMessage = `🔔 *Nova Cotação Disponível*

👋 Olá, ${supplier.name}!

📋 *${quote.title}*
${quote.description}

💰 *Total Estimado:* R$ ${quote.total?.toFixed(2) || 'A calcular'}
📅 *Prazo:* ${quote.deadline ? new Date(quote.deadline).toLocaleDateString('pt-BR') : 'A definir'}

📦 *Itens:*
${quote.items.map(item => 
  `• ${item.product_name} - Qtd: ${item.quantity}`
).join('\n')}

💬 *Mensagem:*
${settings.custom_message}

👤 *Cliente:* ${client.name}
📧 *Contato:* ${client.email}

---
_Cotação enviada via QuoteMaster Pro_`;

return {
  phone: supplier.whatsapp,
  message: whatsappMessage,
  supplier: supplier
};
```

### 3. Adicionar Nó HTTP Request (WhatsApp API)
Configure para sua API de WhatsApp preferida:

**Exemplo com Evolution API:**
- **Method**: POST
- **URL**: `https://sua-evolution-api.com/message/sendText/instance`
- **Headers**: 
  ```json
  {
    "Content-Type": "application/json",
    "apikey": "sua-api-key"
  }
  ```
- **Body**:
  ```json
  {
    "number": "{{ $json.phone }}",
    "text": "{{ $json.message }}"
  }
  ```

## 🔄 Fluxo Completo do Workflow

```
Webhook → Split In Batches → Function (Prep Email) → Send Email
                           → IF (WhatsApp?) → Function (Prep WhatsApp) → HTTP Request (WhatsApp)
```

## ⚙️ Configurações Adicionais

### 1. Logs e Notificações
Adicione nós para:
- Salvar logs de envio
- Notificar administradores sobre erros
- Salvar estatísticas de envio

### 2. Validações
- Verificar se e-mail/WhatsApp são válidos
- Validar dados da cotação
- Tratar erros de envio

### 3. Rate Limiting
- Adicionar delays entre envios
- Controlar volume de mensagens

## 🚨 Solução de Problemas

### Webhook não recebe dados
1. Verifique se a URL do webhook está correta no QuoteMaster Pro
2. Teste o webhook manualmente com Postman
3. Verifique os logs do N8N

### E-mails não enviados
1. Configure corretamente as credenciais SMTP
2. Verifique se os e-mails dos fornecedores são válidos
3. Teste com um e-mail conhecido primeiro

### WhatsApp não funciona
1. Verifique se a API do WhatsApp está funcionando
2. Confirme se os números estão no formato internacional
3. Teste o endpoint da API separadamente

## 📝 Exemplo de Teste

Use este JSON para testar seu workflow:

```json
{
  "quote": {
    "id": "test-123",
    "title": "Teste de Cotação",
    "description": "Cotação de teste",
    "total": 100.00,
    "deadline": "2024-02-15T10:00:00Z",
    "items": [
      {
        "product_name": "Produto Teste",
        "quantity": 1,
        "unit_price": 100.00,
        "total": 100.00
      }
    ]
  },
  "client": {
    "name": "Cliente Teste",
    "email": "teste@cliente.com",
    "phone": "+55 11 99999-0000"
  },
  "suppliers": [
    {
      "name": "Fornecedor Teste",
      "email": "seu-email@teste.com",
      "whatsapp": "+5511999999999"
    }
  ],
  "settings": {
    "send_whatsapp": true,
    "send_email": true,
    "custom_message": "Esta é uma mensagem de teste."
  }
}
```

## 🔗 Links Úteis

- [Documentação N8N](https://docs.n8n.io/)
- [Evolution API WhatsApp](https://doc.evolution-api.com/)
- [Configurar SMTP no N8N](https://docs.n8n.io/nodes/n8n-nodes-base.emailSend/)

---

*Este guia foi criado para o QuoteMaster Pro. Para suporte adicional, consulte a documentação da plataforma.*