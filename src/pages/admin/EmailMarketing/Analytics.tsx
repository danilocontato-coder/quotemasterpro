import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Mail, Send, MousePointer, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function CampaignAnalytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [clicks, setClicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const [campaignRes, recipientsRes, clicksRes] = await Promise.all([
        supabase.from('email_marketing_campaigns').select('*').eq('id', id).single(),
        supabase.from('email_campaign_recipients').select('*').eq('campaign_id', id),
        supabase.from('email_clicks').select('*').eq('campaign_id', id)
      ]);

      if (campaignRes.data) setCampaign(campaignRes.data);
      if (recipientsRes.data) setRecipients(recipientsRes.data);
      if (clicksRes.data) setClicks(clicksRes.data);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading || !campaign) {
    return <div className="container mx-auto p-6">Carregando...</div>;
  }

  const funnelData = [
    { name: 'Enviados', value: campaign.sent_count, color: '#003366' },
    { name: 'Entregues', value: campaign.delivered_count, color: '#0F172A' },
    { name: 'Abertos', value: campaign.opened_count, color: '#4B5563' },
    { name: 'Clicados', value: campaign.clicked_count, color: '#9CA3AF' },
  ];

  const deviceData = [
    { name: 'Desktop', value: 60 },
    { name: 'Mobile', value: 35 },
    { name: 'Tablet', value: 5 },
  ];

  const COLORS = ['#003366', '#0F172A', '#9CA3AF'];

  // Agregar cliques por URL
  const linkPerformance = clicks.reduce((acc: any[], click) => {
    const existing = acc.find(item => item.url === click.link_url);
    if (existing) {
      existing.clicks += 1;
    } else {
      acc.push({ url: click.link_url, clicks: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.clicks - a.clicks).slice(0, 5);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admin/email-marketing/campaigns')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar para Campanhas
      </Button>

      <div>
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
        <p className="text-muted-foreground">{campaign.subject_line}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Enviados</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.sent_count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa Abertura</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.open_rate}%</div>
            <p className="text-xs text-muted-foreground">{campaign.opened_count} abertos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa Cliques</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.click_rate}%</div>
            <p className="text-xs text-muted-foreground">{campaign.clicked_count} cliques</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa Bounce</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.bounce_rate}%</div>
            <p className="text-xs text-muted-foreground">{campaign.bounced_count} bounces</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnelData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-full">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground">{item.value}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${(item.value / campaign.sent_count) * 100}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => {
                    const percent = entry.percent || 0;
                    return `${entry.name} ${(Number(percent) * 100).toFixed(0)}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance de Links</CardTitle>
        </CardHeader>
        <CardContent>
          {linkPerformance.length === 0 ? (
            <p className="text-muted-foreground">Nenhum clique registrado ainda</p>
          ) : (
            <div className="space-y-2">
              {linkPerformance.map((link, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <span className="text-sm truncate flex-1">{link.url}</span>
                  <span className="text-sm font-semibold ml-4">{link.clicks} cliques</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}