// src/app/api/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createSSRSassClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (code) {
        const supabase = await createSSRSassClient()
        const client = supabase.getSupabaseClient()

        // Exchange the code for a session
        const { data: sessionData, error: sessionError } = await supabase.exchangeCodeForSession(code)

        if (sessionError || !sessionData.user) {
            console.error('Error exchanging code for session:', sessionError)
            return NextResponse.redirect(new URL('/auth/login', request.url))
        }

        const user = sessionData.user

        // Check if this is a new user (from invite)
        const isNewUser = user.created_at && new Date(user.created_at).getTime() > Date.now() - 60000 // Created within last minute

        if (isNewUser && user.email) {
            // Handle new user setup (from invite)
            const { data: invite } = await client
                .from('user_invites')
                .select('*')
                .eq('email', user.email)
                .eq('user_id', user.id)
                .single()

            // Create user profile
            const { error: profileError } = await client
                .from('user_profiles')
                .insert({
                    id: user.id,
                    email: user.email!,
                    full_name: user.user_metadata?.full_name || '',
                })

            if (profileError && profileError.code !== '23505') { // Ignore if profile already exists
                console.error('Error creating user profile:', profileError)
            }

            // Set user role based on invite or metadata
            const role = invite?.role || user.user_metadata?.role || 'customer'
            const { error: roleError } = await client
                .from('user_roles')
                .insert({
                    user_id: user.id,
                    role: role,
                })

            if (roleError && roleError.code !== '23505') { // Ignore if role already exists
                console.error('Error creating user role:', roleError)
            }

            // Mark invite as accepted if exists
            if (invite) {
                await client
                    .from('user_invites')
                    .update({ accepted_at: new Date().toISOString() })
                    .eq('id', invite.id)
            }
        }

        // Redirect to app
        return NextResponse.redirect(new URL('/app/storage-boxes', request.url))
    }

    // If no code provided, redirect to login
    return NextResponse.redirect(new URL('/auth/login', request.url))
}