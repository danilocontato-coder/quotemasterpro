-- Inserir template de recuperação de senha (corrigido)
INSERT INTO whatsapp_templates (
  template_type,
  name,
  subject,
  message_content,
  is_global,
  active
) VALUES (
  'email_password_reset',
  'E-mail de Recuperação de Senha',
  '🔐 Redefinir sua senha - {{company_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: ''Inter'', ''Roboto'', Arial, sans-serif; margin: 0; padding: 0; background: #F9FAFB; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, {{primary_color}} 0%, {{accent_color}} 100%); padding: 40px 30px; text-align: center; border-bottom: 4px solid {{accent_color}}; }
    .logo { max-height: 80px; max-width: 250px; height: auto; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.1)); }
    .header-title { display: none; color: white; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
    .content { padding: 40px 35px; color: #111827; line-height: 1.6; }
    .security-box { background: #FEF3C7; border-left: 5px solid #F59E0B; padding: 20px; margin: 25px 0; border-radius: 8px; }
    .button { background: linear-gradient(135deg, {{primary_color}} 0%, {{accent_color}} 100%); color: white; padding: 16px 40px; text-decoration: none; display: inline-block; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .footer { background: linear-gradient(to bottom, #F9FAFB, #F3F4F6); padding: 30px; text-align: center; border-top: 1px solid #E5E7EB; }
    
    @media only screen and (max-width: 600px) {
      .content { padding: 30px 20px !important; }
      .button { display: block !important; width: 100% !important; padding: 18px 20px !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{logo_url}}" alt="{{company_name}}" class="logo" onerror="this.style.display=''none''; this.nextElementSibling.style.display=''block'';">
      <h1 class="header-title">{{company_name}}</h1>
    </div>
    
    <div class="content">
      <h2 style="color: {{primary_color}}; margin: 0 0 20px 0; font-size: 24px; font-weight: 700;">🔐 Redefinição de Senha</h2>
      
      <p style="color: #4B5563; margin-bottom: 25px;">Olá,</p>
      
      <p style="color: #4B5563; margin-bottom: 25px;">
        Recebemos uma solicitação para <strong>redefinir a senha</strong> da sua conta em <strong style="color: {{primary_color}};">{{company_name}}</strong>.
      </p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="{{reset_link}}" class="button">🔑 Redefinir Minha Senha</a>
      </div>
      
      <div class="security-box">
        <p style="margin: 0 0 10px 0; font-size: 15px; color: #92400E; font-weight: 600;">
          ⏰ <strong>Atenção:</strong> Este link expira em <strong style="color: #B45309;">{{expiry_time}}</strong>.
        </p>
        <p style="margin: 0; font-size: 14px; color: #92400E;">
          Se você não solicitou esta redefinição, ignore este e-mail. Sua senha permanecerá inalterada.
        </p>
      </div>
      
      <hr style="border: none; border-top: 2px solid #E5E7EB; margin: 35px 0;">
      
      <div style="background: #F3F4F6; padding: 18px; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; color: #374151; font-weight: 600; font-size: 15px;">🛡️ Dicas de Segurança</p>
        <ul style="margin: 0; padding-left: 20px; color: #6B7280; font-size: 14px;">
          <li>Nunca compartilhe sua senha com terceiros</li>
          <li>Use senhas fortes com letras, números e símbolos</li>
          <li>Não utilize a mesma senha em múltiplos sites</li>
        </ul>
      </div>
      
      <p style="color: #6B7280; margin-top: 30px; font-size: 14px;">
        Se o botão não funcionar, copie e cole este link no navegador:<br>
        <a href="{{reset_link}}" style="color: {{accent_color}}; word-break: break-all;">{{reset_link}}</a>
      </p>
    </div>
    
    <div class="footer">
      <img src="{{logo_url}}" alt="{{company_name}}" style="max-height: 40px; margin-bottom: 10px; opacity: 0.7;" onerror="this.style.display=''none'';">
      <p style="color: #111827; font-weight: 600; margin: 10px 0; font-size: 14px;">{{company_name}}</p>
      <p style="color: #6B7280; margin: 5px 0; font-size: 12px;">{{footer_text}}</p>
      <p style="color: #9CA3AF; margin: 15px 0 0 0; font-size: 11px;">
        Este é um e-mail automático de segurança. Não responda esta mensagem.
      </p>
    </div>
  </div>
</body>
</html>',
  true,
  true
);