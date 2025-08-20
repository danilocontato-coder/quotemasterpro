import { useState, useCallback } from 'react';
import { MarketAnalysisService } from '@/services/MarketAnalysisService';

export interface ItemAnalysisData {
  productName: string;
  category: string;
  specifications?: string;
  brand?: string;
  unit?: string;
  supplierPrice?: number;
  quantity?: number;
}

export interface ItemAnalysisResult {
  item: ItemAnalysisData;
  analysis: any; // MarketAnalysisResult from service
  competitiveness?: any; // SupplierAnalysis from service
  isLoading: boolean;
  error?: string;
}

export function useItemAnalysis() {
  const [analyses, setAnalyses] = useState<Map<string, ItemAnalysisResult>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const getItemKey = useCallback((item: ItemAnalysisData) => {
    return `${item.productName}_${item.category}_${item.specifications || ''}`.toLowerCase();
  }, []);

  const analyzeItem = useCallback(async (item: ItemAnalysisData) => {
    const key = getItemKey(item);
    
    // Update state to show loading
    setAnalyses(prev => new Map(prev).set(key, {
      item,
      analysis: null,
      isLoading: true
    }));

    try {
      const analysis = await MarketAnalysisService.analyzeItemPrice(
        item.productName,
        item.category,
        item.specifications,
        item.brand,
        item.unit
      );

      let competitiveness = null;
      if (analysis && item.supplierPrice) {
        competitiveness = MarketAnalysisService.analyzeSupplierCompetitiveness(
          item.supplierPrice,
          analysis
        );
      }

      setAnalyses(prev => new Map(prev).set(key, {
        item,
        analysis,
        competitiveness,
        isLoading: false
      }));

      return analysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setAnalyses(prev => new Map(prev).set(key, {
        item,
        analysis: null,
        isLoading: false,
        error: errorMessage
      }));

      throw error;
    }
  }, [getItemKey]);

  const analyzeMultipleItems = useCallback(async (items: ItemAnalysisData[]) => {
    setIsAnalyzing(true);
    setProgress({ completed: 0, total: items.length });

    // Initialize all items as loading
    const newAnalyses = new Map(analyses);
    items.forEach(item => {
      const key = getItemKey(item);
      newAnalyses.set(key, {
        item,
        analysis: null,
        isLoading: true
      });
    });
    setAnalyses(newAnalyses);

    try {
      const analysisItems = items.map(item => ({
        productName: item.productName,
        category: item.category,
        specifications: item.specifications,
        brand: item.brand,
        unit: item.unit
      }));

      const results = await MarketAnalysisService.analyzeMultipleItems(
        analysisItems,
        (completed, total) => {
          setProgress({ completed, total });
        }
      );

      // Update analyses with results
      setAnalyses(prev => {
        const updated = new Map(prev);
        
        items.forEach((item, index) => {
          const key = getItemKey(item);
          const analysis = results[index];
          
          let competitiveness = null;
          if (analysis && item.supplierPrice) {
            competitiveness = MarketAnalysisService.analyzeSupplierCompetitiveness(
              item.supplierPrice,
              analysis
            );
          }

          updated.set(key, {
            item,
            analysis,
            competitiveness,
            isLoading: false,
            error: analysis ? undefined : 'Falha na análise'
          });
        });

        return updated;
      });

      return results;
    } catch (error) {
      console.error('Error in batch analysis:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
      setProgress({ completed: 0, total: 0 });
    }
  }, [analyses, getItemKey]);

  const getItemAnalysis = useCallback((item: ItemAnalysisData): ItemAnalysisResult | null => {
    const key = getItemKey(item);
    return analyses.get(key) || null;
  }, [analyses, getItemKey]);

  const clearAnalyses = useCallback(() => {
    setAnalyses(new Map());
    setProgress({ completed: 0, total: 0 });
  }, []);

  const removeItemAnalysis = useCallback((item: ItemAnalysisData) => {
    const key = getItemKey(item);
    setAnalyses(prev => {
      const updated = new Map(prev);
      updated.delete(key);
      return updated;
    });
  }, [getItemKey]);

  return {
    analyses: Array.from(analyses.values()),
    isAnalyzing,
    progress,
    analyzeItem,
    analyzeMultipleItems,
    getItemAnalysis,
    clearAnalyses,
    removeItemAnalysis
  };
}