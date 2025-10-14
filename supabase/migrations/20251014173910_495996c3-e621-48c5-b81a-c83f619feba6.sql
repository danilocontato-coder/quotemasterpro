-- Atualizar template de email de convite com layout compatível com Outlook
UPDATE public.whatsapp_templates
SET message_content = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Convite de Parceria - {{platform_name}}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .mobile-full-width { width: 100% !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
      .mobile-padding { padding: 15px !important; }
      .mobile-center { text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
  
  <!-- Container Principal -->
  <table width="100%" bgcolor="#f5f5f5" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 20px 0;">
        
        <!-- Email Container (600px) -->
        <table width="600" class="mobile-full-width" bgcolor="#ffffff" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto;">
          
          <!-- Header -->
          <tr>
            <td bgcolor="#003366" align="center" style="padding: 30px 20px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #ffffff; font-size: 24px; font-weight: bold; text-align: center;">
                    🎯 Convite Exclusivo de Parceria
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Badge Exclusivo -->
          <tr>
            <td align="center" style="padding: 20px 20px 10px 20px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="#fbbf24" align="center" style="border-radius: 20px; padding: 8px 20px;">
                    <span style="color: #78350f; font-size: 12px; font-weight: bold; letter-spacing: 1px;">✨ CONVITE EXCLUSIVO</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Saudação -->
          <tr>
            <td style="padding: 20px 20px 10px 20px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #0f172a; font-size: 16px;">
                    Olá <strong>{{supplier_name}}</strong>,
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Card de Cliente -->
          <tr>
            <td style="padding: 0 20px 20px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eff6ff" style="border-left: 4px solid #003366;">
                <tr>
                  <td style="padding: 15px; color: #1e40af; font-size: 14px;">
                    <strong>Você foi convidado por:</strong><br>
                    <span style="font-size: 18px; font-weight: bold; color: #003366;">{{client_name}}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Welcome Box -->
          <tr>
            <td style="padding: 0 20px 20px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f9ff" style="border: 2px solid #003366; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="color: #003366; font-size: 18px; font-weight: bold; padding-bottom: 10px;">
                          🤝 Seja Nosso Parceiro!
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #475569; font-size: 14px; line-height: 1.6;">
                          Junte-se à nossa plataforma e tenha acesso a oportunidades de negócio exclusivas. Complete seu cadastro e comece a receber cotações imediatamente.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Título dos Benefícios -->
          <tr>
            <td style="padding: 10px 20px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #003366; font-size: 18px; font-weight: bold; border-bottom: 2px solid #003366; padding-bottom: 8px;">
                    ⭐ Benefícios da Plataforma
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Benefits Grid (2x2) -->
          <tr>
            <td style="padding: 10px 20px 20px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <!-- Linha 1 -->
                <tr>
                  <td width="50%" valign="top" style="padding: 5px;" class="mobile-stack">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border: 1px solid #e2e8f0; border-radius: 8px;">
                      <tr>
                        <td style="padding: 15px; text-align: center;">
                          <div style="font-size: 28px; margin-bottom: 8px;">📋</div>
                          <div style="color: #003366; font-size: 15px; font-weight: bold; margin-bottom: 5px;">Cotações Diretas</div>
                          <div style="color: #64748b; font-size: 13px; line-height: 1.4;">Receba solicitações de clientes na sua área</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" valign="top" style="padding: 5px;" class="mobile-stack">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border: 1px solid #e2e8f0; border-radius: 8px;">
                      <tr>
                        <td style="padding: 15px; text-align: center;">
                          <div style="font-size: 28px; margin-bottom: 8px;">💰</div>
                          <div style="color: #003366; font-size: 15px; font-weight: bold; margin-bottom: 5px;">Gestão Financeira</div>
                          <div style="color: #64748b; font-size: 13px; line-height: 1.4;">Pagamentos seguros e rastreáveis</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Linha 2 -->
                <tr>
                  <td width="50%" valign="top" style="padding: 5px;" class="mobile-stack">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border: 1px solid #e2e8f0; border-radius: 8px;">
                      <tr>
                        <td style="padding: 15px; text-align: center;">
                          <div style="font-size: 28px; margin-bottom: 8px;">📊</div>
                          <div style="color: #003366; font-size: 15px; font-weight: bold; margin-bottom: 5px;">Propostas Online</div>
                          <div style="color: #64748b; font-size: 13px; line-height: 1.4;">Sistema completo para enviar propostas</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" valign="top" style="padding: 5px;" class="mobile-stack">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border: 1px solid #e2e8f0; border-radius: 8px;">
                      <tr>
                        <td style="padding: 15px; text-align: center;">
                          <div style="font-size: 28px; margin-bottom: 8px;">🎯</div>
                          <div style="color: #003366; font-size: 15px; font-weight: bold; margin-bottom: 5px;">Oportunidades</div>
                          <div style="color: #64748b; font-size: 13px; line-height: 1.4;">Acesso a novos clientes e projetos</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button (Bulletproof) -->
          <tr>
            <td align="center" style="padding: 20px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#003366" style="border-radius: 8px; padding: 15px 35px;">
                    <a href="{{registration_link}}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                      🚀 Completar Cadastro Agora
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Info Box -->
          <tr>
            <td style="padding: 0 20px 20px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fffbeb" style="border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 12px; color: #92400e; font-size: 13px;">
                    📌 <strong>Importante:</strong> Este convite é válido por <strong>30 dias</strong>. Não perca essa oportunidade!
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Quote Preview -->
          <tr>
            <td style="padding: 0 20px 20px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8fafc" style="border: 1px solid #cbd5e1; border-radius: 8px;">
                <tr>
                  <td style="padding: 15px; color: #475569; font-size: 12px; word-break: break-all;">
                    🔗 <strong>Link de registro:</strong><br>
                    <a href="{{registration_link}}" style="color: #003366; text-decoration: underline;">{{registration_link}}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td bgcolor="#f8fafc" align="center" style="padding: 20px; border-top: 1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #64748b; font-size: 12px; text-align: center; line-height: 1.6;">
                    © {{platform_name}} - Plataforma de Gestão de Cotações<br>
                    Precisa de ajuda? Entre em contato: <a href="mailto:{{support_email}}" style="color: #003366; text-decoration: underline;">{{support_email}}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        <!-- Fim Email Container -->
        
      </td>
    </tr>
  </table>
  <!-- Fim Container Principal -->
  
</body>
</html>',
  updated_at = now()
WHERE template_type = 'email_supplier_invite' 
  AND is_global = true;