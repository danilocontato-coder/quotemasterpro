import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserSettings {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  company_name: string | null;
  notifications: {
    email: boolean;
    whatsapp: boolean;
    newQuotes: boolean;
    approvals: boolean;
    payments: boolean;
    lowStock: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    currency: string;
    theme: string;
  };
  two_factor_enabled: boolean;
  two_factor_method: string;
  created_at: string;
  updated_at: string;
}

export const useSupabaseSettings = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  // Fetch current user and settings
  const fetchUserAndSettings = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        setCurrentUser(null);
        setSettings(null);
        return;
      }
      
      setCurrentUser(user);
      
      // Get or create user settings
      const { data, error } = await supabase
        .rpc('get_or_create_user_settings', { user_uuid: user.id });
      
      if (error) {
        console.error('Settings fetch error:', error);
        throw error;
      }
      
      // Transform the data to match our interface
      const transformedSettings: UserSettings = {
        ...data,
        notifications: typeof data.notifications === 'string' 
          ? JSON.parse(data.notifications) 
          : data.notifications,
        preferences: typeof data.preferences === 'string' 
          ? JSON.parse(data.preferences) 
          : data.preferences
      };
      
      setSettings(transformedSettings);
    } catch (error) {
      console.error('Error fetching user settings:', error);
      toast({
        title: "Erro ao carregar configurações",
        description: "Não foi possível carregar suas configurações.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile settings
  const updateProfile = async (profileData: {
    display_name?: string;
    phone?: string;
    company_name?: string;
  }) => {
    try {
      if (!currentUser) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('user_settings')
        .update(profileData)
        .eq('user_id', currentUser.id)
        .select()
        .single();

      if (error) throw error;

      // Transform the data to match our interface
      const transformedSettings: UserSettings = {
        ...data,
        notifications: typeof data.notifications === 'string' 
          ? JSON.parse(data.notifications) 
          : data.notifications,
        preferences: typeof data.preferences === 'string' 
          ? JSON.parse(data.preferences) 
          : data.preferences
      };

      setSettings(transformedSettings);
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro ao atualizar perfil",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Update notification preferences
  const updateNotifications = async (notifications: UserSettings['notifications']) => {
    try {
      if (!currentUser) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('user_settings')
        .update({ notifications })
        .eq('user_id', currentUser.id)
        .select()
        .single();

      if (error) throw error;

      // Transform the data to match our interface
      const transformedSettings: UserSettings = {
        ...data,
        notifications: typeof data.notifications === 'string' 
          ? JSON.parse(data.notifications) 
          : data.notifications,
        preferences: typeof data.preferences === 'string' 
          ? JSON.parse(data.preferences) 
          : data.preferences
      };

      setSettings(transformedSettings);
      toast({
        title: "Notificações atualizadas",
        description: "Suas preferências de notificação foram salvas.",
      });
      return true;
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast({
        title: "Erro ao atualizar notificações",
        description: "Não foi possível salvar as preferências.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Update system preferences
  const updatePreferences = async (preferences: UserSettings['preferences']) => {
    try {
      if (!currentUser) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('user_settings')
        .update({ preferences })
        .eq('user_id', currentUser.id)
        .select()
        .single();

      if (error) throw error;

      // Transform the data to match our interface
      const transformedSettings: UserSettings = {
        ...data,
        notifications: typeof data.notifications === 'string' 
          ? JSON.parse(data.notifications) 
          : data.notifications,
        preferences: typeof data.preferences === 'string' 
          ? JSON.parse(data.preferences) 
          : data.preferences
      };

      setSettings(transformedSettings);
      toast({
        title: "Preferências salvas",
        description: "Suas configurações foram atualizadas.",
      });
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Erro ao atualizar preferências",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Update avatar URL
  const updateAvatar = async (avatar_url: string) => {
    try {
      if (!currentUser) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('user_settings')
        .update({ avatar_url })
        .eq('user_id', currentUser.id)
        .select()
        .single();

      if (error) throw error;

      // Transform the data to match our interface
      const transformedSettings: UserSettings = {
        ...data,
        notifications: typeof data.notifications === 'string' 
          ? JSON.parse(data.notifications) 
          : data.notifications,
        preferences: typeof data.preferences === 'string' 
          ? JSON.parse(data.preferences) 
          : data.preferences
      };

      setSettings(transformedSettings);
      toast({
        title: "Avatar atualizado",
        description: "Sua foto de perfil foi alterada com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast({
        title: "Erro ao atualizar avatar",
        description: "Não foi possível alterar a foto de perfil.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Toggle two-factor authentication
  const toggleTwoFactor = async (enabled: boolean, method: string = 'sms') => {
    try {
      if (!currentUser) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('user_settings')
        .update({ 
          two_factor_enabled: enabled,
          two_factor_method: method 
        })
        .eq('user_id', currentUser.id)
        .select()
        .single();

      if (error) throw error;

      // Transform the data to match our interface
      const transformedSettings: UserSettings = {
        ...data,
        notifications: typeof data.notifications === 'string' 
          ? JSON.parse(data.notifications) 
          : data.notifications,
        preferences: typeof data.preferences === 'string' 
          ? JSON.parse(data.preferences) 
          : data.preferences
      };

      setSettings(transformedSettings);
      toast({
        title: enabled ? "2FA ativado" : "2FA desativado",
        description: enabled 
          ? "Autenticação de dois fatores foi ativada." 
          : "Autenticação de dois fatores foi desativada.",
      });
      return true;
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      toast({
        title: "Erro ao configurar 2FA",
        description: "Não foi possível alterar a configuração de dois fatores.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchUserAndSettings();

    const channel = supabase
      .channel('user-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings'
        },
        () => {
          fetchUserAndSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    settings,
    currentUser,
    isLoading,
    refetch: fetchUserAndSettings,
    updateProfile,
    updateNotifications,
    updatePreferences,
    updateAvatar,
    toggleTwoFactor
  };
};