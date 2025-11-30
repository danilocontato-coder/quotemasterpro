import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Code, Eye } from 'lucide-react';

interface EmailContent {
  subject: string;
  htmlBody: string;
  plainTextBody: string;
}

interface EmailContentEditorProps {
  content: EmailContent;
  onChange: (content: EmailContent) => void;
}

export function EmailContentEditor({ content, onChange }: EmailContentEditorProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Conteúdo do E-mail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Assunto do E-mail *</Label>
          <Input
            id="subject"
            value={content.subject}
            onChange={(e) => onChange({ ...content, subject: e.target.value })}
            placeholder="Ex: Novidades imperdíveis para você!"
          />
        </div>

        <Tabs defaultValue="html" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="html" className="flex items-center gap-1">
              <Code className="h-3 w-3" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Texto
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="html" className="mt-3">
            <div className="space-y-2">
              <Label htmlFor="htmlBody">Corpo HTML *</Label>
              <Textarea
                id="htmlBody"
                value={content.htmlBody}
                onChange={(e) => onChange({ ...content, htmlBody: e.target.value })}
                placeholder="<html><body>Seu conteúdo aqui...</body></html>"
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use tags HTML para formatar o e-mail. Variáveis disponíveis: {'{{'} nome {'}}'}, {'{{'} empresa {'}}'}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="text" className="mt-3">
            <div className="space-y-2">
              <Label htmlFor="plainTextBody">Texto Plano (fallback)</Label>
              <Textarea
                id="plainTextBody"
                value={content.plainTextBody}
                onChange={(e) => onChange({ ...content, plainTextBody: e.target.value })}
                placeholder="Versão em texto plano para clientes de e-mail que não suportam HTML..."
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                Versão alternativa para clientes de e-mail sem suporte a HTML
              </p>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-3">
            <div className="border rounded-md p-4 bg-background min-h-[300px]">
              <div className="mb-3 pb-3 border-b">
                <p className="text-sm text-muted-foreground">Assunto:</p>
                <p className="font-medium">{content.subject || '(sem assunto)'}</p>
              </div>
              {content.htmlBody ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: content.htmlBody }}
                />
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  Nenhum conteúdo HTML. Digite acima ou use a IA para gerar.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
