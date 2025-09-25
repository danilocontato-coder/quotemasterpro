import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBranding } from '@/contexts/BrandingContext';
import { useToast } from '@/hooks/use-toast';
import { Palette, Upload, RotateCcw, Save } from 'lucide-react';

export const BrandingSettings = () => {
  const { settings, updateSettings, resetToDefaults, isLoading } = useBranding();
  const { toast } = useToast();
  
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Atualizar configurações locais quando as settings mudarem
  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSettings(localSettings);
    } catch (error) {
      console.error('Erro ao salvar branding:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await resetToDefaults();
      setLocalSettings(settings);
    } catch (error) {
      console.error('Erro ao resetar branding:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" />
            Configurações de Branding
          </h1>
          <p className="text-muted-foreground mt-1">
            Personalize a identidade visual da sua plataforma
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isResetting || isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {isResetting ? 'Resetando...' : 'Resetar'}
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={isSaving || isResetting}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      {/* Identidade da Marca */}
      <Card>
        <CardHeader>
          <CardTitle>Identidade da Marca</CardTitle>
          <CardDescription>
            Defina o nome da empresa e elementos visuais principais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="companyName">Nome da Empresa</Label>
            <Input
              id="companyName"
              value={localSettings.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              placeholder="Ex: Minha Empresa Ltda"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="logo">URL do Logo</Label>
              <Input
                id="logo"
                value={localSettings.logo}
                onChange={(e) => handleInputChange('logo', e.target.value)}
                placeholder="https://exemplo.com/logo.png"
              />
            </div>
            
            <div>
              <Label htmlFor="favicon">URL do Favicon</Label>
              <Input
                id="favicon"
                value={localSettings.favicon}
                onChange={(e) => handleInputChange('favicon', e.target.value)}
                placeholder="https://exemplo.com/favicon.ico"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Esquema de Cores */}
      <Card>
        <CardHeader>
          <CardTitle>Esquema de Cores</CardTitle>
          <CardDescription>
            Personalize as cores da interface de usuário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="primaryColor">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={localSettings.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={localSettings.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  placeholder="#003366"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="secondaryColor">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={localSettings.secondaryColor}
                  onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={localSettings.secondaryColor}
                  onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                  placeholder="#F5F5F5"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="accentColor">Cor de Destaque</Label>
              <div className="flex gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={localSettings.accentColor}
                  onChange={(e) => handleInputChange('accentColor', e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={localSettings.accentColor}
                  onChange={(e) => handleInputChange('accentColor', e.target.value)}
                  placeholder="#0066CC"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Textos Personalizados */}
      <Card>
        <CardHeader>
          <CardTitle>Textos Personalizados</CardTitle>
          <CardDescription>
            Configure mensagens e textos exibidos na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="loginPageTitle">Título da Página de Login</Label>
            <Input
              id="loginPageTitle"
              value={localSettings.loginPageTitle}
              onChange={(e) => handleInputChange('loginPageTitle', e.target.value)}
              placeholder="Bem-vindo à nossa plataforma"
            />
          </div>

          <div>
            <Label htmlFor="loginPageSubtitle">Subtítulo da Página de Login</Label>
            <Input
              id="loginPageSubtitle"
              value={localSettings.loginPageSubtitle}
              onChange={(e) => handleInputChange('loginPageSubtitle', e.target.value)}
              placeholder="Sua solução completa"
            />
          </div>

          <div>
            <Label htmlFor="footerText">Texto do Rodapé</Label>
            <Input
              id="footerText"
              value={localSettings.footerText}
              onChange={(e) => handleInputChange('footerText', e.target.value)}
              placeholder="© 2025 Minha Empresa. Todos os direitos reservados."
            />
          </div>

          <div>
            <Label htmlFor="dashboardWelcomeMessage">Mensagem de Boas-vindas do Dashboard</Label>
            <Input
              id="dashboardWelcomeMessage"
              value={localSettings.dashboardWelcomeMessage}
              onChange={(e) => handleInputChange('dashboardWelcomeMessage', e.target.value)}
              placeholder="Bem-vindo de volta!"
            />
          </div>
        </CardContent>
      </Card>

      {/* CSS Personalizado */}
      <Card>
        <CardHeader>
          <CardTitle>CSS Personalizado</CardTitle>
          <CardDescription>
            Adicione estilos CSS customizados para personalizações avançadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="customCss">Código CSS</Label>
            <Textarea
              id="customCss"
              value={localSettings.customCss || ''}
              onChange={(e) => handleInputChange('customCss', e.target.value)}
              placeholder="/* Seu CSS personalizado aqui */
.custom-class {
  color: #000;
}"
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ Use com cuidado. CSS inválido pode afetar a aparência da plataforma.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Visualização das Alterações */}
      <Card>
        <CardHeader>
          <CardTitle>Visualização das Alterações</CardTitle>
          <CardDescription>
            Preview das configurações aplicadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="p-6 rounded-lg border-2 border-dashed"
            style={{
              backgroundColor: localSettings.secondaryColor,
              color: localSettings.primaryColor,
              borderColor: localSettings.accentColor,
            }}
          >
            <h3 
              className="text-xl font-bold mb-2"
              style={{ color: localSettings.primaryColor }}
            >
              {localSettings.companyName}
            </h3>
            <p className="mb-4">{localSettings.loginPageTitle}</p>
            <p className="text-sm opacity-75">{localSettings.loginPageSubtitle}</p>
            <div className="mt-4 pt-4 border-t border-current/20">
              <p className="text-xs">{localSettings.footerText}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandingSettings;