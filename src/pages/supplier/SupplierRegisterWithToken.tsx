import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Phone, MapPin, FileText, Loader2 } from 'lucide-react';

export default function SupplierRegisterWithToken() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [supplierData, setSupplierData] = useState<any>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    cnpj: '',
    phone: '',
    city: '',
    state: ''
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setValidating(true);
      
      console.log('🔍 Validating token via edge function:', token);
      
      // ✅ Usar edge function que bypassa RLS
      const { data, error } = await supabase.functions.invoke('validate-quote-token', {
        body: { token }
      });

      console.log('📦 Token validation response:', { data, error });

      if (error || !data?.valid) {
        console.error('❌ Token validation failed:', error || data?.error);
        toast({
          title: data?.expired ? 'Link expirado' : 'Link inválido',
          description: data?.error || 'Link de cadastro inválido ou expirado.',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      console.log('✅ Token valid, supplier data:', data.supplier);

      // Edge function retorna supplier e quote dados completos
      setSupplierData(data.supplier);
      setQuoteId(data.quote_id);
      
      // Pré-preencher formulário com dados do supplier
      setFormData({
        cnpj: data.supplier?.cnpj || '',
        phone: data.supplier?.phone || '',
        city: data.supplier?.city || '',
        state: data.supplier?.state || ''
      });

    } catch (error) {
      console.error('💥 Erro ao validar convite:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao validar convite.',
        variant: 'destructive'
      });
      navigate('/');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      console.log('🚀 Completing registration for token:', token);

      // Chamar edge function de registro completo
      const { data, error } = await supabase.functions.invoke('complete-supplier-registration', {
        body: {
          invitation_token: token,
          supplier_data: {
            cnpj: formData.cnpj,
            phone: formData.phone,
            city: formData.city,
            state: formData.state
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao completar cadastro');
      }

      console.log('✅ Registration completed:', data);

      // Fazer login automático com a sessão retornada
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });

      if (setSessionError) {
        console.error('Session set error:', setSessionError);
        throw setSessionError;
      }

      toast({
        title: 'Cadastro concluído! 🎉',
        description: data.whatsapp_sent 
          ? 'Suas credenciais foram enviadas por WhatsApp. Você já pode responder a cotação!'
          : 'Cadastro concluído! Você já pode responder a cotação.'
      });

      // Redirecionar para a cotação que motivou o cadastro
      if (data.quote_id && token) {
        console.log('📍 Redirecting to quote:', data.quote_id);
        navigate(`/supplier/quick-response/${data.quote_id}/${token}`);
      } else {
        navigate('/supplier/dashboard');
      }

    } catch (error: any) {
      console.error('Erro no registro:', error);
      toast({
        title: 'Erro no cadastro',
        description: error.message || 'Não foi possível completar o cadastro.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Validando convite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8">
      <div className="container mx-auto px-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Building2 className="w-6 h-6" />
              Complete seu Cadastro
            </CardTitle>
            {supplierData && (
              <div className="mt-4 p-4 bg-primary/10 rounded-lg space-y-2">
                <p className="text-sm font-medium text-primary">{supplierData.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  {supplierData.email}
                </div>
                <div className="mt-3 pt-3 border-t border-primary/20">
                  <p className="text-xs text-muted-foreground">
                    ✅ Após completar o cadastro, você receberá suas credenciais por WhatsApp 
                    e será direcionado automaticamente para responder a cotação.
                  </p>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Complete os dados opcionais (recomendado)
                </h3>
                
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                      placeholder="00.000.000/0000-00"
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Telefone/WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="(00) 00000-0000"
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        placeholder="Cidade"
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="state">UF</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value.toUpperCase()})}
                      placeholder="BA"
                      maxLength={2}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    🔑 <strong>Senha temporária será gerada automaticamente</strong> e enviada 
                    para seu WhatsApp junto com as instruções de acesso.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Finalizando cadastro...
                    </>
                  ) : (
                    'Completar Cadastro e Responder Cotação'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
