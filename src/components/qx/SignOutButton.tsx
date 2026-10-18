import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
export function SignOutButton() {
  const cache = useQueryClient(); const navigate = useNavigate();
  return <Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out" onClick={async () => {
    await cache.cancelQueries(); cache.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { window.alert(error.message); return; }
    await navigate({ to: '/auth', replace: true });
  }}><LogOut /></Button>;
}