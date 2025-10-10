import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  HelpCircle, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  Truck, 
  DollarSign, 
  Settings,
  User
} from "lucide-react";
import { useSupabaseQuoteChats } from "@/hooks/useSupabaseQuoteChats";

interface SupplierClarificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
  supplierName?: string;
}

interface QuestionCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  questions: Question[];
}

interface Question {
  id: string;
  text: string;
  maxChars: number;
  responseType: 'text' | 'select' | 'number';
  options?: string[];
}

// Perguntas específicas que fornecedores fazem para clientes
const supplierQuestionCategories: QuestionCategory[] = [
  {
    id: 'specifications',
    name: 'Especificações',
    icon: <Package className="h-4 w-4" />,
    color: 'blue',
    questions: [
      {
        id: 'technical_requirements',
        text: 'Existem especificações técnicas ou normas específicas que devemos seguir?',
        maxChars: 200,
        responseType: 'text'
      },
      {
        id: 'quality_certifications',
        text: 'Alguma certificação de qualidade é obrigatória para este produto/serviço?',
        maxChars: 150,
        responseType: 'text'
      },
      {
        id: 'customization_needs',
        text: 'Há necessidade de personalização ou adaptação específica?',
        maxChars: 200,
        responseType: 'text'
      }
    ]
  },
  {
    id: 'logistics',
    name: 'Logística',
    icon: <Truck className="h-4 w-4" />,
    color: 'green',
    questions: [
      {
        id: 'delivery_flexibility',
        text: 'Qual é a flexibilidade de prazo de entrega? Existe urgência específica?',
        maxChars: 150,
        responseType: 'text'
      },
      {
        id: 'delivery_schedule',
        text: 'Há preferência de horário ou dia da semana para entrega?',
        maxChars: 100,
        responseType: 'text'
      },
      {
        id: 'logistics_support',
        text: 'Vocês fornecem apoio logístico (descarga, transporte interno)?',
        maxChars: 150,
        responseType: 'select',
        options: ['Sim, completo', 'Sim, parcial', 'Não fornecemos', 'A definir']
      }
    ]
  },
  {
    id: 'operational',
    name: 'Operacional',
    icon: <Settings className="h-4 w-4" />,
    color: 'purple',
    questions: [
      {
        id: 'project_timeline',
        text: 'Qual é o cronograma completo do projeto? Há marcos específicos?',
        maxChars: 200,
        responseType: 'text'
      },
      {
        id: 'approval_process',
        text: 'Como funciona o processo de aprovação interna de vocês?',
        maxChars: 150,
        responseType: 'text'
      },
      {
        id: 'main_contact',
        text: 'Quem será o ponto de contato principal durante o projeto?',
        maxChars: 100,
        responseType: 'text'
      }
    ]
  }
];

