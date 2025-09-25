import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Save, Eye, Building2, DollarSign } from 'lucide-react';

export default function BrandSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    companyName: 'QuoteMaster Pro',
    logo: '/placeholder.svg',
    primaryColor: '#003366',
    secondaryColor: '#F5F5F5'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['company_name', 'company_logo', 'primary_color', 'secondary_color']);
      
      if (data) {
        const newSettings = { ...settings };
        data.forEach(item => {
          switch (item.setting_key) {
            case 'company_name':
              newSettings.companyName = (item.setting_value as any)?.value || 'QuoteMaster Pro';
              break;
            case 'company_logo':
              newSettings.logo = (item.setting_value as any)?.url || '/placeholder.svg';
              break;
            case 'primary_color':
              newSettings.primaryColor = (item.setting_value as any)?.color || '#003366';
              break;
            case 'secondary_color':
              newSettings.secondaryColor = (item.setting_value as any)?.color || '#F5F5F5';
              break;
          }
        });
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const updates = [
        {
          setting_key: 'company_name',
          setting_value: { value: settings.companyName },
          description: 'Nome da empresa'
        },
        {
          setting_key: 'company_logo',
          setting_value: { url: settings.logo },
          description: 'Logo da empresa'
        },
        {
          setting_key: 'primary_color',
          setting_value: { color: settings.primaryColor },
          description: 'Cor primária'
        },
        {
          setting_key: 'secondary_color',
          setting_value: { color: settings.secondaryColor },
          description: 'Cor secundária'
        }
      ];

      for (const update of updates) {
        await supabase
          .from('system_settings')
          .upsert(update, { onConflict: 'setting_key' });
      }

      toast({
        title: "Sucesso!",
        description: "Configurações de marca salvas com sucesso."
      });

    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      
      // Upload para o storage do Supabase
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(`logos/${fileName}`, file);

      if (error) throw error;

      // Obter URL pública
      const { data: publicUrl } = supabase.storage
        .from('attachments')
        .getPublicUrl(`logos/${fileName}`);

      setSettings(prev => ({ ...prev, logo: publicUrl.publicUrl }));

      toast({
        title: "Sucesso!",
        description: "Logo carregado com sucesso."
      });

    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar logo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações de Marca</h1>
          <p className="text-muted-foreground">
            Configure o nome, logo e cores da sua empresa
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Nome da sua empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo da Empresa</Label>
              <div className="flex gap-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('logo')?.click()}
                  disabled={isLoading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Carregar Logo
                </Button>
                {settings.logo !== '/placeholder.svg' && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(settings.logo, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Formatos aceitos: PNG, JPG, SVG. Tamanho recomendado: 200x60px
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Cor Primária</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={settings.primaryColor}
                    onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                    placeholder="#003366"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Cor Secundária</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => setSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={settings.secondaryColor}
                    onChange={(e) => setSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    placeholder="#F5F5F5"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={saveSettings} 
              disabled={isLoading}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visualização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Header Preview */}
            <div 
              className="p-4 rounded-lg text-white"
              style={{ backgroundColor: settings.primaryColor }}
            >
              <div className="flex items-center gap-3">
                {settings.logo !== '/placeholder.svg' ? (
                  <img 
                    src={settings.logo} 
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
                <h3 className="text-lg font-bold">{settings.companyName}</h3>
              </div>
            </div>

            {/* Report Header Preview */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Preview do Relatório PDF:</h4>
              <div className="space-y-2 text-sm">
                <div 
                  className="p-3 rounded text-white flex items-center gap-2"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  {settings.logo !== '/placeholder.svg' ? (
                    <img 
                      src={settings.logo} 
                      alt="Logo" 
                      className="h-6 w-auto object-contain"
                    />
                  ) : (
                    <Building2 className="h-4 w-4" />
                  )}
                  <span className="font-bold text-sm">{settings.companyName}</span>
                </div>
                <div className="text-center py-2 border-b">
                  <h5 className="font-bold">RELATÓRIO EXECUTIVO DE COMPRAS</h5>
                  <p className="text-xs text-muted-foreground">
                    Período: {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {settings.companyName} - Relatório de Compras | Página 1 de 3
                </div>
              </div>
            </div>

            {/* Card Preview */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Preview de Cards:</h4>
              <div 
                className="rounded-lg p-3"
                style={{ backgroundColor: settings.secondaryColor }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded flex items-center justify-center text-white"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">R$ 125.400</p>
                    <p className="text-sm text-muted-foreground">Total Cotado</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}