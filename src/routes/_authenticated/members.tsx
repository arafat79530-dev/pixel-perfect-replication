import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/components/qx/SignOutButton';
import { ArrowLeft, Check, X, Ban, RefreshCw, Users, UserCheck, Clock, Send, PauseCircle, PlayCircle } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/members')({
  beforeLoad: ({ context }) => { if (!context.isAdmin) throw redirect({ to: '/terminal' }); },
  head: () => ({ meta: [{ title: 'Admin Panel — GHOST TRADER AI' }, { name: 'description', content: 'Owner admin panel for GHOST TRADER AI: member approval, Telegram links and AI access control.' }, { property: 'og:title', content: 'Admin Panel — GHOST TRADER AI' }, { property: 'og:description', content: 'Private owner access management.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: AdminPanel,
});

function AdminPanel() {
  const { userId } = Route.useRouteContext();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [pauseBusy, setPauseBusy] = useState(false);
  const [pauseMsg, setPauseMsg] = useState('');

  const members = useQuery({
    queryKey: ['admin-members'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_members');
      if (error) throw error;
      return data;
    },
  });

  const pause = useQuery({
    queryKey: ['ai-pause'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_ai_pause');
      if (error) throw error;
      return data[0] ?? null;
    },
  });

  const decide = async (id: string, status: string) => {
    setBusy(id); setError('');
    const { error } = await supabase.rpc('decide_access', { target_user: id, new_status: status });
    if (error) setError(error.message); else await members.refetch();
    setBusy(null);
  };

  const togglePause = async () => {
    setPauseBusy(true); setError('');
    const next = !pause.data;
    const { error } = await supabase.rpc('set_ai_pause', { paused: next, message: pauseMsg || 'AI analysis is temporarily paused by the owner. / মালিক সাময়িকভাবে এআই বিশ্লেষণ বন্ধ রেখেছেন।' });
    if (error) setError(error.message); else await pause.refetch();
    setPauseBusy(false);
  };

  const list = members.data ?? [];
  const total = list.length;
  const pending = list.filter((m) => m.status === 'pending').length;
  const approved = list.filter((m) => m.status === 'approved').length;
  const tgLinked = list.filter((m) => m.telegram_linked).length;

  const stats = [
    { label: 'মোট সদস্য / Total', value: total, I: Users },
    { label: 'অপেক্ষমাণ / Pending', value: pending, I: Clock },
    { label: 'অনুমোদিত / Approved', value: approved, I: UserCheck },
    { label: 'Telegram যুক্ত / Linked', value: tgLinked, I: Send },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">GHOST TRADER AI</h1>
          <h2 className="mt-2 text-primary">Admin Panel / অ্যাডমিন প্যানেল</h2>
        </div>
        <SignOutButton />
      </header>

      <div className="flex justify-between">
        <Button variant="outline" asChild><Link to="/terminal"><ArrowLeft /> Terminal</Link></Button>
        <Button variant="ghost" size="icon" aria-label="Refresh admin data" onClick={() => { void members.refetch(); void pause.refetch(); }}><RefreshCw /></Button>
      </div>

      {(error || members.error || pause.error) && <p role="alert" className="text-put">{error || members.error?.message || pause.error?.message}</p>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(({ label, value, I }) => (
          <div key={label} className="glass flex items-center gap-3 p-4">
            <I className="h-6 w-6 text-primary" />
            <div><p className="text-2xl font-bold">{members.isPending ? '…' : value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
          </div>
        ))}
      </section>

      <section className="glass space-y-3 p-4">
        <h3 className="font-bold">AI Access / এআই অ্যাক্সেস</h3>
        <p className="text-sm text-muted-foreground">
          {pause.isPending ? '…' : pause.data
            ? <>এআই বিশ্লেষণ এখন <span className="text-put">বন্ধ</span> আছে। বার্তা: {pause.data.message}</>
            : 'এআই বিশ্লেষণ চালু আছে। সব অনুমোদিত সদস্য স্ক্যানার ও Telegram বিশ্লেষণ ব্যবহার করতে পারছে।'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={pauseMsg}
            onChange={(e) => setPauseMsg(e.target.value)}
            placeholder="বন্ধের বার্তা (ঐচ্ছিক) / Pause message (optional)"
            className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          />
          <Button variant={pause.data ? 'default' : 'destructive'} disabled={pauseBusy || pause.isPending} onClick={() => void togglePause()}>
            {pause.data ? <><PlayCircle /> Resume AI / চালু করুন</> : <><PauseCircle /> Pause AI / বন্ধ করুন</>}
          </Button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-bold">Members / সদস্যবৃন্দ</h3>
        {members.isPending && <p>Loading…</p>}
        <div className="divide-y border-y">
          {list.map((m) => (
            <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-4 py-5">
              <div className="min-w-0">
                <h4 className="font-bold">{m.display_name || 'Member'}</h4>
                <p className="break-all text-sm text-muted-foreground">{m.email}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-warn">{m.user_id === userId ? 'Owner / মালিক' : m.status}</span>
                  {m.telegram_linked && <span className="flex items-center gap-1 text-primary"><Send className="h-3 w-3" /> Telegram linked</span>}
                </p>
              </div>
              {m.user_id !== userId && (
                <div className="flex flex-wrap gap-2">
                  {m.status !== 'approved' && <Button size="sm" disabled={busy === m.user_id} onClick={() => void decide(m.user_id, 'approved')}><Check /> Approve</Button>}
                  {m.status === 'pending' && <Button variant="outline" size="sm" disabled={busy === m.user_id} onClick={() => void decide(m.user_id, 'rejected')}><X /> Reject</Button>}
                  {m.status === 'approved' && <Button variant="destructive" size="sm" disabled={busy === m.user_id} onClick={() => { if (window.confirm('Revoke this member’s access?')) void decide(m.user_id, 'revoked'); }}><Ban /> Revoke</Button>}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
