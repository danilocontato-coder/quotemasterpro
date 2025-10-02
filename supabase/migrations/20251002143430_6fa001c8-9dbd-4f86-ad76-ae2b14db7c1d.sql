-- CORREÇÃO CRÍTICA: Políticas RLS da tabela profiles
-- Simplificar para evitar loops e deadlocks

-- Remover todas as políticas antigas
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;  
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- POLÍTICA SIMPLIFICADA: Ver próprio perfil OU ser admin (verificado via coluna direta)
CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid()
  OR
  -- Admin pode ver todos - verifica diretamente a coluna role do próprio usuário
  (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- POLÍTICA: Criar próprio perfil
CREATE POLICY "profiles_insert"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- POLÍTICA: Atualizar próprio perfil OU ser admin
CREATE POLICY "profiles_update"  
ON public.profiles
FOR UPDATE
USING (
  id = auth.uid()
  OR
  (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);