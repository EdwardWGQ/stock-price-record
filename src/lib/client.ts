import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
export const configured = !!url && /^https:\/\/[\w-]+\.supabase\.co$/.test(url) && !!key && key.startsWith('sb_publishable_') && !key.includes('REPLACE');
export const supabase = configured && !demoMode ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }) : null;
