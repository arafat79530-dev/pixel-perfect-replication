import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getAccessState = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('memberships').select('status').eq('user_id', context.userId).single();
  if (error) throw new Error('Unable to read account access.');
  const { data: admin, error: roleError } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (roleError) throw new Error('Unable to read account role.');
  return { status: data.status, isAdmin: admin === true, userId: context.userId };
});