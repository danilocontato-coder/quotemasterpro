import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBranding } from '@/contexts/BrandingContext';
import { 
  Upload, Save, Eye, Building2, DollarSign, Palette, 
  Type, Image as ImageIcon, Globe, RefreshCw, AlertTriangle 
} from 'lucide-react';

export default function BrandSettings() {
  const { toast } = useToast();
  const { settings, isLoading: brandingLoading, updateSettings, resetToDefaults } = useBranding();
  const [isUploading, setIsUploading] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  // Sincronizar settings locais com o contexto
  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
    } catch (error) {
      // Error já tratado no contexto
    }
  };

  const handleReset = async () => {
    if (confirm('Tem certeza de que deseja restaurar todas as configurações para os valores padrão?')) {
      await resetToDefaults();
      setLocalSettings(settings);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>, 
    type: 'logo' | 'favicon'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // Upload para o storage do Supabase
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(`branding/${fileName}`, file);

      if (error) throw error;

      // Obter URL pública
      const { data: publicUrl } = supabase.storage
        .from('attachments')
        .getPublicUrl(`branding/${fileName}`);

      setLocalSettings(prev => ({ 
        ...prev, 
        [type]: publicUrl.publicUrl 
      }));

      toast({
        title: "Sucesso!",
        description: `${type === 'logo' ? 'Logo' : 'Favicon'} carregado com sucesso.`
      });

    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: `Erro ao carregar ${type === 'logo' ? 'logo' : 'favicon'}.`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações de Marca</h1>
          <p className="text-muted-foreground">
            Configure completamente a marca da sua plataforma para whitelabel
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleReset}
          disabled={brandingLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Restaurar Padrão
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          As alterações serão aplicadas globalmente em todo o sistema. 
          Para ver todas as mudanças, recarregue a página após salvar.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identidade da Marca */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Identidade da Marca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                value={localSettings.companyName}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Nome da sua empresa"
              />
            </div>

            <div className="space-y-2">
              <Label>Logo da Empresa</Label>
              <div className="flex gap-2">
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'logo')}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  disabled={isUploading}
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Logo
                </Button>
                {localSettings.logo !== '/placeholder.svg' && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(localSettings.logo, '_blank')}
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Favicon</Label>
              <div className="flex gap-2">
                <Input
                  id="favicon-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'favicon')}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('favicon-upload')?.click()}
                  disabled={isUploading}
                  size="sm"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Favicon
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                PNG recomendado, 32x32px
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Esquema de Cores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Esquema de Cores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'primaryColor', label: 'Cor Primária', desc: 'Botões, links, destaques' },
              { key: 'secondaryColor', label: 'Cor Secundária', desc: 'Fundos, cards' },
              { key: 'accentColor', label: 'Cor de Destaque', desc: 'Elementos especiais' }
            ].map(({ key, label, desc }) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={localSettings[key as keyof typeof localSettings] as string}
                    onChange={(e) => setLocalSettings(prev => ({ 
                      ...prev, 
                      [key]: e.target.value 
                    }))}
                    className="w-12 h-8 p-1"
                  />
                  <div className="flex-1">
                    <Input
                      value={localSettings[key as keyof typeof localSettings] as string}
                      onChange={(e) => setLocalSettings(prev => ({ 
                        ...prev, 
                        [key]: e.target.value 
                      }))}
                      className="mb-1"
                    />
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Textos Personalizados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Textos Personalizados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loginTitle">Título da Página de Login</Label>
              <Input
                id="loginTitle"
                value={localSettings.loginPageTitle}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  loginPageTitle: e.target.value 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loginSubtitle">Subtítulo da Página de Login</Label>
              <Input
                id="loginSubtitle"
                value={localSettings.loginPageSubtitle}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  loginPageSubtitle: e.target.value 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Mensagem de Boas-vindas</Label>
              <Input
                id="welcomeMessage"
                value={localSettings.dashboardWelcomeMessage}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  dashboardWelcomeMessage: e.target.value 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footerText">Texto do Rodapé</Label>
              <Input
                id="footerText"
                value={localSettings.footerText}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  footerText: e.target.value 
                }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CSS Customizado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            CSS Personalizado (Avançado)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="customCss">CSS Personalizado</Label>
            <Textarea
              id="customCss"
              value={localSettings.customCss || ''}
              onChange={(e) => setLocalSettings(prev => ({ 
                ...prev, 
                customCss: e.target.value 
              }))}
              placeholder="/* Adicione seu CSS personalizado aqui */
.custom-header {
  background: linear-gradient(135deg, #your-color, #another-color);
}"
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              CSS avançado para personalizações específicas. Use com cuidado.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visualização das Alterações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header Preview */}
          <div>
            <h4 className="font-semibold mb-2">Cabeçalho do Sistema:</h4>
            <div 
              className="p-4 rounded-lg text-white"
              style={{ backgroundColor: localSettings.primaryColor }}
            >
              <div className="flex items-center gap-3">
                {localSettings.logo !== '/placeholder.svg' ? (
                  <img 
                    src={localSettings.logo} 
                    alt="Logo" 
                    className="h-8 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                ) : (
                  <div className="h-8 w-16 bg-white/20 rounded flex items-center justify-center">
                    <Building2 className="h-4 w-4" />
                  </div>
                )}
                <h3 className="text-lg font-bold">{localSettings.companyName}</h3>
              </div>
            </div>
          </div>

          {/* Login Preview */}
          <div>
            <h4 className="font-semibold mb-2">Página de Login:</h4>
            <div className="border rounded-lg p-4 space-y-2">
              <h5 className="text-lg font-bold">{localSettings.loginPageTitle}</h5>
              <p className="text-muted-foreground">{localSettings.loginPageSubtitle}</p>
              <div className="text-xs text-muted-foreground mt-4">
                {localSettings.footerText}
              </div>
            </div>
          </div>

          {/* Cards Preview */}
          <div>
            <h4 className="font-semibold mb-2">Elementos da Interface:</h4>
            <div className="grid grid-cols-3 gap-4">
              <div 
                className="rounded-lg p-3 text-white text-center"
                style={{ backgroundColor: localSettings.primaryColor }}
              >
                <div className="font-bold">Primária</div>
                <div className="text-xs opacity-90">Botões principais</div>
              </div>
              <div 
                className="rounded-lg p-3 border text-center"
                style={{ 
                  backgroundColor: localSettings.secondaryColor,
                  borderColor: localSettings.primaryColor + '20' 
                }}
              >
                <div className="font-bold">Secundária</div>
                <div className="text-xs opacity-70">Cards e fundos</div>
              </div>
              <div 
                className="rounded-lg p-3 text-white text-center"
                style={{ backgroundColor: localSettings.accentColor }}
              >
                <div className="font-bold">Destaque</div>
                <div className="text-xs opacity-90">Elementos especiais</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-4">
        <Button 
          variant="outline"
          onClick={() => setLocalSettings(settings)}
          disabled={brandingLoading}
        >
          Cancelar Alterações
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={brandingLoading || isUploading}
          className="min-w-32"
        >
          <Save className="h-4 w-4 mr-2" />
          {brandingLoading ? 'Salvando...' : 'Aplicar Branding'}
        </Button>
      </div>
    </div>
  );
}