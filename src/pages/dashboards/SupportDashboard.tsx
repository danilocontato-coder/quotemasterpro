import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Phone,
  Mail,
  Users,
  Headphones
} from 'lucide-react';

export default function SupportDashboard() {
  const ticketStats = [
    {
      title: "Tickets Abertos",
      value: "23",
      change: "-3",
      trend: "down",
      icon: AlertCircle,
      color: "text-red-600"
    },
    {
      title: "Em Andamento",
      value: "18",
      change: "+2",
      trend: "up",
      icon: Clock,
      color: "text-yellow-600"
    },
    {
      title: "Resolvidos Hoje",
      value: "45",
      change: "+12",
      trend: "up",
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: "Tempo Médio",
      value: "2.4h",
      change: "-0.3h",
      trend: "down",
      icon: MessageSquare,
      color: "text-blue-600"
    }
  ];

  const recentTickets = [
    {
      id: "T-001",
      title: "Problema no login",
      customer: "João Silva",
      company: "Condomínio Vista Verde",
      priority: "high",
      status: "open",
      time: "5 min atrás"
    },
    {
      id: "T-002",
      title: "Erro ao gerar relatório",
      customer: "Maria Santos",
      company: "Fornecedora Alpha",
      priority: "medium",
      status: "in_progress",
      time: "12 min atrás"
    },
    {
      id: "T-003",
      title: "Dúvida sobre cotações",
      customer: "Carlos Oliveira",
      company: "Condomínio Bela Vista",
      priority: "low",
      status: "open",
      time: "25 min atrás"
    },
    {
      id: "T-004",
      title: "Integração com pagamento",
      customer: "Ana Costa",
      company: "Fornecedora Beta",
      priority: "high",
      status: "in_progress",
      time: "1h atrás"
    }
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Alta</Badge>;
      case 'medium':
        return <Badge variant="secondary">Média</Badge>;
      case 'low':
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Aberto</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">Em Andamento</Badge>;
      case 'resolved':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Resolvido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Central de Suporte</h1>
          <p className="text-muted-foreground">
            Gerencie tickets e atenda aos usuários da plataforma
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Phone className="mr-2 h-4 w-4" />
            Ligar
          </Button>
          <Button>
            <MessageSquare className="mr-2 h-4 w-4" />
            Novo Ticket
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ticketStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center mt-1">
                    <span className={`text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`${stat.color}`}>
                  <stat.icon className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Tickets Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium">{ticket.id}</span>
                      {getPriorityBadge(ticket.priority)}
                      {getStatusBadge(ticket.status)}
                    </div>
                    <h4 className="font-medium">{ticket.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {ticket.customer} • {ticket.company}
                    </p>
                    <p className="text-xs text-muted-foreground">{ticket.time}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Ver
                    </Button>
                    <Button size="sm">
                      Responder
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="mr-2 h-4 w-4" />
                Criar Ticket
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Buscar Cliente
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Phone className="mr-2 h-4 w-4" />
                Fazer Chamada
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Mail className="mr-2 h-4 w-4" />
                Enviar Email
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Headphones className="mr-2 h-4 w-4" />
                Base de Conhecimento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}