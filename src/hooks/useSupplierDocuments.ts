import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupplierDocument {
  id: string;
  supplier_id: string;
  client_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  status: 'pending' | 'validated' | 'rejected' | 'expired';
  validation_data: any;
  expiry_date: string | null;
  validated_at: string | null;
  validated_by: string | null;
  rejection_reason: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPES = {
  cnpj: 'Cartão CNPJ',
  contrato_social: 'Contrato Social',
  certidao_regularidade_fiscal: 'Certidão de Regularidade Fiscal',
  certidao_inss: 'Certidão Negativa de INSS',
  certidao_fgts: 'Certidão Negativa de FGTS',
  alvara: 'Alvará de Funcionamento',
  certificado_iso: 'Certificado ISO',
  apolice_seguro: 'Apólice de Seguro',
  certidao_trabalhista: 'Certidão Negativa Trabalhista',
  outros: 'Outros Documentos'
} as const;

export type DocumentType = keyof typeof DOCUMENT_TYPES;

interface UseSupplierDocumentsProps {
  supplierId: string;
  clientId?: string;
}

export function useSupplierDocuments({ supplierId, clientId }: UseSupplierDocumentsProps) {
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    if (!supplierId) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('supplier_documents')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments((data || []) as SupplierDocument[]);
    } catch (error: any) {
      console.error('Erro ao carregar documentos:', error);
      toast({
        title: "Erro ao carregar documentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadDocument = async (
    file: File,
    documentType: DocumentType,
    expiryDate?: string
  ): Promise<boolean> => {
    if (!supplierId || !clientId) {
      toast({
        title: "Erro",
        description: "Fornecedor ou cliente não identificado",
        variant: "destructive",
      });
      return false;
    }

    setUploading(true);
    try {
      // 1. Upload do arquivo para Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `${supplierId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('supplier-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Criar registro no banco
      const { error: dbError } = await supabase
        .from('supplier_documents')
        .insert({
          supplier_id: supplierId,
          client_id: clientId,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          expiry_date: expiryDate || null,
          status: 'pending',
          metadata: {
            original_name: file.name,
            uploaded_at: new Date().toISOString()
          }
        });

      if (dbError) throw dbError;

      toast({
        title: "Documento enviado",
        description: "O documento foi enviado com sucesso e aguarda validação.",
      });

      await fetchDocuments();
      return true;
    } catch (error: any) {
      console.error('Erro ao enviar documento:', error);
      toast({
        title: "Erro ao enviar documento",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (doc: SupplierDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('supplier-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Erro ao baixar documento:', error);
      toast({
        title: "Erro ao baixar documento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const doc = documents.find(d => d.id === documentId);
      if (!doc) return;

      // 1. Deletar do storage
      const { error: storageError } = await supabase.storage
        .from('supplier-documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // 2. Deletar do banco
      const { error: dbError } = await supabase
        .from('supplier_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      toast({
        title: "Documento removido",
        description: "O documento foi removido com sucesso.",
      });

      await fetchDocuments();
    } catch (error: any) {
      console.error('Erro ao remover documento:', error);
      toast({
        title: "Erro ao remover documento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const validateDocument = async (
    documentId: string,
    status: 'validated' | 'rejected',
    rejectionReason?: string
  ) => {
    try {
      const { error } = await supabase
        .from('supplier_documents')
        .update({
          status,
          validated_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null
        })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: status === 'validated' ? "Documento aprovado" : "Documento rejeitado",
        description: status === 'validated' 
          ? "O documento foi aprovado com sucesso."
          : "O documento foi rejeitado.",
      });

      await fetchDocuments();
    } catch (error: any) {
      console.error('Erro ao validar documento:', error);
      toast({
        title: "Erro ao validar documento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [supplierId, clientId]);

  return {
    documents,
    isLoading,
    uploading,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    validateDocument,
    refetch: fetchDocuments
  };
}
