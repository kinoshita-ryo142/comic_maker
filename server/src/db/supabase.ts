import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { hashPassword } from '../utils/password.js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が .env に設定されていません。'
    );
  }
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export async function ensureAdminUser(): Promise<void> {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    console.warn('[init] Supabase env vars are not set. Skipping admin seed.');
    return;
  }
  const supabase = getSupabase();
  const { data: existing, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', config.adminUsername)
    .maybeSingle();

  if (error) {
    console.warn('[init] Failed to check admin user (did you run schema.sql?):', error.message);
    return;
  }

  if (!existing) {
    const { error: insertError } = await supabase.from('users').insert({
      username: config.adminUsername,
      password_hash: hashPassword(config.adminPassword),
      role: 'admin',
    });
    if (insertError) {
      console.error('[init] Failed to seed admin user:', insertError.message);
    } else {
      console.log(`[init] Seeded initial admin user: ${config.adminUsername}`);
    }
  }
}
