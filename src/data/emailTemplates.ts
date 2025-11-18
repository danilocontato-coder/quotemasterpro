export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  subject: string;
  html: string;
  plainText: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Boas-Vindas',
    description: 'E-mail de boas-vindas para novos clientes',
    category: 'Onboarding',
    subject: 'Bem-vindo ao Cotiz, {{client_name}}! 👋',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #003366;">Olá, {{client_name}}! 👋</h1>
        <p style="font-size: 16px; line-height: 1.6;">
          É um prazer ter você conosco na plataforma Cotiz!
        </p>
        <p style="font-size: 16px; line-height: 1.6;">
          Seu condomínio está localizado em: <strong>{{client_address}}</strong>
        </p>
        <p style="font-size: 16px; line-height: 1.6;">
          Plano contratado: <strong>{{subscription_plan}}</strong>
        </p>
        <div style="margin: 30px 0;">
          <a href="{{login_url}}" style="background-color: #003366; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Acessar Plataforma
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          Se precisar de ajuda, nossa equipe está disponível em <a href="{{support_url}}">suporte</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">
          © {{current_year}} Cotiz - Plataforma de Cotações
        </p>
      </div>
    `,
    plainText: `Olá, {{client_name}}!

É um prazer ter você conosco na plataforma Cotiz!

Seu condomínio está localizado em: {{client_address}}
Plano contratado: {{subscription_plan}}

Acesse a plataforma: {{login_url}}

Se precisar de ajuda, nossa equipe está disponível em {{support_url}}.

© {{current_year}} Cotiz - Plataforma de Cotações`
  },
  {
    id: 'quote_approved',
    name: 'Cotação Aprovada',
    description: 'Notificação de aprovação de cotação',
    category: 'Cotações',
    subject: '✅ Cotação aprovada - {{client_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #28a745;">✅ Cotação Aprovada</h1>
        <p style="font-size: 16px; line-height: 1.6;">
          Olá <strong>{{client_name}}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6;">
          Temos boas notícias! Sua cotação foi aprovada.
        </p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Cliente:</strong> {{company_name}}</p>
          <p style="margin: 5px 0;"><strong>CNPJ:</strong> {{client_cnpj}}</p>
          <p style="margin: 5px 0;"><strong>Endereço:</strong> {{client_address}}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">
          Em breve você receberá mais detalhes sobre a entrega.
        </p>
        <div style="margin: 30px 0;">
          <a href="{{dashboard_url}}/quotes" style="background-color: #003366; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Ver Cotações
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">
          © {{current_year}} Cotiz - Plataforma de Cotações
        </p>
      </div>
    `,
    plainText: `✅ Cotação Aprovada

Olá {{client_name}},

Temos boas notícias! Sua cotação foi aprovada.

Cliente: {{company_name}}
CNPJ: {{client_cnpj}}
Endereço: {{client_address}}

Em breve você receberá mais detalhes sobre a entrega.

Ver cotações: {{dashboard_url}}/quotes

© {{current_year}} Cotiz - Plataforma de Cotações`
  },
  {
    id: 'payment_reminder',
    name: 'Lembrete de Pagamento',
    description: 'Lembrete amigável sobre fatura pendente',
    category: 'Pagamentos',
    subject: '💳 Lembrete: Fatura pendente - {{client_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ffc107;">💳 Lembrete de Pagamento</h1>
        <p style="font-size: 16px; line-height: 1.6;">
          Prezado(a) <strong>{{client_name}}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6;">
          Este é um lembrete amigável sobre sua fatura pendente.
        </p>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 5px 0;"><strong>Razão Social:</strong> {{company_name}}</p>
          <p style="margin: 5px 0;"><strong>CNPJ:</strong> {{client_cnpj}}</p>
          <p style="margin: 5px 0;"><strong>Plano:</strong> {{subscription_plan}}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">
          Para manter seus serviços ativos, por favor regularize sua situação o mais breve possível.
        </p>
        <div style="margin: 30px 0;">
          <a href="{{dashboard_url}}/payments" style="background-color: #ffc107; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Ver Faturas
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          Em caso de dúvidas, entre em contato conosco: <a href="{{support_url}}">Suporte</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">
          © {{current_year}} Cotiz - Plataforma de Cotações
        </p>
      </div>
    `,
    plainText: `💳 Lembrete de Pagamento

Prezado(a) {{client_name}},

Este é um lembrete amigável sobre sua fatura pendente.

Razão Social: {{company_name}}
CNPJ: {{client_cnpj}}
Plano: {{subscription_plan}}

Para manter seus serviços ativos, por favor regularize sua situação o mais breve possível.

Ver faturas: {{dashboard_url}}/payments

Em caso de dúvidas, entre em contato: {{support_url}}

© {{current_year}} Cotiz - Plataforma de Cotações`
  },
  {
    id: 'monthly_report',
    name: 'Relatório Mensal',
    description: 'Resumo mensal de atividades',
    category: 'Relatórios',
    subject: '📊 Seu relatório mensal - {{client_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #003366;">📊 Relatório Mensal</h1>
        <p style="font-size: 16px; line-height: 1.6;">
          Olá <strong>{{client_name}}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6;">
          Confira o resumo das suas atividades na plataforma Cotiz durante o mês atual.
        </p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #003366;">Destaques do Mês</h3>
          <p>Em breve você verá aqui um resumo completo das suas cotações, pagamentos e fornecedores.</p>
        </div>
        <div style="margin: 30px 0;">
          <a href="{{dashboard_url}}" style="background-color: #003366; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Acessar Dashboard
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          Plano atual: <strong>{{subscription_plan}}</strong>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">
          © {{current_year}} Cotiz - Plataforma de Cotações<br>
          Data do relatório: {{current_date}}
        </p>
      </div>
    `,
    plainText: `📊 Relatório Mensal

Olá {{client_name}},

Confira o resumo das suas atividades na plataforma Cotiz durante o mês atual.

DESTAQUES DO MÊS
Em breve você verá aqui um resumo completo das suas cotações, pagamentos e fornecedores.

Acessar Dashboard: {{dashboard_url}}

Plano atual: {{subscription_plan}}

© {{current_year}} Cotiz - Plataforma de Cotações
Data do relatório: {{current_date}}`
  }
];

export const TEMPLATE_CATEGORIES = [
  'Onboarding',
  'Cotações',
  'Pagamentos',
  'Relatórios'
];
