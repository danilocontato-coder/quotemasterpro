-- Adicionar foreign key constraint entre audit_logs e profiles
ALTER TABLE public.audit_logs 
ADD CONSTRAINT fk_audit_logs_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Criar índice para melhor performance nas queries de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
ON public.audit_logs(user_id);

-- Comentário para documentação
COMMENT ON CONSTRAINT fk_audit_logs_user_id ON public.audit_logs IS 
'Relacionamento com perfil do usuário que executou a ação. SET NULL se usuário for deletado.';