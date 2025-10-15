import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailTemplate {
  id: string;
  client_id: string | null;
  template_type: string;
  name: string;
  subject: string;
  html_content: string;
  plain_text_content: string | null;
  variables: any;
  active: boolean;
  is_global: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching email templates:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar templates de e-mail',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const createTemplate = async (template: Partial<EmailTemplate>) => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .insert([template as any])
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Template de e-mail criado'
      });
      
      await fetchTemplates();
      return data;
    } catch (error) {
      console.error('Error creating email template:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar template',
        variant: 'destructive'
      });
      throw error;
    }
  };
  
  const updateTemplate = async (id: string, updates: Partial<EmailTemplate>) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Template atualizado'
      });
      
      await fetchTemplates();
    } catch (error) {
      console.error('Error updating email template:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar template',
        variant: 'destructive'
      });
      throw error;
    }
  };
  
  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Template excluído'
      });
      
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting email template:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao excluir template',
        variant: 'destructive'
      });
      throw error;
    }
  };
  
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates
  };
}
