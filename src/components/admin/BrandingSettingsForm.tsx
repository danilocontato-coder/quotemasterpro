import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Palette, Upload, Code } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface BrandingSettingsFormProps {
  onSave: (settingsId: string) => void;
  clientId?: string;
  initialData?: {
    companyName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    faviconUrl?: string;
    customCss?: string;
  };
}

export const BrandingSettingsForm: React.FC<BrandingSettingsFormProps> = ({
  onSave,
  clientId,
  initialData
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    companyName: initialData?.companyName || '',
    logoUrl: initialData?.logoUrl || '',
    primaryColor: initialData?.primaryColor || '#003366',
    secondaryColor: initialData?.secondaryColor || '#0066CC',
    accentColor: initialData?.accentColor || '#FF6B35',
    faviconUrl: initialData?.faviconUrl || '',
    customCss: initialData?.customCss || ''
  });

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const settingsData = {
        client_id: clientId || null,
        company_name: formData.companyName,
        logo_url: formData.logoUrl,
        primary_color: formData.primaryColor,
        secondary_color: formData.secondaryColor,
        accent_color: formData.accentColor,
        favicon_url: formData.faviconUrl,
        custom_css: formData.customCss
      };

      const { data, error } = await supabase
        .from('branding_settings')
        .insert(settingsData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Branding salvo',
        description: 'Configurações de branding foram salvas com sucesso'
      });

      onSave(data.id);
    } catch (error) {
      console.error('Erro ao salvar branding:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações de branding',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Identidade Visual
          </CardTitle>
          <CardDescription>
            Configure a aparência da plataforma para esta administradora
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Ex: Administradora ABC"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="logoUrl">URL do Logo</Label>
              <div className="flex gap-2">
                <Input
                  id="logoUrl"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                  placeholder="https://..."
                />
                <Button variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                  placeholder="#003366"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  placeholder="#0066CC"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor">Cor de Destaque</Label>
              <div className="flex gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={formData.accentColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.accentColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
                  placeholder="#FF6B35"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="faviconUrl">URL do Favicon</Label>
            <Input
              id="faviconUrl"
              value={formData.faviconUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, faviconUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            CSS Personalizado (Avançado)
          </CardTitle>
          <CardDescription>
            Adicione estilos CSS customizados para personalização avançada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.customCss}
            onChange={(e) => setFormData(prev => ({ ...prev, customCss: e.target.value }))}
            placeholder=".sidebar { ... }"
            className="font-mono text-sm min-h-[100px]"
          />
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
        {isLoading ? 'Salvando...' : 'Salvar Configurações de Branding'}
      </Button>
    </div>
  );
};
