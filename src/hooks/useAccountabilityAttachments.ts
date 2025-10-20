import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type DocumentType = 'nfe' | 'receipt' | 'payment_proof' | 'contract' | 'photo' | 'other';

export interface AccountabilityAttachment {
  id: string;
  accountability_record_id: string;
  document_type: DocumentType;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  nfe_key: string | null;
  nfe_data: any | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

export function useAccountabilityAttachments(recordId?: string) {
  const [attachments, setAttachments] = useState<AccountabilityAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const fetchAttachments = async () => {
    if (!recordId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('accountability_attachments')
        .select('*')
        .eq('accountability_record_id', recordId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setAttachments((data || []) as AccountabilityAttachment[]);
    } catch (error: any) {
      console.error('Error fetching attachments:', error);
      toast({
        title: 'Erro ao carregar anexos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadAttachment = async (file: File, documentType: DocumentType) => {
    if (!recordId) {
      throw new Error('Record ID is required');
    }

    const fileId = `${Date.now()}_${file.name}`;

    try {
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      // Upload to Supabase Storage
      const filePath = `accountability/${recordId}/${fileId}`;
      
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));

      // Get user
      const { data: userData } = await supabase.auth.getUser();

      // Create database record
      const { data: attachment, error: dbError } = await supabase
        .from('accountability_attachments')
        .insert({
          accountability_record_id: recordId,
          document_type: documentType,
          file_path: filePath,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          uploaded_by: userData.user?.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

      toast({
        title: 'Arquivo enviado',
        description: `${file.name} foi anexado com sucesso.`,
      });

      await fetchAttachments();
      
      // Clean up progress after 2 seconds
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }, 2000);

      return attachment;
    } catch (error: any) {
      console.error('Error uploading attachment:', error);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
      toast({
        title: 'Erro ao enviar arquivo',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    try {
      // Get attachment details first
      const { data: attachment } = await supabase
        .from('accountability_attachments')
        .select('file_path')
        .eq('id', attachmentId)
        .single();

      if (attachment) {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('attachments')
          .remove([attachment.file_path]);

        if (storageError) {
          console.error('Error deleting from storage:', storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('accountability_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;

      toast({
        title: 'Anexo removido',
        description: 'O arquivo foi excluído com sucesso.',
      });

      await fetchAttachments();
    } catch (error: any) {
      console.error('Error deleting attachment:', error);
      toast({
        title: 'Erro ao excluir anexo',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getAttachmentUrl = (filePath: string): string => {
    const { data } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const downloadAttachment = async (attachment: AccountabilityAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(attachment.file_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Download iniciado',
        description: `Baixando ${attachment.file_name}...`,
      });
    } catch (error: any) {
      console.error('Error downloading attachment:', error);
      toast({
        title: 'Erro no download',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (recordId) {
      fetchAttachments();
    }
  }, [recordId]);

  return {
    attachments,
    isLoading,
    uploadProgress,
    uploadAttachment,
    deleteAttachment,
    getAttachmentUrl,
    downloadAttachment,
    refetch: fetchAttachments,
  };
}
