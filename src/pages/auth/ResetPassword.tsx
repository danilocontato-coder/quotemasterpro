import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasValidToken, setHasValidToken] = useState<boolean | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const validateToken = async () => {
      setIsCheckingToken(true);

      // Ler parâmetros do hash (#...)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const hashType = hashParams.get('type');

      // Ler parâmetros da query (?...)
      const queryType = searchParams.get('type');
      const queryToken = searchParams.get('token');
      const code = searchParams.get('code');
      const urlError = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Se veio erro explícito na URL
      if (urlError === 'token_expired' || urlError === 'invalid_token' || errorDescription?.includes('expired')) {
        setHasValidToken(false);
        setError('Seu link de redefinição expirou ou é inválido. Solicite um novo link.');
        setIsCheckingToken(false);
        return;
      }

      try {
        // Fluxo 1: Se há code (PKCE), trocar por sessão
        if (code) {
          console.log('🔄 PKCE code -> exchangeCodeForSession');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchangeError || !data.session) {
            console.error('❌ exchangeCodeForSession failed:', exchangeError);
            setHasValidToken(false);
            setError('Link de recuperação inválido ou expirado. Solicite um novo.');
            setIsCheckingToken(false);
            return;
          }
          
          console.log('✅ Sessão criada via PKCE');
          setHasValidToken(true);
          setIsCheckingToken(false);
          
          // Limpar URL
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        // Fluxo 2: Se há access_token + refresh_token no hash e type=recovery
        if (accessToken && refreshToken && hashType === 'recovery') {
          console.log('🔄 Hash tokens -> setSession');
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (sessionError || !data.session) {
            console.error('❌ setSession failed:', sessionError);
            setHasValidToken(false);
            setError('Link de recuperação inválido ou expirado. Solicite um novo.');
            setIsCheckingToken(false);
            return;
          }
          
          console.log('✅ Sessão criada via hash tokens');
          setHasValidToken(true);
          setIsCheckingToken(false);
          
          // Limpar URL
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        // Fluxo 3: Se há token na query com type=recovery
        if (queryToken && queryType === 'recovery') {
          console.log('🔄 Query token -> verifyOtp');
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: queryToken
          });
          
          if (verifyError || !data.session) {
            console.error('❌ verifyOtp failed:', verifyError);
            setHasValidToken(false);
            setError('Link de recuperação inválido ou expirado. Solicite um novo.');
            setIsCheckingToken(false);
            return;
          }
          
          console.log('✅ Sessão criada via query token');
          setHasValidToken(true);
          setIsCheckingToken(false);
          
          // Limpar URL
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        // Fluxo 4: Verificar sessão existente
        console.log('🔍 Session encontrada via getSession');
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          console.log('✅ Sessão existente encontrada');
          setHasValidToken(true);
          setIsCheckingToken(false);
          
          // Limpar tokens da URL se existirem
          if (accessToken || queryToken) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          return;
        }

        // Fluxo 5: Se há apenas access_token no hash (fallback para compatibilidade)
        if (accessToken && hashType === 'recovery') {
          console.log('⚠️ Usando access_token simples (fallback)');
          setHasValidToken(true);
          setIsCheckingToken(false);
          return;
        }

        // Nenhum token/sessão válido encontrado
        console.log('❌ Nenhum token/sessão válido encontrado');
        setHasValidToken(false);
        setError('Link de recuperação inválido ou expirado. Solicite um novo.');
      } catch (err) {
        console.error('❌ Erro ao validar token:', err);
        setHasValidToken(false);
        setError('Erro ao validar link de recuperação. Tente novamente.');
      } finally {
        setIsCheckingToken(false);
      }
    };

    validateToken();

    // Assinar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          setHasValidToken(true);
          setIsCheckingToken(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'A senha deve ter no mínimo 8 caracteres';
    if (!/[A-Z]/.test(pwd)) return 'A senha deve conter ao menos uma letra maiúscula';
    if (!/[a-z]/.test(pwd)) return 'A senha deve conter ao menos uma letra minúscula';
    if (!/[0-9]/.test(pwd)) return 'A senha deve conter ao menos um número';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validações
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    try {
      // Verificar se há sessão ativa antes de tentar atualizar
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('Sua sessão de recuperação expirou. Gere um novo link e tente novamente.');
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess('Senha redefinida com sucesso! Redirecionando...');
      setTimeout(() => {
        navigate('/auth/login');
      }, 2000);
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Estado de carregamento
  if (isCheckingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Redefinir Senha</CardTitle>
          <CardDescription className="text-center">
            {hasValidToken ? 'Digite sua nova senha abaixo' : 'Link inválido ou expirado'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50 text-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="ml-2">{success}</AlertDescription>
            </Alert>
          )}

          {hasValidToken ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use letras maiúsculas, minúsculas, números e símbolos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Redefinir Senha
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Solicite um novo link de recuperação de senha.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/auth/forgot-password')}
              >
                Voltar para Recuperação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
