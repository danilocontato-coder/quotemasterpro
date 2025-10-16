import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailCampaign {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  subject_line: string;
  preview_text: string | null;
  from_name: string;
  reply_to_email: string | null;
  html_content: string;
  plain_text_content: string | null;
  ai_generated: boolean;
  ai_prompt: string | null;
  ai_metadata: any;
  target_segment: any;
  recipient_count: number;
  scheduled_send_at: string | null;
  timezone: string;
  ab_testing_enabled: boolean;
  ab_variant_id: string | null;
  ab_test_percentage: number;
  ab_winning_variant: string | null;
  status: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useEmailCampaigns() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar campanhas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (campaign: Partial<EmailCampaign>) => {
    try {
      const { data, error } = await supabase
        .from('email_marketing_campaigns')
        .insert([campaign as any])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Campanha criada com sucesso'
      });

      await fetchCampaigns();
      return data;
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar campanha',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<EmailCampaign>) => {
    try {
      const { error } = await supabase
        .from('email_marketing_campaigns')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Campanha atualizada'
      });

      await fetchCampaigns();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar campanha',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_marketing_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Campanha excluída'
      });

      await fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao excluir campanha',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const sendCampaign = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email-campaign', {
        body: { campaign_id: id }
      });

      if (error) throw error;

      toast({
        title: 'Campanha Enviada',
        description: `${data.sent_count} e-mails enviados com sucesso`
      });

      await fetchCampaigns();
      return data;
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao enviar campanha',
        variant: 'destructive'
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return {
    campaigns,
    loading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    refetch: fetchCampaigns
  };
}