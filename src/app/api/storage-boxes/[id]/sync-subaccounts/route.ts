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
      // Fetch subaccounts from Hetzner
      const subaccounts = await hetznerApi.listSubAccounts(storageBox.hetzner_id);

      // Get existing subaccounts from database
      const { data: existingSubaccounts } = await supabase
        .from('subaccounts')
        .select('hetzner_id')
        .eq('storage_box_id', id);

      const existingIds = new Set(existingSubaccounts?.map(s => s.hetzner_id) || []);

      // Insert new subaccounts
      const newSubaccounts = subaccounts.filter(s => !existingIds.has(s.id));
      
      if (newSubaccounts.length > 0) {
        const { error: insertError } = await supabase
          .from('subaccounts')
          .insert(
            newSubaccounts.map(s => ({
              storage_box_id: id,
              hetzner_id: s.id,
              username: s.username,
              comment: s.description || '',
              home_dir: s.home_directory,
              samba: s.access_settings.samba_enabled,
              ssh: s.access_settings.ssh_enabled,
              external_reachability: s.access_settings.reachable_externally,
              webdav: s.access_settings.webdav_enabled,
              readonly: s.access_settings.readonly,
            }))
          );

        if (insertError) {
          console.error('Error inserting subaccounts:', insertError);
          return NextResponse.json({ error: 'Failed to save subaccounts' }, { status: 500 });
        }
      }

      // Update existing subaccounts
      for (const subaccount of subaccounts) {
        if (existingIds.has(subaccount.id)) {
          await supabase
            .from('subaccounts')
            .update({
              username: subaccount.username,
              comment: subaccount.description || '',
              home_dir: subaccount.home_directory,
              samba: subaccount.access_settings.samba_enabled,
              ssh: subaccount.access_settings.ssh_enabled,
              external_reachability: subaccount.access_settings.reachable_externally,
              webdav: subaccount.access_settings.webdav_enabled,
              readonly: subaccount.access_settings.readonly,
            })
            .eq('hetzner_id', subaccount.id)
            .eq('storage_box_id', id);
        }
      }

      // Remove deleted subaccounts
      const currentIds = new Set(subaccounts.map(s => s.id));
      const toDelete = Array.from(existingIds).filter(id => !currentIds.has(id));
      
      if (toDelete.length > 0) {
        await supabase
          .from('subaccounts')
          .delete()
          .in('hetzner_id', toDelete)
          .eq('storage_box_id', id);
      }

      // Log API call
      await supabase.from('api_logs').insert({
        user_id: user.id,
        storage_box_id: id,
        endpoint: `/storage_boxes/${storageBox.hetzner_id}/subaccounts`,
        method: 'GET',
        status_code: 200,
      });

      // Get updated subaccounts
      const { data: updatedSubaccounts } = await supabase
        .from('subaccounts')
        .select('*')
        .eq('storage_box_id', id)
        .order('username');

      return NextResponse.json({ 
        success: true, 
        subaccounts: updatedSubaccounts || [],
        synced: newSubaccounts.length,
        updated: subaccounts.length - newSubaccounts.length,
        deleted: toDelete.length
      });
    } catch (apiError) {
      // Log failed API call
      await supabase.from('api_logs').insert({
        user_id: user.id,
        storage_box_id: id,
        endpoint: `/storage_boxes/${storageBox.hetzner_id}/subaccounts`,
        method: 'GET',
        error_message: apiError instanceof Error ? apiError.message : 'Unknown error',
      });

      return NextResponse.json(
        { error: 'Failed to sync subaccounts from provider' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error syncing subaccounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}