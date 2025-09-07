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
  recipients_count?: number;
  announcement_group_id?: string;
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

      if (user.role === 'admin') {
        // For admin, fetch grouped announcements
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcements')
          .select(`
            id,
            announcement_group_id,
            title,
            content,
            type,
            priority,
            target_audience,
            attachments,
            created_by,
            created_by_name,
            expires_at,
            created_at,
            updated_at
          `)
          .order('created_at', { ascending: false });

        if (announcementsError) {
          throw announcementsError;
        }

        // Group by announcement_group_id and count recipients
        const groupedAnnouncements = new Map();
        
        (announcementsData || []).forEach(announcement => {
          const groupId = announcement.announcement_group_id;
          if (!groupedAnnouncements.has(groupId)) {
            groupedAnnouncements.set(groupId, {
              ...announcement,
              recipients_count: 1,
              read: true // Admin always sees as read
            });
          } else {
            const existing = groupedAnnouncements.get(groupId);
            existing.recipients_count += 1;
          }
        });

        const enrichedAnnouncements = Array.from(groupedAnnouncements.values()).map(announcement => ({
          ...announcement,
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

        console.log('✅ Admin announcements fetched and grouped:', enrichedAnnouncements.length);
        setAnnouncements(enrichedAnnouncements);
        
      } else {
        // For regular users, fetch their specific announcements
        let query = supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });

        // If not admin and no specific clientId, we need current client
        if (!clientId) {
          console.log('⚠️ Non-admin users need a client ID');
          return;
        }

        // Filter by client
        query = query.eq('client_id', clientId);

        const { data: announcementsData, error: announcementsError } = await query;

        if (announcementsError) {
          throw announcementsError;
        }

        // For client users, also get read status
        let readAnnouncementIds = new Set<string>();
        const { data: readsData, error: readsError } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id);

        if (readsError) {
          console.warn('⚠️ Error fetching announcement reads:', readsError);
        } else {
          readAnnouncementIds = new Set(readsData?.map(r => r.announcement_id) || []);
        }

        const enrichedAnnouncements = (announcementsData || []).map(announcement => ({
          ...announcement,
          read: readAnnouncementIds.has(announcement.id),
          type: announcement.type as 'info' | 'warning' | 'success' | 'urgent',
          priority: announcement.priority as 'low' | 'medium' | 'high',
          target_audience: announcement.target_audience as 'clients' | 'suppliers' | 'all',
          created_at: announcement.created_at || new Date().toISOString(),
          updated_at: announcement.updated_at || new Date().toISOString(),
          attachments: announcement.attachments || [],
          created_by: announcement.created_by || undefined,
          created_by_name: announcement.created_by_name || undefined,
          expires_at: announcement.expires_at || undefined,
          recipients_count: 1
        }));

        console.log('✅ Client announcements fetched:', enrichedAnnouncements.length);
        setAnnouncements(enrichedAnnouncements);
      }

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
    targetClientId?: string,
    targetSupplierId?: string,
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

    // Additional safety check to ensure user data is available
    if (!user.id || !user.name) {
      toast({
        title: "Erro",
        description: "Dados do usuário não disponíveis. Tente novamente.",
        variant: "destructive"
      });
      return null;
    }

    try {
      console.log('🔍 DEBUG: Creating announcement with params:', {
        title,
        content,
        type,
        priority,
        targetAudience,
        targetClientId,
        targetSupplierId,
        user: user ? { id: user.id, name: user.name, role: user.role } : 'null'
      });
      
      // Generate a unique group ID for this batch of announcements
      const groupId = crypto.randomUUID();
      
      // For target_audience 'all' or when both client and supplier are specified
      const announcements_to_create = [];
      
      if (targetAudience === 'all') {
        // Create announcements for all clients
        const { data: allClients } = await supabase.from('clients').select('id').eq('status', 'active');
        const { data: allSuppliers } = await supabase.from('suppliers').select('id').eq('status', 'active');
        
        console.log('🔍 DEBUG: Fetched clients and suppliers:', { allClients, allSuppliers });
        
        if (allClients && allClients.length > 0) {
          announcements_to_create.push(...allClients
            .filter(client => client && client.id)
            .map(client => ({
              announcement_group_id: groupId,
              client_id: client.id,
              title: title.trim(),
              content: content.trim(),
              type,
              priority,
              target_audience: 'clients' as const,
              created_by: user.id,
              created_by_name: user.name || user.email || 'Admin',
              expires_at: expiresAt || null,
              attachments: attachments || []
            })));
        }
        
        if (allSuppliers && allSuppliers.length > 0) {
          announcements_to_create.push(...allSuppliers
            .filter(supplier => supplier && supplier.id)
            .map(supplier => ({
              announcement_group_id: groupId,
              supplier_id: supplier.id,
              title: title.trim(),
              content: content.trim(),
              type,
              priority,
              target_audience: 'suppliers' as const,
              created_by: user.id,
              created_by_name: user.name || user.email || 'Admin',
              expires_at: expiresAt || null,
              attachments: attachments || []
            })));
        }
      } else if (targetAudience === 'clients' && targetClientId) {
        console.log('🔍 DEBUG: Creating announcement for specific client:', targetClientId);
        announcements_to_create.push({
          announcement_group_id: groupId,
          client_id: targetClientId,
          title: title.trim(),
          content: content.trim(),
          type,
          priority,
          target_audience: targetAudience,
          created_by: user.id,
          created_by_name: user.name || user.email || 'Admin',
          expires_at: expiresAt || null,
          attachments: attachments || []
        });
      } else if (targetAudience === 'suppliers' && targetSupplierId) {
        console.log('🔍 DEBUG: Creating announcement for specific supplier:', targetSupplierId);
        announcements_to_create.push({
          announcement_group_id: groupId,
          supplier_id: targetSupplierId,
          title: title.trim(),
          content: content.trim(),
          type,
          priority,
          target_audience: targetAudience,
          created_by: user.id,
          created_by_name: user.name || user.email || 'Admin',
          expires_at: expiresAt || null,
          attachments: attachments || []
        });
      } else if (targetAudience === 'clients') {
        // If no specific client is selected, create for all active clients
        console.log('🔍 DEBUG: Creating announcement for all clients (no specific client selected)');
        const { data: allClients } = await supabase.from('clients').select('id').eq('status', 'active');
        
        if (allClients && allClients.length > 0) {
          announcements_to_create.push(...allClients
            .filter(client => client && client.id)
            .map(client => ({
              announcement_group_id: groupId,
              client_id: client.id,
              title: title.trim(),
              content: content.trim(),
              type,
              priority,
              target_audience: 'clients' as const,
              created_by: user.id,
              created_by_name: user.name || user.email || 'Admin',
              expires_at: expiresAt || null,
              attachments: attachments || []
            })));
        }
      }

      console.log('🔍 DEBUG: Announcements to create:', announcements_to_create);

      if (announcements_to_create.length === 0) {
        console.warn('⚠️ No announcements to create - no valid targets found');
        toast({
          title: "Aviso",
          description: "Nenhum destinatário válido encontrado para o comunicado.",
          variant: "destructive"
        });
        return null;
      }

      const { data: insertedData, error } = await supabase
        .from('announcements')
        .insert(announcements_to_create)
        .select();

      console.log('🔍 DEBUG: Insert result:', { insertedData, error });

      if (error) {
        throw error;
      }
      
      const firstAnnouncement = insertedData?.[0];
      if (!firstAnnouncement) {
        console.warn('⚠️ No announcement data returned from insert');
        throw new Error('Nenhum dado de comunicado retornado após inserção');
      }

      toast({
        title: "Comunicado criado",
        description: `Comunicado criado com sucesso para ${announcements_to_create.length} destinatário(s).`,
      });

      // Refresh announcements list
      await fetchAnnouncements();

      return groupId;

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