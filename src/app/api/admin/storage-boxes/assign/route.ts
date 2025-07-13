import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/roles';

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin();
    const supabase = await createSSRClient();
    
    const body = await request.json();
    const { storage_box_id, user_id } = body;
    
    if (!storage_box_id || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Update storage box assignment
    const { data, error } = await supabase
      .from('storage_boxes')
      .update({
        user_id,
        is_assigned: true,
        assigned_by: adminUser.id,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', storage_box_id)
      .select()
      .single();
    
    if (error) {
      console.error('Error assigning storage box:', error);
      return NextResponse.json({ error: 'Failed to assign storage box' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, storageBox: data });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }
    console.error('Error in storage box assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Unassign storage box
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createSSRClient();
    
    const { searchParams } = new URL(request.url);
    const storageBoxId = searchParams.get('id');
    
    if (!storageBoxId) {
      return NextResponse.json({ error: 'Storage box ID is required' }, { status: 400 });
    }
    
    // Update storage box to unassign
    const { error } = await supabase
      .from('storage_boxes')
      .update({
        is_assigned: false,
        assigned_by: null,
        assigned_at: null,
      })
      .eq('id', storageBoxId);
    
    if (error) {
      console.error('Error unassigning storage box:', error);
      return NextResponse.json({ error: 'Failed to unassign storage box' }, { status: 500 });
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
    console.error('Error in storage box unassignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}