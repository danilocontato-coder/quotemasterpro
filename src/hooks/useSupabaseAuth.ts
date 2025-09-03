import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSupabaseAuth = () => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { toast } = useToast();

  const changePassword = async (newPassword: string) => {
    try {
      setIsChangingPassword(true);
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
      return true;
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Não foi possível alterar a senha.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsChangingPassword(false);
    }
  };

  const updateUserEmail = async (newEmail: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      toast({
        title: "E-mail atualizado",
        description: "Verifique seu novo e-mail para confirmar a alteração.",
      });
      return true;
    } catch (error: any) {
      console.error('Error updating email:', error);
      toast({
        title: "Erro ao atualizar e-mail",
        description: error.message || "Não foi possível atualizar o e-mail.",
        variant: "destructive"
      });
      return false;
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      toast({
        title: "E-mail enviado",
        description: "Verifique sua caixa de entrada para redefinir a senha.",
      });
      return true;
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast({
        title: "Erro ao enviar e-mail",
        description: error.message || "Não foi possível enviar o e-mail de recuperação.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    changePassword,
    updateUserEmail,
    sendPasswordResetEmail,
    isChangingPassword
  };
};