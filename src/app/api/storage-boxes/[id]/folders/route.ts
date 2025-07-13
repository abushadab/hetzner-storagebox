import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { getStorageApiToken } from '@/lib/settings';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path') || '';
    
    console.log(`[Folders API] Getting folders for storage box ${id}, path: "${path}"`);
    
    const supabase = await createSSRClient();
    
    // Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user owns this storage box
    const { data: storageBox, error: boxError } = await supabase
      .from('storage_boxes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (boxError || !storageBox) {
      return NextResponse.json({ error: 'Storage box not found' }, { status: 404 });
    }

    // Get API token
    const apiToken = await getStorageApiToken();
    if (!apiToken) {
      return NextResponse.json({ error: 'API token not configured' }, { status: 500 });
    }

    // Make request to Hetzner API
    const startTime = Date.now();
    const url = `https://api.hetzner.com/v1/storage_boxes/${storageBox.hetzner_id}/folders${path ? `?path=${encodeURIComponent(path)}` : ''}`;
    
    console.log(`[Folders API] Requesting: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    });

    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      const error = await response.json();
      console.error('[Folders API] Storage API error:', error);
      return NextResponse.json(
        { error: error.error?.message || 'Failed to get folders' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Folders API] Got ${data.folders?.length || 0} folders in ${responseTime}ms`);
    
    // Convert to directory format for compatibility
    const directories = (data.folders || []).map((folderName: string) => ({
      name: folderName,
      path: path ? `${path}/${folderName}` : folderName,
      type: 'directory' as const,
    }));

    return NextResponse.json({ 
      directories,
      path,
      performance: {
        responseTime
      }
    });

  } catch (error) {
    console.error('[Folders API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get folders' },
      { status: 500 }
    );
  }
}