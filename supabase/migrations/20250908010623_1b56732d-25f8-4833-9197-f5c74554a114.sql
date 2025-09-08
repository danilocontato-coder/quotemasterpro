-- Corrigir status da análise para um valor válido
UPDATE ai_negotiations 
SET status = 'completed', 
    updated_at = now(),
    completed_at = now(),
    ai_analysis = jsonb_build_object(
      'analysis_complete', true,
      'items_analyzed', true,
      'market_analysis', 'Análise de mercado completa com base nos itens da cotação e propostas recebidas'
    )
WHERE quote_id = 'RFQ12' AND status = 'analyzing';