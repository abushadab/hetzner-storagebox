import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

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

    // Get storage box - user can only see their assigned boxes
    const { data: storageBox, error } = await supabase
      .from('storage_boxes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_assigned', true)
      .eq('is_active', true)
      .single();

    if (error || !storageBox) {
      return NextResponse.json({ error: 'Storage box not found' }, { status: 404 });
    }

    // Remove sensitive data and decrypt password if exists
    const { password_encrypted, ...safeStorageBox } = storageBox;
    
    // Decrypt password if it exists
    let decryptedPassword = null;
    if (password_encrypted) {
      const { decrypt } = await import('@/lib/crypto');
      try {
        decryptedPassword = decrypt(password_encrypted);
      } catch (err) {
        console.error('Failed to decrypt password:', err);
      }
    }

    return NextResponse.json({ 
      storageBox: {
        ...safeStorageBox,
        password: decryptedPassword
      }
    });
  } catch (error) {
    console.error('Error fetching storage box:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}