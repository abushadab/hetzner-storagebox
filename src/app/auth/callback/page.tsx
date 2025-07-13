'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSPAClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createSPAClient();
        
        // Check if we have a hash with tokens (invite flow)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          // Parse the hash parameters
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const type = params.get('type');

          if (accessToken && refreshToken) {
            // Set the session with the tokens
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Error setting session:', error);
              router.push('/auth/login');
              return;
            }

            if (data.session?.user) {
              const user = data.session.user;
              
              // Handle new user setup for invites
              if (type === 'invite') {
                // Create user profile
                const { error: profileError } = await supabase
                  .from('user_profiles')
                  .insert({
                    id: user.id,
                    email: user.email!,
                    full_name: user.user_metadata?.full_name || '',
                  });

                if (profileError && profileError.code !== '23505') {
                  console.error('Error creating user profile:', profileError);
                }

                // Set user role based on metadata
                const role = user.user_metadata?.role || 'customer';
                const { error: roleError } = await supabase
                  .from('user_roles')
                  .insert({
                    user_id: user.id,
                    role: role,
                  });

                if (roleError && roleError.code !== '23505') {
                  console.error('Error creating user role:', roleError);
                }

                // Mark invite as accepted
                if (user.email) {
                  const { error: inviteError } = await supabase
                    .from('user_invites')
                    .update({ accepted_at: new Date().toISOString() })
                    .eq('email', user.email)
                    .is('accepted_at', null);

                  if (inviteError) {
                    console.error('Error updating invite:', inviteError);
                  }
                }

                // Check if user needs to set password (for invited users)
                const hasPassword = user.user_metadata?.has_password || false;
                if (!hasPassword) {
                  router.push('/auth/set-password');
                  return;
                }
              } else {
                // For regular signup email confirmations, ensure user profile exists
                const { error: profileError } = await supabase
                  .from('user_profiles')
                  .insert({
                    id: user.id,
                    email: user.email!,
                    full_name: user.user_metadata?.full_name || '',
                  });

                if (profileError && profileError.code !== '23505') {
                  console.error('Error creating user profile:', profileError);
                }

                // Set default customer role if not exists
                const { error: roleError } = await supabase
                  .from('user_roles')
                  .insert({
                    user_id: user.id,
                    role: 'customer',
                  });

                if (roleError && roleError.code !== '23505') {
                  console.error('Error creating user role:', roleError);
                }
              }

              // Redirect to app
              router.push('/app/storage-boxes');
              return;
            }
          }
        }

        // Check for code parameter (OAuth flow)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          // Let the API route handle the code exchange
          const response = await fetch(`/api/auth/callback-api?code=${code}`);
          if (response.redirected) {
            window.location.href = response.url;
            return;
          }
        }

        // If we get here, something went wrong
        router.push('/auth/login');
      } catch (error) {
        console.error('Callback error:', error);
        router.push('/auth/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Processing login...</p>
      </div>
    </div>
  );
}