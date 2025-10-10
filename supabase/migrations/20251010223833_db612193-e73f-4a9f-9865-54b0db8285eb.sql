-- Fase 1: Adicionar novos status para controle de visitas técnicas

-- Comentário: Adicionar constraint com novos status de visita
COMMENT ON COLUMN public.quotes.status IS 'Status da cotação: draft, sent, awaiting_visit, visit_scheduled, visit_confirmed, visit_overdue, receiving, received, approved, rejected, paid, cancelled';

-- Não há necessidade de alterar enum se o status já é text, apenas documentar os novos valores válidos
-- Os novos status são:
-- awaiting_visit: Aguardando agendamento da visita técnica
-- visit_scheduled: Visita técnica agendada mas não confirmada
-- visit_confirmed: Visita técnica confirmada, fornecedor pode enviar proposta
-- visit_overdue: Visita técnica atrasada