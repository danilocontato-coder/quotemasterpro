import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleBasedRoute } from '@/contexts/auth/AuthNavigation';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Componente de monitoramento de segurança
 * Detecta e bloqueia tentativas de acesso não autorizado
 */
export const SecurityMonitor: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const currentPath = location.pathname;
    
    // PROTEÇÃO 1: Bloquear acesso de não-admins às rotas administrativas
if (currentPath.startsWith('/admin/') && user.role !== 'admin') {
      // Log apenas em desenvolvimento - não expor dados sensíveis em produção
      if (import.meta.env.DEV) {
        console.error('[SECURITY] Tentativa de acesso não autorizado às rotas administrativas:', {
          userRole: user.role,
          attemptedPath: currentPath
        });
      }
      
      toast.error('Acesso negado', {
        description: 'Você não tem permissão para acessar esta área.'
      });
      
      navigate('/', { replace: true });
      return;
    }

// PROTEÇÃO 2: Bloquear fornecedores de acessar rotas de cliente
    // PRIORIZA O ROLE do usuário, não apenas a existência de IDs
    if (user.role === 'supplier' && !currentPath.startsWith('/supplier/') && !currentPath.startsWith('/auth/')) {
      if (import.meta.env.DEV) {
        console.warn('[SECURITY] Fornecedor tentou acessar rota de cliente');
      }
      
      navigate('/supplier/dashboard', { replace: true });
      return;
    }

// PROTEÇÃO 3: Bloquear clientes de acessar rotas de fornecedor
    // PRIORIZA O ROLE do usuário para evitar conflitos com dados inconsistentes
    if (user.role !== 'supplier' && user.role !== 'admin' && currentPath.startsWith('/supplier/')) {
      if (import.meta.env.DEV) {
        console.warn('[SECURITY] Cliente tentou acessar rota de fornecedor');
      }
      
      const targetRoute = getRoleBasedRoute(user.role, {
        supplierId: user.supplierId,
        clientId: user.clientId,
        clientType: user.clientType
      });
      navigate(targetRoute, { replace: true });
      return;
    }

    // PROTEÇÃO 4: Monitorar tentativas de acesso direto via URL
    const adminPaths = [
      '/admin/clients',
      '/admin/suppliers',
      '/admin/plans',
      '/admin/financial',
      '/admin/integrations',
      '/admin/settings',
      '/admin/audit',
      '/admin/coupons'
    ];

if (adminPaths.some(path => currentPath.startsWith(path)) && user.role !== 'admin') {
      // Log apenas em desenvolvimento - não expor dados sensíveis em produção
      if (import.meta.env.DEV) {
        console.error('[SECURITY] Tentativa de acesso direto a painel administrativo:', {
          attemptedPath: currentPath
        });
      }
      
      toast.error('Violação de segurança detectada', {
        description: 'Tentativa de acesso não autorizado foi registrada.'
      });
      
      navigate('/', { replace: true });
      return;
    }

  }, [user, location.pathname, navigate]);

  // Componente não renderiza nada, apenas monitora
  return null;
};