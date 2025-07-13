import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types';

let serviceRoleClient: ReturnType<typeof createClient<Database>> | null = null;

export function createServiceRoleClient() {
  if (serviceRoleClient) return serviceRoleClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
  }

  serviceRoleClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return serviceRoleClient;
}