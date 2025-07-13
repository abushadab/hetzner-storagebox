import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { HetznerAPI } from '@/lib/hetzner-api';

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

    // Get subaccounts from database
    const { data: subaccounts, error } = await supabase
      .from('subaccounts')
      .select('*')
      .eq('storage_box_id', id)
      .order('username');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Decrypt passwords
    const { decrypt } = await import('@/lib/crypto');
    const subaccountsWithPasswords = subaccounts.map(subaccount => ({
      ...subaccount,
      password: subaccount.password_encrypted ? decrypt(subaccount.password_encrypted) : null,
      password_encrypted: undefined, // Remove encrypted password from response
    }));

    return NextResponse.json({ subaccounts: subaccountsWithPasswords });
  } catch (error) {
    console.error('Error fetching subaccounts:', error);
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
  console.log('=== SUBACCOUNT CREATION START ===');
  try {
    const { id } = await params;
    console.log('Storage box ID from params:', id);
    const supabase = await createSSRClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    const {
      comment,
      home_dir,
      samba = false,
      ssh = false,
      external_reachability = false,
      webdav = false,
      readonly = false,
      password,
    } = body;

    if (!home_dir) {
      return NextResponse.json(
        { error: 'Home directory is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Get storage box
    console.log('Fetching storage box from database...');
    const { data: storageBox, error: fetchError } = await supabase
      .from('storage_boxes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    console.log('Storage box fetch error:', fetchError);
    console.log('Storage box data:', storageBox);

    if (fetchError || !storageBox) {
      console.error('Storage box not found or error:', fetchError);
      return NextResponse.json({ error: 'Storage box not found' }, { status: 404 });
    }

    // Create Hetzner API client with global token
    console.log('Creating Hetzner API client...');
    const hetznerApi = new HetznerAPI();

    try {
      // Create request payload matching Hetzner API exactly (same format that worked in test)
      const requestPayload = {
        password: password,
        home_directory: home_dir,
        access_settings: {
          samba_enabled: Boolean(samba),
          ssh_enabled: Boolean(ssh),
          reachable_externally: Boolean(external_reachability),
          webdav_enabled: Boolean(webdav),
          readonly: Boolean(readonly),
        },
        description: comment || '',
      };
      
      console.log('=== HETZNER API CALL ===');
      console.log('Creating subaccount for storage box ID:', storageBox.hetzner_id);
      console.log('Request payload:', JSON.stringify(requestPayload, null, 2));
      
      // Log the exact curl command for comparison
      const curlCommand = `curl -X POST \\
    -H "Authorization: Bearer \${API_TOKEN}" \\
    -H "Content-Type: application/json" \\
    -d '${JSON.stringify(requestPayload)}' \\
    "https://api.hetzner.com/v1/storage_boxes/${storageBox.hetzner_id}/subaccounts"`;
      console.log('Equivalent curl command:');
      console.log(curlCommand);

      // Create subaccount via Hetzner API
      const actionResponse = await hetznerApi.createSubAccount(storageBox.hetzner_id, requestPayload);

      console.log('Hetzner API response:', JSON.stringify(actionResponse, null, 2));

      // Check if action was successful or still running
      if (actionResponse.action.status === 'error') {
        console.error('Hetzner API error:', actionResponse.action.error);
        throw new Error(actionResponse.action.error?.message || 'Failed to create subaccount');
      }
      
      // If action is still running, wait for it to complete
      if (actionResponse.action.status === 'running') {
        console.log('Subaccount creation is still running, waiting...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Check if the action actually succeeded
      if (actionResponse.action.status !== 'success' && actionResponse.action.status !== 'running') {
        throw new Error(`Subaccount creation failed with status: ${actionResponse.action.status}`);
      }

      // Get the subaccount ID from the action response
      const subaccountResource = actionResponse.action.resources?.find(r => r.type === 'storage_box_subaccount');
      if (!subaccountResource) {
        console.error('No subaccount resource in response:', actionResponse);
        throw new Error('Failed to create subaccount - no resource ID returned');
      }

      // Wait and retry fetching the subaccount with exponential backoff
      console.log('Waiting for subaccount to be available...');
      let newSubaccount = null;
      const maxRetries = 5;
      const baseDelay = 2000; // Start with 2 seconds
      
      for (let i = 0; i < maxRetries; i++) {
        const delay = baseDelay * Math.pow(2, i); // 2s, 4s, 8s, 16s, 32s
        console.log(`Attempt ${i + 1}/${maxRetries}: Waiting ${delay}ms before checking...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
          const subaccounts = await hetznerApi.listSubAccounts(storageBox.hetzner_id);
          console.log(`Found ${subaccounts.length} subaccounts, looking for ID ${subaccountResource.id}`);
          newSubaccount = subaccounts.find(s => s.id === subaccountResource.id);
          
          if (newSubaccount) {
            console.log('Successfully found the new subaccount:', newSubaccount);
            break;
          }
        } catch (error) {
          console.error(`Attempt ${i + 1} failed to fetch subaccounts:`, error);
        }
      }
      
      if (!newSubaccount) {
        // If we can't fetch it, we'll get the details on next sync
        console.warn('Could not fetch created subaccount details immediately');
        // Use minimal data - the actual username will be synced later
        newSubaccount = {
          id: subaccountResource.id,
          username: `pending-${subaccountResource.id}`,
          description: comment || '',
          home_directory: home_dir,
          access_settings: {
            samba_enabled: samba,
            ssh_enabled: ssh,
            reachable_externally: external_reachability,
            webdav_enabled: webdav,
            readonly: readonly,
          },
        };
      }

      // Encrypt and save password
      const { encrypt } = await import('@/lib/crypto');
      const encryptedPassword = encrypt(password);

      // Save to database
      const { data: saved, error: saveError } = await supabase
        .from('subaccounts')
        .insert({
          storage_box_id: id,
          hetzner_id: newSubaccount.id,
          username: newSubaccount.username,
          comment: newSubaccount.description,
          home_dir: newSubaccount.home_directory,
          samba: newSubaccount.access_settings.samba_enabled,
          ssh: newSubaccount.access_settings.ssh_enabled,
          external_reachability: newSubaccount.access_settings.reachable_externally,
          webdav: newSubaccount.access_settings.webdav_enabled,
          readonly: newSubaccount.access_settings.readonly,
          password_encrypted: encryptedPassword,
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      // Log API call
      await supabase.from('api_logs').insert({
        user_id: user.id,
        storage_box_id: id,
        endpoint: `/storage_boxes/${storageBox.hetzner_id}/subaccounts`,
        method: 'POST',
        status_code: 200,
      });

      // Return response with status info
      const response = {
        subaccount: saved,
        hetzner_status: 'created',
        hetzner_id: subaccountResource.id,
        message: newSubaccount 
          ? 'Subaccount created successfully' 
          : 'Subaccount creation initiated on Hetzner. Username will be updated automatically.'
      };
      
      console.log('=== SUBACCOUNT CREATION SUCCESS ===');
      console.log('Hetzner subaccount ID:', subaccountResource.id);
      console.log('Database record created with ID:', saved.id);
      
      return NextResponse.json(response);
    } catch (apiError) {
      console.error('API Error:', apiError);
      
      // Log failed API call
      await supabase.from('api_logs').insert({
        user_id: user.id,
        storage_box_id: id,
        endpoint: `/storage_boxes/${storageBox.hetzner_id}/subaccounts`,
        method: 'POST',
        error_message: apiError instanceof Error ? apiError.message : 'Unknown error',
      });

      // Extract detailed error message
      let errorMessage = 'Failed to create subaccount';
      if (apiError instanceof Error) {
        errorMessage = apiError.message;
        // If it's a password error, provide helpful feedback
        if (errorMessage.includes('password')) {
          errorMessage += '. Try using a different password (20+ characters, alphanumeric only).';
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating subaccount:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}