import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { getAccessState } from '@/lib/access.functions';
import { isApproved } from '@/lib/access';
export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: '/auth' });
    const access = await getAccessState();
    if (!isApproved(access.status)) throw redirect({ to: '/auth' });
    return access;
  },
  component: Outlet,
});