-- Atualizar template de recuperação de senha para compatibilidade com Outlook
UPDATE whatsapp_templates
SET message_content = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Redefinir Senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #F9FAFB;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border: 1px solid #E5E7EB;">
          <tr>
            <td align="center" style="background-color: {{primary_color}}; padding: 40px 30px;">
              <img src="{{logo_url}}" alt="{{company_name}}" style="max-width: 200px; height: auto; display: block;" onerror="this.style.display=''none''" />
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 35px; color: #111827;">
              <h2 style="color: {{primary_color}}; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;">🔐 Redefinição de Senha</h2>
              <p style="color: #4B5563; margin: 0 0 15px 0; line-height: 1.6;">Olá <strong>{{user_name}}</strong>,</p>
              <p style="color: #4B5563; margin: 0 0 25px 0; line-height: 1.6;">
                Recebemos uma solicitação para <strong>redefinir a senha</strong> da sua conta em <strong style="color: {{primary_color}};">{{company_name}}</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{reset_link}}" style="background-color: {{primary_color}}; color: #FFFFFF; padding: 16px 40px; text-decoration: none; display: inline-block; border-radius: 6px; font-weight: bold; font-size: 16px;">🔑 Redefinir Minha Senha</a>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; font-size: 15px; color: #92400E; font-weight: bold;">
                      ⏰ <strong>Atenção:</strong> Este link expira em <span style="color: #B45309;">{{expiry_time}}</span>.
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #92400E; line-height: 1.5;">
                      Se você não solicitou esta redefinição, ignore este e-mail. Sua senha permanecerá inalterada.
                    </p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6; border-radius: 6px; margin: 30px 0;">
                <tr>
                  <td style="padding: 18px;">
                    <p style="margin: 0 0 10px 0; color: #374151; font-weight: bold; font-size: 15px;">🛡️ Dicas de Segurança</p>
                    <ul style="margin: 0; padding-left: 20px; color: #6B7280; font-size: 14px; line-height: 1.8;">
                      <li>Nunca compartilhe sua senha com terceiros</li>
                      <li>Use senhas fortes com letras, números e símbolos</li>
                      <li>Não utilize a mesma senha em múltiplos sites</li>
                    </ul>
                  </td>
                </tr>
              </table>
              <p style="color: #6B7280; margin: 30px 0 0 0; font-size: 13px; line-height: 1.6;">
                Se o botão não funcionar, copie e cole este link no navegador:<br>
                <a href="{{reset_link}}" style="color: {{primary_color}}; word-break: break-all;">{{reset_link}}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #F9FAFB; padding: 30px; border-top: 1px solid #E5E7EB;">
              <p style="color: #111827; font-weight: bold; margin: 0 0 5px 0; font-size: 14px;">{{company_name}}</p>
              <p style="color: #6B7280; margin: 0 0 15px 0; font-size: 12px;">{{footer_text}}</p>
              <p style="color: #9CA3AF; margin: 0; font-size: 11px;">
                Este é um e-mail automático de segurança. Não responda esta mensagem.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  updated_at = now()
WHERE template_type = 'email_password_reset';