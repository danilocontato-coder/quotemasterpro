import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Paperclip, Clock, User, Building } from "lucide-react";
import { useCommunication } from "@/hooks/useCommunication";

interface ChatModalProps {
  chat: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatModal({ chat, open, onOpenChange }: ChatModalProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, markChatAsRead } = useCommunication();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open && chat) {
      markChatAsRead(chat.id);
      scrollToBottom();
    }
  }, [open, chat, markChatAsRead]);

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !chat || isLoading) return;

    setIsLoading(true);
    try {
      await sendMessage(chat.id, message.trim());
      setMessage("");
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!chat) return null;

  // Group messages by date
  const messagesByDate = chat.messages.reduce((groups: any, message: any) => {
    const date = formatDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(chat.supplierName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>{chat.supplierName}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {chat.quoteName}
                  </Badge>
                  <Badge className={chat.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                    {chat.status === 'active' ? 'Ativa' : 'Fechada'}
                  </Badge>
                </div>
              </div>
            </div>
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
                <div 
                  key={msg.id} 
                  className={`flex gap-3 mb-4 ${msg.senderType === 'client' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.senderType !== 'client' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {getInitials(msg.senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`max-w-[70%] ${msg.senderType === 'client' ? 'order-first' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {msg.senderName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.timestamp)}
                      </span>
                      {msg.senderType === 'client' && (
                        <Building className="h-3 w-3 text-blue-600" />
                      )}
                      {msg.senderType === 'supplier' && (
                        <User className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                    
                    <div className={`p-3 rounded-lg ${
                      msg.senderType === 'client' 
                        ? 'bg-primary text-primary-foreground ml-auto' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((attachment: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-xs opacity-75">
                              <Paperclip className="h-3 w-3" />
                              <span>{attachment}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {msg.senderType === 'client' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(msg.senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="flex-shrink-0 border-t pt-4 px-4 pb-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="resize-none"
                rows={3}
                disabled={chat.status !== 'active'}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                size="icon"
                variant="outline"
                disabled={chat.status !== 'active'}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading || chat.status !== 'active'}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {chat.status !== 'active' && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Esta conversa foi encerrada
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}