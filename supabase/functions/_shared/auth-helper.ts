import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
  user_metadata?: any;
}

export interface SupplierProfile {
  supplier_id: string;
  client_id?: string;
}

export interface ClientProfile {
  client_id: string;
  supplier_id?: string;
}

/**
 * Valida o token JWT e retorna o usuário autenticado
 * @throws Error se não autorizado
 */
export async function validateUserAuth(
  req: Request,
  supabase: SupabaseClient
): Promise<AuthUser> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('No authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user as AuthUser;
}

/**
 * Busca o profile do fornecedor do usuário
 * @throws Error se usuário não for fornecedor
 */
export async function getSupplierProfile(
  userId: string,
  supabase: SupabaseClient
): Promise<SupplierProfile> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('supplier_id, client_id')
    .eq('id', userId)
    .single();

  if (error || !profile?.supplier_id) {
    throw new Error('User is not a supplier');
  }

  return profile;
}

/**
 * Busca o profile do cliente do usuário
 * @throws Error se usuário não for cliente
 */
export async function getClientProfile(
  userId: string,
  supabase: SupabaseClient
): Promise<ClientProfile> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('client_id, supplier_id')
    .eq('id', userId)
    .single();

  if (error || !profile?.client_id) {
    throw new Error('User is not a client');
  }

  return profile;
}

/**
 * Valida autenticação E busca profile de fornecedor em uma única chamada
 * Útil para funções que sempre precisam de supplier_id
 */
export async function validateSupplierAuth(
  req: Request,
  supabase: SupabaseClient
): Promise<{ user: AuthUser; profile: SupplierProfile }> {
  const user = await validateUserAuth(req, supabase);
  const profile = await getSupplierProfile(user.id, supabase);
  
  return { user, profile };
}

/**
 * Valida autenticação E busca profile de cliente em uma única chamada
 */
export async function validateClientAuth(
  req: Request,
  supabase: SupabaseClient
): Promise<{ user: AuthUser; profile: ClientProfile }> {
  const user = await validateUserAuth(req, supabase);
  const profile = await getClientProfile(user.id, supabase);
  
  return { user, profile };
}
