import { supabase } from '@/integrations/supabase/client';

interface SendSupplierWelcomeParams {
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  supplierWhatsApp?: string;
  administradoraName: string;
}

export const sendSupplierWelcomeNotifications = async ({
  supplierId,
  supplierName,
  supplierEmail,
  supplierWhatsApp,
  administradoraName,
}: SendSupplierWelcomeParams) => {
  const results = {
    email: false,
    whatsapp: false,
    notification: false,
  };

  try {
    // 1. Enviar Email de boas-vindas
    console.log('[SupplierNotification] Enviando email para:', supplierEmail);
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: [supplierEmail],
        subject: `Bem-vindo ao Cotiz - ${administradoraName}`,
        html: `
          <h2>Olá, ${supplierName}!</h2>
          <p>Você foi adicionado como fornecedor da <strong>${administradoraName}</strong> na plataforma Cotiz.</p>
          <p>Acesse o sistema para começar a receber cotações:</p>
          <p><a href="${window.location.origin}/login" style="background: #003366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Acessar Sistema</a></p>
          <p>Atenciosamente,<br>Equipe Cotiz</p>
        `,
      },
    });

    if (emailError) {
      console.error('[SupplierNotification] Erro ao enviar email:', emailError);
    } else {
      results.email = true;
      console.log('[SupplierNotification] ✅ Email enviado com sucesso');
    }

    // 2. Enviar WhatsApp (se fornecido)
    if (supplierWhatsApp) {
      console.log('[SupplierNotification] Enviando WhatsApp para:', supplierWhatsApp);
      const { error: whatsappError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: supplierWhatsApp,
          message: `Olá *${supplierName}*! 👋\n\nVocê foi adicionado como fornecedor da *${administradoraName}* na plataforma Cotiz.\n\nAcesse: ${window.location.origin}/login`,
        },
      });

      if (whatsappError) {
        console.error('[SupplierNotification] Erro ao enviar WhatsApp:', whatsappError);
      } else {
        results.whatsapp = true;
        console.log('[SupplierNotification] ✅ WhatsApp enviado com sucesso');
      }
    }

    // 3. Criar notificação no sistema
    console.log('[SupplierNotification] Criando notificação in-app');
    const { error: notificationError } = await supabase.from('notifications').insert({
      user_id: supplierId,
      type: 'supplier_registered',
      title: 'Bem-vindo ao Cotiz!',
      message: `Você foi adicionado como fornecedor da ${administradoraName}.`,
      metadata: {
        administradora_name: administradoraName,
      },
    });

    if (notificationError) {
      console.error('[SupplierNotification] Erro ao criar notificação:', notificationError);
    } else {
      results.notification = true;
      console.log('[SupplierNotification] ✅ Notificação criada com sucesso');
    }

    return { success: true, results };
  } catch (error) {
    console.error('[SupplierNotification] Erro geral ao enviar notificações:', error);
    return { success: false, error, results };
  }
};
