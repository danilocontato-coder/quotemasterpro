-- Atualizar template email_supplier_invite com layout compacto
UPDATE public.whatsapp_templates
SET message_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #003366 0%, #0052a3 100%);
      color: #ffffff;
      text-align: center;
      padding: 30px 20px;
    }
    .header-title {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      padding: 25px 20px;
      color: #333333;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 15px;
      color: #0F172A;
    }
    .exclusive-badge {
      display: inline-block;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: #78350f;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      margin: 12px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .client-info-card {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-left: 4px solid #003366;
      padding: 18px;
      border-radius: 8px;
      margin: 15px 0;
    }
    .client-info-card strong {
      color: #003366;
      font-size: 16px;
    }
    .welcome-box {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #003366;
      border-radius: 12px;
      padding: 20px;
      margin: 15px 0;
    }
    .welcome-box h2 {
      color: #003366;
      margin: 0 0 8px 0;
      font-size: 20px;
    }
    .welcome-box p {
      margin: 0 0 12px 0;
      line-height: 1.5;
      color: #1e293b;
    }
    .section-title {
      color: #003366;
      font-size: 18px;
      font-weight: 700;
      margin: 20px 0 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #003366;
    }
    .benefits-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin: 12px 0;
    }
    .benefit-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      transition: all 0.3s ease;
    }
    .benefit-card:hover {
      box-shadow: 0 4px 12px rgba(0,51,102,0.15);
      transform: translateY(-2px);
    }
    .benefit-icon {
      font-size: 28px;
      margin-bottom: 8px;
    }
    .benefit-card h4 {
      color: #003366;
      font-size: 15px;
      margin: 0 0 5px 0;
      font-weight: 600;
    }
    .benefit-card p {
      color: #64748b;
      font-size: 13px;
      margin: 0;
      line-height: 1.4;
    }
    .cta-container {
      text-align: center;
      margin: 25px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #003366 0%, #0052a3 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 15px 35px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0,51,102,0.3);
      transition: all 0.3s ease;
    }
    .cta-button:hover {
      background: linear-gradient(135deg, #0052a3 0%, #003366 100%);
      box-shadow: 0 6px 16px rgba(0,51,102,0.4);
      transform: translateY(-2px);
    }
    .info-box {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .info-box p {
      margin: 6px 0;
      font-size: 14px;
      color: #78350f;
      line-height: 1.5;
    }
    .footer {
      background: #f8fafc;
      text-align: center;
      padding: 20px;
      color: #64748b;
      font-size: 13px;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #003366;
      text-decoration: none;
      font-weight: 600;
    }
    .quote-preview {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
      margin-top: 12px;
    }
    .quote-preview p {
      margin: 4px 0;
      font-size: 13px;
      color: #475569;
    }
    @media only screen and (max-width: 600px) {
      .benefits-grid {
        grid-template-columns: 1fr;
      }
      .content {
        padding: 20px 15px;
      }
      .header {
        padding: 25px 15px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1 class="header-title">🎯 Convite Exclusivo de Parceria</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Olá, <strong>{{supplier_name}}</strong>!</p>
      
      <div class="exclusive-badge">✨ Convite Exclusivo</div>
      
      <div class="client-info-card">
        <p style="margin: 0;">Você foi convidado por:</p>
        <strong>{{client_name}}</strong>
      </div>
      
      <div class="welcome-box">
        <h2>🤝 Seja Nosso Parceiro!</h2>
        <p>Temos uma excelente oportunidade de parceria comercial. Você foi selecionado para fazer parte de nossa rede de fornecedores confiáveis em <strong>{{platform_name}}</strong>.</p>
      </div>
      
      <h3 class="section-title">💼 Benefícios da Parceria</h3>
      
      <div class="benefits-grid">
        <div class="benefit-card">
          <div class="benefit-icon">📋</div>
          <h4>Cotações Diretas</h4>
          <p>Receba solicitações qualificadas</p>
        </div>
        
        <div class="benefit-card">
          <div class="benefit-icon">💰</div>
          <h4>Gestão Financeira</h4>
          <p>Pagamentos seguros e rastreáveis</p>
        </div>
        
        <div class="benefit-card">
          <div class="benefit-icon">📊</div>
          <h4>Propostas Online</h4>
          <p>Envie orçamentos facilmente</p>
        </div>
        
        <div class="benefit-card">
          <div class="benefit-icon">🎯</div>
          <h4>Oportunidades</h4>
          <p>Acesse novos clientes</p>
        </div>
      </div>
      
      <div class="cta-container">
        <a href="{{registration_link}}" class="cta-button">
          🚀 Completar Cadastro Agora
        </a>
      </div>
      
      <div class="info-box">
        <p><strong>📌 Importante:</strong></p>
        <p>Este convite é válido por <strong>30 dias</strong>. Complete seu cadastro para começar a receber cotações e fazer parte da nossa rede de parceiros.</p>
      </div>
      
      <div class="quote-preview">
        <p><strong>🔗 Link de registro:</strong></p>
        <p style="word-break: break-all; color: #003366;">{{registration_link}}</p>
      </div>
    </div>
    
    <div class="footer">
      <p>© {{platform_name}} - Plataforma de Gestão de Cotações</p>
      <p>Dúvidas? Entre em contato: <a href="mailto:{{support_email}}">{{support_email}}</a></p>
    </div>
  </div>
</body>
</html>',
  updated_at = now()
WHERE template_type = 'email_supplier_invite'
  AND is_global = true;