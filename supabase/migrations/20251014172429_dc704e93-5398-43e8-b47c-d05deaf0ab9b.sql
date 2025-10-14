-- Redesign profissional do template de convite para fornecedores
UPDATE public.whatsapp_templates
SET 
  message_content = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite Exclusivo - {{company_name}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; background-color: #F5F5F5; }
    .email-container { max-width: 600px; margin: 0 auto; background: white; }
    
    .header { background: linear-gradient(135deg, {{primary_color}} 0%, {{accent_color}} 100%); padding: 40px 30px; text-align: center; }
    .logo-container { margin-bottom: 20px; }
    .logo { max-height: 80px; width: auto; }
    .header-title { color: white; font-size: 28px; font-weight: 700; margin: 15px 0 5px; }
    .header-subtitle { color: rgba(255,255,255,0.9); font-size: 14px; }
    
    .content { padding: 40px 30px; }
    .greeting { font-size: 18px; color: #0F172A; margin-bottom: 25px; }
    
    .exclusive-badge { display: inline-block; background: {{accent_color}}; color: white; padding: 8px 20px; border-radius: 25px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin: 20px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    
    .client-info-card { background: linear-gradient(to right, {{secondary_color}}, white); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 5px solid {{primary_color}}; box-shadow: 0 3px 10px rgba(0,0,0,0.06); }
    .client-info-card h3 { color: #0F172A; font-size: 20px; margin-bottom: 10px; font-weight: 700; }
    .client-info-card p { color: #475569; font-size: 15px; }
    
    .welcome-box { background: linear-gradient(to right, {{secondary_color}}, white); padding: 35px; border-radius: 12px; margin: 30px 0; border-left: 5px solid {{accent_color}}; box-shadow: 0 4px 15px rgba(0,0,0,0.08); text-align: center; }
    .welcome-box h2 { color: #0F172A; font-size: 24px; font-weight: 700; margin-bottom: 12px; }
    .welcome-box p { color: #475569; font-size: 16px; margin-bottom: 20px; }
    .quote-preview { background: white; padding: 18px; border-radius: 8px; margin-top: 20px; border: 1px solid #E5E5E5; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .quote-preview strong { color: {{primary_color}}; display: block; margin-bottom: 8px; font-size: 14px; }
    .quote-preview span { color: #0F172A; font-size: 16px; font-weight: 600; }
    
    .section-title { color: #0F172A; font-size: 20px; font-weight: 700; margin: 35px 0 20px; }
    
    .benefits-grid { display: grid; gap: 15px; margin: 25px 0; }
    .benefit-card { background: white; border: 1px solid #E5E5E5; border-left: 4px solid {{accent_color}}; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s; }
    .benefit-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .benefit-icon { font-size: 32px; margin-bottom: 12px; }
    .benefit-card h4 { color: #0F172A; font-size: 16px; font-weight: 700; margin-bottom: 8px; }
    .benefit-card p { color: #64748B; font-size: 14px; line-height: 1.5; }
    
    .cta-container { text-align: center; margin: 45px 0; }
    .cta-button { background: linear-gradient(135deg, {{primary_color}} 0%, {{accent_color}} 100%); color: white !important; padding: 18px 45px; text-decoration: none; display: inline-block; border-radius: 10px; font-weight: 700; font-size: 18px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); transition: transform 0.2s, box-shadow 0.2s; }
    .cta-button:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
    
    .info-box { background: #F8F9FA; padding: 25px; border-radius: 10px; margin: 30px 0; border: 1px solid #E5E5E5; }
    .info-box p { color: #475569; font-size: 15px; margin: 10px 0; display: flex; align-items: center; }
    .info-box p strong { color: #0F172A; margin-left: 8px; }
    
    .footer { background: linear-gradient(to right, {{secondary_color}}, white); padding: 35px 30px; text-align: center; border-top: 3px solid {{primary_color}}; }
    .footer p { color: #64748B; font-size: 13px; margin: 8px 0; }
    .footer strong { color: #0F172A; font-size: 15px; }
    
    @media only screen and (max-width: 600px) {
      .content { padding: 25px 20px; }
      .header { padding: 30px 20px; }
      .header-title { font-size: 24px; }
      .welcome-box { padding: 25px; }
      .cta-button { padding: 16px 35px; font-size: 16px; }
      .benefit-card { padding: 15px; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header com gradiente e logo -->
    <div class="header">
      <div class="logo-container">
        <img src="{{system_logo}}" alt="{{company_name}}" class="logo" onerror="this.style.display=''none''" />
      </div>
      <h1 class="header-title">{{company_name}}</h1>
      <p class="header-subtitle">Sistema de Gestão de Cotações Empresariais</p>
    </div>
    
    <div class="content">
      <!-- Saudação -->
      <div class="greeting">
        <p>Olá <strong>{{supplier_name}}</strong> 👋</p>
      </div>
      
      <!-- Badge de convite exclusivo -->
      <div style="text-align: center;">
        <span class="exclusive-badge">🎯 Convite Exclusivo</span>
      </div>
      
      <!-- Card do cliente que convidou -->
      <div class="client-info-card">
        <h3>{{client_name}} convidou você!</h3>
        <p>Uma empresa parceira gostaria de trabalhar com você através da nossa plataforma profissional de cotações.</p>
      </div>
      
      <!-- Box de boas-vindas -->
      <div class="welcome-box">
        <h2>✨ Bem-vindo ao {{company_name}}</h2>
        <p>Complete seu cadastro em apenas 2 minutos e comece a receber oportunidades de negócio</p>
        <div class="quote-preview">
          <strong>📋 Primeira cotação aguardando sua resposta:</strong>
          <span>{{quote_title}}</span>
        </div>
      </div>
      
      <!-- Título da seção de benefícios -->
      <h3 class="section-title">🎯 Por que se cadastrar?</h3>
      
      <!-- Grid de benefícios -->
      <div class="benefits-grid">
        <div class="benefit-card">
          <div class="benefit-icon">📊</div>
          <h4>Múltiplas Oportunidades</h4>
          <p>Acesso a cotações de empresas verificadas e qualificadas</p>
        </div>
        
        <div class="benefit-card">
          <div class="benefit-icon">💰</div>
          <h4>Sistema Transparente</h4>
          <p>Negociação clara e pagamentos seguros através da plataforma</p>
        </div>
        
        <div class="benefit-card">
          <div class="benefit-icon">⭐</div>
          <h4>Reputação Digital</h4>
          <p>Destaque seu trabalho com avaliações e certificações</p>
        </div>
        
        <div class="benefit-card">
          <div class="benefit-icon">⚡</div>
          <h4>Notificações em Tempo Real</h4>
          <p>Receba alertas instantâneos de novas oportunidades</p>
        </div>
      </div>
      
      <!-- CTA Button -->
      <div class="cta-container">
        <a href="{{registration_link}}" class="cta-button">
          🚀 Completar Cadastro Agora
        </a>
      </div>
      
      <!-- Info adicional -->
      <div class="info-box">
        <p>✅ <strong>Grátis</strong> para começar a receber cotações</p>
        <p>⏱️ <strong>2 minutos</strong> para completar o cadastro</p>
        <p>🔒 <strong>Dados seguros</strong> com criptografia avançada</p>
      </div>
      
      <!-- Link alternativo -->
      <div style="text-align: center; margin-top: 30px; padding-top: 25px; border-top: 1px solid #E5E5E5;">
        <p style="color: #64748B; font-size: 13px; margin-bottom: 10px;">
          Problemas com o botão? Copie e cole este link no seu navegador:
        </p>
        <p style="color: {{primary_color}}; font-size: 13px; word-break: break-all; font-family: monospace;">
          {{registration_link}}
        </p>
      </div>
    </div>
    
    <!-- Footer com gradiente -->
    <div class="footer">
      <p><strong>{{company_name}}</strong></p>
      <p>{{footer_text}}</p>
      <p style="margin-top: 15px; font-size: 11px; color: #94A3B8;">
        Este é um convite exclusivo enviado por {{client_name}}. Se você não esperava este email, pode ignorá-lo com segurança.
      </p>
    </div>
  </div>
</body>
</html>',
  updated_at = now()
WHERE template_type = 'email_supplier_invite';