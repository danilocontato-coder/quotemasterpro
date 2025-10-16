import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, FileText, Maximize2 } from 'lucide-react';

interface EmailPreviewProps {
  htmlContent: string;
  plainTextContent?: string;
  subjectLine?: string;
  previewText?: string;
}

export function EmailPreview({ htmlContent, plainTextContent, subjectLine, previewText }: EmailPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const renderPreviewContent = (isModal = false) => (
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
        <div 
          className={`border rounded-lg bg-background overflow-auto ${
            isModal ? 'h-[calc(100vh-200px)]' : 'max-h-[600px]'
          } p-4`}
        >
          {isModal && subjectLine && (
            <div className="bg-muted border-b p-4 mb-4 rounded-t-lg">
              <div className="space-y-1 max-w-3xl mx-auto">
                <p className="text-xs text-muted-foreground">De: Sistema Cotiz</p>
                <p className="text-sm font-semibold">Assunto: {subjectLine}</p>
                {previewText && <p className="text-xs text-muted-foreground">{previewText}</p>}
              </div>
            </div>
          )}
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="mobile" className="mt-4">
        <div 
          className={`border rounded-lg bg-background overflow-auto mx-auto p-4 ${
            isModal ? 'h-[calc(100vh-200px)]' : 'max-h-[600px]'
          }`}
          style={{ maxWidth: '375px' }}
        >
          {isModal && subjectLine && (
            <div className="bg-muted border-b p-3 mb-4 rounded-t-lg">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">De: Sistema Cotiz</p>
                <p className="text-sm font-semibold">{subjectLine}</p>
                {previewText && <p className="text-xs text-muted-foreground line-clamp-1">{previewText}</p>}
              </div>
            </div>
          )}
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>
      </TabsContent>

      <TabsContent value="plain" className="mt-4">
        <div 
          className={`border rounded-lg bg-muted overflow-auto p-4 ${
            isModal ? 'h-[calc(100vh-200px)]' : 'max-h-[600px]'
          }`}
        >
          <pre className="text-sm whitespace-pre-wrap font-mono">
            {plainTextContent || stripHtml(htmlContent)}
          </pre>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle>Preview do E-mail</CardTitle>
              {subjectLine && (
                <div className="space-y-1 mt-2">
                  <p className="text-sm font-semibold">{subjectLine}</p>
                  {previewText && <p className="text-xs text-muted-foreground">{previewText}</p>}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFullscreen(true)}
              title="Ver em tela cheia"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderPreviewContent(false)}
        </CardContent>
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] h-[95vh]">
          <DialogHeader>
            <DialogTitle>Preview do E-mail - Tela Cheia</DialogTitle>
          </DialogHeader>
          {renderPreviewContent(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}