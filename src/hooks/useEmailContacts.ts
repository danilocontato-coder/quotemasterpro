import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailContact {
  id: string;
  client_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  tags: string[];
  custom_fields: any;
  status: 'active' | 'unsubscribed' | 'bounced';
  source: string;
  unsubscribed_at: string | null;
  bounced_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useEmailContacts() {
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchContacts = async (filters?: { status?: string; tags?: string[] }) => {
    try {
      setLoading(true);
      let query = supabase
        .from('email_contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContacts((data || []) as EmailContact[]);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar contatos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const importContacts = async (contactsData: Partial<EmailContact>[]) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.client_id) {
        throw new Error('Cliente não encontrado');
      }

      const contactsWithClientId = contactsData.map(contact => ({
        email: contact.email || '',
        name: contact.name,
        phone: contact.phone,
        tags: contact.tags || [],
        custom_fields: contact.custom_fields || {},
        status: contact.status || 'active',
        client_id: profile.client_id,
        source: 'imported'
      }));

      const { data, error } = await supabase
        .from('email_contacts')
        .upsert(contactsWithClientId, { 
          onConflict: 'client_id,email',
          ignoreDuplicates: false 
        })
        .select();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `${data?.length || 0} contatos importados`
      });

      await fetchContacts();
      return data;
    } catch (error: any) {
      console.error('Error importing contacts:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao importar contatos',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Contato excluído'
      });

      await fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao excluir contato',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateContact = async (id: string, updates: Partial<EmailContact>) => {
    try {
      const { error } = await supabase
        .from('email_contacts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Contato atualizado'
      });

      await fetchContacts();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar contato',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const exportContacts = () => {
    const csv = [
      ['Nome', 'Email', 'Telefone', 'Tags', 'Status', 'Data Criação'].join(','),
      ...contacts.map(c => [
        c.name || '',
        c.email,
        c.phone || '',
        c.tags.join(';'),
        c.status,
        new Date(c.created_at).toLocaleDateString('pt-BR')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contatos-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStats = () => {
    const total = contacts.length;
    const active = contacts.filter(c => c.status === 'active').length;
    const unsubscribed = contacts.filter(c => c.status === 'unsubscribed').length;
    const bounced = contacts.filter(c => c.status === 'bounced').length;

    return { total, active, unsubscribed, bounced };
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  return {
    contacts,
    loading,
    fetchContacts,
    importContacts,
    deleteContact,
    updateContact,
    exportContacts,
    getStats
  };
}
