import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const messageSchema = z.object({ chat: z.object({ id: z.number().int(), type: z.string() }), from: z.object({ id: z.number().int() }).optional(), text: z.string().max(4096).optional(), photo: z.array(z.object({ file_id: z.string().max(512) })).max(20).optional(), document: z.object({ file_id: z.string().max(512), mime_type: z.string().optional() }).optional() });
export const Route = createFileRoute('/api/public/telegram/webhook')({ server: { handlers: { POST: async ({ request }) => {
  const { webhookSecret, validSecret, telegram, downloadChart } = await import('@/lib/telegram.server');
  const key = process.env['TELEGRAM_API_KEY'];
  if (!key || !validSecret(request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '', webhookSecret(key))) return new Response('Unauthorized', { status: 401 });
  const raw = await request.text();
  if (raw.length > 100_000) return new Response('Too large', { status: 413 });
  let parsed;
  try { parsed = z.object({ update_id: z.number().int(), message: messageSchema.optional() }).safeParse(JSON.parse(raw)); } catch { return new Response('Invalid update', { status: 400 }); }
  if (!parsed.success) return new Response('Invalid update', { status: 400 });
  const { update_id, message } = parsed.data;
  if (!message || message.chat.type !== 'private' || message.from?.id !== message.chat.id) return Response.json({ ok: true });
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error: duplicate } = await supabaseAdmin.from('telegram_updates').insert({ update_id });
  if (duplicate?.code === '23505') return Response.json({ ok: true });
  if (duplicate) return new Response('Unable to store update', { status: 503 });
  const chat = message.chat.id;
  try {
    const token = message.text?.match(/^\/start(?:@\w+)? ([a-f0-9]{64})$/)?.[1];
    if (token) {
      const { data, error } = await supabaseAdmin.rpc('telegram_bind', { token, target_chat: chat });
      if (error) throw new Error('Unable to link account.');
      await telegram('sendMessage', { chat_id: chat, text: data ? 'সংযুক্ত হয়েছে। এখন ১ মিনিটের চার্টের স্ক্রিনশট পাঠান। / Linked. Send a 1-minute chart screenshot.' : 'লিংক মেয়াদোত্তীর্ণ বা অনুমোদন নেই। অ্যাপ থেকে নতুন লিংক নিন।' });
    } else {
      const { data: allowed, error } = await supabaseAdmin.rpc('telegram_allowed', { target_chat: chat });
      if (error || !allowed) { await telegram('sendMessage', { chat_id: chat, text: 'আগে GHOST TRADER AI-তে অনুমোদিত অ্যাকাউন্ট দিয়ে Telegram সংযুক্ত করুন।' }); return Response.json({ ok: true }); }
      const fileId = message.photo?.at(-1)?.file_id || message.document?.file_id;
      if (!fileId) { await telegram('sendMessage', { chat_id: chat, text: '১ মিনিটের চার্টের স্ক্রিনশট পাঠান। / Send a 1-minute chart screenshot.' }); return Response.json({ ok: true }); }
      const image = await downloadChart(fileId);
      const { analyzeImage } = await import('@/lib/chart-ai.server');
      const result = await analyzeImage(image);
      await telegram('sendMessage', { chat_id: chat, text: `${result.signal === 'CALL' ? 'UP ▲' : result.signal === 'PUT' ? 'DOWN ▼' : 'WAIT'} · ${result.pair}\nEvidence: ${Math.round(result.confidence)}% (not win probability)\n${result.reasoning_bn}\n${result.reasoning_en}\n${result.entry_tip_bn}\nRisk: ${result.risk}\nশিক্ষামূলক অনুমান—নিশ্চয়তা নয়। Binary options can lose the entire stake.`.slice(0, 4000) });
    }
  } catch (error) {
    await telegram('sendMessage', { chat_id: chat, text: (error instanceof Error ? error.message : 'Analysis failed').slice(0, 1000) }).catch(() => undefined);
  }
  return Response.json({ ok: true });
} } } });