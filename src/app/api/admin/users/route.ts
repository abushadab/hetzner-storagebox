import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/roles';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createSSRClient();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    
    // Get users from the view
    let query = supabase
      .from('user_management')
      .select('*', { count: 'exact' });
    
    // Add search if provided
    if (search) {
      query = query.ilike('email', `%${search}%`);
    }
    
    // Add pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('user_created_at', { ascending: false });
    
    const { data: users, error, count } = await query;
    
    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
    
    // Get storage box counts for each user
    const userIds = users?.map(u => u.user_id).filter((id): id is string => id !== null) || [];
    const { data: storageCounts } = await supabase
      .from('storage_boxes')
      .select('user_id')
      .in('user_id', userIds)
      .eq('is_assigned', true);
    
    // Count storage boxes per user
    const storageCountMap = storageCounts?.reduce((acc, box) => {
      acc[box.user_id] = (acc[box.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    // Format users data
    const formattedUsers = users?.map(u => ({
      id: u.user_id,
      email: u.email,
      role: u.role,
      created_at: u.user_created_at,
      storage_count: u.user_id ? (storageCountMap[u.user_id] || 0) : 0
    })) || [];
    
    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }
    console.error('Error in admin users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update user role
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createSSRClient();
    
    const body = await request.json();
    const { user_id, role } = body;
    
    if (!user_id || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    if (!['admin', 'customer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('user_roles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('user_id', user_id);
    
    if (error) {
      console.error('Error updating user role:', error);
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
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
    console.error('Error in admin users PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}