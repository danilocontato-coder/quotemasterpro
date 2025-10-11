import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Building2, Users, User, CheckCircle2, Zap, Shield, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getRoleBasedRoute } from '@/contexts/AuthContext';
import { InactiveClientAlert } from '@/components/auth/InactiveClientAlert';
import { BrandedLogo } from '@/components/branding/BrandedLogo';

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
  const { user, isLoading: authLoading } = useAuth();
  const { settings: brandingSettings } = useBranding();

  const from = location.state?.from?.pathname || getRoleBasedRoute('client');

  // Auto redirect when user is authenticated
  useEffect(() => {
    if (user && !authLoading) {
      const storedRedirect = sessionStorage.getItem('redirectAfterLogin');
      if (storedRedirect) {
        console.log('Login: redirectAfterLogin encontrado. Redirecionando para', storedRedirect);
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(storedRedirect, { replace: true });
        return;
      }

      const redirectPath = getRoleBasedRoute(user.role, { supplierId: user.supplierId, clientId: user.clientId });
      console.log('Login: redirecting user', user.email, 'with role', user.role, 'to', redirectPath);
      
      const timeoutId = setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, authLoading, navigate]);

  // Detectar tipo de usuário
  const detectUserType = async (emailValue: string) => {
    if (!emailValue || !emailValue.includes('@')) {
      setDetectedUserType(null);
      return;
    }

    setIsDetecting(true);
    setError('');

    try {
      if (emailValue.includes('admin@')) {
        setDetectedUserType('admin');
        setIsDetecting(false);
        return;
      }

      const [{ data: suppliers }, { data: clients }] = await Promise.all([
        supabase.from('suppliers').select('email').eq('email', emailValue).single(),
        supabase.from('clients').select('email').eq('email', emailValue).single()
      ]);

      if (suppliers) {
        setDetectedUserType('supplier');
      } else if (clients) {
        setDetectedUserType('client');
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', emailValue)
          .single();

        if (profile) {
          setDetectedUserType(profile.role === 'admin' ? 'admin' : 'client');
        } else {
          setDetectedUserType('client');
        }
      }
    } catch (error) {
      console.error('Erro ao detectar tipo de usuário:', error);
      setDetectedUserType('client');
    } finally {
      setIsDetecting(false);
    }
  };

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
        return { label: 'Administrador', icon: User, color: 'text-purple-600 bg-purple-50' };
      case 'supplier':
        return { label: 'Fornecedor', icon: Building2, color: 'text-green-600 bg-green-50' };
      case 'client':
        return { label: 'Cliente', icon: Users, color: 'text-blue-600 bg-blue-50' };
      default:
        return { label: '', icon: null, color: '' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isDetecting) return;

    setIsLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos.');
        } else if (signInError.message.includes('too_many_requests')) {
          setError('Muitas tentativas. Tente novamente em alguns minutos.');
        } else {
          setError(signInError.message);
        }
        return;
      }

      if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, email, role, client_id')
          .eq('id', data.user.id)
          .single();

        if (!profile) {
          setError('Usuário não encontrado no sistema.');
          await supabase.auth.signOut();
          return;
        }

        if (profile.client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('status')
            .eq('id', profile.client_id)
            .maybeSingle();

          if (clientData && clientData.status !== 'active') {
            setError('Sua conta foi desativada.');
            await supabase.auth.signOut();
            return;
          }
        }
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const userTypeInfo = getUserTypeInfo();

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex flex-col items-start gap-4 mb-16">
            <BrandedLogo size="xxl" showCompanyName={false} />
            <p className="text-primary-foreground/80 text-sm">Gestão Inteligente de Cotações</p>
          </div>

          {/* Features */}
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Agilidade nas Cotações</h3>
                <p className="text-primary-foreground/90 text-sm">
                  Envie cotações para múltiplos fornecedores em segundos e receba respostas organizadas
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Segurança & Compliance</h3>
                <p className="text-primary-foreground/90 text-sm">
                  Sistema certificado com proteção de dados e rastreabilidade completa
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Economia Garantida</h3>
                <p className="text-primary-foreground/90 text-sm">
                  Compare propostas automaticamente e economize até 30% nas compras
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Mais de 500 empresas confiam</span>
            </div>
            <p className="text-primary-foreground/80 text-sm">
              Junte-se aos líderes do mercado que já otimizaram seus processos de compras
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center justify-center gap-4 mb-8">
            <BrandedLogo size="xl" showCompanyName={false} />
            <p className="text-muted-foreground text-sm">Gestão de Cotações</p>
          </div>

          <Card className="border-0 shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-foreground">Bem-vindo</h1>
                <p className="text-muted-foreground">Faça login para acessar sua conta</p>
              </div>

              {/* User Type Indicator */}
              {detectedUserType && userTypeInfo.icon && (
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${userTypeInfo.color} animate-fade-in`}>
                  <userTypeInfo.icon className="h-5 w-5" />
                  <span className="font-medium text-sm">{userTypeInfo.label}</span>
                </div>
              )}

              {isDetecting && (
                <div className="flex items-center justify-center p-4 bg-muted/50 rounded-xl">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Identificando...</span>
                </div>
              )}

              <InactiveClientAlert />
              
              {(error && !error.includes('desativada')) && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Link 
                    to="/auth/forgot-password" 
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium" 
                  disabled={isLoading || isDetecting}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>

              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Precisa de acesso? <Link to="/contact" className="text-primary hover:underline font-medium">Entre em contato</Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center mt-6 text-xs text-muted-foreground">
            {brandingSettings.footerText}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
