export const condominioWelcomeTemplate = (data: {
  condominio_name: string;
  administradora_name: string;
  email: string;
  temporary_password: string;
  login_url: string;
  support_email: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Cotiz</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #003366 0%, #0055aa 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Bem-vindo ao Cotiz!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Sua conta foi criada com sucesso</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #0F172A; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Olá <strong>${data.condominio_name}</strong>,
              </p>
              
              <p style="color: #0F172A; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Sua conta foi criada por <strong>${data.administradora_name}</strong> e você já pode acessar a plataforma para gerenciar aprovações de cotações.
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #EFF6FF; border: 2px solid #3B82F6; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #1E40AF; font-weight: bold; margin: 0 0 15px 0; font-size: 16px;">🔐 Suas Credenciais de Acesso:</p>
                    
                    <p style="margin: 10px 0; color: #0F172A;">
                      <strong>E-mail:</strong><br>
                      <code style="background-color: #ffffff; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; font-size: 14px;">${data.email}</code>
                    </p>
                    
                    <p style="margin: 10px 0; color: #0F172A;">
                      <strong>Senha Temporária:</strong><br>
                      <code style="background-color: #ffffff; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; font-size: 14px;">${data.temporary_password}</code>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.login_url}" style="display: inline-block; background-color: #003366; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Acessar o Sistema
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Important Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; margin: 30px 0;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0 0 10px 0; color: #92400E; font-weight: bold;">⚠️ Importante:</p>
                    <ul style="margin: 0; padding-left: 20px; color: #92400E;">
                      <li>Você deverá trocar sua senha no primeiro acesso</li>
                      <li>Guarde suas credenciais em local seguro</li>
                      <li>Configure os aprovadores nos níveis de aprovação</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Se você tiver dúvidas, entre em contato com o suporte em <a href="mailto:${data.support_email}" style="color: #003366;">${data.support_email}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="color: #64748B; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Cotiz - Sistema de Gestão de Cotações
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
