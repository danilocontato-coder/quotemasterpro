/**
 * Centralized Quote Token Management
 * 
 * This module handles all quote token generation and link creation
 * for supplier access to quotes.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a short link for a quote
 * This calls the edge function to create a token and return the short URL
 * Automatically reuses existing valid tokens for the same quote
 */
export async function generateQuoteShortLink(quoteId: string): Promise<{
  success: boolean;
  shortUrl?: string;
  fullUrl?: string;
  shortCode?: string;
  fullToken?: string;
  reused?: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-quote-token', {
      body: { quote_id: quoteId }
    });

    if (error) {
      console.error('Error generating quote token:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate token'
      };
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || 'Token generation failed'
      };
    }

    return {
      success: true,
      shortUrl: data.short_url,
      fullUrl: data.full_url,
      shortCode: data.short_code,
      fullToken: data.full_token,
      reused: data.reused || false
    };
  } catch (err) {
    console.error('Exception generating quote token:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

/**
 * Resolve a short code to get the full redirect URL
 */
export async function resolveShortLink(shortCode: string): Promise<{
  success: boolean;
  redirectUrl?: string;
  redirectPath?: string;
  quoteId?: string;
  fullToken?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('resolve-short-link', {
      body: { short_code: shortCode }
    });

    if (error) {
      console.error('Error resolving short link:', error);
      return {
        success: false,
        error: error.message || 'Failed to resolve link'
      };
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || 'Link resolution failed'
      };
    }

    return {
      success: true,
      redirectUrl: data.redirect_url,
      redirectPath: data.redirect_path,
      quoteId: data.quote_id,
      fullToken: data.full_token
    };
  } catch (err) {
    console.error('Exception resolving short link:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

/**
 * Get base URL from system settings (cached)
 */
let cachedBaseUrl: string | null = null;

export async function getBaseUrl(): Promise<string> {
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }

  try {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'base_url')
      .single();

    if (data?.setting_value) {
      const value = typeof data.setting_value === 'string'
        ? data.setting_value.replace(/"/g, '')
        : String(data.setting_value || '').replace(/"/g, '');
      
      if (value) {
        cachedBaseUrl = value;
        return value;
      }
    }
  } catch (error) {
    console.warn('Could not fetch base URL from settings:', error);
  }

  // Fallback to current origin
  return window.location.origin;
}

/**
 * Clear base URL cache (call this if settings change)
 */
export function clearBaseUrlCache() {
  cachedBaseUrl = null;
}
