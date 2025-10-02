import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Users, Building2 } from 'lucide-react';

export function LeadGenerator() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLeads, setGeneratedLeads] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    type: 'client' as 'client' | 'supplier',
    segment: '',
    region: '',
    maxLeads: 20
  });

  const handleGenerate = async () => {
    if (!formData.segment) {
      toast({
        title: 'Atenção',
        description: 'Preencha o segmento para gerar leads',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-lead-scoring', {
        body: formData
      });

      if (error) throw error;

      if (data?.success) {
        setGeneratedLeads(data.leads || []);
        toast({
          title: '✅ Leads Gerados!',
          description: `${data.leads?.length || 0} leads criados com sucesso`,
        });
      }
    } catch (error: any) {
      console.error('Erro ao gerar leads:', error);
      toast({
        title: '❌ Erro',
        description: error.message || 'Não foi possível gerar leads',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário de Geração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Gerar Leads com IA
          </CardTitle>
          <CardDescription>
            Configure os parâmetros e deixe a IA encontrar leads qualificados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Lead</Label>
              <Select 
                value={formData.type}
                onValueChange={(value: 'client' | 'supplier') => 
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Clientes
                    </div>
                  </SelectItem>
                  <SelectItem value="supplier">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Fornecedores
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Segmento</Label>
              <Input
                placeholder="Ex: Condomínios Residenciais"
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Região (opcional)</Label>
              <Input
                placeholder="Ex: São Paulo"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Quantidade Máxima</Label>
              <Input
                type="number"
                min={5}
                max={100}
                value={formData.maxLeads}
                onChange={(e) => setFormData({ ...formData, maxLeads: Number(e.target.value) })}
              />
            </div>
          </div>

          <Button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full gap-2"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Sparkles className="h-4 w-4 animate-pulse" />
                Gerando Leads...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Leads
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Leads Gerados */}
      {generatedLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leads Gerados ({generatedLeads.length})</CardTitle>
            <CardDescription>
              Leads prontos para contato e conversão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedLeads.map((lead, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{lead.company_name}</h3>
                        <Badge variant={lead.score >= 80 ? 'default' : lead.score >= 60 ? 'secondary' : 'outline'}>
                          Score: {lead.score}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {lead.region && <p>📍 {lead.city}, {lead.state} - {lead.region}</p>}
                        {lead.segment && <p>🏢 {lead.segment}</p>}
                        {lead.ai_insights?.reasoning && (
                          <p className="text-foreground mt-2">💡 {lead.ai_insights.reasoning}</p>
                        )}
                        {lead.ai_insights?.potential_revenue_monthly && (
                          <p className="font-medium text-green-600 mt-2">
                            💰 Receita Potencial: R$ {lead.ai_insights.potential_revenue_monthly.toLocaleString('pt-BR')}/mês
                          </p>
                        )}
                        {lead.ai_insights?.recommended_plan && (
                          <p>📋 Plano recomendado: {lead.ai_insights.recommended_plan}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
