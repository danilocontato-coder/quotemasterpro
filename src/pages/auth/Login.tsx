import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Building2, Users, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getRoleBasedRoute } from '@/contexts/AuthContext';
import { InactiveClientAlert } from '@/components/auth/InactiveClientAlert';
import { BrandedHeader } from '@/components/common/BrandedHeader';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [detectedUserType, setDetectedUserType] = useState<'client' | 'supplier' | 'admin' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading, error: authError } = useAuth();
  const { settings: brandingSettings } = useBranding();

  const from = location.state?.from?.pathname || getRoleBasedRoute('client');

  // Auto redirect when user is authenticated
  useEffect(() => {
    if (user && !authLoading) {
      // Priorizar redirecionamento armazenado (ex.: acesso via link de fornecedor)
      const storedRedirect = sessionStorage.getItem('redirectAfterLogin');
      if (storedRedirect) {
        console.log('Login: redirectAfterLogin encontrado. Redirecionando para', storedRedirect);
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(storedRedirect, { replace: true });
        return;
      }

      const redirectPath = getRoleBasedRoute(user.role, { supplierId: user.supplierId, clientId: user.clientId });
      console.log('Login: redirecting user', user.email, 'with role', user.role, 'ctx', { supplierId: user.supplierId, clientId: user.clientId }, 'to', redirectPath);
      
      // Add small delay to prevent instant redirect during logout
      const timeoutId = setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, authLoading, navigate]);

  // Detectar tipo de usuário baseado no email
  const detectUserType = async (emailValue: string) => {
    if (!emailValue || !emailValue.includes('@')) {
      setDetectedUserType(null);
      return;
    }

    setIsDetecting(true);
    setError('');

    try {
      // Primeiro verificar se é admin (baseado no domínio ou email específico)
      if (emailValue.includes('admin@') || emailValue.includes(`@${brandingSettings.companyName.toLowerCase().replace(/\s+/g, '')}.com`)) {
        setDetectedUserType('admin');
        setIsDetecting(false);
        return;
      }

      // Verificar nas tabelas de usuários para determinar o tipo
      const [{ data: suppliers }, { data: clients }] = await Promise.all([
        supabase.from('suppliers').select('email').eq('email', emailValue).single(),
        supabase.from('clients').select('email').eq('email', emailValue).single()
      ]);

      if (suppliers) {
        setDetectedUserType('supplier');
      } else if (clients) {
        setDetectedUserType('client');
      } else {
        // Se não encontrou, verificar na tabela profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', emailValue)
          .single();

        if (profile) {
          setDetectedUserType(profile.role === 'admin' ? 'admin' : 'client');
        } else {
          // Default para cliente se não encontrar
          setDetectedUserType('client');
        }
      }
    } catch (error) {
      console.error('Erro ao detectar tipo de usuário:', error);
      // Em caso de erro, assume cliente
      setDetectedUserType('client');
    } finally {
      setIsDetecting(false);
    }
  };

  // Detectar tipo quando email muda
  useEffect(() => {
    if (email) {
      const timeoutId = setTimeout(() => {
        detectUserType(email);
      }, 800);
      return () => clearTimeout(timeoutId);
    } else {
      setDetectedUserType(null);
    }
  }, [email]);

  const getUserTypeInfo = () => {
    switch (detectedUserType) {
      case 'admin':
        return {
          label: 'Administrador do Sistema',
          description: 'Acesso completo ao sistema de administração',
          icon: User,
          color: 'text-purple-600'
        };
      case 'supplier':
        return {
          label: 'Fornecedor',
          description: 'Acesso para responder cotações e gerenciar produtos',
          icon: Building2,
          color: 'text-green-600'
        };
      case 'client':
        return {
          label: 'Cliente/Condomínio',
          description: 'Acesso para criar cotações e gerenciar compras',
          icon: Users,
          color: 'text-blue-600'
        };
      default:
        return {
          label: 'Usuário',
          description: 'Digite seu email para identificar o tipo de acesso',
          icon: null,
          color: 'text-muted-foreground'
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isDetecting) return;

    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting login for:', email);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (signInError) {
        console.error('Supabase sign in error:', signInError);
        
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos. Verifique suas credenciais.');
        } else if (signInError.message.includes('too_many_requests')) {
          setError('Muitas tentativas de login. Tente novamente em alguns minutos.');
        } else if (signInError.message.includes('email_not_confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada.');
        } else {
          setError(signInError.message);
        }
        return;
      }

      if (data?.user) {
        // Verificar se usuário existe no profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, email, role, client_id')
          .eq('id', data.user.id)
          .single();

        if (!profile) {
          setError('Usuário não encontrado no sistema. Entre em contato com o administrador.');
          await supabase.auth.signOut();
          return;
        }

        // Verificar se perfil tem client_id e se o cliente está ativo
        if (profile.client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('status')
            .eq('id', profile.client_id)
            .maybeSingle();

          if (clientData && clientData.status !== 'active') {
            setError('Sua conta foi desativada. Entre em contato com o administrador.');
            await supabase.auth.signOut();
            return;
          }
        }
      }

      console.log('Login realizado com sucesso!');
      // O redirecionamento será feito automaticamente pelo useEffect que monitora o user
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const userTypeInfo = getUserTypeInfo();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BrandedHeader className="justify-center" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{brandingSettings.loginPageTitle}</h1>
          <p className="text-muted-foreground mt-2">{brandingSettings.loginPageSubtitle}</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Fazer Login</CardTitle>
            <CardDescription className="text-center">
              Digite seu email e o sistema detectará automaticamente seu tipo de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Indicador de tipo de usuário detectado */}
            {detectedUserType && userTypeInfo.icon && (
              <div className="flex items-center justify-center p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <userTypeInfo.icon className="h-5 w-5 text-primary mr-2" />
                <div className="text-center">
                  <p className="font-medium text-sm">{userTypeInfo.label}</p>
                  <p className="text-xs text-muted-foreground">{userTypeInfo.description}</p>
                </div>
              </div>
            )}

            {isDetecting && (
              <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Detectando tipo de usuário...</span>
              </div>
            )}

            {!detectedUserType && !isDetecting && email && (
              <div className="text-center text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                {userTypeInfo.description}
              </div>
            )}

            {/* Mostrar erro de cliente inativo via componente específico */}
            <InactiveClientAlert />
            
            {/* Mostrar outros erros que não sejam de cliente inativo */}
            {(error && !error.includes('desativada')) && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link 
                  to="/auth/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || isDetecting}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>

            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                Precisa de acesso? Entre em contato com o administrador.
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-muted-foreground">
          {brandingSettings.footerText}
        </div>
      </div>
    </div>
  );
};

export default Login;