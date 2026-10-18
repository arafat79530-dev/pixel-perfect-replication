import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import '@lovable.dev/cloud-auth-js/styles.css';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/components/qx/SignOutButton';
import { Ghost, ShieldCheck, Clock3, RefreshCw, Loader2 } from 'lucide-react';
export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [{ title: 'Login & Sign Up — GHOST TRADER AI' }, { name: 'description', content: 'Sign in or request owner-approved membership for GHOST TRADER AI.' }, { property: 'og:title', content: 'Login & Sign Up — GHOST TRADER AI' }, { property: 'og:description', content: 'Secure login and membership approval.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: AuthPage,
});
function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const account = useQuery({ queryKey: ['account-access'], retry: false, queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error: e } = await supabase.from('memberships').select('status').eq('user_id', user.id).single();
    if (e) throw new Error('Account access could not be checked. Please retry.');
    return { user, status: data.status };
  }});
  useEffect(() => { if (account.data?.status === 'approved') void navigate({ to: '/terminal', replace: true }); }, [account.data, navigate]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error; setMessage('Password reset link sent. ইমেইল দেখুন।');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin } });
        if (error) throw error; setMessage('ইমেইলের লিংকে অ্যাকাউন্ট নিশ্চিত করুন, তারপর মালিকের অনুমোদনের জন্য অপেক্ষা করুন। Check your email to confirm.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error; await account.refetch();
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to continue.'); } finally { setBusy(false); }
  };
  const oauth = async (provider: 'google' | 'lovable') => {
    setBusy(true); setError('');
    try { const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` }); if (r.error) throw r.error; if (!r.redirected) await account.refetch(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Sign in failed'); } finally { setBusy(false); }
  };
  return <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
    <Ghost className="size-12 text-primary" /><h1 className="text-3xl font-bold">GHOST TRADER <span className="text-primary">AI</span></h1>
    {account.isPending ? <Loader2 className="animate-spin text-primary" /> : account.data ? <>
      <div className="flex items-center justify-between"><Clock3 className="size-8 text-warn" /><SignOutButton /></div>
      <h2 className="text-xl font-bold">{account.data.status === 'approved' ? 'Opening terminal…' : account.data.status === 'pending' ? 'অনুমোদনের অপেক্ষায় / Pending approval' : 'প্রবেশাধিকার নেই / Access denied'}</h2>
      <p className="break-all text-sm text-muted-foreground">{account.data.user.email}</p>
      <p className="text-sm text-muted-foreground">মালিক অনুমতি দিলে তবেই ট্রেডিং অ্যাপে প্রবেশ করতে পারবেন।</p>
      <Button variant="outline" onClick={() => account.refetch()}><RefreshCw /> Check permission / অনুমতি দেখুন</Button>
    </> : <>
      <div className="flex gap-2 border-b pb-3"><Button variant={mode === 'login' ? 'default' : 'ghost'} onClick={() => { setMode('login'); setMessage(''); setError(''); }}>Login</Button><Button variant={mode === 'signup' ? 'default' : 'ghost'} onClick={() => { setMode('signup'); setMessage(''); setError(''); }}>Sign up</Button></div>
      <form onSubmit={submit} className="space-y-4">
        {mode === 'signup' && <label className="block space-y-2 text-sm">Name / নাম<input required maxLength={100} className="field" autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label>}
        <label className="block space-y-2 text-sm">Email<input required type="email" maxLength={255} className="field" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        {mode !== 'forgot' && <label className="block space-y-2 text-sm">Password<input required minLength={8} maxLength={128} type="password" className="field" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>}
        <Button disabled={busy} type="submit" className="w-full">{busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}{mode === 'signup' ? 'Request access / অনুমতি চাই' : mode === 'forgot' ? 'Send reset link' : 'Login'}</Button>
      </form>
      {mode === 'login' && <Button variant="link" onClick={() => setMode('forgot')}>Forgot password?</Button>}
      {mode !== 'forgot' && <div className="space-y-3 border-t pt-4"><Button variant="outline" disabled={busy} className="w-full" onClick={() => oauth('google')}>Continue with Google</Button><Button className="lovable-auth-button w-full" disabled={busy} onClick={() => oauth('lovable')}>Continue with Lovable</Button><p className="text-xs text-muted-foreground">সব নতুন সদস্যের জন্য মালিকের অনুমোদন প্রয়োজন।</p></div>}
    </>}
    {message && <p role="status" className="text-sm text-call">{message}</p>}
    {(error || account.error) && <p role="alert" className="text-sm text-put">{error || account.error?.message}</p>}
    {account.error && <Button variant="outline" onClick={() => account.refetch()}>Retry</Button>}
  </div>;
}