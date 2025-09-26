import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Bell, Headphones, Sparkles } from "lucide-react";
import { useSupabaseAnnouncements } from "@/hooks/useSupabaseAnnouncements";
import { useSupabaseTickets } from "@/hooks/useSupabaseTickets";
import { useSupabaseCurrentClient } from "@/hooks/useSupabaseCurrentClient";
import { useSupabaseQuoteChats } from "@/hooks/useSupabaseQuoteChats";
import { ContextualQA } from "@/components/communication/ContextualQA";
import { ClientAnnouncementsList } from "@/components/communication/client/ClientAnnouncementsList";
import { ClientTicketsManager } from "@/components/communication/client/ClientTicketsManager";
import { AIContextualAssistant } from "@/components/communication/AIContextualAssistant";

import { useEffect } from "react";

export default function Communication() {
  const [activeTab, setActiveTab] = useState("chats");
  const { client } = useSupabaseCurrentClient();
  
  const { announcements, fetchAnnouncements, getUnreadAnnouncementsCount } = useSupabaseAnnouncements();
  const { tickets, fetchTickets, getOpenTicketsCount } = useSupabaseTickets();
  const { getUnreadChatsCount } = useSupabaseQuoteChats();

  useEffect(() => {
    if (client?.id) {
      fetchAnnouncements(client.id);
      fetchTickets(client.id);
    }
  }, [client?.id, fetchAnnouncements, fetchTickets]);

  const unreadChats = getUnreadChatsCount();
  const unreadAnnouncements = getUnreadAnnouncementsCount();
  const openTickets = getOpenTicketsCount();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comunicação</h1>
          <p className="text-muted-foreground">
            Esclarecimentos estruturados, comunicados e suporte técnico
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-corporate">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <MessageCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Esclarecimentos</p>
                <p className="text-2xl font-bold">{getUnreadChatsCount()}</p>
              </div>
            </div>
            {unreadChats > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadChats} não lidas
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="card-corporate">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comunicados</p>
                <p className="text-2xl font-bold">{announcements.length}</p>
              </div>
            </div>
            {unreadAnnouncements > 0 && (
              <Badge className="bg-orange-500 text-white">
                {unreadAnnouncements} novos
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="card-corporate">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Headphones className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tickets Abertos</p>
                <p className="text-2xl font-bold">{openTickets}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="card-corporate">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chats" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span>Esclarecimentos</span>
                {unreadChats > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                    {unreadChats}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="announcements" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>Comunicados</span>
                {unreadAnnouncements > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                    {unreadAnnouncements}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tickets" className="flex items-center gap-2">
                <Headphones className="h-4 w-4" />
                <span>Suporte</span>
                {openTickets > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                    {openTickets}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="p-0">
            <TabsContent value="chats" className="m-0">
              <div className="p-6 space-y-6">
                {/* Assistente IA - Novo componente integrado */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900">Assistente IA Contextual</h3>
                      <p className="text-sm text-blue-700">
                        Obtenha perguntas contextuais e sugestões inteligentes para suas cotações
                      </p>
                    </div>
                  </div>
                  <AIContextualAssistant />
                </div>
                
                <ContextualQA />
              </div>
            </TabsContent>
            
            <TabsContent value="announcements" className="m-0 p-6">
              <ClientAnnouncementsList />
            </TabsContent>
            
            <TabsContent value="tickets" className="m-0 p-6">
              <ClientTicketsManager />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}