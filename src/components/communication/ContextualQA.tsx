import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, HelpCircle, CheckCircle, Clock } from "lucide-react";
import { useSupabaseQuoteChats } from "@/hooks/useSupabaseQuoteChats";
import { QAModal } from "./QAModal";
import { AIContextualAssistant } from "./AIContextualAssistant";

export function ContextualQA() {
  const { conversations, loading } = useSupabaseQuoteChats();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [qaModalOpen, setQaModalOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}min atrás`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h atrás`;
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const handleOpenQA = (conversation: any) => {
    setSelectedConversation(conversation);
    setQaModalOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Esclarecimentos Estruturados</h3>
          <p className="text-sm text-muted-foreground">
            Perguntas e respostas categorizadas para esclarecimentos sobre cotações
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {conversations.length} conversas disponíveis
        </Badge>
      </div>

      {/* Disclaimer */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-800 mb-1">Sistema de Esclarecimentos</h4>
              <p className="text-sm text-orange-700">
                Este sistema permite apenas esclarecimentos estruturados. Propostas comerciais devem ser enviadas através do formulário oficial para análise da IA.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {conversations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma cotação disponível</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Os esclarecimentos aparecerão aqui quando você tiver cotações em negociação com fornecedores.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <Card 
              key={conversation.id} 
              className="transition-all duration-200 hover:shadow-md cursor-pointer border-l-4 border-l-blue-500"
              onClick={() => handleOpenQA(conversation)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-base">{conversation.supplier_name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {conversation.quote_title}
                      </Badge>
                      {(conversation.unread_count || 0) > 0 && (
                        <Badge className="bg-orange-500 text-white text-xs">
                          {conversation.unread_count} pendentes
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {conversation.last_message || "Nenhum esclarecimento ainda"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {conversation.last_message_at ? formatDate(conversation.last_message_at) : "Novo"}
                      </div>
                      <div className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        {conversation.messages_count || 0} esclarecimentos
                      </div>
                    </div>
                  </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge 
                        className={conversation.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}
                      >
                        {conversation.status === 'active' ? 'Disponível' : 'Encerrado'}
                      </Badge>
                      <div className="flex gap-2">
                        <AIContextualAssistant 
                          quoteId={conversation.quote_id}
                          quotetitle={conversation.quote_title}
                          supplierName={conversation.supplier_name}
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenQA(conversation);
                          }}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Esclarecimentos
                        </Button>
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <QAModal
        conversation={selectedConversation}
        open={qaModalOpen}
        onOpenChange={setQaModalOpen}
      />
    </div>
  );
}