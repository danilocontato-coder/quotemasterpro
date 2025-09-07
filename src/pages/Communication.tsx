import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Bell, Headphones } from "lucide-react";
import { useCommunication } from "@/hooks/useCommunication";
import { ChatSection } from "@/components/communication/ChatSection";
import { AnnouncementsSection } from "@/components/communication/AnnouncementsSection";
import { TicketsSection } from "@/components/communication/TicketsSection";

export default function Communication() {
  const [activeTab, setActiveTab] = useState("chats");
  
  const {
    getUnreadChatsCount,
    getUnreadAnnouncementsCount,
    getOpenTicketsCount,
  } = useCommunication();

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
            Chat com fornecedores, comunicados e suporte técnico
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
                <p className="text-sm text-muted-foreground">Conversas Ativas</p>
                <p className="text-2xl font-bold">2</p>
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
                <p className="text-2xl font-bold">4</p>
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
                <span>Conversas</span>
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
              <ChatSection />
            </TabsContent>
            
            <TabsContent value="announcements" className="m-0">
              <AnnouncementsSection />
            </TabsContent>
            
            <TabsContent value="tickets" className="m-0">
              <TicketsSection />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}