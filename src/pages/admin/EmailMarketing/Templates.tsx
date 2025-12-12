import { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Sparkles, Crown } from 'lucide-react';
import DOMPurify from 'dompurify';

export default function TemplatesGallery() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase
        .from('email_templates_library')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (data) setTemplates(data);
      setLoading(false);
    };

    fetchTemplates();
  }, []);

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUseTemplate = async (template: any) => {
    // Incrementar contador de uso
    await supabase
      .from('email_templates_library')
      .update({ usage_count: template.usage_count + 1 })
      .eq('id', template.id);

    // Navegar para editor com template
    navigate(`/admin/email-marketing/editor?template=${template.id}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admin/email-marketing')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar ao Dashboard
      </Button>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Galeria de Templates</h1>
          <p className="text-muted-foreground">Escolha um template profissional para sua campanha</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando templates...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <div className="flex gap-1">
                    {template.is_ai_optimized && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        IA
                      </Badge>
                    )}
                    {template.is_premium && (
                      <Badge className="flex items-center gap-1">
                        <Crown className="h-3 w-3" />
                        Premium
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </CardHeader>
              <CardContent>
                <div className="border rounded p-4 bg-accent/50 min-h-[200px] max-h-[200px] overflow-hidden">
<div 
                    className="text-xs"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(template.html_template.substring(0, 500) + '...') 
                    }}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <span className="text-xs text-muted-foreground">
                  {template.usage_count} usos
                </span>
                <Button onClick={() => handleUseTemplate(template)}>
                  Usar Template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredTemplates.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Nenhum template encontrado
        </p>
      )}
    </div>
  );
}