import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import * as ftp from 'basic-ftp';

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

    const body = await request.json();
    const { password, path = '/' } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Get storage box
    const { data: storageBox, error: fetchError } = await supabase
      .from('storage_boxes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !storageBox) {
      return NextResponse.json({ error: 'Storage box not found' }, { status: 404 });
    }

    // Connect to FTP
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: storageBox.server,
        user: storageBox.login,
        password: password,
        secure: true, // Use FTPS
        secureOptions: {
          rejectUnauthorized: false // Accept self-signed certificates
        }
      });

      // List directory contents
      const fileList = await client.list(path);
      
      // Filter and format directories only
      const directories = fileList
        .filter(file => file.type === 2) // Type 2 is directory
        .map(dir => ({
          name: dir.name,
          path: path === '/' ? `/${dir.name}` : `${path}/${dir.name}`,
          type: 'directory' as const
        }));

      // Add the current path if it's not root
      if (path !== '/') {
        directories.unshift({
          name: '..',
          path: path.split('/').slice(0, -1).join('/') || '/',
          type: 'directory'
        });
      }

      await client.close();

      return NextResponse.json({ directories });
    } catch (ftpError) {
      await client.close();
      console.error('FTP error:', ftpError);
      return NextResponse.json(
        { error: 'Failed to connect to FTP server. Check your password.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error listing directories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}