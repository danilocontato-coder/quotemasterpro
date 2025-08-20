import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Clock, User } from "lucide-react";
import { useCommunication } from "@/hooks/useCommunication";
import { ChatModal } from "./ChatModal";

export function ChatSection() {
  const { chats } = useCommunication();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);

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

  const handleOpenChat = (chat: any) => {
    setSelectedChat(chat);
    setChatModalOpen(true);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Conversas com Fornecedores</h3>
        <Badge variant="outline" className="text-sm">
          {chats.length} conversas ativas
        </Badge>
      </div>

      {chats.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma conversa ativa</h3>
            <p className="text-muted-foreground text-center max-w-md">
              As conversas aparecerão aqui quando você tiver cotações em negociação com fornecedores.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => (
            <Card 
              key={chat.id} 
              className="transition-all duration-200 hover:shadow-md cursor-pointer border-l-4 border-l-blue-500"
              onClick={() => handleOpenChat(chat)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-base">{chat.supplierName}</h4>
                      <Badge variant="outline" className="text-xs">
                        {chat.quoteName}
                      </Badge>
                      {chat.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white text-xs">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {chat.lastMessage}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(chat.lastMessageTime)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {chat.messages.length} mensagens
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge 
                      className={chat.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}
                    >
                      {chat.status === 'active' ? 'Ativa' : 'Fechada'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ChatModal
        chat={selectedChat}
        open={chatModalOpen}
        onOpenChange={setChatModalOpen}
      />
    </div>
  );
}