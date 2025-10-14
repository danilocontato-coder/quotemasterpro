import { Step } from 'react-joyride';

export const getStepsForRole = (role: string, tenantType?: string, platformName: string = 'Cotiz'): Step[] => {
  // Admin/Super Admin
  if (role === 'admin' || role === 'super_admin') {
    return [
      {
        target: '[data-tour="superadmin-header"]',
        content: `Bem-vindo ao painel administrativo. Aqui você tem controle total da plataforma ${platformName}.`,
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-tour="menu-clients"]',
        content: 'Gerencie todos os clientes da plataforma, visualize suas atividades e controle assinaturas.',
        placement: 'right',
      },
      {
        target: '[data-tour="menu-suppliers"]',
        content: 'Administre fornecedores, aprove certificações e gerencie permissões.',
        placement: 'right',
      },
      {
        target: '[data-tour="menu-plans"]',
        content: 'Configure planos de assinatura, limites de uso e recursos disponíveis.',
        placement: 'right',
      },
      {
        target: '[data-tour="menu-analytics"]',
        content: 'Acesse relatórios detalhados sobre uso da plataforma e métricas de negócio.',
        placement: 'right',
      },
      {
        target: '[data-tour="user-menu"]',
        content: 'Configure suas preferências administrativas e segurança da conta.',
        placement: 'bottom',
      },
    ];
  }

  // Fornecedor
  if (tenantType === 'supplier') {
    return [
      {
        target: '[data-tour="dashboard"]',
        content: `Bem-vindo ao ${platformName}! Este é seu painel de controle como fornecedor.`,
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-tour="menu-quotes"]',
        content: 'Aqui você encontra todas as cotações recebidas dos clientes. Responda rapidamente para aumentar suas chances!',
        placement: 'right',
      },
      {
        target: '[data-tour="menu-products"]',
        content: 'Gerencie seu catálogo de produtos e serviços. Mantenha sempre atualizado para responder cotações mais rápido.',
        placement: 'right',
      },
      {
        target: '[data-tour="menu-payments"]',
        content: 'Acompanhe seus pagamentos, histórico financeiro e gerencie recebimentos.',
        placement: 'right',
      },
      {
        target: '[data-tour="menu-profile"]',
        content: 'Complete seu perfil com informações, certificações e áreas de atuação para receber mais cotações.',
        placement: 'right',
      },
      {
        target: '[data-tour="user-menu"]',
        content: 'Configure suas notificações e preferências de comunicação.',
        placement: 'bottom',
      },
    ];
  }

  // Cliente/Manager (padrão)
  return [
    {
      target: '[data-tour="dashboard"]',
      content: `Bem-vindo ao ${platformName}! Aqui você tem uma visão completa de todas as suas cotações e atividades.`,
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="menu-quotes"]',
      content: 'Crie e gerencie suas cotações de forma simples. Envie para múltiplos fornecedores com um clique!',
      placement: 'right',
    },
    {
      target: '[data-tour="menu-approvals"]',
      content: 'Aprove ou rejeite propostas recebidas. Configure fluxos de aprovação para sua equipe.',
      placement: 'right',
    },
    {
      target: '[data-tour="menu-suppliers"]',
      content: 'Gerencie seus fornecedores favoritos e descubra novos parceiros certificados.',
      placement: 'right',
    },
    {
      target: '[data-tour="menu-products"]',
      content: 'Mantenha seu catálogo de produtos para criar cotações mais rápido.',
      placement: 'right',
    },
    {
      target: '[data-tour="quick-actions"]',
      content: 'Use as ações rápidas para agilizar tarefas do dia a dia.',
      placement: 'top',
    },
    {
      target: '[data-tour="user-menu"]',
      content: 'Configure seu perfil, notificações e preferências do sistema.',
      placement: 'bottom',
    },
  ];
};
