import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { HetznerAPI } from '@/lib/hetzner-api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSSRClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get storage box from database
    const { data: storageBox, error: fetchError } = await supabase
      .from('storage_boxes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !storageBox) {
      return NextResponse.json({ error: 'Storage box not found' }, { status: 404 });
    }

    // Create Hetzner API client with global token
    const hetznerApi = new HetznerAPI();

    try {
      // Fetch updated data from Hetzner
      const updatedBox = await hetznerApi.getStorageBox(storageBox.hetzner_id);

      // Update database
      const { data: updated, error: updateError } = await supabase
        .from('storage_boxes')
        .update({
          name: updatedBox.name,
          login: updatedBox.username,
          location: updatedBox.location.name,
          product: updatedBox.storage_box_type.name,
          server: updatedBox.server,
          quota_gb: Math.floor(updatedBox.storage_box_type.size / 1024 / 1024 / 1024),
          used_gb: Math.floor(updatedBox.stats.size / 1024 / 1024 / 1024),
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Log successful sync
      await supabase.from('api_logs').insert({
        user_id: user.id,
        storage_box_id: id,
        endpoint: `/storage_boxes/${storageBox.hetzner_id}`,
        method: 'GET',
        status_code: 200,
      });

      return NextResponse.json({ 
        storageBox: {
          ...updated,
          api_token_encrypted: undefined,
        }
      });
    } catch (apiError) {
      // Log failed API call
      await supabase.from('api_logs').insert({
        user_id: user.id,
        storage_box_id: id,
        endpoint: `/storage_boxes/${storageBox.hetzner_id}`,
        method: 'GET',
        error_message: apiError instanceof Error ? apiError.message : 'Unknown error',
      });

      return NextResponse.json(
        { error: 'Failed to sync with storage API' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error syncing storage box:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}