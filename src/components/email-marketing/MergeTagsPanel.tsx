import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Tags } from 'lucide-react';
import { AVAILABLE_MERGE_TAGS, MERGE_TAG_CATEGORIES } from '@/data/mergeTags';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function MergeTagsPanel() {
  const { toast } = useToast();
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  
  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    toast({ 
      title: 'Copiado!', 
      description: `${tag} copiado para área de transferência` 
    });
    
    setTimeout(() => setCopiedTag(null), 2000);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="h-5 w-5 text-primary" />
          Variáveis Personalizadas
        </CardTitle>
        <CardDescription>
          Clique para copiar e colar no conteúdo do e-mail
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="Cliente" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
            {MERGE_TAG_CATEGORIES.map((category) => (
              <TabsTrigger key={category} value={category} className="text-xs">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {MERGE_TAG_CATEGORIES.map((category) => (
            <TabsContent key={category} value={category} className="space-y-2 mt-4">
              {AVAILABLE_MERGE_TAGS
                .filter(item => item.category === category)
                .map((item) => (
                  <div 
                    key={item.tag}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => copyTag(item.tag)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {item.tag}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                      {item.example && (
                        <p className="text-xs text-muted-foreground/70 italic mt-1">
                          Ex: {item.example}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyTag(item.tag);
                      }}
                    >
                      {copiedTag === item.tag ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
            </TabsContent>
          ))}
        </Tabs>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-900 dark:text-blue-100">
            💡 <strong>Dica:</strong> As variáveis serão substituídas automaticamente 
            pelos dados reais de cada cliente ao enviar o e-mail.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
