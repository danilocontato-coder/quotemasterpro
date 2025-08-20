import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Building2, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Settings,
  Activity
} from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    {
      title: "Total de Usuários",
      value: "2,847",
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Empresas Ativas",
      value: "342",
      change: "+8%",
      trend: "up",
      icon: Building2,
      color: "text-green-600"
    },
    {
      title: "Cotações Processadas",
      value: "15,642",
      change: "+23%",
      trend: "up",
      icon: FileText,
      color: "text-purple-600"
    },
    {
      title: "Receita Total",
      value: "R$ 89.420",
      change: "+18%",
      trend: "up",
      icon: DollarSign,
      color: "text-orange-600"
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: "user_registered",
      message: "Novo usuário cadastrado: João Silva",
      time: "2 minutos atrás",
      status: "success"
    },
    {
      id: 2,
      type: "company_approved",
      message: "Empresa Alpha Ltda foi aprovada",
      time: "15 minutos atrás",
      status: "success"
    },
    {
      id: 3,
      type: "payment_received",
      message: "Pagamento recebido: R$ 2.400,00",
      time: "1 hora atrás",
      status: "success"
    },
    {
      id: 4,
      type: "system_alert",
      message: "Manutenção programada para amanhã",
      time: "2 horas atrás",
      status: "warning"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground">
            Visão geral da plataforma e métricas de negócio
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Button>
          <Button>
            <Shield className="mr-2 h-4 w-4" />
            Segurança
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                    <span className="text-xs text-green-600">{stat.change}</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <Badge 
                    variant={activity.status === 'success' ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {activity.status === 'success' ? '✓' : '!'}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
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
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 flex-col">
                <Users className="h-6 w-6 mb-2" />
                <span className="text-xs">Gerenciar Usuários</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Building2 className="h-6 w-6 mb-2" />
                <span className="text-xs">Aprovar Empresas</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-xs">Relatórios</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Settings className="h-6 w-6 mb-2" />
                <span className="text-xs">Configurações</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}