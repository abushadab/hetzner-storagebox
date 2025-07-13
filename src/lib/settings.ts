import { createSSRClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/crypto';

export async function getSetting(key: string): Promise<string | null> {
  const supabase = await createSSRClient();
  
  const { data, error } = await supabase
    .from('settings')
    .select('value, encrypted')
    .eq('key', key)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  if (data.encrypted && data.value) {
    return decrypt(data.value);
  }
  
  return data.value;
}

export async function setSetting(key: string, value: string, encrypted = false): Promise<boolean> {
  const supabase = await createSSRClient();
  
  const finalValue = encrypted ? encrypt(value) : value;
  
  const { error } = await supabase
    .from('settings')
    .upsert({
      key,
      value: finalValue,
      encrypted,
    });
  
  return !error;
}

export async function getStorageApiToken(): Promise<string | null> {
  console.log('[getStorageApiToken] Retrieving API token...');
  
  // First try to get from database
  const dbToken = await getSetting('storage_api_token');
  if (dbToken) {
    console.log('[getStorageApiToken] Found token in database');
    return dbToken;
  }
  
  // Fallback to environment variable
  const envToken = process.env.STORAGE_API_TOKEN;
  if (envToken) {
    console.log('[getStorageApiToken] Found token in environment variable');
    return envToken;
  }
  
  // TEMPORARY: Return the token for development
  // TODO: Configure this properly in admin settings or environment
  console.log('[getStorageApiToken] Using temporary token - CONFIGURE THIS PROPERLY!');
  return '7oEbdwtzDZRxnp7Fo3KUp9Xaupjw6sxO05XXmFyg58EznOxMqcjAN52ORM0ztFL7';
}