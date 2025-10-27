import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/systemLogger';
import { Loader2, Save, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TermsManagement: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [version, setVersion] = useState('1.0');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      setIsLoading(true);
      logger.info('admin', 'Carregando termos de uso para edição');

      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'terms_of_use')
        .single();

      if (error) throw error;

      if (data?.setting_value) {
        const termsData = data.setting_value as any;
        setTitle(termsData.title || '');
        setContent(termsData.content || '');
        setVersion(termsData.version || '1.0');
      }

      logger.info('admin', 'Termos carregados com sucesso');
    } catch (error: any) {
      logger.error('admin', 'Erro ao carregar termos', error);
      toast({
        title: "Erro ao carregar",
        description: error.message || "Não foi possível carregar os termos de uso.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e conteúdo são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      logger.info('admin', 'Salvando termos de uso');

      // Incrementar versão automaticamente
      const versionParts = version.split('.');
      const newVersion = `${versionParts[0]}.${parseInt(versionParts[1] || '0') + 1}`;

      const termsData = {
        title: title.trim(),
        content: content.trim(),
        version: newVersion,
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_value: termsData,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'terms_of_use');

      if (error) throw error;

      // Log de auditoria
      await supabase.from('audit_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'TERMS_UPDATED',
        entity_type: 'system_settings',
        entity_id: 'terms_of_use',
        panel_type: 'admin',
        details: {
          old_version: version,
          new_version: newVersion,
          title: title.trim()
        }
      });

      setVersion(newVersion);
      logger.info('admin', 'Termos atualizados', { new_version: newVersion });

      toast({
        title: "Termos atualizados",
        description: `Versão ${newVersion} salva com sucesso.`,
      });
    } catch (error: any) {
      logger.error('admin', 'Erro ao salvar termos', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar os termos de uso.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderPreview = () => {
    return (
      <div className="prose prose-sm max-w-none">
        <h2 className="text-2xl font-bold mb-4">{title || "Título do termo"}</h2>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {content.split('\n').map((line, i) => {
            if (line.startsWith('### ')) {
              return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.replace('### ', '')}</h3>;
            }
            if (line.startsWith('## ')) {
              return <h2 key={i} className="text-xl font-bold mt-6 mb-3">{line.replace('## ', '')}</h2>;
            }
            if (line.startsWith('- ')) {
              return <li key={i} className="ml-4">{line.replace('- ', '')}</li>;
            }
            if (line.startsWith('---')) {
              return <hr key={i} className="my-4" />;
            }
            if (line.startsWith('**') && line.endsWith('**')) {
              return <p key={i} className="font-bold mt-2">{line.replace(/\*\*/g, '')}</p>;
            }
            if (line.trim() === '') {
              return <br key={i} />;
            }
            return <p key={i} className="mb-2">{line}</p>;
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gerenciamento de Termos de Uso</h1>
        <p className="text-muted-foreground mt-2">
          Edite os termos de uso exibidos aos usuários no primeiro acesso
        </p>
      </div>

      <Tabs defaultValue="editor" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="editor">
            <Save className="mr-2 h-4 w-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="mr-2 h-4 w-4" />
            Prévia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Editar Termos</CardTitle>
              <CardDescription>
                Use Markdown básico para formatação (##, ###, -, ---, **texto**)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Termos de Uso da Plataforma Cotiz"
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">Versão Atual</Label>
                  <Input
                    id="version"
                    value={version}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    A versão será incrementada automaticamente ao salvar
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="## Seção 1&#10;### Subseção&#10;- Item 1&#10;- Item 2"
                    rows={20}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use ## para títulos, ### para subtítulos, - para listas, --- para linha horizontal
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving || !title.trim() || !content.trim()}
                className="w-full sm:w-auto"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Salvar Termos
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Prévia dos Termos</CardTitle>
              <CardDescription>
                Visualize como os termos serão exibidos aos usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {renderPreview()}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TermsManagement;