export function SupplierClarificationModal({ 
  open, 
  onOpenChange, 
  quote, 
  supplierName 
}: SupplierClarificationModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{category: string, question: string, reasoning: string}>>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const { sendMessage, markMessagesAsRead, fetchMessages, messages } = useSupabaseQuoteChats();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const qaMessages = conversationId ? messages[conversationId] || [] : [];
  
  const conversation = conversationId ? {
    id: conversationId,
    quote_id: quote?.id,
    quote_title: quote?.title,
    supplier_name: supplierName || 'Fornecedor',
    client_name: quote?.client_name || 'Cliente',
    status: 'active'
  } : null;

  // Buscar ou criar conversa real ao abrir o modal
  useEffect(() => {
    const initConversation = async () => {
      if (!open || !quote || !user?.supplierId) return;
      
      try {
        // Buscar conversa existente
        const { data: existingConv, error: fetchError } = await supabase
          .from('quote_conversations')
          .select('id')
          .eq('quote_id', quote.id)
          .eq('client_id', quote.clientId)
          .eq('supplier_id', user.supplierId)
          .maybeSingle();

        if (fetchError) {
          console.error('Erro ao buscar conversa:', fetchError);
          toast({
            title: "Erro ao carregar conversa",
            description: fetchError.message,
            variant: "destructive"
          });
          return;
        }

        if (existingConv) {
          setConversationId(existingConv.id);
        } else {
          // Criar nova conversa se não existir
          const { data: newConv, error: createError } = await supabase
            .from('quote_conversations')
            .insert({
              quote_id: quote.id,
              client_id: quote.clientId,
              supplier_id: user.supplierId,
              status: 'active'
            })
            .select('id')
            .single();

          if (createError) {
            console.error('Erro ao criar conversa:', createError);
            toast({
              title: "Erro ao criar conversa",
              description: createError.message,
              variant: "destructive"
            });
            return;
          }

          setConversationId(newConv.id);
        }
      } catch (err: any) {
        console.error('Erro na inicialização da conversa:', err);
      }
    };

    initConversation();
  }, [open, quote, user?.supplierId, toast]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  useEffect(() => {
    if (open && conversationId) {
      fetchMessages(conversationId);
      markMessagesAsRead(conversationId);
    }
  }, [open, conversationId, fetchMessages, markMessagesAsRead]);

  const handleSendQuestion = async () => {
    if (!selectedQuestion || !conversationId || isLoading || !user?.supplierId) return;

    setIsLoading(true);
    try {
      const questionText = selectedQuestion.text;
      const formattedMessage = `**ESCLARECIMENTO**\n\n**Categoria:** ${supplierQuestionCategories.find(c => c.id === selectedCategory)?.name}\n**Pergunta:** ${questionText}`;
      
      // Enviar mensagem como fornecedor
      const { error: sendError } = await supabase
        .from('quote_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: 'supplier',
          content: formattedMessage,
          attachments: []
        });

      if (sendError) throw sendError;

      // Recarregar mensagens
      await fetchMessages(conversationId);
      
      setSelectedQuestion(null);
      setSelectedCategory('');
      toast({ 
        title: "Pergunta enviada", 
        description: "Sua pergunta foi enviada para o cliente." 
      });
    } catch (err: any) {
      console.error('Erro ao enviar pergunta:', err);
      toast({
        title: "Erro ao enviar pergunta",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionSelect = (questionId: string) => {
    const category = supplierQuestionCategories.find(cat => cat.id === selectedCategory);
    const question = category?.questions.find(q => q.id === questionId);
    setSelectedQuestion(question || null);
  };

  const generateAIQuestions = async () => {
    if (!quote || !conversationId || isGeneratingQuestions) return;

    setIsGeneratingQuestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-contextual-questions', {
        body: {
          quote_id: quote.id,
          quote_title: quote.title,
          user_role: 'supplier',
          existing_questions: qaMessages.length
        }
      });
      
      if (error) {
        console.error('Erro ao gerar perguntas:', error);
        toast({
          title: "Erro",
          description: "Erro ao gerar perguntas contextuais",
          variant: "destructive",
        });
        return;
      }
      
      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setAiSuggestions(data.suggestions);
        setShowAiSuggestions(true);
        toast({ 
          title: "Perguntas IA Geradas", 
          description: `${data.suggestions.length} perguntas estratégicas sugeridas. Clique em uma para usar.` 
        });
      } else {
        toast({
          title: "Erro",
          description: "Resposta da IA inválida",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro na geração de perguntas:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível gerar perguntas com IA.", 
        variant: "destructive" 
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  F
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>Esclarecimentos - Fornecedor</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    Cotação {quote.id}
                  </Badge>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                    Sistema Estruturado
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left Panel - Q&A Interface */}
          <div className="w-1/2 flex flex-col space-y-4">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">📋 Canal de Esclarecimentos Técnicos</h4>
                    <p className="text-sm text-blue-800 mb-2">
                      Como fornecedor, use este canal apenas para esclarecer dúvidas técnicas e operacionais sobre a cotação.
                    </p>
                    <div className="bg-blue-100 border border-blue-300 rounded p-2 mt-2">
                      <p className="text-xs text-blue-900 font-medium">
                        ⚠️ Propostas comerciais e valores devem ser enviados via sistema formal de propostas.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Categoria da Pergunta</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierQuestionCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          {category.icon}
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCategory && (
                <div>
                  <Label htmlFor="question">Pergunta Específica</Label>
                  <Select value={selectedQuestion?.id || ''} onValueChange={handleQuestionSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma pergunta" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierQuestionCategories
                        .find(cat => cat.id === selectedCategory)
                        ?.questions.map((question) => (
                          <SelectItem key={question.id} value={question.id}>
                            {question.text}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedQuestion && (
                <Button
                  onClick={handleSendQuestion}
                  disabled={isLoading || !conversationId}
                  className="w-full"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  {isLoading ? 'Enviando...' : 'Enviar Pergunta'}
                </Button>
              )}

              <div className="pt-2 border-t">
                <Button
                  onClick={generateAIQuestions}
                  disabled={isGeneratingQuestions}
                  variant="outline"
                  className="w-full"
                >
                  {isGeneratingQuestions ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  ) : (
                    <HelpCircle className="h-4 w-4 mr-2" />
                  )}
                  {isGeneratingQuestions ? 'Gerando...' : 'IA: Sugerir Perguntas Contextuais'}
                </Button>
              </div>

              {/* Sugestões da IA */}
              {showAiSuggestions && aiSuggestions.length > 0 && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-800">Perguntas Sugeridas pela IA</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAiSuggestions(false)}
                        className="h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {aiSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="p-3 bg-white rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors"
                          onClick={() => {
                            const categoryMap: { [key: string]: string } = {
                              'especificações': 'specifications',
                              'logística': 'logistics',
                              'operacional': 'operational'
                            };
                            
                            const categoryId = categoryMap[suggestion.category.toLowerCase()];
                            if (categoryId) {
                              setSelectedCategory(categoryId);
                              setSelectedQuestion({
                                id: `ai-${index}`,
                                text: suggestion.question,
                                maxChars: 300,
                                responseType: 'text'
                              });
                            }
                            setShowAiSuggestions(false);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-900 mb-1">
                                {suggestion.question}
                              </p>
                              <p className="text-xs text-gray-600 mb-1">
                                <strong>Categoria:</strong> {suggestion.category}
                              </p>
                              <p className="text-xs text-gray-500">
                                <strong>Por quê:</strong> {suggestion.reasoning}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Panel - Chat History */}
          <div className="w-1/2 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Histórico de Esclarecimentos</h3>
              <Badge variant="secondary">
                {qaMessages.length} {qaMessages.length === 1 ? 'registro' : 'registros'}
              </Badge>
            </div>

            <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-y-auto space-y-4">
              {qaMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum esclarecimento ainda</p>
                  <p className="text-sm">Faça uma pergunta para iniciar</p>
                </div>
              ) : (
                qaMessages.map((message, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {message.sender_type === 'supplier' ? 'F' : 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {message.sender_type === 'supplier' ? supplierName || 'Fornecedor' : quote.client_name || 'Cliente'}
                        </span>
                        <Badge 
                          variant={message.sender_type === 'supplier' ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {message.sender_type === 'supplier' ? 'Fornecedor' : 'Cliente'}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(message.created_at)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}