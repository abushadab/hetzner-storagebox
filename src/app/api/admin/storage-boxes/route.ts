import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/roles';
import { HetznerAPI } from '@/lib/hetzner-api';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createSSRClient();
    
    // Get all storage boxes
    const { data: storageBoxes, error } = await supabase
      .from('storage_boxes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching storage boxes:', error);
      return NextResponse.json({ error: 'Failed to fetch storage boxes' }, { status: 500 });
    }
    
    return NextResponse.json({ storageBoxes: storageBoxes || [] });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }
    console.error('Error in admin storage boxes GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add new storage box to system
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin();
    const supabase = await createSSRClient();
    
    const body = await request.json();
    const { storage_box_id } = body;
    
    if (!storage_box_id) {
      return NextResponse.json({ error: 'Storage box ID is required' }, { status: 400 });
    }
    
    // Check if storage box already exists
    const { data: existing } = await supabase
      .from('storage_boxes')
      .select('id')
      .eq('hetzner_id', storage_box_id)
      .single();
    
    if (existing) {
      return NextResponse.json({ error: 'Storage box already exists in system' }, { status: 400 });
    }
    
    // Fetch storage box details from API
    const api = new HetznerAPI();
    
    try {
      const storageBox = await api.getStorageBox(storage_box_id);
      
      // Add to database (unassigned)
      const { data, error } = await supabase
        .from('storage_boxes')
        .insert({
          hetzner_id: storageBox.id,
          login: storageBox.username,
          name: storageBox.name,
          location: storageBox.location.name,
          product: storageBox.storage_box_type.name,
          server: storageBox.server,
          quota_gb: Math.floor(storageBox.storage_box_type.size / 1024 / 1024 / 1024),
          used_gb: Math.floor(storageBox.stats.size / 1024 / 1024 / 1024),
          user_id: adminUser.id, // Temporarily assign to admin
          is_assigned: false,
          last_synced_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving storage box:', error);
        return NextResponse.json({ error: 'Failed to save storage box' }, { status: 500 });
      }
      
      return NextResponse.json({ storageBox: data });
    } catch (apiError) {
      console.error('API Error:', apiError);
      return NextResponse.json({ 
        error: 'Failed to fetch storage box from provider. Please check the ID.' 
      }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }
    console.error('Error in admin storage boxes POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}