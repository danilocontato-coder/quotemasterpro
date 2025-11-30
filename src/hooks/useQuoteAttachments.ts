import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DocumentType = 'document' | 'proposal' | 'invoice' | 'contract' | 'specification' | 'image' | 'other';

export interface QuoteAttachment {
  id: string;
  quote_id: string;
  client_id: string | null;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  document_type: DocumentType;
  uploaded_by: string | null;
  uploaded_at: string;
  description: string | null;
}

interface UseQuoteAttachmentsReturn {
  attachments: QuoteAttachment[];
  isLoading: boolean;
  uploadProgress: number;
  fetchAttachments: () => Promise<void>;
  uploadAttachment: (file: File, documentType?: DocumentType, description?: string) => Promise<QuoteAttachment | null>;
  deleteAttachment: (attachmentId: string) => Promise<boolean>;
  getAttachmentUrl: (filePath: string) => Promise<string | null>;
  downloadAttachment: (attachment: QuoteAttachment) => Promise<void>;
}

export function useQuoteAttachments(quoteId: string | undefined): UseQuoteAttachmentsReturn {
  const [attachments, setAttachments] = useState<QuoteAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchAttachments = useCallback(async () => {
    if (!quoteId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('quote_attachments')
        .select('*')
        .eq('quote_id', quoteId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      
      setAttachments((data || []) as QuoteAttachment[]);
    } catch (error) {
      console.error('Erro ao buscar anexos:', error);
      toast.error('Erro ao carregar anexos');
    } finally {
      setIsLoading(false);
    }
  }, [quoteId]);

  const uploadAttachment = async (
    file: File,
    documentType: DocumentType = 'document',
    description?: string
  ): Promise<QuoteAttachment | null> => {
    if (!quoteId) {
      toast.error('ID da cotação não fornecido');
      return null;
    }

    setUploadProgress(0);

    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${quoteId}/${fileName}`;

      setUploadProgress(20);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('quote-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      setUploadProgress(60);

      // Create database record
      const { data: attachment, error: dbError } = await supabase
        .from('quote_attachments')
        .insert({
          quote_id: quoteId,
          file_name: file.name,
          file_path: filePath,
          mime_type: file.type || null,
          file_size: file.size,
          document_type: documentType,
          description: description || null,
        })
        .select()
        .single();

      if (dbError) {
        // If DB insert fails, delete the uploaded file
        await supabase.storage.from('quote-attachments').remove([filePath]);
        throw new Error(`Erro ao salvar registro: ${dbError.message}`);
      }

      setUploadProgress(100);
      
      // Add to local state
      setAttachments(prev => [attachment as QuoteAttachment, ...prev]);
      
      toast.success('Arquivo anexado com sucesso!');
      return attachment as QuoteAttachment;
    } catch (error) {
      console.error('Erro ao anexar arquivo:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao anexar arquivo');
      return null;
    } finally {
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const deleteAttachment = async (attachmentId: string): Promise<boolean> => {
    try {
      // Find attachment to get file path
      const attachment = attachments.find(a => a.id === attachmentId);
      if (!attachment) {
        toast.error('Anexo não encontrado');
        return false;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('quote-attachments')
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Erro ao deletar do storage:', storageError);
        // Continue anyway to delete DB record
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('quote_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;

      // Remove from local state
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      
      toast.success('Anexo removido com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao deletar anexo:', error);
      toast.error('Erro ao remover anexo');
      return false;
    }
  };

  const getAttachmentUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data } = await supabase.storage
        .from('quote-attachments')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Erro ao gerar URL:', error);
      return null;
    }
  };

  const downloadAttachment = async (attachment: QuoteAttachment): Promise<void> => {
    try {
      const { data, error } = await supabase.storage
        .from('quote-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  // Fetch attachments when quoteId changes
  useEffect(() => {
    if (quoteId) {
      fetchAttachments();
    }
  }, [quoteId, fetchAttachments]);

  return {
    attachments,
    isLoading,
    uploadProgress,
    fetchAttachments,
    uploadAttachment,
    deleteAttachment,
    getAttachmentUrl,
    downloadAttachment,
  };
}
