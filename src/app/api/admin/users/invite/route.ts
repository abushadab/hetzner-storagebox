import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireAdmin } from '@/lib/auth/roles';

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin();
    const supabase = await createSSRClient();
    
    const body = await request.json();
    const { email, role = 'customer' } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    if (!['admin', 'customer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    
    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', email)
      .single();
    
    if (existingProfile) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }
    
    // Check if invite already exists
    const { data: existingInvite } = await supabase
      .from('user_invites')
      .select('id')
      .eq('email', email)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (existingInvite) {
      return NextResponse.json({ error: 'Active invite already exists for this email' }, { status: 400 });
    }
    
    try {
      // Use service role client to send invite email through Supabase Auth
      const serviceClient = createServiceRoleClient();
      
      // Send invite email using Supabase Auth
      // Option 1: Magic link (passwordless)
      const { data: authData, error: authError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
        data: {
          role: role,
          invited_by: adminUser.id,
          has_password: false
        }
      });

      if (authError) {
        console.error('Error sending invite email:', authError);
        // Provide more specific error message
        const errorMessage = authError.message || 'Failed to send invite email';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
      }

      // Also create a record in our user_invites table for tracking
      const { data: invite, error: dbError } = await supabase
        .from('user_invites')
        .insert({
          email,
          role,
          invited_by: adminUser.id,
          // Store the auth user id if available
          user_id: authData.user?.id
        })
        .select()
        .single();
      
      if (dbError) {
        console.error('Error creating invite record:', dbError);
        // Don't fail the request if we couldn't create the tracking record
        // The invite email was already sent
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Invite email sent successfully',
        invite: invite || { email, role }
      });
    } catch (serviceError) {
      // If service role key is not configured, fall back to manual process
      console.error('Service role error:', serviceError);
      console.error('Service error details:', {
        message: serviceError instanceof Error ? serviceError.message : 'Unknown error',
        stack: serviceError instanceof Error ? serviceError.stack : undefined
      });
      
      // Create invite record for manual process
      const { data: invite, error } = await supabase
        .from('user_invites')
        .insert({
          email,
          role,
          invited_by: adminUser.id,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating invite:', error);
        return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
      }
      
      // Return invite URL for manual sharing
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invite?token=${invite.token}`;
      
      return NextResponse.json({ 
        success: true, 
        invite: {
          ...invite,
          invite_url: inviteUrl
        },
        warning: 'Email service not configured. Please share the invite URL manually.'
      });
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
    console.error('Error in invite user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get pending invites
export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createSSRClient();
    
    const { data: invites, error } = await supabase
      .from('user_invites')
      .select('*')
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching invites:', error);
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
    }
    
    return NextResponse.json({ invites: invites || [] });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }
    console.error('Error fetching invites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}