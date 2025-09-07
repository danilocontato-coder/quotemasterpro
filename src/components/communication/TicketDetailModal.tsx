import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Clock, User, Headphones, AlertTriangle, Paperclip, CheckCircle2, XCircle } from "lucide-react";
import { useSupabaseTickets } from "@/hooks/useSupabaseTickets";
import { useAuth } from "@/contexts/AuthContext";
import { getTicketStatusColor, getTicketPriorityColor } from "@/data/mockCommunication";
import { supabase } from "@/integrations/supabase/client";

interface TicketDetailModalProps {
  ticket: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketUpdate?: () => void;
}

export function TicketDetailModal({ ticket, open, onOpenChange, onTicketUpdate }: TicketDetailModalProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addTicketMessage, updateTicketStatus } = useSupabaseTickets();
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open && ticket) {
      scrollToBottom();
    }
  }, [open, ticket]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !ticket || isLoading) return;

    setIsLoading(true);
    try {
      await addTicketMessage(ticket.id, message.trim(), [], user?.role === 'admin');
      setMessage("");
      if (onTicketUpdate) {
        onTicketUpdate();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'novo':
        return 'Novo';
      case 'open':
        return 'Aberto';
      case 'in_progress':
        return 'Em Andamento';
      case 'resolved':
        return 'Resolvido';
      case 'closed':
        return 'Fechado';
      default:
        return status;
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket || !user || user.role !== 'admin') return;
    
    const success = await updateTicketStatus(ticket.id, newStatus as any);
    if (success && onTicketUpdate) {
      onTicketUpdate();
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'Baixa';
      case 'medium':
        return 'Média';
      case 'high':
        return 'Alta';
      case 'urgent':
        return 'Urgente';
      default:
        return priority;
    }
  };

  if (!ticket) return null;

  // Group messages by date
  const messagesByDate = ticket.messages.reduce((groups: any, message: any) => {
    const date = formatDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  const statusColor = getTicketStatusColor(ticket.status);
  const priorityColor = getTicketPriorityColor(ticket.priority);
  const canReply = ticket.status !== 'closed' && ticket.status !== 'resolved';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">{ticket.subject}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className={priorityColor}>
                  {getPriorityText(ticket.priority)}
                </Badge>
                {user?.role === 'admin' ? (
                  <Select value={ticket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="closed">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={statusColor}>
                    {getStatusText(ticket.status)}
                  </Badge>
                )}
              </div>
            </div>
            
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Ticket ID</p>
                    <p className="font-mono font-medium">#{ticket.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Categoria</p>
                    <p className="font-medium">{ticket.category}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Criado em</p>
                    <p className="font-medium">{formatDateTime(ticket.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Criado por</p>
                    <p className="font-medium">{ticket.createdByName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Atribuído a</p>
                    <p className="font-medium">{ticket.assignedToName || 'Não atribuído'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última atualização</p>
                    <p className="font-medium">{formatDateTime(ticket.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 space-y-4 min-h-0">
          {Object.entries(messagesByDate).map(([date, messages]: [string, any]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-muted px-3 py-1 rounded-full text-sm text-muted-foreground">
                  {date}
                </div>
              </div>

              {/* Messages for this date */}
              {messages.map((msg: any) => (
                <div key={msg.id} className="flex gap-3 mb-4">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={`text-xs ${
                      msg.senderType === 'client' 
                        ? 'bg-primary text-primary-foreground' 
                        : msg.senderType === 'support'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {getInitials(msg.senderName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {msg.senderName}
                      </span>
                      {msg.senderType === 'client' && <User className="h-3 w-3 text-blue-600" />}
                      {msg.senderType === 'support' && <Headphones className="h-3 w-3 text-green-600" />}
                      {msg.senderType === 'admin' && <AlertTriangle className="h-3 w-3 text-red-600" />}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(msg.timestamp)}
                      </span>
                      {msg.isInternal && (
                        <Badge variant="outline" className="text-xs">
                          Interno
                        </Badge>
                      )}
                    </div>
                    
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((attachment: string, index: number) => {
                            const handleDownload = async (e: React.MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              console.log('🔍 Downloading attachment:', attachment);
                              
                              try {
                                const { data, error } = await supabase.storage
                                  .from('attachments')
                                  .createSignedUrl(attachment, 3600);
                                
                                if (error) {
                                  console.error('❌ Error creating signed URL:', error);
                                  alert('Erro ao acessar o arquivo: ' + error.message);
                                  return;
                                }
                                
                                console.log('✅ Signed URL created:', data.signedUrl);
                                
                                // Abrir em nova aba
                                const link = document.createElement('a');
                                link.href = data.signedUrl;
                                link.target = '_blank';
                                link.rel = 'noopener noreferrer';
                                link.download = attachment.split('/').pop() || 'attachment';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                
                              } catch (error) {
                                console.error('❌ Error downloading file:', error);
                                alert('Erro ao baixar o arquivo');
                              }
                            };

                            return (
                              <div
                                key={index}
                                onClick={handleDownload}
                                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 cursor-pointer hover:underline p-1 rounded hover:bg-blue-50"
                              >
                                <Paperclip className="h-3 w-3" />
                                <span>{attachment.split('/').pop()}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="flex-shrink-0 border-t pt-4 px-4 pb-4">
          {canReply ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="resize-none"
                rows={3}
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Pressione Enter para enviar, Shift+Enter para nova linha
                </p>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isLoading ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Este ticket foi {ticket.status === 'resolved' ? 'resolvido' : 'fechado'} e não aceita mais mensagens.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}