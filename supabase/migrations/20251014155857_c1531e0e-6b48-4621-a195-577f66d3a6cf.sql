-- Atualizar template de e-mail de cotação com layout premium e logomarca
UPDATE whatsapp_templates 
SET 
  message_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: ''Roboto'', Arial, sans-serif; margin: 0; padding: 0; background: #F5F5F5; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; }
    .header { 
      background: linear-gradient(135deg, {{primary_color}} 0%, {{accent_color}} 100%); 
      padding: 40px 30px; 
      text-align: center; 
    }
    .logo-container { margin-bottom: 15px; }
    .logo { max-height: 80px; width: auto; }
    .header-title { color: white; margin: 0; font-size: 28px; font-weight: 700; }
    .header-subtitle { color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px; font-weight: 400; }
    .content { padding: 40px 30px; color: #0F172A; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .highlight-box { 
      background: linear-gradient(to right, {{secondary_color}}, white); 
      padding: 25px; 
      border-radius: 12px; 
      margin: 25px 0; 
      border-left: 4px solid {{accent_color}};
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .highlight-box h3 { color: {{primary_color}}; margin: 0 0 15px 0; font-size: 20px; }
    .info-row { 
      margin: 10px 0; 
      padding: 8px 0; 
      border-bottom: 1px solid rgba(0,0,0,0.05);
      display: flex;
      justify-content: space-between;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #666; font-size: 14px; }
    .info-value { color: #0F172A; font-weight: 600; font-size: 14px; }
    .items-box { 
      background: white; 
      border: 1px solid #E5E5E5;
      border-left: 4px solid {{accent_color}}; 
      padding: 20px; 
      margin: 25px 0; 
      border-radius: 8px;
    }
    .items-box h4 { margin: 0 0 15px 0; color: {{primary_color}}; font-size: 16px; }
    .button { 
      background: linear-gradient(135deg, {{primary_color}} 0%, {{accent_color}} 100%);
      color: white !important; 
      padding: 16px 40px; 
      text-decoration: none; 
      display: inline-block; 
      border-radius: 8px; 
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s;
    }
    .button:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.2); }
    .warning-box { 
      background: linear-gradient(to right, #FFF9E6, white);
      border: 1px solid #FFE066; 
      border-left: 4px solid #FFA500;
      padding: 18px; 
      border-radius: 8px; 
      margin: 25px 0; 
    }
    .warning-box p { margin: 0; font-size: 14px; color: #664D00; }
    .contact-card {
      background: {{secondary_color}};
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .contact-card h4 { margin: 0 0 12px 0; color: {{primary_color}}; }
    .contact-item { margin: 8px 0; color: #0F172A; }
    .footer { 
      background: linear-gradient(to right, {{secondary_color}}, white);
      padding: 30px 20px; 
      text-align: center; 
      color: #666; 
      font-size: 13px; 
    }
    .footer strong { color: {{primary_color}}; font-size: 15px; }
    .badge { 
      display: inline-block;
      background: {{accent_color}};
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    }
    
    @media only screen and (max-width: 600px) {
      .content { padding: 30px 20px !important; }
      .header { padding: 30px 20px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
      .info-row { flex-direction: column; gap: 4px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <img src="{{system_logo}}" alt="{{company_name}}" class="logo" />
      </div>
      <h1 class="header-title">{{company_name}}</h1>
      <p class="header-subtitle">Sistema de Gestão de Cotações</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        <p style="margin: 0;">Olá <strong style="color: {{primary_color}};">{{supplier_name}}</strong> 👋</p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6;">
        <strong>{{client_name}}</strong> enviou uma nova solicitação de cotação através da nossa plataforma:
      </p>
      
      <div class="highlight-box">
        <h3>📋 {{quote_title}}</h3>
        <div class="info-row">
          <span class="info-label">Código da Cotação</span>
          <span class="info-value">{{quote_id}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">⏰ Prazo de Resposta</span>
          <span class="info-value">{{deadline_formatted}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">📦 Total de Itens</span>
          <span class="info-value">{{items_count}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">💰 Valor Estimado</span>
          <span class="info-value">{{total_formatted}}</span>
        </div>
      </div>
      
      <div class="items-box">
        <h4>📋 Itens Solicitados:</h4>
        <pre style="font-family: ''Courier New'', monospace; font-size: 13px; white-space: pre-wrap; margin: 0; color: #333; line-height: 1.8;">{{items_list}}</pre>
      </div>
      
      <p style="text-align: center; margin: 35px 0;">
        <a href="{{proposal_link}}" class="button">📤 ENVIAR MINHA PROPOSTA</a>
      </p>
      
      <div class="warning-box">
        <p>
          <strong>⏰ Atenção:</strong> Você tem até <strong>{{deadline_formatted}}</strong> para enviar sua proposta comercial.
        </p>
      </div>
      
      <div class="contact-card">
        <h4>📞 Informações de Contato do Cliente</h4>
        <div class="contact-item"><strong>Cliente:</strong> {{client_name}}</div>
        <div class="contact-item"><strong>📧 E-mail:</strong> {{client_email}}</div>
        <div class="contact-item"><strong>📱 Telefone:</strong> {{client_phone}}</div>
      </div>
      
      <hr style="border: none; border-top: 2px solid {{secondary_color}}; margin: 35px 0;">
      
      <p style="font-size: 13px; color: #666; text-align: center; line-height: 1.6;">
        Este é um e-mail automático. Utilize o link acima para enviar sua proposta através da plataforma.<br>
        Em caso de dúvidas, entre em contato diretamente com o cliente.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 8px 0;"><strong>{{company_name}}</strong></p>
      <p style="margin: 0;">{{footer_text}}</p>
    </div>
  </div>
</body>
</html>',
  updated_at = now()
WHERE template_type = 'email_quote_request' 
  AND (is_global = true OR client_id IS NULL);