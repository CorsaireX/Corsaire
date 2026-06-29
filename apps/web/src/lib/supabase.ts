import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// For client-side
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For server-side (admin access to bypass RLS if needed, though we don't have RLS yet)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
