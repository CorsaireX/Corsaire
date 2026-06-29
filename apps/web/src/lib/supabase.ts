import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization using Proxy to prevent Next.js from throwing build-time errors 
// when process.env variables are empty during Cloudflare Vercel CLI compilation phase.
// Using bracket notation process.env['VAR'] avoids Next.js aggressive static string substitution.

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

// For client-side
export const supabase = new Proxy({} as SupabaseClient, {
  get: (target, prop: keyof SupabaseClient) => {
    if (!_supabase) {
      const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://dummy.supabase.co';
      const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 'dummy';
      _supabase = createClient(url, key);
    }
    return _supabase[prop];
  }
});

// For server-side (admin access)
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get: (target, prop: keyof SupabaseClient) => {
    if (!_supabaseAdmin) {
      const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://dummy.supabase.co';
      const key = process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 'dummy';
      _supabaseAdmin = createClient(url, key);
    }
    return _supabaseAdmin[prop];
  }
});
