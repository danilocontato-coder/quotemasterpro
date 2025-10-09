
-- Adicionar 'manager' e 'collaborator' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'collaborator';

-- Comentário para documentar
COMMENT ON TYPE public.app_role IS 'Tipos de papéis de usuário: super_admin (plataforma), manager/admin_cliente (gestor do cliente), collaborator/solicitante (colaborador), aprovador_n1/n2/n3 (aprovadores), financeiro, fornecedor, suporte_cliente';
