import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/roles';
import { encrypt, decrypt } from '@/lib/crypto';
import { HetznerAPI } from '@/lib/hetzner-api';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createSSRClient();
    
    // Get all settings
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .order('key');
    
    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
    
    // Decrypt encrypted values for display
    const decryptedSettings = settings.map(setting => {
      if (setting.encrypted && setting.value) {
        try {
          return {
            ...setting,
            value: decrypt(setting.value),
          };
        } catch {
          return {
            ...setting,
            value: '', // Return empty if decryption fails
          };
        }
      }
      return setting;
    });
    
    return NextResponse.json({ settings: decryptedSettings });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }
    console.error('Error in admin settings GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await requireAdmin();
    const supabase = await createSSRClient();
    
    const body = await request.json();
    const { key, value } = body;
    
    if (!key) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 });
    }
    
    // Get current setting to check if it's encrypted
    const { data: currentSetting } = await supabase
      .from('settings')
      .select('encrypted')
      .eq('key', key)
      .single();
    
    const finalValue = currentSetting?.encrypted ? encrypt(value) : value;
    
    // Update setting
    const { error } = await supabase
      .from('settings')
      .upsert({
        key,
        value: finalValue,
        updated_by: adminUser.id,
      });
    
    if (error) {
      console.error('Error updating setting:', error);
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
    }
    
    // If updating API token, test the connection
    if (key === 'storage_api_token' && value) {
      try {
        const api = new HetznerAPI(value);
        const isValid = await api.testConnection();
        if (!isValid) {
          return NextResponse.json({ 
            error: 'Invalid API token. Please check and try again.' 
          }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ 
          error: 'Failed to validate API token. Please check and try again.' 
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }
    console.error('Error in admin settings PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}