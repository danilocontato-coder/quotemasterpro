import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  HelpCircle, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  Truck, 
  DollarSign, 
  Settings,
  FileText
} from "lucide-react";
import { useSupabaseQuoteChats } from "@/hooks/useSupabaseQuoteChats";
import { useToast } from "@/hooks/use-toast";

interface QAModalProps {
  conversation: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const questionCategories: QuestionCategory[] = [
  {
    id: 'specifications',
    name: 'Especificações',
    icon: <Package className="h-4 w-4" />,
    color: 'blue',
    questions: [
      {
        id: 'brand_preference',
        text: 'Qual a marca preferida para este produto?',
        maxChars: 100,
        responseType: 'text'
      },
      {
        id: 'technical_specs',
        text: 'Há especificações técnicas adicionais necessárias?',
        maxChars: 200,
        responseType: 'text'
      },
      {
        id: 'quality_standard',
        text: 'Qual o padrão de qualidade exigido?',
        maxChars: 150,
        responseType: 'select',
        options: ['Básico', 'Intermediário', 'Premium', 'Personalizado']
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
        id: 'delivery_deadline',
        text: 'Qual o prazo máximo para entrega?',
        maxChars: 50,
        responseType: 'text'
      },
      {
        id: 'delivery_location',
        text: 'Local específico de entrega?',
        maxChars: 100,
        responseType: 'text'
      },
      {
        id: 'delivery_time',
        text: 'Horário preferencial para entrega?',
        maxChars: 50,
        responseType: 'select',
        options: ['Manhã (8h-12h)', 'Tarde (13h-17h)', 'Comercial (8h-18h)', 'Flexível']
      }
    ]
  },
  {
    id: 'commercial',
    name: 'Comercial',
    icon: <DollarSign className="h-4 w-4" />,
    color: 'orange',
    questions: [
      {
        id: 'payment_discount',
        text: 'Há desconto para pagamento à vista?',
        maxChars: 100,
        responseType: 'text'
      },
      {
        id: 'installment_options',
        text: 'Aceita parcelamento? Quantas vezes?',
        maxChars: 100,
        responseType: 'text'
      },
      {
        id: 'warranty_period',
        text: 'Qual o período de garantia oferecido?',
        maxChars: 50,
        responseType: 'select',
        options: ['30 dias', '90 dias', '6 meses', '1 ano', 'Mais de 1 ano']
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
        id: 'technical_responsible',
        text: 'Quem é o responsável técnico pelo projeto?',
        maxChars: 100,
        responseType: 'text'
      },
      {
        id: 'installation_service',
        text: 'Inclui serviço de instalação?',
        maxChars: 100,
        responseType: 'select',
        options: ['Sim, incluído', 'Sim, taxa adicional', 'Não oferecemos', 'Apenas orientação']
      },
      {
        id: 'support_availability',
        text: 'Disponibilidade para suporte pós-venda?',
        maxChars: 100,
        responseType: 'text'
      }
    ]
  }
];

export function QAModal({ conversation, open, onOpenChange }: QAModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<'client' | 'supplier'>('client');
  const [pendingQuestions, setPendingQuestions] = useState<any[]>([]);
  const [selectedPendingQuestion, setSelectedPendingQuestion] = useState<any>(null);
  const [supplierResponse, setSupplierResponse] = useState('');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const { sendMessage, markMessagesAsRead, fetchMessages, messages } = useSupabaseQuoteChats();
  const { toast } = useToast();
  
  const qaMessages = conversation ? messages[conversation.id] || [] : [];

  // Detectar papel do usuário e buscar perguntas pendentes
  useEffect(() => {
    // TODO: Implementar detecção real do papel do usuário
    setUserRole('client'); // Por enquanto assumindo cliente
    
    if (userRole === 'supplier') {
      // Buscar perguntas não respondidas do cliente
      const questions = qaMessages
        .filter(msg => msg.content.includes('**PERGUNTA**') && msg.sender_type === 'client')
        .map(msg => ({
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          answered: qaMessages.some(reply => 
            reply.content.includes(msg.id) && reply.sender_type === 'supplier'
          )
        }))
        .filter(q => !q.answered);
      
      setPendingQuestions(questions);
    }
  }, [userRole, qaMessages]);

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
    if (open && conversation) {
      fetchMessages(conversation.id);
      markMessagesAsRead(conversation.id);
    }
  }, [open, conversation, fetchMessages, markMessagesAsRead]);

  const handleSendQuestion = async () => {
    if (!selectedQuestion || !conversation || isLoading) return;

    setIsLoading(true);
    try {
      const questionText = selectedQuestion.text;
      const formattedMessage = `**PERGUNTA**\n\n**Categoria:** ${questionCategories.find(c => c.id === selectedCategory)?.name}\n**Pergunta:** ${questionText}`;
      
      await sendMessage(conversation.id, formattedMessage);
      setSelectedQuestion(null);
      setSelectedCategory('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionSelect = (questionId: string) => {
    const category = questionCategories.find(cat => cat.id === selectedCategory);
    const question = category?.questions.find(q => q.id === questionId);
    setSelectedQuestion(question || null);
    setResponse('');
  };

  const handleSupplierResponse = async () => {
    if (!selectedPendingQuestion || !supplierResponse.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const formattedMessage = `**RESPOSTA**\n\n**Referência:** ${selectedPendingQuestion.id}\n**Resposta:** ${supplierResponse.trim()}`;
      
      await sendMessage(conversation.id, formattedMessage);
      setSupplierResponse('');
      setSelectedPendingQuestion(null);
      toast({ title: "Resposta enviada", description: "Sua resposta foi enviada com sucesso." });
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIQuestions = async () => {
    if (!conversation || isGeneratingQuestions) return;

    setIsGeneratingQuestions(true);
    try {
      // Chamar edge function para gerar perguntas contextuais
      const response = await fetch('https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/generate-contextual-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: conversation.quote_id,
          quote_title: conversation.quote_title,
          existing_questions: qaMessages.length
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({ 
          title: "Perguntas IA", 
          description: `${data.suggestions?.length || 0} perguntas contextuais sugeridas pela IA.` 
        });
      }
    } catch (error) {
      toast({ 
        title: "Erro", 
        description: "Não foi possível gerar perguntas com IA.", 
        variant: "destructive" 
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  if (!conversation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(conversation.supplier_name || 'Fornecedor')}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>Esclarecimentos - {conversation.supplier_name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {conversation.quote_title}
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
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-800 mb-1">Sistema de Esclarecimentos</h4>
                    <p className="text-sm text-orange-700">
                      {userRole === 'client' 
                        ? 'Como cliente, você pode fazer perguntas estruturadas ao fornecedor sobre esta cotação.'
                        : 'Como fornecedor, você responde às perguntas do cliente sobre esta cotação.'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {userRole === 'client' ? (
              // CLIENTE: Pode fazer perguntas pré-definidas
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category">Categoria da Pergunta</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {questionCategories.map((category) => (
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
                        {questionCategories
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
                    disabled={isLoading || conversation.status !== 'active'}
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
              </div>
            ) : (
              // FORNECEDOR: Responde perguntas do cliente
              <div className="space-y-4">
                {pendingQuestions.length > 0 ? (
                  <>
                    <div>
                      <Label htmlFor="pending-questions">Perguntas Pendentes ({pendingQuestions.length})</Label>
                      <Select 
                        value={selectedPendingQuestion?.id || ''} 
                        onValueChange={(questionId) => {
                          const question = pendingQuestions.find(q => q.id === questionId);
                          setSelectedPendingQuestion(question || null);
                          setSupplierResponse('');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma pergunta para responder" />
                        </SelectTrigger>
                        <SelectContent>
                          {pendingQuestions.map((question) => (
                            <SelectItem key={question.id} value={question.id}>
                              <div className="max-w-xs truncate">
                                {question.content.split('\n')[2]?.replace('**Pergunta:** ', '') || 'Pergunta'}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPendingQuestion && (
                      <div>
                        <Label htmlFor="supplier-response">
                          Sua Resposta ({supplierResponse.length}/300)
                        </Label>
                        <Textarea
                          id="supplier-response"
                          placeholder="Digite sua resposta estruturada..."
                          value={supplierResponse}
                          onChange={(e) => {
                            if (e.target.value.length <= 300) {
                              setSupplierResponse(e.target.value);
                            }
                          }}
                          className="resize-none"
                          rows={4}
                          maxLength={300}
                        />
                        
                        <Button
                          onClick={handleSupplierResponse}
                          disabled={!supplierResponse.trim() || isLoading || conversation.status !== 'active'}
                          className="w-full mt-2"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {isLoading ? 'Enviando...' : 'Enviar Resposta'}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-800 mb-1">Nenhuma Pergunta Pendente</h4>
                          <p className="text-sm text-blue-700">
                            Aguardando o cliente enviar perguntas sobre esta cotação.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Messages History */}
          <div className="w-1/2 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Histórico de Esclarecimentos</h4>
              <Badge variant="outline">
                {qaMessages.length} registros
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
              {qaMessages.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      Nenhum esclarecimento ainda.
                      <br />
                      Use o painel ao lado para fazer perguntas estruturadas.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                qaMessages.map((msg: any) => (
                  <Card key={msg.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(msg.sender_name || 'Usuario')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{msg.sender_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {msg.sender_type === 'client' ? 'Cliente' : 'Fornecedor'}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      
                      <div className="text-sm whitespace-pre-wrap bg-muted/50 p-2 rounded">
                        {msg.content}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {conversation.status !== 'active' && (
          <div className="flex-shrink-0 bg-muted/50 p-3 rounded text-center">
            <p className="text-sm text-muted-foreground">
              Esta cotação foi encerrada - não é possível enviar novos esclarecimentos
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}