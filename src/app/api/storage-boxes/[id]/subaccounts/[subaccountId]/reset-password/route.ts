import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';
import { getUserRole } from '@/lib/auth/roles';
import { HetznerAPI } from '@/lib/hetzner-api';

export async function POST(
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

    const role = await getUserRole(user.id);
    
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // Get storage box and subaccount details
    const { data: storageBox, error: boxError } = await supabase
      .from('storage_boxes')
      .select('id, hetzner_id, user_id')
      .eq('id', id)
      .single();

    if (boxError || !storageBox) {
      return NextResponse.json({ error: 'Storage box not found' }, { status: 404 });
    }

    // Only allow admins or the assigned user to reset password
    if (role !== 'admin') {
      if (storageBox.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Get subaccount details
    const { data: subaccount, error: subError } = await supabase
      .from('subaccounts')
      .select('id, hetzner_id, username')
      .eq('id', subaccountId)
      .eq('storage_box_id', id)
      .single();

    if (subError || !subaccount) {
      return NextResponse.json({ error: 'Subaccount not found' }, { status: 404 });
    }

    // Call Hetzner API to reset subaccount password
    const api = new HetznerAPI();
    try {
      const result = await api.resetSubAccountPassword(
        storageBox.hetzner_id, 
        subaccount.hetzner_id, 
        password
      );
      console.log('Reset subaccount password API response:', result);
      
      // Check if the action was initiated successfully
      if (result.action && (result.action.status === 'running' || result.action.status === 'success')) {
        // Action initiated successfully
        console.log('Subaccount password reset action initiated successfully');
      } else if (result.action?.error) {
        console.error('Hetzner API returned error:', result.action.error);
        return NextResponse.json({ 
          error: result.action.error.message || 'Failed to reset password on Hetzner' 
        }, { status: 500 });
      }
    } catch (error) {
      console.error('Hetzner API error:', error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to reset password on Hetzner' 
      }, { status: 500 });
    }

    // Encrypt and save password in database
    const encryptedPassword = encrypt(password);
    const { error: updateError } = await supabase
      .from('subaccounts')
      .update({ 
        password_encrypted: encryptedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', subaccountId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ 
        error: 'Password reset on Hetzner but failed to update database' 
      }, { status: 500 });
    }

    // Log the action
    await supabase.from('api_logs').insert({
      user_id: user.id,
      storage_box_id: id,
      endpoint: `/storage-boxes/${id}/subaccounts/${subaccountId}/reset-password`,
      method: 'POST',
      status_code: 200,
      request_body: { 
        subaccount_username: subaccount.username,
        password_length: password.length 
      },
      response_body: { success: true },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Subaccount password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting subaccount password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}