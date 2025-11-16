import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InvitationLetter {
  id: string;
  letter_number: string;
  client_id: string;
  quote_id: string | null;
  title: string;
  description: string;
  deadline: string;
  status: 'draft' | 'sent' | 'cancelled';
  attachments: any | null;
  quote_category: string | null;
  estimated_budget: number | null;
  items_summary: any | null;
  direct_emails: string[] | null;
  required_documents: any | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  created_by: string;
  // Computed fields
  responses_count?: number;
  viewed_count?: number;
}

export interface InvitationLetterSupplier {
  id: string;
  invitation_letter_id: string;
  supplier_id: string;
  response_status: 'pending' | 'accepted' | 'declined' | 'no_interest' | null;
  response_date: string | null;
  response_notes: string | null;
  response_attachment_url: string | null;
  response_token: string | null;
  token_expires_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  created_at: string;
}

export interface CreateLetterData {
  quote_id?: string;
  quote_category?: string;
  estimated_budget?: number;
  title: string;
  description: string;
  deadline: string;
  supplier_ids: string[];
  direct_emails?: string[];
  attachments?: File[];
  required_documents?: Array<{ type: string; label: string; mandatory: boolean }>;
  send_immediately?: boolean;
}

export function useSupabaseInvitationLetters() {
  const [letters, setLetters] = useState<InvitationLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch letters with stats
  const fetchLetters = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch letters
      const { data: lettersData, error: lettersError } = await supabase
        .from('invitation_letters')
        .select('*')
        .order('created_at', { ascending: false});

      if (lettersError) throw lettersError;

      // Fetch stats for each letter
      const lettersWithStats = await Promise.all(
        (lettersData || []).map(async (letter) => {
          const { data: stats } = await supabase.rpc('get_invitation_letter_stats', {
            p_letter_id: letter.id
          });

          // stats is an array with single element
          const statsRow = Array.isArray(stats) && stats.length > 0 ? stats[0] : null;

          return {
            ...letter,
            responses_count: statsRow?.responses_count || 0,
            viewed_count: statsRow?.viewed_count || 0
          };
        })
      );

      setLetters(lettersWithStats);

    } catch (err: any) {
      console.error('[useSupabaseInvitationLetters] Error fetching letters:', err);
      setError(err.message);
      toast.error('Erro ao carregar cartas convite', {
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create letter
  const createLetter = async (data: CreateLetterData): Promise<string | null> => {
    try {
      console.log('[useSupabaseInvitationLetters] Creating letter:', data);

      // Get client_id from current user
      const { data: profileData } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profileData?.client_id) {
        throw new Error('Cliente não encontrado');
      }

      // Create letter record WITHOUT attachments first
      const { data: letterData, error: letterError } = await supabase
        .from('invitation_letters')
        .insert({
          quote_id: data.quote_id || null,
          client_id: profileData.client_id,
          quote_category: data.quote_category || null,
          estimated_budget: data.estimated_budget || null,
          direct_emails: data.direct_emails || [],
          required_documents: data.required_documents || null,
          title: data.title,
          description: data.description,
          deadline: data.deadline,
          status: 'draft',
          attachments: null // Will be updated after upload
        })
        .select()
        .single();

      if (letterError) throw letterError;

      console.log('[useSupabaseInvitationLetters] Letter created:', letterData);

      // NOW upload attachments using the correct letter_id
      let attachmentUrls: any[] = [];
      if (data.attachments && data.attachments.length > 0) {
        try {
          attachmentUrls = await Promise.all(
            data.attachments.map(async (file) => {
              const fileExt = file.name.split('.').pop();
              const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
              const filePath = `${letterData.id}/${fileName}`; // ✅ Using letter_id instead of quote_id

              const { error: uploadError } = await supabase.storage
                .from('invitation-attachments')
                .upload(filePath, file);

              if (uploadError) throw uploadError;

              const { data: urlData } = supabase.storage
                .from('invitation-attachments')
                .getPublicUrl(filePath);

              return {
                name: file.name,
                url: urlData.publicUrl,
                size: file.size,
                type: file.type
              };
            })
          );

          // Update letter with attachments
          const { error: updateError } = await supabase
            .from('invitation_letters')
            .update({ attachments: attachmentUrls })
            .eq('id', letterData.id);

          if (updateError) throw updateError;

        } catch (uploadError: any) {
          console.error('[useSupabaseInvitationLetters] Upload error:', uploadError);
          // Rollback: delete the created letter
          await supabase.from('invitation_letters').delete().eq('id', letterData.id);
          throw new Error(`Erro no upload de anexos: ${uploadError.message}`);
        }
      }

      console.log('[useSupabaseInvitationLetters] Letter created:', letterData);

      // Create supplier assignments
      const supplierAssignments = data.supplier_ids.map(supplierId => ({
        invitation_letter_id: letterData.id,
        supplier_id: supplierId
      }));

      const { error: suppliersError } = await supabase
        .from('invitation_letter_suppliers')
        .insert(supplierAssignments);

      if (suppliersError) throw suppliersError;

      // If send_immediately, call edge function to send
      if (data.send_immediately) {
        const { error: sendError } = await supabase.functions.invoke('send-invitation-letter', {
          body: { letterId: letterData.id }
        });

        if (sendError) {
          console.error('[useSupabaseInvitationLetters] Error sending letter:', sendError);
          toast.error('Carta criada, mas houve erro no envio', {
            description: 'Você pode reenviar manualmente'
          });
        }
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        action: 'CREATE_INVITATION_LETTER',
        panel_type: 'client',
        entity_type: 'invitation_letters',
        entity_id: letterData.id,
        details: {
          letter_number: letterData.letter_number,
          suppliers_count: data.supplier_ids.length,
          deadline: data.deadline,
          send_immediately: data.send_immediately
        }
      });

      toast.success(
        data.send_immediately 
          ? `Carta ${letterData.letter_number} enviada com sucesso!`
          : `Carta ${letterData.letter_number} salva como rascunho`
      );

      await fetchLetters();
      return letterData.id;

    } catch (err: any) {
      console.error('[useSupabaseInvitationLetters] Error creating letter:', err);
      
      // Tratamento específico de erros
      let errorTitle = 'Erro ao criar carta convite';
      let errorDescription = err.message;
      
      if (err.code === '23505') {
        // Duplicate key error
        if (err.message.includes('letter_number')) {
          errorTitle = 'Número de carta duplicado';
          errorDescription = 'Ocorreu um conflito ao gerar o número da carta. Por favor, tente novamente.';
        }
      } else if (err.code === '23503') {
        // Foreign key violation
        errorTitle = 'Dados relacionados não encontrados';
        errorDescription = 'Cliente ou fornecedor não encontrado. Verifique os dados e tente novamente.';
      } else if (err.message.includes('storage')) {
        errorTitle = 'Erro ao fazer upload de anexos';
        errorDescription = 'Não foi possível fazer upload dos anexos. Verifique o tamanho e formato dos arquivos.';
      } else if (err.message.includes('cliente')) {
        errorTitle = 'Cliente não identificado';
        errorDescription = 'Não foi possível identificar o seu cliente. Faça login novamente.';
      }
      
      toast.error(errorTitle, { description: errorDescription });
      return null;
    }
  };

  // Send letter (for drafts)
  const sendLetter = async (letterId: string): Promise<boolean> => {
    try {
      console.log('[useSupabaseInvitationLetters] Sending letter:', letterId);

      const { error } = await supabase.functions.invoke('send-invitation-letter', {
        body: { letterId }
      });

      if (error) throw error;

      toast.success('Carta enviada com sucesso!');
      await fetchLetters();
      return true;

    } catch (err: any) {
      console.error('[useSupabaseInvitationLetters] Error sending letter:', err);
      
      let errorDescription = err.message;
      if (err.message.includes('not found') || err.message.includes('não encontrad')) {
        errorDescription = 'Carta não encontrada. Ela pode ter sido excluída ou você não tem permissão para enviá-la.';
      } else if (err.message.includes('email') || err.message.includes('e-mail')) {
        errorDescription = 'Erro ao enviar e-mails. Verifique os endereços dos fornecedores.';
      }
      
      toast.error('Erro ao enviar carta', { description: errorDescription });
      return false;
    }
  };

  // Resend letter
  const resendLetter = async (letterId: string): Promise<boolean> => {
    try {
      console.log('[useSupabaseInvitationLetters] Resending letter:', letterId);

      const { error } = await supabase.functions.invoke('send-invitation-letter', {
        body: { letterId, isResend: true }
      });

      if (error) throw error;

      toast.success('Carta reenviada com sucesso!');
      await fetchLetters();
      return true;

    } catch (err: any) {
      console.error('[useSupabaseInvitationLetters] Error resending letter:', err);
      
      let errorDescription = err.message;
      if (err.message.includes('not found') || err.message.includes('não encontrad')) {
        errorDescription = 'Carta não encontrada. Ela pode ter sido excluída.';
      } else if (err.message.includes('email') || err.message.includes('e-mail')) {
        errorDescription = 'Erro ao enviar e-mails. Verifique os endereços dos fornecedores.';
      }
      
      toast.error('Erro ao reenviar carta', { description: errorDescription });
      return false;
    }
  };

  // Cancel letter
  const cancelLetter = async (letterId: string): Promise<boolean> => {
    try {
      console.log('[useSupabaseInvitationLetters] Cancelling letter:', letterId);

      const { error } = await supabase
        .from('invitation_letters')
        .update({ status: 'cancelled' })
        .eq('id', letterId);

      if (error) throw error;

      // Audit log
      await supabase.from('audit_logs').insert({
        action: 'CANCEL_INVITATION_LETTER',
        panel_type: 'client',
        entity_type: 'invitation_letters',
        entity_id: letterId,
        details: {}
      });

      toast.success('Carta cancelada com sucesso');
      await fetchLetters();
      return true;

    } catch (err: any) {
      console.error('[useSupabaseInvitationLetters] Error cancelling letter:', err);
      
      let errorDescription = err.message;
      if (err.message.includes('not found') || err.message.includes('não encontrad')) {
        errorDescription = 'Carta não encontrada. Ela pode já ter sido cancelada ou excluída.';
      }
      
      toast.error('Erro ao cancelar carta', { description: errorDescription });
      return false;
    }
  };

  // Get letter suppliers
  const getLetterSuppliers = async (letterId: string): Promise<InvitationLetterSupplier[]> => {
    try {
      const { data, error } = await supabase
        .from('invitation_letter_suppliers')
        .select('*')
        .eq('invitation_letter_id', letterId);

      if (error) throw error;

      return data || [];

    } catch (err: any) {
      console.error('[useSupabaseInvitationLetters] Error fetching suppliers:', err);
      return [];
    }
  };

  // Generate PDF
  const generatePDF = async (letterId: string): Promise<Blob | null> => {
    try {
      console.log('[useSupabaseInvitationLetters] Generating PDF:', letterId);

      const { data, error } = await supabase.functions.invoke('generate-invitation-pdf', {
        body: { letterId }
      });

      if (error) throw error;

      // Convert base64 to Blob
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      return blob;

    } catch (err: any) {
      console.error('[useSupabaseInvitationLetters] Error generating PDF:', err);
      toast.error('Erro ao gerar PDF', {
        description: err.message
      });
      return null;
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    fetchLetters();

    const channel = supabase
      .channel('invitation-letters-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'invitation_letters'
        },
        (payload) => {
          console.log('[useSupabaseInvitationLetters] 🆕 Real-time INSERT:', payload.new);
          setLetters(prev => [payload.new as InvitationLetter, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invitation_letters'
        },
        (payload) => {
          console.log('[useSupabaseInvitationLetters] 🔄 Real-time UPDATE:', payload.new);
          setLetters(prev => 
            prev.map(letter => 
              letter.id === payload.new.id ? { ...letter, ...payload.new } as InvitationLetter : letter
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'invitation_letters'
        },
        (payload) => {
          console.log('[useSupabaseInvitationLetters] 🗑️ Real-time DELETE:', payload.old);
          setLetters(prev => prev.filter(letter => letter.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLetters]);

  return {
    letters,
    isLoading,
    error,
    createLetter,
    sendLetter,
    resendLetter,
    cancelLetter,
    getLetterSuppliers,
    generatePDF,
    refetch: fetchLetters
  };
}
