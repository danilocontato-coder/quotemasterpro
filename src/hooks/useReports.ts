import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReportFilter {
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string[];
  suppliers?: string[];
  clients?: string[];
  minAmount?: number;
  maxAmount?: number;
  categories?: string[];
  ratings?: {
    min: number;
    max: number;
  };
}

export interface ReportData {
  quotes: any[];
  payments: any[];
  suppliers: any[];
  ratings: any[];
  summary: {
    totalQuotes: number;
    totalAmount: number;
    avgAmount: number;
    totalSuppliers: number;
    avgRating: number;
    completionRate: number;
  };
}

export interface SavedReport {
  id: string;
  name: string;
  description?: string;
  report_type: string;
  filters: ReportFilter;
  columns: string[];
  client_id?: string;
  created_by: string;
  is_public: boolean;
  schedule?: any;
  created_at: string;
  updated_at: string;
}

export const useReports = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async (filters: ReportFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      // Buscar cotações com filtros
      let quotesQuery = supabase
        .from('quotes')
        .select(`
          *,
          quote_responses (
            id,
            supplier_id,
            supplier_name,
            total_amount,
            status,
            created_at
          ),
          suppliers (
            id,
            name,
            rating
          )
        `);

      // Aplicar filtros de data
      if (filters.dateRange) {
        quotesQuery = quotesQuery
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      // Aplicar filtros de status
      if (filters.status && filters.status.length > 0) {
        quotesQuery = quotesQuery.in('status', filters.status);
      }

      // Aplicar filtros de fornecedor
      if (filters.suppliers && filters.suppliers.length > 0) {
        quotesQuery = quotesQuery.in('supplier_id', filters.suppliers);
      }

      // Aplicar filtros de valor
      if (filters.minAmount !== undefined) {
        quotesQuery = quotesQuery.gte('total', filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        quotesQuery = quotesQuery.lte('total', filters.maxAmount);
      }

      const { data: quotes, error: quotesError } = await quotesQuery;
      if (quotesError) throw quotesError;

      // Buscar pagamentos
      let paymentsQuery = supabase
        .from('payments')
        .select('*');

      if (filters.dateRange) {
        paymentsQuery = paymentsQuery
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      const { data: payments, error: paymentsError } = await paymentsQuery;
      if (paymentsError) throw paymentsError;

      // Buscar fornecedores
      let suppliersQuery = supabase
        .from('suppliers')
        .select(`
          *,
          supplier_ratings (
            rating,
            quality_rating,
            delivery_rating,
            communication_rating,
            price_rating,
            would_recommend
          )
        `);

      if (filters.suppliers && filters.suppliers.length > 0) {
        suppliersQuery = suppliersQuery.in('id', filters.suppliers);
      }

      const { data: suppliers, error: suppliersError } = await suppliersQuery;
      if (suppliersError) throw suppliersError;

      // Buscar avaliações
      let ratingsQuery = supabase
        .from('supplier_ratings')
        .select(`
          *,
          suppliers (
            name
          ),
          quotes (
            title,
            id
          )
        `);

      if (filters.dateRange) {
        ratingsQuery = ratingsQuery
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      if (filters.ratings) {
        ratingsQuery = ratingsQuery
          .gte('rating', filters.ratings.min)
          .lte('rating', filters.ratings.max);
      }

      const { data: ratings, error: ratingsError } = await ratingsQuery;
      if (ratingsError) throw ratingsError;

      // Calcular resumo
      const totalQuotes = quotes?.length || 0;
      const totalAmount = quotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0;
      const avgAmount = totalQuotes > 0 ? totalAmount / totalQuotes : 0;
      const totalSuppliers = suppliers?.length || 0;
      const avgRating = ratings?.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : 0;
      const completedQuotes = quotes?.filter(q => q.status === 'approved').length || 0;
      const completionRate = totalQuotes > 0 ? (completedQuotes / totalQuotes) * 100 : 0;

      const reportData: ReportData = {
        quotes: quotes || [],
        payments: payments || [],
        suppliers: suppliers || [],
        ratings: ratings || [],
        summary: {
          totalQuotes,
          totalAmount,
          avgAmount,
          totalSuppliers,
          avgRating,
          completionRate
        }
      };

      setReportData(reportData);
      return reportData;

    } catch (err: any) {
      console.error('Erro ao gerar relatório:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const saveReport = async (reportData: {
    name: string;
    description?: string;
    report_type: string;
    filters: ReportFilter;
    columns: string[];
    client_id?: string;
    is_public: boolean;
    schedule?: any;
  }) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('saved_reports')
        .insert({
          ...reportData,
          filters: reportData.filters as any,
          columns: reportData.columns as any,
          created_by: user.user.id
        });

      if (error) throw error;

      await fetchSavedReports();
      return true;
    } catch (err) {
      console.error('Erro ao salvar relatório:', err);
      throw err;
    }
  };

  const fetchSavedReports = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedReports((data || []).map(report => ({
        ...report,
        filters: report.filters as ReportFilter,
        columns: report.columns as string[]
      })));
    } catch (err) {
      console.error('Erro ao buscar relatórios salvos:', err);
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('saved_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      await fetchSavedReports();
      return true;
    } catch (err) {
      console.error('Erro ao deletar relatório:', err);
      throw err;
    }
  };

  const exportReport = async (data: ReportData, format: 'csv' | 'pdf' | 'excel') => {
    // Implementar exportação
    console.log('Exportando relatório em formato:', format);
    // TODO: Implementar lógica de exportação
  };

  useEffect(() => {
    fetchSavedReports();
  }, []);

  return {
    reportData,
    savedReports,
    isLoading,
    error,
    generateReport,
    saveReport,
    fetchSavedReports,
    deleteReport,
    exportReport
  };
};