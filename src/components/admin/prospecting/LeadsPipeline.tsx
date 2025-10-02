import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Users, Eye, MessageSquare, CheckCircle2, XCircle } from 'lucide-react';

export function LeadsPipeline() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedLeads = {
    new: leads.filter(l => l.status === 'new'),
    contacted: leads.filter(l => l.status === 'contacted'),
    qualified: leads.filter(l => l.status === 'qualified'),
    converted: leads.filter(l => l.status === 'converted'),
    lost: leads.filter(l => l.status === 'lost')
  };

  const statusConfig = {
    new: { label: 'Novos', icon: Users, color: 'bg-blue-500/10 text-blue-700' },
    contacted: { label: 'Contatados', icon: MessageSquare, color: 'bg-purple-500/10 text-purple-700' },
    qualified: { label: 'Qualificados', icon: Eye, color: 'bg-yellow-500/10 text-yellow-700' },
    converted: { label: 'Convertidos', icon: CheckCircle2, color: 'bg-green-500/10 text-green-700' },
    lost: { label: 'Perdidos', icon: XCircle, color: 'bg-gray-500/10 text-gray-700' }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[1,2,3,4,5].map(i => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {Object.entries(groupedLeads).map(([status, statusLeads]) => {
        const config = statusConfig[status as keyof typeof statusConfig];
        const Icon = config.icon;
        
        return (
          <Card key={status} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {config.label}
              </CardTitle>
              <CardDescription>
                {statusLeads.length} leads
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              {statusLeads.map((lead) => (
                <div 
                  key={lead.id}
                  className={`p-3 rounded-lg ${config.color} text-sm cursor-pointer hover:opacity-80 transition-opacity`}
                >
                  <p className="font-medium truncate">
                    {lead.contact_data?.name || 'Lead sem nome'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="text-xs">
                      Score: {lead.score}
                    </Badge>
                    <span className="text-xs opacity-70">
                      {lead.type === 'client' ? '👤' : '🏢'}
                    </span>
                  </div>
                </div>
              ))}
              
              {statusLeads.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum lead
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
