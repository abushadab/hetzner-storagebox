import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { HetznerAPI } from '@/lib/hetzner-api';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subaccountId: string }> }
) {
  try {
    const { id, subaccountId } = await params;
    const supabase = await createSSRClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      comment,
      ssh,
      samba,
      webdav,
      readonly,
      external_reachability,
      resetPassword,
      newPassword,
    } = body;

    // Get storage box and subaccount
    const { data: storageBox } = await supabase
      .from('storage_boxes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!storageBox) {
      return NextResponse.json({ error: 'Storage box not found' }, { status: 404 });
    }

    const { data: subaccount } = await supabase
      .from('subaccounts')
      .select('*')
      .eq('id', subaccountId)
      .eq('storage_box_id', id)
      .single();

    if (!subaccount) {
      return NextResponse.json({ error: 'Subaccount not found' }, { status: 404 });
    }

    // Create Hetzner API client
    const hetznerApi = new HetznerAPI();

    try {
      // Update access settings via Hetzner API
      await hetznerApi.updateSubAccountAccessSettings(
        storageBox.hetzner_id,
        subaccount.hetzner_id,
        {
          samba_enabled: samba,
          ssh_enabled: ssh,
          webdav_enabled: webdav,
          readonly: readonly,
          reachable_externally: external_reachability,
        }
      );

      // Update description
      await hetznerApi.updateSubAccount(
        storageBox.hetzner_id,
        subaccount.hetzner_id,
        {
          description: comment || '',
          labels: {},
        }
      );

      // Reset password if requested
      if (resetPassword && newPassword) {
        await hetznerApi.resetSubAccountPassword(
          storageBox.hetzner_id,
          subaccount.hetzner_id,
          newPassword
        );
      }

      // Update local database
      const updates: Record<string, unknown> = {
        comment,
        ssh,
        samba,
        webdav,
        readonly,
        external_reachability,
      };

      // Encrypt and save new password if reset
      if (resetPassword && newPassword) {
        const { encrypt } = await import('@/lib/crypto');
        updates.password_encrypted = encrypt(newPassword);
      }

      const { data: updated, error: updateError } = await supabase
        .from('subaccounts')
        .update(updates)
        .eq('id', subaccountId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Log API call
      await supabase.from('api_logs').insert({
        user_id: user.id,
        storage_box_id: id,
        endpoint: `/storage_boxes/${storageBox.hetzner_id}/subaccounts/${subaccount.hetzner_id}`,
        method: 'PATCH',
        status_code: 200,
      });

      return NextResponse.json({ subaccount: updated });
    } catch (apiError) {
      // Log failed API call
      await supabase.from('api_logs').insert({
        user_id: user.id,
        storage_box_id: id,
        endpoint: `/storage_boxes/${storageBox.hetzner_id}/subaccounts/${subaccount.hetzner_id}`,
        method: 'PATCH',
        error_message: apiError instanceof Error ? apiError.message : 'Unknown error',
      });

      return NextResponse.json(
        { error: 'Failed to update subaccount' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating subaccount:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subaccountId: string }> }
) {
  try {
    const { id, subaccountId } = await params;
    const supabase = await createSSRClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get storage box and subaccount
    const { data: storageBox } = await supabase
      .from('storage_boxes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!storageBox) {
      return NextResponse.json({ error: 'Storage box not found' }, { status: 404 });
    }

    const { data: subaccount } = await supabase
      .from('subaccounts')
      .select('*')
      .eq('id', subaccountId)
      .eq('storage_box_id', id)
      .single();

    if (!subaccount) {
      return NextResponse.json({ error: 'Subaccount not found' }, { status: 404 });
    }

    // Create Hetzner API client
    const hetznerApi = new HetznerAPI();

    try {
      // Delete subaccount via Hetzner API
      await hetznerApi.deleteSubAccount(
        storageBox.hetzner_id,
        subaccount.hetzner_id
      );

      // Delete from local database
      const { error: deleteError } = await supabase
        .from('subaccounts')
        .delete()
        .eq('id', subaccountId);

      if (deleteError) {
        throw deleteError;
      }

      // Log API call
      await supabase.from('api_logs').insert({
        user_id: user.id,
        storage_box_id: id,
        endpoint: `/storage_boxes/${storageBox.hetzner_id}/subaccounts/${subaccount.hetzner_id}`,
        method: 'DELETE',
        status_code: 200,
      });

      return NextResponse.json({ success: true });
    } catch (apiError) {
      // Log failed API call
      await supabase.from('api_logs').insert({
        user_id: user.id,
        storage_box_id: id,
        endpoint: `/storage_boxes/${storageBox.hetzner_id}/subaccounts/${subaccount.hetzner_id}`,
        method: 'DELETE',
        error_message: apiError instanceof Error ? apiError.message : 'Unknown error',
      });

      return NextResponse.json(
        { error: 'Failed to delete subaccount' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting subaccount:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}