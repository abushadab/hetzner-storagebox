import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/crypto';
import { getUserRole } from '@/lib/auth/roles';

export async function GET(
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
    
    // Get storage box
    const { data: storageBox, error } = await supabase
      .from('storage_boxes')
      .select('id, password_encrypted')
      .eq('id', id)
      .single();

    if (error || !storageBox) {
      console.error('Storage box query error:', error);
      return NextResponse.json({ error: 'Storage box not found' }, { status: 404 });
    }

    // Only allow admins or the assigned user to view password
    if (role !== 'admin') {
      const { data: userBox } = await supabase
        .from('storage_boxes')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
        
      if (!userBox) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    if (storageBox.password_encrypted) {
      try {
        const decrypted = decrypt(storageBox.password_encrypted);
        return NextResponse.json({ 
          hasPassword: true, 
          password: decrypted 
        });
      } catch {
        return NextResponse.json({ 
          hasPassword: true, 
          password: null,
          error: 'Failed to decrypt password' 
        });
      }
    }

    return NextResponse.json({ hasPassword: false });
  } catch (error) {
    console.error('Error fetching password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Only allow admins or the assigned user to set password
    if (role !== 'admin') {
      const { data: userBox } = await supabase
        .from('storage_boxes')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
        
      if (!userBox) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Encrypt password
    const encryptedPassword = encrypt(password);

    // Update storage box
    const { error: updateError } = await supabase
      .from('storage_boxes')
      .update({ password_encrypted: encryptedPassword })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}