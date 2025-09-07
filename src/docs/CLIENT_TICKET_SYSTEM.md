# Sistema de Tickets para Clientes

## Como usar

O sistema de tickets permite que clientes se comuniquem diretamente com a equipe de suporte através de mensagens organizadas.

### Funcionalidades Disponíveis

#### Para Clientes:
1. **Criar novos tickets** com anexos
2. **Enviar mensagens** nos tickets existentes
3. **Visualizar histórico** de todas as interações
4. **Acompanhar status** dos tickets (Novo, Aberto, Em Andamento, Resolvido, Fechado)

#### Para Administradores:
1. **Gerenciar todos os tickets** de todos os clientes
2. **Alterar status** dos tickets
3. **Atribuir tickets** para membros da equipe
4. **Enviar mensagens internas** (não visíveis para clientes)
5. **Enviar mensagens públicas** (visíveis para clientes)

### Como Acessar

1. Faça login no sistema
2. Acesse a página "Comunicação" no menu lateral
3. Clique na aba "Suporte"

### Como Criar um Ticket

1. Clique em "Novo Ticket"
2. Preencha o assunto e descrição
3. Selecione a prioridade e categoria
4. Anexe arquivos se necessário (máximo 10MB por arquivo)
5. Clique em "Criar Ticket"

### Como Enviar Mensagens

1. Clique em um ticket existente para abri-lo
2. Digite sua mensagem na área de texto
3. Anexe arquivos se necessário
4. Clique em "Enviar"

### Status dos Tickets

- **Novo**: Ticket recém-criado, aguardando primeira resposta
- **Aberto**: Ticket sendo processado pela equipe
- **Em Andamento**: Equipe está trabalhando na solução
- **Resolvido**: Problema foi resolvido, mas ticket ainda pode receber mensagens
- **Fechado**: Ticket finalizado, não aceita mais mensagens

### Anexos

- Suporte para arquivos de até 10MB
- Tipos aceitos: PDF, imagens, documentos
- Arquivos são armazenados de forma segura no Supabase Storage
- Acesso através de URLs assinadas para segurança

### Segurança

- Row Level Security (RLS) ativo
- Clientes só veem seus próprios tickets
- Anexos são privados e acessíveis apenas aos envolvidos
- Mensagens internas são visíveis apenas para a equipe

### Notificações

- Clientes recebem notificações quando há novas mensagens
- Status de tickets em tempo real
- Contadores de tickets ativos no dashboard