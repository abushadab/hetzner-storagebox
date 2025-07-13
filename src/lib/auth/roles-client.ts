import { createSPAClient } from '@/lib/supabase/client';

export async function getUserRoleClient(userId?: string): Promise<'admin' | 'customer' | null> {
  const supabase = createSPAClient();
  
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    targetUserId = user.id;
  }
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', targetUserId)
    .single();
  
  console.log('getUserRoleClient - data:', data, 'error:', error); // Debug log
  
  if (error || !data) {
    console.log('Returning default role: customer');
    return 'customer'; // Default role
  }
  
  console.log('Returning role:', data.role);
  return data.role as 'admin' | 'customer';
}

export async function isAdminClient(): Promise<boolean> {
  const role = await getUserRoleClient();
  return role === 'admin';
}