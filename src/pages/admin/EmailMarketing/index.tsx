import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEmailCampaigns } from '@/hooks/useEmailCampaigns';
import { Mail, Send, MousePointer, TrendingUp, Plus, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EmailMarketingDashboard() {
  const { campaigns, loading } = useEmailCampaigns();
  const navigate = useNavigate();

  const stats = {
    totalSent: campaigns.reduce((sum, c) => sum + c.sent_count, 0),
    avgOpenRate: campaigns.length > 0 
      ? (campaigns.reduce((sum, c) => sum + c.open_rate, 0) / campaigns.length).toFixed(1)
      : '0.0',
    avgClickRate: campaigns.length > 0
      ? (campaigns.reduce((sum, c) => sum + c.click_rate, 0) / campaigns.length).toFixed(1)
      : '0.0',
    totalCampaigns: campaigns.length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">E-mail Marketing</h1>
          <p className="text-muted-foreground">Crie campanhas inteligentes com IA</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/email-marketing/contacts')} variant="outline" size="lg">
            <Users className="h-4 w-4 mr-2" />
            Gerenciar Contatos
          </Button>
          <Button onClick={() => navigate('/admin/email-marketing/editor')} size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            Criar Campanha com IA
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Enviados</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa Abertura</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOpenRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa Cliques</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgClickRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Campanhas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campanhas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma campanha criada ainda</p>
              <Button onClick={() => navigate('/admin/email-marketing/editor')}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Campanha
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.slice(0, 5).map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent">
                  <div>
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <p className="text-sm text-muted-foreground">{campaign.subject_line}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{campaign.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {campaign.open_rate}% abertos • {campaign.click_rate}% cliques
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}