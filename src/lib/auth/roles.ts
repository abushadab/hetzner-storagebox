import { createSSRClient } from '@/lib/supabase/server';

export type UserRole = 'admin' | 'customer';

export async function getUserRole(userId?: string): Promise<UserRole | null> {
  const supabase = await createSSRClient();
  
  // If no userId provided, get current user
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) return null;
  
  return data.role as UserRole;
}

export async function isAdmin(userId?: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
}

export async function requireAdmin() {
  const supabase = await createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  const isUserAdmin = await isAdmin(user.id);
  if (!isUserAdmin) {
    throw new Error('Forbidden: Admin access required');
  }
  
  return user;
}

export async function ensureUserHasRole(userId: string) {
  const supabase = await createSSRClient();
  
  // Check if user already has a role
  const { data: existingRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  if (!existingRole) {
    // Create default customer role
    await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: 'customer' });
  }
}