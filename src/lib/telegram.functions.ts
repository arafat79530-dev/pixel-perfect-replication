import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const connectTelegram = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: allowed, error } = await context.supabase.rpc('can_use_app');
  if (error || !allowed) throw new Error('Owner approval is required.');
  const { telegram } = await import('./telegram.server');
  const bot = await telegram('getMe', {});
  const { data: token, error: linkError } = await context.supabase.rpc('telegram_create_link');
  if (linkError || !token) throw new Error('Unable to create Telegram link.');
  return `https://t.me/${bot.username}?start=${token}`;
});