import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@/integrations/supabase/types';

const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
const publishable = process.env['SUPABASE_PUBLISHABLE_KEY'];
describe.skipIf(!url || !key || !publishable)('Live approval permissions', () => {
  const ids: string[] = [];
  let member: ReturnType<typeof createClient<Database>>;
  let owner: ReturnType<typeof createClient<Database>>;
  let admin: ReturnType<typeof createClient<Database>>;
  beforeAll(async () => {
    if (!url || !key || !publishable) throw new Error('Missing test bindings');
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    admin = createClient<Database>(url, key, options);
    const password = crypto.randomUUID() + 'Aa9';
    const clients = [];
    for (let i = 0; i < 2; i++) {
      const email = `ghost-permissions-${crypto.randomUUID()}@example.com`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: 'Permission test' } });
      if (created.error || !created.data.user) throw new Error('Could not create test account');
      ids.push(created.data.user.id);
      const client = createClient<Database>(url, publishable, options);
      const signedIn = await client.auth.signInWithPassword({ email, password });
      if (signedIn.error) throw new Error('Test sign-in failed');
      clients.push(client);
    }
    const [first, second] = clients;
    if (!first || !second) throw new Error('Missing test clients');
    member = first; owner = second;
    const role = await admin.from('user_roles').insert({ user_id: ids[1] ?? '', role: 'admin' });
    if (role.error) throw role.error;
  }, 30000);
  afterAll(async () => { if (admin) for (const id of ids) await admin.auth.admin.deleteUser(id); });
  it('signup creates name and pending membership', async () => {
    const profile = await member.from('profiles').select('display_name').single();
    expect(profile.data?.display_name).toBe('Permission test');
    expect((await member.rpc('can_use_app')).data).toBe(false);
  });
  it('ordinary users cannot approve themselves', async () => {
    const result = await member.rpc('decide_access', { target_user: ids[0] ?? '', new_status: 'approved' });
    expect(result.error?.message).toContain('Forbidden');
  });
  it('ordinary users cannot write approval state directly', async () => {
    const result = await member.from('memberships').update({ status: 'approved' }).eq('user_id', ids[0] ?? '');
    expect((await member.from('memberships').select('status').eq('user_id', ids[0] ?? '').single()).data?.status).toBe('pending');
    expect((await member.rpc('can_use_app')).data).toBe(false);
  });
  it('owner approval enables app access', async () => {
    expect((await owner.rpc('decide_access', { target_user: ids[0] ?? '', new_status: 'approved' })).error).toBeNull();
    expect((await member.rpc('can_use_app')).data).toBe(true);
  });
  it('only approved accounts can link Telegram; tokens are single-use', async () => {
    const link = await member.rpc('telegram_create_link');
    expect(link.error).toBeNull();
    expect(link.data).toHaveLength(64);
    const token = link.data || '';
    expect((await admin.rpc('telegram_bind', { token, target_chat: -900001 })).data).toBe(true);
    expect((await admin.rpc('telegram_bind', { token, target_chat: -900002 })).data).toBe(false);
    expect((await admin.rpc('telegram_allowed', { target_chat: -900001 })).data).toBe(true);
  });
  it('owner revocation disables existing member sessions', async () => {
    expect((await owner.rpc('decide_access', { target_user: ids[0] ?? '', new_status: 'revoked' })).error).toBeNull();
    expect((await member.rpc('can_use_app')).data).toBe(false);
    expect((await admin.rpc('telegram_allowed', { target_chat: -900001 })).data).toBe(false);
    expect((await member.rpc('telegram_create_link')).error).not.toBeNull();
  });
  it('owner rejection disables member access', async () => {
    expect((await owner.rpc('decide_access', { target_user: ids[0] ?? '', new_status: 'rejected' })).error).toBeNull();
    expect((await member.rpc('can_use_app')).data).toBe(false);
  });
  it('owner cannot revoke an admin account', async () => {
    expect((await owner.rpc('decide_access', { target_user: ids[1] ?? '', new_status: 'revoked' })).error?.message).toContain('Owner access cannot be changed');
  });
});