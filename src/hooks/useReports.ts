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
  products: any[];
  categories: any[];
  summary: {
    totalQuotes: number;
    totalAmount: number;
    avgAmount: number;
    totalSuppliers: number;
    avgRating: number;
    completionRate: number;
    totalSavings: number;
    totalProducts: number;
    totalCategories: number;
  };
  financial: {
    totalSpent: number;
    totalSaved: number;
    averageDiscount: number;
    bestSavings: {
      amount: number;
      percentage: number;
      supplier: string;
      quote: string;
    };
    monthlyTrend: {
      current: number;
      previous: number;
      change: number;
    };
    topExpenseCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };
  supplierMetrics: Array<{
    id: string;
    name: string;
    totalQuotes: number;
    totalAmount: number;
    averageRating: number;
    deliveryTime: number;
    responseRate: number;
    savings: number;
    categories: string[];
  }>;
  productAnalysis: {
    products: Array<{
      id: string;
      name: string;
      category: string;
      totalQuantity: number;
      totalAmount: number;
      averagePrice: number;
      suppliers: number;
      lastPurchase: string;
      trend: 'up' | 'down' | 'stable';
      trendPercentage: number;
    }>;
    categories: Array<{
      name: string;
      totalAmount: number;
      totalQuantity: number;
      products: number;
      percentage: number;
      averagePrice: number;
      topSupplier: string;
      savings: number;
    }>;
  };
  savingsAnalysis: {
    totalSavings: number;
    targetSavings: number;
    savingsGoal: number;
    bestNegotiation: {
      amount: number;
      percentage: number;
      supplier: string;
      product: string;
      originalPrice: number;
      finalPrice: number;
    };
    monthlySavings: Array<{
      month: string;
      savings: number;
      target: number;
      negotiations: number;
    }>;
    savingsByCategory: Array<{
      category: string;
      amount: number;
      percentage: number;
      opportunities: number;
    }>;
    savingsByMethod: Array<{
      method: string;
      amount: number;
      count: number;
      avgSaving: number;
    }>;
    topNegotiations: Array<{
      id: string;
      supplier: string;
      product: string;
      originalPrice: number;
      finalPrice: number;
      savings: number;
      percentage: number;
      date: string;
    }>;
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

      // Buscar produtos e itens de cotação
      let productsQuery = supabase
        .from('quote_items')
        .select(`
          *,
          quotes (
            client_id,
            status,
            created_at,
            total
          )
        `);

      if (filters.dateRange) {
        productsQuery = productsQuery
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      const { data: quoteItems, error: productsError } = await productsQuery;
      if (productsError) throw productsError;

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

      // Buscar fornecedores com métricas
      let suppliersQuery = supabase
        .from('suppliers')
        .select(`
          *
        `);

      if (filters.suppliers && filters.suppliers.length > 0) {
        suppliersQuery = suppliersQuery.in('id', filters.suppliers);
      }

      const { data: suppliers, error: suppliersError } = await suppliersQuery;
      if (suppliersError) throw suppliersError;

      // Buscar respostas de cotações para métricas de fornecedores
      const { data: quoteResponses, error: qrError } = await supabase
        .from('quote_responses')
        .select('*');
      
      if (qrError) throw qrError;

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

      // Processar dados para análises
      const totalQuotes = quotes?.length || 0;
      const totalAmount = quotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0;
      const avgAmount = totalQuotes > 0 ? totalAmount / totalQuotes : 0;
      const totalSuppliers = suppliers?.length || 0;
      const avgRating = ratings?.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : 0;
      const completedQuotes = quotes?.filter(q => q.status === 'approved').length || 0;
      const completionRate = totalQuotes > 0 ? (completedQuotes / totalQuotes) * 100 : 0;

      // Calcular métricas de economia
      const totalSavings = 250000; // Simulado - calcular baseado em negociações
      const totalProducts = quoteItems?.length || 0;

      // Processar categorias de produtos
      const categoryMap = new Map();
      quoteItems?.forEach(item => {
        const category = 'Categoria Geral'; // Simplificado
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            name: category,
            totalAmount: 0,
            totalQuantity: 0,
            products: 0,
            items: []
          });
        }
        const cat = categoryMap.get(category);
        cat.totalAmount += (item.total || 0);
        cat.totalQuantity += item.quantity;
        cat.products += 1;
        cat.items.push(item);
      });

      const categories = Array.from(categoryMap.values()).map(cat => ({
        ...cat,
        percentage: totalAmount > 0 ? (cat.totalAmount / totalAmount) * 100 : 0,
        averagePrice: cat.totalQuantity > 0 ? cat.totalAmount / cat.totalQuantity : 0,
        topSupplier: 'Fornecedor Principal',
        savings: cat.totalAmount * 0.1 // 10% economia simulada
      }));

      const totalCategories = categories.length;

      // Processar métricas de fornecedores
      const supplierMetrics = suppliers?.map(supplier => {
        const supplierResponses = quoteResponses?.filter(qr => qr.supplier_id === supplier.id) || [];
        const supplierRatings = ratings?.filter(r => r.supplier_id === supplier.id) || [];
        
        return {
          id: supplier.id,
          name: supplier.name,
          totalQuotes: supplierResponses.length,
          totalAmount: supplierResponses.reduce((sum: number, qr: any) => sum + (qr.total_amount || 0), 0),
          averageRating: supplierRatings.length > 0 
            ? supplierRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / supplierRatings.length 
            : 0,
          deliveryTime: 7, // Simulado
          responseRate: 85, // Simulado
          savings: supplierResponses.reduce((sum: number, qr: any) => sum + (qr.total_amount || 0), 0) * 0.15,
          categories: supplier.specialties || ['Geral']
        };
      }) || [];

      // Processar análise de produtos
      const productAnalysis = {
        products: quoteItems?.map((item, index) => ({
          id: item.id,
          name: item.product_name,
          category: 'Categoria Geral',
          totalQuantity: item.quantity,
          totalAmount: item.total || 0,
          averagePrice: item.unit_price || 0,
          suppliers: 3, // Simulado
          lastPurchase: item.created_at,
          trend: ['up', 'down', 'stable'][index % 3] as 'up' | 'down' | 'stable',
          trendPercentage: (Math.random() - 0.5) * 20
        })) || [],
        categories
      };

      // Dados financeiros
      const financial = {
        totalSpent: totalAmount,
        totalSaved: totalSavings,
        averageDiscount: 12.5,
        bestSavings: {
          amount: 15000,
          percentage: 25,
          supplier: 'Fornecedor Alpha',
          quote: quotes?.[0]?.id || 'RFQ01'
        },
        monthlyTrend: {
          current: totalAmount,
          previous: totalAmount * 0.9,
          change: 10.5
        },
        topExpenseCategories: categories.slice(0, 5).map(cat => ({
          category: cat.name,
          amount: cat.totalAmount,
          percentage: cat.percentage
        }))
      };

      // Análise de economia
      const savingsAnalysis = {
        totalSavings,
        targetSavings: 300000,
        savingsGoal: 500000,
        bestNegotiation: {
          amount: 15000,
          percentage: 25,
          supplier: 'Fornecedor Alpha',
          product: 'Produto Premium',
          originalPrice: 60000,
          finalPrice: 45000
        },
        monthlySavings: Array.from({ length: 6 }, (_, i) => ({
          month: `Mês ${i + 1}`,
          savings: 30000 + Math.random() * 20000,
          target: 40000,
          negotiations: Math.floor(5 + Math.random() * 10)
        })),
        savingsByCategory: categories.slice(0, 5).map((cat, index) => ({
          category: cat.name,
          amount: cat.savings,
          percentage: (cat.savings / totalSavings) * 100,
          opportunities: Math.floor(3 + Math.random() * 7)
        })),
        savingsByMethod: [
          { method: 'Negociação IA', amount: totalSavings * 0.4, count: 15, avgSaving: (totalSavings * 0.4) / 15 },
          { method: 'Negociação Manual', amount: totalSavings * 0.3, count: 8, avgSaving: (totalSavings * 0.3) / 8 },
          { method: 'Cotação Múltipla', amount: totalSavings * 0.2, count: 12, avgSaving: (totalSavings * 0.2) / 12 },
          { method: 'Desconto Volume', amount: totalSavings * 0.1, count: 5, avgSaving: (totalSavings * 0.1) / 5 }
        ],
        topNegotiations: Array.from({ length: 10 }, (_, i) => ({
          id: `neg-${i + 1}`,
          supplier: `Fornecedor ${String.fromCharCode(65 + i)}`,
          product: `Produto ${i + 1}`,
          originalPrice: 5000 + Math.random() * 20000,
          finalPrice: 3000 + Math.random() * 15000,
          savings: 1000 + Math.random() * 8000,
          percentage: 10 + Math.random() * 20,
          date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
        }))
      };

      const reportData: ReportData = {
        quotes: quotes || [],
        payments: payments || [],
        suppliers: suppliers || [],
        ratings: ratings || [],
        products: quoteItems || [],
        categories,
        summary: {
          totalQuotes,
          totalAmount,
          avgAmount,
          totalSuppliers,
          avgRating,
          completionRate,
          totalSavings,
          totalProducts,
          totalCategories
        },
        financial,
        supplierMetrics,
        productAnalysis,
        savingsAnalysis
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