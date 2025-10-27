import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_ATTEMPTS = 5; // 5 resets per hour per admin

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify JWT and get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('[Security] Unauthorized attempt to reset password - no auth header');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não autorizado. Autenticação necessária.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get authenticated user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.warn('[Security] Invalid JWT token:', userError?.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token inválido ou expirado' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // SECURITY: Verify user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      console.warn(`[Security] Non-admin user ${user.email} attempted to reset password`);
      
      // Audit log for denied attempt
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action_type: 'PASSWORD_RESET_DENIED',
          panel_type: 'admin',
          entity_type: 'users',
          details: {
            reason: 'Insufficient permissions',
            attempted_by: user.email,
            user_role: profile?.role || 'unknown'
          }
        });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Acesso negado. Apenas administradores podem redefinir senhas.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    // SECURITY: Rate limiting
    const now = Date.now();
    const rateLimitKey = user.id;
    const rateLimitData = rateLimitMap.get(rateLimitKey);

    if (rateLimitData) {
      if (now < rateLimitData.resetTime) {
        if (rateLimitData.count >= RATE_LIMIT_MAX_ATTEMPTS) {
          console.warn(`[Security] Rate limit exceeded for admin ${user.email}`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Limite de ${RATE_LIMIT_MAX_ATTEMPTS} redefinições por hora excedido. Tente novamente mais tarde.` 
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 429 
            }
          );
        }
        rateLimitData.count++;
      } else {
        // Reset window expired, start new window
        rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      }
    } else {
      // First attempt in this window
      rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }

    const { authUserId, newPassword } = await req.json();

    console.log(`[Audit] Admin ${user.email} is resetting password for user ${authUserId}`);

    if (!authUserId || !newPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'authUserId e newPassword são obrigatórios' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Validate password length
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Senha deve ter no mínimo 6 caracteres' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Create admin client for password reset
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get target user info for audit log
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('profiles')
      .select('email, role')
      .eq('auth_user_id', authUserId)
      .single();

    // Update user password using admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      authUserId,
      { password: newPassword }
    );

    if (error) {
      console.error('[Error] Password update failed:', error);
      
      // Audit log for failed attempt
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action_type: 'PASSWORD_RESET_FAILED',
          panel_type: 'admin',
          entity_type: 'users',
          entity_id: authUserId,
          details: {
            error: error.message,
            target_user_email: targetUser?.email || 'unknown',
            admin_email: user.email
          }
        });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`[Success] Password updated for user: ${authUserId} by admin: ${user.email}`);

    // Audit log for successful reset
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action_type: 'PASSWORD_RESET_SUCCESS',
        panel_type: 'admin',
        entity_type: 'users',
        entity_id: authUserId,
        details: {
          target_user_email: targetUser?.email || 'unknown',
          target_user_role: targetUser?.role || 'unknown',
          admin_email: user.email,
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Senha redefinida com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in reset-user-password function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
