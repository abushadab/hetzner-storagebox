import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';
import { getUserRole } from '@/lib/auth/roles';
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

    // Get storage box details
    const { data: storageBox, error: fetchError } = await supabase
      .from('storage_boxes')
      .select('id, hetzner_id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !storageBox) {
      return NextResponse.json({ error: 'Storage box not found' }, { status: 404 });
    }

    // Only allow admins or the assigned user to reset password
    if (role !== 'admin') {
      if (storageBox.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Call Hetzner API to reset password
    const api = new HetznerAPI();
    try {
      const result = await api.resetPassword(storageBox.hetzner_id, password);
      console.log('Reset password API response:', result);
      
      // Check if the action was initiated successfully
      if (result.action && (result.action.status === 'running' || result.action.status === 'success')) {
        // Action initiated successfully
        console.log('Password reset action initiated successfully');
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
      .from('storage_boxes')
      .update({ 
        password_encrypted: encryptedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

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
      endpoint: `/storage-boxes/${id}/reset-password`,
      method: 'POST',
      status_code: 200,
      request_body: { password_length: password.length },
      response_body: { success: true },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}