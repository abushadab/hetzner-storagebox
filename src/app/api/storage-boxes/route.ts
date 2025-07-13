import { NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSSRClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: storageBoxes, error } = await supabase
      .from('storage_boxes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_assigned', true)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ storageBoxes: storageBoxes || [] });
  } catch (error) {
    console.error('Error fetching storage boxes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST method removed - only admins can add storage boxes via admin API