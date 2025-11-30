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
      console.error('🚨 [SECURITY BREACH] Tentativa de acesso não autorizado às rotas administrativas:', {
        userId: user.id,
        userRole: user.role,
        attemptedPath: currentPath,
        timestamp: new Date().toISOString()
      });
      
      toast.error('Acesso negado', {
        description: 'Você não tem permissão para acessar esta área.'
      });
      
      navigate('/', { replace: true });
      return;
    }

    // PROTEÇÃO 2: Bloquear fornecedores de acessar rotas de cliente
    if (user.supplierId && !currentPath.startsWith('/supplier/') && !currentPath.startsWith('/auth/')) {
      console.warn('🔒 [SECURITY] Fornecedor tentou acessar rota de cliente:', {
        supplierId: user.supplierId,
        attemptedPath: currentPath
      });
      
      navigate('/supplier/dashboard', { replace: true });
      return;
    }

    // PROTEÇÃO 3: Bloquear clientes de acessar rotas de fornecedor
    if (user.clientId && currentPath.startsWith('/supplier/')) {
      console.warn('🔒 [SECURITY] Cliente tentou acessar rota de fornecedor:', {
        clientId: user.clientId,
        attemptedPath: currentPath
      });
      
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
      console.error('🚨 [SECURITY BREACH] Tentativa de acesso direto a painel administrativo:', {
        userId: user.id,
        userRole: user.role,
        clientId: user.clientId,
        supplierId: user.supplierId,
        attemptedPath: currentPath,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      // Log crítico de segurança - poderia ser enviado para sistema de monitoramento
      console.error('CRITICAL SECURITY EVENT: Unauthorized admin access attempt');
      
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