import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Bot, User, CheckCircle, Calendar } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSupabaseSubscriptionGuard } from '@/hooks/useSupabaseSubscriptionGuard';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface AIQuoteChatProps {
  onQuoteGenerated: (quote: any) => void;
  onClose: () => void;
  onRefresh?: () => void;
}

export const AIQuoteChat: React.FC<AIQuoteChatProps> = ({ onQuoteGenerated, onClose, onRefresh }) => {
  const { enforceLimit } = useSupabaseSubscriptionGuard();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());
  const [requiresVisit, setRequiresVisit] = useState(false);
  const [visitDeadline, setVisitDeadline] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Função para scroll automático
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Mensagem de boas-vindas dinâmica com sugestões
    const welcomeContent = 'Olá! Sou seu assistente especializado em cotações. Vou te ajudar a criar uma RFQ detalhada e personalizada. Descreva o que você precisa e farei perguntas para garantir que tenhamos todas as especificações necessárias.\n\n[SUGESTÕES: "Materiais para minha empresa", "Equipamentos de escritório", "Serviços especializados", "Tenho uma lista de produtos"]';
    
    // Extrair sugestões da mensagem inicial
    let suggestions: string[] = [];
    let cleanContent = welcomeContent;
    
    const suggestionsMatch = welcomeContent.match(/\[SUGESTÕES:\s*([^\]]+)\]/);
    if (suggestionsMatch) {
      try {
        const suggestionsText = suggestionsMatch[1];
        const matches = suggestionsText.match(/"([^"]+)"/g);
        if (matches) {
          suggestions = matches.map((match: string) => match.slice(1, -1));
        }
        cleanContent = welcomeContent.replace(/\[SUGESTÕES:[^\]]+\]/, '').trim();
      } catch (error) {
        console.error('Erro ao extrair sugestões da mensagem inicial:', error);
      }
    }

    const welcomeMessage: Message = {
      id: '1',
      role: 'assistant',
      content: cleanContent,
      timestamp: new Date(),
      suggestions: suggestions
    };
    setMessages([welcomeMessage]);
  }, []);

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
      const { data, error } = await supabase.functions.invoke('ai-quote-chat', {
        body: {
          conversationId,
          message: text,
          messageHistory: messages,
          requiresVisit,
          visitDeadline
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        suggestions: data.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Se a IA criou uma RFQ no banco de dados
      if (data.rfqCreated) {
        // Mostrar mensagem de sucesso com ID da RFQ
        const successMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `✅ Cotação #${data.quoteId} criada com sucesso!\n\n` +
            `Você pode visualizá-la na lista de cotações.` +
            (data.standardizedProducts?.length > 0 
              ? `\n\n📦 ${data.standardizedProducts.length} produto(s) foram adicionados ao catálogo.` 
              : ''),
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, successMessage]);
        
        toast.success(`RFQ #${data.quoteId} criada com sucesso!`);
        
        // Fechar chat após 2 segundos
        setTimeout(() => {
          onClose();
          if (onRefresh) {
            onRefresh();
          }
        }, 2000);
        
        return;
      }

      // Se a IA gerou dados para o modal de criação (fluxo antigo)
      if (data.quote) {
        const canCreate = enforceLimit('CREATE_QUOTE');
        if (!canCreate) {
          return;
        }

        toast.success("Dados preparados para criação!");
        onQuoteGenerated(data.quote);
      }

    } catch (error: any) {
      console.error('Erro no chat:', error);
      
      const errorDetails = error?.message || 'Erro desconhecido';
      const isConfigError = errorDetails.includes('OpenAI') || errorDetails.includes('API key');
      
      toast.error(
        isConfigError 
          ? "Erro de configuração da IA. Contate o administrador." 
          : "Erro ao processar mensagem. Tente novamente."
      );
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: isConfigError
          ? '❌ Desculpe, há um problema com a configuração da IA. Por favor, contate o administrador do sistema para verificar as configurações da chave OpenAI.'
          : '❌ Desculpe, ocorreu um erro ao processar sua mensagem. Você pode tentar reformular ou tentar novamente.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
    // Scroll automático após selecionar sugestão
    setTimeout(() => scrollToBottom(), 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(currentMessage);
    // Scroll automático após enviar mensagem
    setTimeout(() => scrollToBottom(), 100);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-medium">Assistente de Cotações</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div className={`flex flex-col gap-2 max-w-[80%] ${message.role === 'user' ? 'items-end' : ''}`}>
                  <div className={`rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  {/* Sugestões clicáveis */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Elemento invisível para scroll automático */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t space-y-3">
          {/* Opção de visita técnica */}
          <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires-visit-ai"
                checked={requiresVisit}
                onCheckedChange={(checked) => setRequiresVisit(checked as boolean)}
              />
              <Label htmlFor="requires-visit-ai" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Requer visita técnica prévia
              </Label>
            </div>
            
            {requiresVisit && (
              <div className="pl-6 space-y-1">
                <Label htmlFor="visit-deadline-ai" className="text-xs text-muted-foreground">
                  Prazo desejado para visita
                </Label>
                <Input
                  id="visit-deadline-ai"
                  type="date"
                  value={visitDeadline}
                  onChange={(e) => setVisitDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !currentMessage.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};