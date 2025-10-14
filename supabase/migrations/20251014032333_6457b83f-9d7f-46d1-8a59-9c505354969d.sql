-- Inserir templates HTML de e-mail com branding

-- Template: Email Quote Request (Solicitação de Cotação)
INSERT INTO whatsapp_templates (
  name,
  template_type,
  subject,
  message_content,
  active,
  is_global,
  is_default,
  variables
) VALUES (
  'Solicitação de Cotação - E-mail Corporativo',
  'email_quote_request',
  'Nova Cotação: {{quote_title}} - {{client_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: ''Roboto'', Arial, sans-serif; margin: 0; padding: 0; background: #F5F5F5; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; }
    .header { background: {{primary_color}}; padding: 30px; text-align: center; }
    .logo { max-height: 60px; width: auto; }
    .header-title { color: white; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; color: #0F172A; }
    .highlight-box { background: #F5F5F5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .highlight-box h3 { color: {{primary_color}}; margin-top: 0; }
    .items-box { background: white; border-left: 4px solid {{accent_color}}; padding: 15px; margin: 20px 0; }
    .button { background: {{primary_color}}; color: white; padding: 14px 28px; text-decoration: none; display: inline-block; border-radius: 6px; font-weight: 600; }
    .warning-box { background: #FFF9E6; border: 1px solid #FFE066; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { background: #F5F5F5; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    .info-row { margin: 8px 0; }
    
    @media only screen and (max-width: 600px) {
      .content { padding: 30px 20px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="header-title">{{company_name}}</h1>
    </div>
    
    <div class="content">
      <h2 style="color: {{primary_color}}; margin-top: 0;">Nova Solicitação de Cotação</h2>
      
      <p>Olá <strong>{{supplier_name}}</strong>,</p>
      
      <p><strong>{{client_name}}</strong> solicita uma cotação para o seguinte projeto:</p>
      
      <div class="highlight-box">
        <h3>📋 {{quote_title}}</h3>
        <div class="info-row"><strong>Código:</strong> {{quote_id}}</div>
        <div class="info-row"><strong>Prazo:</strong> {{deadline_formatted}}</div>
        <div class="info-row"><strong>Total de Itens:</strong> {{items_count}}</div>
        <div class="info-row"><strong>Estimativa:</strong> {{total_formatted}}</div>
      </div>
      
      <div class="items-box">
        <h4 style="margin-top: 0; color: #333;">Itens da Cotação:</h4>
        <pre style="font-family: monospace; font-size: 13px; white-space: pre-wrap; margin: 0;">{{items_list}}</pre>
      </div>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{proposal_link}}" class="button">📤 Enviar Proposta</a>
      </p>
      
      <div class="warning-box">
        <p style="margin: 0; font-size: 14px;">
          ⏰ <strong>Atenção:</strong> Você tem até <strong>{{deadline_formatted}}</strong> para enviar sua proposta.
        </p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 30px 0;">
      
      <p style="font-size: 14px; color: #666;">
        <strong>Dados do Cliente:</strong><br>
        📧 {{client_email}}<br>
        {{#if client_phone}}📱 {{client_phone}}{{/if}}
      </p>
    </div>
    
    <div class="footer">
      <p><strong>{{company_name}}</strong></p>
      <p>{{footer_text}}</p>
    </div>
  </div>
</body>
</html>',
  true,
  true,
  true,
  '{"supplier_name": "Nome do fornecedor", "client_name": "Nome do cliente", "client_email": "cliente@email.com", "client_phone": "+55 71 99999-0000", "quote_title": "Compra de Material de Limpeza", "quote_id": "RFQ01", "deadline_formatted": "31/12/2025 18:00", "items_count": "5", "items_list": "• Detergente - Qtd: 10 - R$ 50,00\n• Sabão - Qtd: 5 - R$ 25,00", "total_formatted": "R$ 1.250,00", "proposal_link": "https://link.com", "company_name": "QuoteMaster Pro", "primary_color": "#003366", "accent_color": "#0066CC", "footer_text": "© 2025 QuoteMaster Pro"}'::jsonb
) ON CONFLICT DO NOTHING;

-- Template: Email Supplier Invite (Convite de Fornecedor)
INSERT INTO whatsapp_templates (
  name,
  template_type,
  subject,
  message_content,
  active,
  is_global,
  is_default,
  variables
) VALUES (
  'Convite de Cadastro - E-mail',
  'email_supplier_invite',
  '{{client_name}} convidou você para o {{company_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: ''Roboto'', Arial, sans-serif; margin: 0; padding: 0; background: #F5F5F5; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; }
    .header { background: {{primary_color}}; padding: 30px; text-align: center; }
    .header-title { color: white; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; color: #0F172A; }
    .gradient-box { background: linear-gradient(135deg, {{primary_color}}, {{accent_color}}); padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center; color: white; }
    .button { background: {{primary_color}}; color: white; padding: 16px 32px; text-decoration: none; display: inline-block; border-radius: 6px; font-weight: 600; font-size: 16px; }
    .benefits-list { line-height: 1.8; }
    .footer { background: #F5F5F5; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    
    @media only screen and (max-width: 600px) {
      .content { padding: 30px 20px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="header-title">{{company_name}}</h1>
    </div>
    
    <div class="content">
      <h2 style="color: {{primary_color}}; margin-top: 0;">Convite para Parceria</h2>
      
      <p>Olá <strong>{{supplier_name}}</strong>,</p>
      
      <p><strong>{{client_name}}</strong> gostaria de trabalhar com você e convidou sua empresa para fazer parte de nossa plataforma de cotações.</p>
      
      <div class="gradient-box">
        <h3 style="margin: 0 0 10px 0; font-size: 24px;">✨ Bem-vindo ao {{company_name}}</h3>
        <p style="margin: 0; font-size: 16px;">Complete seu cadastro e comece a receber cotações</p>
      </div>
      
      <h3 style="color: {{primary_color}};">🎯 Benefícios da Plataforma:</h3>
      <ul class="benefits-list">
        <li>✅ <strong>Acesso a múltiplas cotações</strong> de empresas verificadas</li>
        <li>✅ <strong>Gestão simplificada</strong> de todas as suas propostas</li>
        <li>✅ <strong>Histórico completo</strong> de negociações</li>
        <li>✅ <strong>Sistema de reputação</strong> para destacar seu trabalho</li>
        <li>✅ <strong>Notificações em tempo real</strong></li>
      </ul>
      
      <p style="text-align: center; margin: 35px 0;">
        <a href="{{registration_link}}" class="button">🚀 Completar Cadastro</a>
      </p>
      
      <p style="font-size: 14px; color: #666; text-align: center;">
        O cadastro leva menos de 2 minutos
      </p>
    </div>
    
    <div class="footer">
      <p><strong>{{company_name}}</strong></p>
      <p>{{footer_text}}</p>
    </div>
  </div>
</body>
</html>',
  true,
  true,
  true,
  '{"supplier_name": "Fornecedor Alpha", "client_name": "Condomínio Azul", "company_name": "QuoteMaster Pro", "registration_link": "https://link.com/register", "primary_color": "#003366", "accent_color": "#0066CC", "footer_text": "© 2025 QuoteMaster Pro"}'::jsonb
) ON CONFLICT DO NOTHING;

-- Template: Email Payment Confirmation (Confirmação de Pagamento)
INSERT INTO whatsapp_templates (
  name,
  template_type,
  subject,
  message_content,
  active,
  is_global,
  is_default,
  variables
) VALUES (
  'Confirmação de Pagamento - E-mail',
  'email_payment_confirmation',
  'Pagamento Confirmado - {{quote_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: ''Roboto'', Arial, sans-serif; margin: 0; padding: 0; background: #F5F5F5; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; }
    .header { background: {{primary_color}}; padding: 30px; text-align: center; }
    .header-title { color: white; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; color: #0F172A; }
    .success-banner { text-align: center; padding: 20px; background: linear-gradient(135deg, #10B981, #059669); border-radius: 8px; color: white; margin-bottom: 30px; }
    .details-box { background: #F5F5F5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .details-table { width: 100%; border-collapse: collapse; }
    .details-table td { padding: 8px 0; }
    .info-box { background: #E0F2FE; border-left: 4px solid #0284C7; padding: 15px; margin: 20px 0; color: #0C4A6E; }
    .button { background: {{primary_color}}; color: white; padding: 14px 28px; text-decoration: none; display: inline-block; border-radius: 6px; font-weight: 600; }
    .footer { background: #F5F5F5; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    
    @media only screen and (max-width: 600px) {
      .content { padding: 30px 20px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="header-title">{{company_name}}</h1>
    </div>
    
    <div class="content">
      <div class="success-banner">
        <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
        <h2 style="margin: 0; font-size: 28px;">Pagamento Confirmado!</h2>
      </div>
      
      <p>Olá <strong>{{client_name}}</strong>,</p>
      
      <p>Confirmamos o recebimento do pagamento da cotação <strong>{{quote_title}}</strong>.</p>
      
      <div class="details-box">
        <h3 style="color: {{primary_color}}; margin-top: 0;">💰 Detalhes do Pagamento</h3>
        <table class="details-table">
          <tr>
            <td style="color: #666;"><strong>Cotação:</strong></td>
            <td style="text-align: right;">{{quote_title}}</td>
          </tr>
          <tr>
            <td style="color: #666;"><strong>Valor:</strong></td>
            <td style="text-align: right; font-size: 20px; font-weight: bold; color: {{primary_color}};">{{amount}}</td>
          </tr>
          <tr>
            <td style="color: #666;"><strong>ID do Pagamento:</strong></td>
            <td style="text-align: right;">{{payment_id}}</td>
          </tr>
          <tr>
            <td style="color: #666;"><strong>Data:</strong></td>
            <td style="text-align: right;">{{payment_date}}</td>
          </tr>
        </table>
      </div>
      
      <div class="info-box">
        <p style="margin: 0;">
          <strong>📦 Próximos Passos:</strong><br>
          O fornecedor foi notificado e iniciará o processo de entrega conforme acordado.
        </p>
      </div>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{view_link}}" class="button">Ver Detalhes da Cotação</a>
      </p>
    </div>
    
    <div class="footer">
      <p><strong>{{company_name}}</strong></p>
      <p>{{footer_text}}</p>
    </div>
  </div>
</body>
</html>',
  true,
  true,
  true,
  '{"client_name": "Condomínio Azul", "quote_title": "Compra de Material", "amount": "R$ 1.250,00", "payment_id": "PG001", "payment_date": "31/12/2025 14:30", "view_link": "https://link.com", "company_name": "QuoteMaster Pro", "primary_color": "#003366", "accent_color": "#0066CC", "footer_text": "© 2025 QuoteMaster Pro"}'::jsonb
) ON CONFLICT DO NOTHING;