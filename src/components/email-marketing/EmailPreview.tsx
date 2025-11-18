import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Maximize2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useSupabaseCurrentClient } from "@/hooks/useSupabaseCurrentClient";
import { replaceVariables } from "@/lib/replaceVariables";

interface EmailPreviewProps {
  htmlContent: string;
  plainTextContent?: string;
  subjectLine?: string;
  previewText?: string;
}

export function EmailPreview({ htmlContent, plainTextContent, subjectLine, previewText }: EmailPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewWithRealData, setPreviewWithRealData] = useState(false);
  const { client } = useSupabaseCurrentClient();

  const mergeTags = useMemo(() => {
    if (!client || !previewWithRealData) return {};
    
    return {
      client_name: client.name || '',
      client_email: client.email || '',
      current_date: new Date().toLocaleDateString('pt-BR'),
      current_year: new Date().getFullYear(),
    };
  }, [client, previewWithRealData]);

  const processedHtmlContent = useMemo(() => {
    if (!previewWithRealData || !htmlContent) return htmlContent;
    return replaceVariables(htmlContent, mergeTags);
  }, [htmlContent, previewWithRealData, mergeTags]);

  const processedSubject = useMemo(() => {
    if (!previewWithRealData || !subjectLine) return subjectLine;
    return replaceVariables(subjectLine, mergeTags);
  }, [subjectLine, previewWithRealData, mergeTags]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Preview do E-mail</CardTitle>
            <Button 
              variant="default"
              size="sm"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Ver em Tela Cheia
            </Button>
          </div>
          {processedSubject && (
            <div className="text-sm mt-2">
              <span className="font-medium">Assunto:</span> {processedSubject}
            </div>
          )}
          <div className="flex items-center space-x-2 mt-4">
            <Switch 
              id="preview-mode"
              checked={previewWithRealData} 
              onCheckedChange={setPreviewWithRealData} 
            />
            <Label htmlFor="preview-mode" className="text-sm cursor-pointer">
              Visualizar com dados reais
            </Label>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg bg-background overflow-auto max-h-[800px] p-4 relative">
            {processedHtmlContent ? (
              <div dangerouslySetInnerHTML={{ __html: processedHtmlContent }} />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Nenhum conteúdo gerado ainda
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] h-[90vh]">
          <div className="border rounded-lg bg-background overflow-auto h-full p-4">
            <div dangerouslySetInnerHTML={{ __html: processedHtmlContent }} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
