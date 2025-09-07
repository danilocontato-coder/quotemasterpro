import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Announcement {
  id: string;
  client_id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  priority: 'low' | 'medium' | 'high';
  target_audience: 'clients' | 'suppliers' | 'all';
  attachments: string[];
  created_by?: string;
  created_by_name?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  read?: boolean;
}

export const useSupabaseAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch announcements for admin (all clients) or client-specific
  const fetchAnnouncements = useCallback(async (clientId?: string) => {
    if (!user) {
      console.log('⚠️ Cannot fetch announcements: no user');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      // If not admin and no specific clientId, we need current client
      if (user.role !== 'admin' && !clientId) {
        console.log('⚠️ Non-admin users need a client ID');
        return;
      }

      // Filter by client if specified or if not admin
      if (clientId) {
        query = query.eq('client_id', clientId);
      } else if (user.role !== 'admin') {
        // This shouldn't happen but just in case
        return;
      }

      const { data: announcementsData, error: announcementsError } = await query;

      if (announcementsError) {
        throw announcementsError;
      }

      // For client users, also get read status
      let readAnnouncementIds = new Set<string>();
      if (user.role !== 'admin') {
        const { data: readsData, error: readsError } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id);

        if (readsError) {
          console.warn('⚠️ Error fetching announcement reads:', readsError);
        } else {
          readAnnouncementIds = new Set(readsData?.map(r => r.announcement_id) || []);
        }
      }

      const enrichedAnnouncements = (announcementsData || []).map(announcement => ({
        ...announcement,
        read: user.role === 'admin' ? true : readAnnouncementIds.has(announcement.id),
        type: announcement.type as 'info' | 'warning' | 'success' | 'urgent',
        priority: announcement.priority as 'low' | 'medium' | 'high',
        target_audience: announcement.target_audience as 'clients' | 'suppliers' | 'all',
        created_at: announcement.created_at || new Date().toISOString(),
        updated_at: announcement.updated_at || new Date().toISOString(),
        attachments: announcement.attachments || [],
        created_by: announcement.created_by || undefined,
        created_by_name: announcement.created_by_name || undefined,
        expires_at: announcement.expires_at || undefined
      }));

      console.log('✅ Announcements fetched:', enrichedAnnouncements.length);
      setAnnouncements(enrichedAnnouncements);

    } catch (err) {
      console.error('❌ Error fetching announcements:', err);
      setError(err instanceof Error ? err.message : 'Error fetching announcements');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Mark announcement as read (client users only)
  const markAnnouncementAsRead = useCallback(async (announcementId: string) => {
    if (!user?.id || user.role === 'admin') return;

    try {
      const { error } = await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_id: user.id
        });

      if (error) {
        throw error;
      }

      // Update local state
      setAnnouncements(prev => prev.map(announcement => 
        announcement.id === announcementId 
          ? { ...announcement, read: true }
          : announcement
      ));

    } catch (err) {
      console.error('❌ Error marking announcement as read:', err);
      toast({
        title: "Erro",
        description: "Não foi possível marcar o comunicado como lido.",
        variant: "destructive"
      });
    }
  }, [user?.id, toast]);

  // Create announcement (admin only)
  const createAnnouncement = useCallback(async (
    title: string,
    content: string,
    type: 'info' | 'warning' | 'success' | 'urgent',
    priority: 'low' | 'medium' | 'high',
    targetAudience: 'clients' | 'suppliers' | 'all',
    targetClientId: string,
    expiresAt?: string,
    attachments?: string[]
  ) => {
    if (!user || user.role !== 'admin') {
      toast({
        title: "Erro",
        description: "Apenas administradores podem criar comunicados.",
        variant: "destructive"
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          client_id: targetClientId,
          title: title.trim(),
          content: content.trim(),
          type,
          priority,
          target_audience: targetAudience,
          created_by: user.id,
          created_by_name: user.name,
          expires_at: expiresAt || null,
          attachments: attachments || []
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Comunicado criado",
        description: "O comunicado foi criado com sucesso.",
      });

      return data.id;

    } catch (err) {
      console.error('❌ Error creating announcement:', err);
      toast({
        title: "Erro",
        description: "Não foi possível criar o comunicado. Tente novamente.",
        variant: "destructive"
      });
      return null;
    }
  }, [user, toast]);

  // Update announcement (admin only)
  const updateAnnouncement = useCallback(async (
    id: string,
    updates: Partial<Pick<Announcement, 'title' | 'content' | 'type' | 'priority' | 'target_audience' | 'expires_at' | 'attachments'>>
  ) => {
    if (!user || user.role !== 'admin') {
      toast({
        title: "Erro",
        description: "Apenas administradores podem editar comunicados.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('announcements')
        .update(updates)
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Comunicado atualizado",
        description: "O comunicado foi atualizado com sucesso.",
      });

      return true;

    } catch (err) {
      console.error('❌ Error updating announcement:', err);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o comunicado. Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  // Delete announcement (admin only)
  const deleteAnnouncement = useCallback(async (id: string) => {
    if (!user || user.role !== 'admin') {
      toast({
        title: "Erro",
        description: "Apenas administradores podem excluir comunicados.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      setAnnouncements(prev => prev.filter(a => a.id !== id));

      toast({
        title: "Comunicado excluído",
        description: "O comunicado foi excluído com sucesso.",
      });

      return true;

    } catch (err) {
      console.error('❌ Error deleting announcement:', err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o comunicado. Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  // Utility functions
  const getUnreadAnnouncementsCount = useCallback(() => {
    return announcements.filter(announcement => !announcement.read).length;
  }, [announcements]);

  return {
    // State
    announcements,
    isLoading,
    error,
    
    // Actions
    fetchAnnouncements,
    markAnnouncementAsRead,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    
    // Utilities
    getUnreadAnnouncementsCount,
  };
};