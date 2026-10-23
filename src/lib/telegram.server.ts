import { createHash, timingSafeEqual } from 'node:crypto';

export function webhookSecret(key: string) {
  return createHash('sha256').update(`telegram-webhook:${key}`).digest('base64url');
}
export function validSecret(actual: string, expected: string) {
  const a = Buffer.from(actual); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function telegram(method: string, body: Record<string, unknown>) {
  const key = process.env['LOVABLE_API_KEY']; const connection = process.env['TELEGRAM_API_KEY'];
  if (!key || !connection) throw new Error('Telegram is not configured.');
  const response = await fetch(`https://connector-gateway.lovable.dev/telegram/${method}`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'X-Connection-Api-Key': connection, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Telegram ${response.status}: ${await response.text()}`);
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || 'Telegram request failed');
  return data.result;
}
export async function downloadChart(fileId: string) {
  const file = await telegram('getFile', { file_id: fileId });
  if (!file.file_path || file.file_size > 5_000_000) throw new Error('Chart must be under 5 MB.');
  const response = await fetch(`https://connector-gateway.lovable.dev/telegram/file/${file.file_path}`, { headers: { Authorization: `Bearer ${process.env['LOVABLE_API_KEY']}`, 'X-Connection-Api-Key': process.env['TELEGRAM_API_KEY'] || '' } });
  if (!response.ok) throw new Error(`Telegram download ${response.status}: ${await response.text()}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 5_000_000) throw new Error('Chart must be under 5 MB.');
  const mime = bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg' : bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP' ? 'image/webp' : null;
  if (!mime) throw new Error('Use a PNG, JPEG or WebP chart.');
  return `data:${mime};base64,${bytes.toString('base64')}`;
}