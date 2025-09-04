-- Recriar o trigger corretamente
CREATE TRIGGER trigger_update_quote_responses_count
  AFTER INSERT OR DELETE ON quote_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_responses_count();

-- Verificar os dados atualizados
SELECT id, title, status, responses_count 
FROM quotes 
WHERE id IN ('RFQ03', 'RFQ02');