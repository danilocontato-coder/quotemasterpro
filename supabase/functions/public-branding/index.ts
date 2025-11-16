import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface BrandingResponse {
  success: boolean;
  data?: Record<string, any>;
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing Supabase env vars' } as BrandingResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'company_name', 'company_logo', 'primary_color', 'secondary_color',
        'accent_color', 'favicon', 'footer_text', 'login_page_title',
        'login_page_subtitle', 'dashboard_welcome_message', 'custom_css'
      ]);

    if (error) {
      console.error('public-branding: query error', error);
      return new Response(
        JSON.stringify({ success: false, message: error.message } as BrandingResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build a flat object with extracted values
    const extract = (v: any) => v?.value ?? v?.url ?? v?.color ?? v?.text ?? v ?? null;
    const map: Record<string, any> = {};

    for (const row of data ?? []) {
      map[row.setting_key] = extract(row.setting_value);
    }

    const response: BrandingResponse = {
      success: true,
      data: {
        companyName: map.company_name ?? null,
        logo: map.company_logo ?? null,
        primaryColor: map.primary_color ?? null,
        secondaryColor: map.secondary_color ?? null,
        accentColor: map.accent_color ?? null,
        favicon: map.favicon ?? null,
        footerText: map.footer_text ?? null,
        loginPageTitle: map.login_page_title ?? null,
        loginPageSubtitle: map.login_page_subtitle ?? null,
        dashboardWelcomeMessage: map.dashboard_welcome_message ?? null,
        customCss: map.custom_css ?? null,
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('public-branding: unexpected error', e);
    return new Response(
      JSON.stringify({ success: false, message: e?.message || 'Internal error' } as BrandingResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});