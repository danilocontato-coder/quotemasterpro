import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Mail, Send, MousePointer, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { format, parseISO, startOfHour } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CampaignAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [clicks, setClicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    const [campaignRes, recipientsRes, clicksRes] = await Promise.all([
      supabase.from('email_marketing_campaigns').select('*').eq('id', id).maybeSingle(),
      supabase.from('email_campaign_recipients').select('*').eq('campaign_id', id),
      supabase.from('email_clicks').select('*').eq('campaign_id', id)
    ]);

    if (campaignRes.data) setCampaign(campaignRes.data);
    if (recipientsRes.data) setRecipients(recipientsRes.data);
    if (clicksRes.data) setClicks(clicksRes.data);
    setLoading(false);
  };

  if (loading || !campaign) {
    return <div className="container mx-auto p-6">Carregando...</div>;
  }

  const funnelData = [
    { name: 'Enviados', value: campaign.sent_count || 0, percentage: 100 },
    { name: 'Entregues', value: campaign.delivered_count || 0, percentage: campaign.sent_count ? Math.round((campaign.delivered_count / campaign.sent_count) * 100) : 0 },
    { name: 'Abertos', value: campaign.opened_count || 0, percentage: campaign.sent_count ? Math.round((campaign.opened_count / campaign.sent_count) * 100) : 0 },
    { name: 'Clicados', value: campaign.clicked_count || 0, percentage: campaign.sent_count ? Math.round((campaign.clicked_count / campaign.sent_count) * 100) : 0 },
  ];

  const linkPerformance = clicks.reduce((acc: any[], click) => {
    const existing = acc.find(item => item.url === click.link_url);
    if (existing) {
      existing.clicks += 1;
    } else {
      acc.push({ url: click.link_url, clicks: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.clicks - a.clicks).slice(0, 5);

  // Temporal evolution data
  const temporalData = recipients
    .filter(r => r.opened_at)
    .reduce((acc: any[], r) => {
      const hour = startOfHour(parseISO(r.opened_at));
      const hourKey = format(hour, 'dd/MM HH:00', { locale: ptBR });
      const existing = acc.find(item => item.hour === hourKey);
      if (existing) {
        existing.opens += 1;
        if (r.first_click_at) existing.clicks += 1;
      } else {
        acc.push({ hour: hourKey, opens: 1, clicks: r.first_click_at ? 1 : 0 });
      }
      return acc;
    }, [])
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // Heatmap data (hours of day)
  const heatmapData = Array.from({ length: 24 }, (_, i) => {
    const opens = recipients.filter(r => {
      if (!r.opened_at) return false;
      const hour = parseISO(r.opened_at).getHours();
      return hour === i;
    }).length;
    return { hour: `${i}h`, opens };
  });

  // Real device data from user_agent
  const deviceData = recipients
    .filter(r => r.user_agent)
    .reduce((acc: any[], r) => {
      const ua = r.user_agent.toLowerCase();
      let device = 'Desktop';
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) device = 'Mobile';
      if (ua.includes('tablet') || ua.includes('ipad')) device = 'Tablet';
      
      const existing = acc.find(item => item.name === device);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: device, value: 1 });
      }
      return acc;
    }, []);

  const COLORS = ['#003366', '#0F172A', '#9CA3AF'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admin/email-marketing/campaigns')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
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
            <div className="text-2xl font-bold">{campaign.sent_count || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa Abertura</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.open_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">{campaign.opened_count || 0} abertos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa Cliques</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.click_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">{campaign.clicked_count || 0} cliques</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa Bounce</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.bounce_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">{campaign.bounced_count || 0} bounces</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {funnelData.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">{item.value} ({item.percentage}%)</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-primary h-3 rounded-full transition-all" 
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispositivos (Real)</CardTitle>
          </CardHeader>
          <CardContent>
            {deviceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Dados de dispositivo não disponíveis</p>
            )}
          </CardContent>
        </Card>
      </div>

      {temporalData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolução Temporal (Aberturas e Cliques)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temporalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="opens" stroke="#8884d8" name="Aberturas" />
                <Line type="monotone" dataKey="clicks" stroke="#82ca9d" name="Cliques" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {heatmapData.some(d => d.opens > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Heatmap de Horários (Aberturas)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={heatmapData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="opens" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

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
