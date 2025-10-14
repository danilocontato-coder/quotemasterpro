import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Mail, Lock, User, Phone, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBranding } from '@/contexts/BrandingContext';

const SupplierAuth = () => {
  const { quoteId, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useBranding();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('register'); // Começar na aba de cadastro
  const [supplierEmail, setSupplierEmail] = useState<string>('');
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  const [registerData, setRegisterData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    password: '',
    confirmPassword: ''
  });

  // Validar token e buscar dados do fornecedor
  useEffect(() => {
    if (!quoteId || !token) {
      toast({ title: 'Link inválido', description: 'Parâmetros ausentes no link.', variant: 'destructive' });
      navigate('/');
      return;
    }
    
    // Validate token and fetch supplier email
    const validateToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('validate-quote-token', {
          body: { quote_id: quoteId, token }
        });
        
        if (error || !data?.valid) {
          toast({ 
            title: 'Link inválido', 
            description: data?.error || 'Token expirado ou inválido.', 
            variant: 'destructive' 
          });
          navigate('/');
          return;
        }
        
        console.log('Token validated successfully:', data);
        
        // Usar dados do fornecedor retornados pela edge function (bypassa RLS)
        if (data.supplier) {
          const supplier = data.supplier;
          console.log('✅ Supplier data received from edge function:', supplier.name);
          
          setSupplierEmail(supplier.email);
          // Pré-preencher TODOS os dados disponíveis
          setRegisterData(prev => ({ 
            ...prev, 
            email: supplier.email,
            name: supplier.name || '',
            cnpj: supplier.cnpj || '',
            phone: supplier.phone || '',
            city: supplier.city || '',
            state: supplier.state || ''
          }));
          setLoginData(prev => ({ ...prev, email: supplier.email }));
        } else {
          console.log('ℹ️ No supplier data in quote - user can register with any email');
        }
        
        localStorage.setItem('supplier_quote_context', JSON.stringify({ 
          quoteId, 
          token, 
          quoteInfo: data.quote,
          ts: Date.now() 
        }));
      } catch (error) {
        console.error('Token validation error:', error);
        // Continue anyway for backwards compatibility
        localStorage.setItem('supplier_quote_context', JSON.stringify({ quoteId, token, ts: Date.now() }));
      }
    };
    
    validateToken();
  }, [quoteId, token, navigate, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      if (error) throw error;

      // Tentar identificar perfil e auto-completar onboarding se necessário
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, supplier_id, onboarding_completed')
        .eq('id', data.user.id)
        .maybeSingle();

      // Auto-completar onboarding se fornecedor já vinculado mas onboarding incompleto
      if (profile?.supplier_id && !profile?.onboarding_completed) {
        console.log('🔧 Auto-completando onboarding para fornecedor já vinculado');
        await supabase
          .from('profiles')
          .update({ 
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.user.id);
      }

      if (!profile || profile.role !== 'supplier') {
        toast({
          title: 'Acesso via link',
          description: 'Conta não marcada como fornecedor. Prosseguiremos pelo link recebido.',
        });
      }

      try { localStorage.setItem('supplier_quote_context', JSON.stringify({ quoteId, token, email: loginData.email, ts: Date.now() })); } catch {}


      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso!"
      });

      // Redirecionar para resposta da cotação (resposta rápida)
      navigate(`/supplier/quick-response/${quoteId}/${token}`);
      
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer login",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerData.name || !registerData.email || !registerData.password) {
      toast({
        title: "Erro", 
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Erro",
        description: "Senhas não coincidem",
        variant: "destructive"
      });
      return;
    }

    if (registerData.password.length < 6) {
      toast({
        title: "Erro",
        description: "Senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // PASSO 1: Buscar dados da cotação do localStorage (já validados pela edge function)
      const storedContext = localStorage.getItem('supplier_quote_context');
      let targetSupplierId = null;
      
      if (!storedContext) {
        throw new Error('Contexto da cotação não encontrado. Tente acessar o link novamente.');
      }

      const context = JSON.parse(storedContext);
      
      // Verificar se há um fornecedor pré-cadastrado (do supplierEmail state)
      if (supplierEmail) {
        // Validar se o email do registro corresponde ao email do fornecedor pré-cadastrado
        if (supplierEmail.toLowerCase() === registerData.email.toLowerCase()) {
          // Buscar o supplier_id usando SERVICE_ROLE através de uma query simples
          // Como já temos o email validado, podemos buscar o supplier
          const { data: existingSupplier } = await supabase
            .from('suppliers')
            .select('id')
            .eq('email', supplierEmail)
            .maybeSingle();
          
          if (existingSupplier) {
            targetSupplierId = existingSupplier.id;
            console.log('✅ Email corresponde ao fornecedor pré-cadastrado:', targetSupplierId);
          }
        } else {
          toast({
            title: "Email não corresponde",
            description: `Esta cotação foi enviada para ${supplierEmail}. Use esse email para se cadastrar.`,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      }

      // PASSO 2: Registrar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/supplier/quick-response/${quoteId}/${token}`,
          data: {
            name: registerData.name,
            role: 'supplier'
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Guardar contexto do link para uso após confirmação de e-mail
        try { localStorage.setItem('supplier_quote_context', JSON.stringify({ quoteId, token, email: registerData.email, ts: Date.now() })); } catch {}

        if (authData.session) {
          // PASSO 3: GARANTIR que role seja 'supplier' ANTES de vincular
          // Atualizar profile primeiro com role=supplier
          await supabase
            .from('profiles')
            .update({ 
              role: 'supplier',
              tenant_type: 'supplier'
            })
            .eq('id', authData.user.id);
          
          // PASSO 4: Vincular ao fornecedor existente ou criar novo
          if (targetSupplierId) {
            // Vincular ao fornecedor existente
            console.log('🔗 Vinculando profile ao fornecedor existente:', targetSupplierId);
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: authData.user.id,
                email: registerData.email.toLowerCase().trim(),
                name: registerData.name.trim() || 'Fornecedor',
                role: 'supplier',
                tenant_type: 'supplier',
                supplier_id: targetSupplierId,
                onboarding_completed: true,
                active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'id',
                ignoreDuplicates: false
              });
            if (profileError) throw profileError;

            toast({ 
              title: 'Conta vinculada!', 
              description: 'Sua conta foi vinculada ao fornecedor cadastrado.' 
            });
          } else {
            // Criar novo fornecedor se não houver um vinculado à cotação
            console.log('🆕 Criando novo fornecedor para email:', registerData.email);
            const { data: supplier, error: supplierError } = await supabase
              .from('suppliers')
              .insert({
                name: registerData.name,
                cnpj: registerData.cnpj,
                email: registerData.email,
                phone: registerData.phone,
                city: registerData.city,
                state: registerData.state,
                status: 'active',
                type: 'local'
              })
              .select('id')
              .single();
            if (supplierError) throw supplierError;

            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: authData.user.id,
                email: registerData.email.toLowerCase().trim(),
                name: registerData.name.trim() || 'Fornecedor',
                role: 'supplier',
                tenant_type: 'supplier',
                supplier_id: supplier.id,
                onboarding_completed: true,
                active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'id',
                ignoreDuplicates: false
              });
            if (profileError) throw profileError;

            toast({ title: 'Sucesso', description: 'Cadastro realizado e sessão criada.' });
          }

          // ⚠️ CRITICAL: Forçar reload do auth para pegar role atualizado
          await supabase.auth.refreshSession();
          
          navigate(`/supplier/quick-response/${quoteId}/${token}`);
        } else {
          // Sem sessão (confirmação de e-mail exigida): orientar próximo passo
          toast({
            title: 'Verifique seu e-mail',
            description: 'Enviamos um link de confirmação. Após confirmar, volte a este link para responder a cotação.',
          });
        }
      }
      
    } catch (error: any) {
      console.error('Register error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8">
      <div className="container mx-auto px-4 max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">{settings.companyName}</h1>
          <p className="text-muted-foreground">Acesso para Fornecedores</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              Responder Cotação
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Se você já tem uma conta, faça <strong>login</strong>.<br />
              Se é a primeira vez, clique em <strong>Cadastrar</strong> usando o email para o qual a cotação foi enviada.
            </p>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="loginEmail">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="loginEmail"
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                        placeholder="seu@email.com"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="loginPassword">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="loginPassword"
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                        placeholder="Sua senha"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  {supplierEmail && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm space-y-2">
                      <p className="text-primary font-medium">✅ Dados pré-preenchidos pelo cliente</p>
                      <p className="text-muted-foreground text-xs">
                        Os dados abaixo foram fornecidos pelo cliente que enviou a cotação. 
                        Por favor, <strong>confirme ou atualize</strong> as informações conforme necessário.
                      </p>
                      <p className="text-primary text-xs font-medium">📧 Email: {supplierEmail}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="registerName">Nome da Empresa *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerName"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                        placeholder="Razão social"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="registerCnpj">CNPJ</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerCnpj"
                        value={registerData.cnpj}
                        onChange={(e) => setRegisterData({...registerData, cnpj: e.target.value})}
                        placeholder="00.000.000/0000-00"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="registerEmail">E-mail *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerEmail"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                        placeholder="contato@empresa.com"
                        className="pl-10"
                        disabled={loading || !!supplierEmail}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="registerPhone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerPhone"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({...registerData, phone: e.target.value})}
                        placeholder="(11) 99999-9999"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="registerCity">Cidade</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="registerCity"
                          value={registerData.city}
                          onChange={(e) => setRegisterData({...registerData, city: e.target.value})}
                          placeholder="Cidade"
                          className="pl-10"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="registerState">Estado</Label>
                      <Input
                        id="registerState"
                        value={registerData.state}
                        onChange={(e) => setRegisterData({...registerData, state: e.target.value})}
                        placeholder="UF"
                        disabled={loading}
                        maxLength={2}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="registerPassword">Senha *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerPassword"
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                        placeholder="Mínimo 6 caracteres"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                        placeholder="Confirme sua senha"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Cadastrando...' : 'Criar Conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>Ao continuar, você concorda com nossos termos de uso.</p>
        </div>
      </div>
    </div>
  );
};

export default SupplierAuth;