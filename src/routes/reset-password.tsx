import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [{ title: 'Reset Password — GHOST TRADER AI' }, { name: 'description', content: 'Securely reset your GHOST TRADER AI account password.' }, { property: 'og:title', content: 'Reset Password — GHOST TRADER AI' }, { property: 'og:description', content: 'Account password recovery.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: ResetPassword,
});
function ResetPassword() {
  const [recovery, setRecovery] = useState(false), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { setRecovery(new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery'); }, []);
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-6"><h1 className="text-2xl font-bold">GHOST TRADER AI</h1><h2>Reset password / নতুন পাসওয়ার্ড</h2>{recovery ? <form className="space-y-4" onSubmit={async e => {
    e.preventDefault(); if (password !== confirm) { setMessage('Passwords do not match.'); return; } setBusy(true);
    const { error } = await supabase.auth.updateUser({ password }); setMessage(error?.message ?? 'Password updated. You can now sign in.'); setBusy(false);
  }}><label className="block">New password<input className="field mt-2" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label><label className="block">Confirm password<input className="field mt-2" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label><Button disabled={busy} type="submit">Update password</Button></form> : <p className="text-warn">Open the password recovery link from your email.</p>}{message && <p role="status">{message}</p>}<Button variant="outline" asChild><Link to="/auth">Back to login</Link></Button></main>;
}