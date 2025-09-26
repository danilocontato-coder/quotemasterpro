import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Send, Bot, User, Sparkles, MessageCircle, HelpCircle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: (string | { category?: string; question: string; reasoning?: string })[];
}

interface AIContextualAssistantProps {
  quoteId?: string;
  quotetitle?: string;
  supplierName?: string;
  userRole?: 'client' | 'supplier' | 'admin'; // Novo prop para identificar o contexto
}

export const AIContextualAssistant: React.FC<AIContextualAssistantProps> = ({ 
  quoteId, 
  quotetitle,
  supplierName,
  userRole = 'client' 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Função para scroll automático
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Mensagem de boas-vindas contextual baseada no papel do usuário
      const welcomeMessage: Message = {
        id: '1',
        role: 'assistant',
        content: userRole === 'supplier' 
          ? `Olá! Sou seu assistente IA especializado em esclarecimentos com clientes. ${
              quoteId && quotetitle
                ? `Vejo que você está trabalhando na cotação "${quotetitle}". `
                : ''
            }Posso te ajudar gerando perguntas importantes para esclarecer com o cliente, entender melhor os requisitos ou negociar condições.`
          : `Olá! Sou seu assistente IA especializado em esclarecimentos de cotações. ${
              quoteId && quotetitle
                ? `Vejo que você está trabalhando na cotação "${quotetitle}" ${supplierName ? `com ${supplierName}` : ''}. `
                : ''
            }Posso te ajudar gerando perguntas contextuais, esclarecendo dúvidas sobre processos ou ajudando na comunicação com fornecedores.`,
        timestamp: new Date(),
        suggestions: userRole === 'supplier' && quoteId ? [
          'Que informações técnicas preciso esclarecer?',
          'Como negociar melhor prazo de entrega?',
          'Quais requisitos ainda não estão claros?',
          'Sugerir condições comerciais vantajosas'
        ] : quoteId ? [
          'Gerar perguntas sobre esta cotação',
          'Como melhorar a comunicação com o fornecedor?',
          'Que informações ainda faltam?',
          'Sugerir próximos passos'
        ] : [
          'Como usar o sistema de esclarecimentos?',
          'Melhores práticas para cotações',
          'Dicas de comunicação com fornecedores',
          'Automatizar processos de aprovação'
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, quoteId, quotetitle, supplierName, userRole]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-contextual-questions', {
        body: {
          quote_id: quoteId,
          quote_title: quotetitle,
          supplier_name: supplierName,
          user_question: text,
          user_role: userRole, // Incluir o papel do usuário
          conversation_id: conversationId,
          message_history: messages
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || data.suggestions?.join('\n• ') || 'Desculpe, não consegui gerar uma resposta adequada.',
        timestamp: new Date(),
        suggestions: data.suggestions || []
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.suggestions?.length > 0) {
        toast.success(`${data.suggestions.length} sugestões contextuais geradas!`);
      }

    } catch (error) {
      console.error('Erro no assistente IA:', error);
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error("Erro ao consultar assistente IA");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(currentMessage);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Assistente IA
          <Badge variant="secondary" className="ml-1">Beta</Badge>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            Assistente IA Contextual
            {quoteId && (
              <Badge variant="outline" className="ml-2">
                {quotetitle || quoteId}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4">
          {/* Messages */}
          <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <Card className={message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                      <CardContent className="p-3">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs mt-2 opacity-70">
                          {message.timestamp.toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </CardContent>
                    </Card>
                    
                    {/* Suggestions */}
                    {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground">Sugestões:</p>
                        <div className="flex flex-wrap gap-1">
                          {message.suggestions.slice(0, 3).map((suggestion, index) => {
                            const suggestionText = typeof suggestion === 'string' ? suggestion : suggestion.question;
                            return (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => handleSuggestionClick(suggestionText)}
                              >
                                <HelpCircle className="w-3 h-3 mr-1" />
                                {suggestionText}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    </div>
                  </div>
                  <Card className="bg-muted">
                    <CardContent className="p-3">
                      <p className="text-sm text-muted-foreground">Analisando contexto...</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua pergunta ou peça sugestões contextuais..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={() => sendMessage(currentMessage)}
              disabled={isLoading || !currentMessage.trim()}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};