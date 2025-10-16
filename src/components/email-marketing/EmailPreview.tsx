import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Smartphone, FileText } from 'lucide-react';

interface EmailPreviewProps {
  htmlContent: string;
  plainTextContent?: string;
  subjectLine?: string;
  previewText?: string;
}

export function EmailPreview({ htmlContent, plainTextContent, subjectLine, previewText }: EmailPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview do E-mail</CardTitle>
        {subjectLine && (
          <div className="space-y-1">
            <p className="text-sm font-semibold">{subjectLine}</p>
            {previewText && <p className="text-xs text-muted-foreground">{previewText}</p>}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="desktop" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="desktop">
              <Monitor className="h-4 w-4 mr-2" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="mobile">
              <Smartphone className="h-4 w-4 mr-2" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="plain">
              <FileText className="h-4 w-4 mr-2" />
              Texto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="desktop" className="mt-4">
            <div className="border rounded-lg p-4 bg-background overflow-auto" style={{ maxHeight: '600px' }}>
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mobile" className="mt-4">
            <div className="border rounded-lg p-4 bg-background overflow-auto mx-auto" style={{ maxWidth: '375px', maxHeight: '600px' }}>
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          </TabsContent>

          <TabsContent value="plain" className="mt-4">
            <div className="border rounded-lg p-4 bg-muted overflow-auto" style={{ maxHeight: '600px' }}>
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {plainTextContent || stripHtml(htmlContent)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}