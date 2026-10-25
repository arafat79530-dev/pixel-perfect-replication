import { afterEach, expect, it, vi } from 'vitest';
import { analyzeImage } from '@/lib/chart-ai.server';

vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) },
}));

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('uses lighter reasoning for shared screenshot analysis without switching models', async () => {
  vi.stubEnv('LOVABLE_API_KEY', 'test-key');
  const result = { signal: 'CALL', confidence: 65, pair: 'Unknown', patterns: [], reasoning_en: '', reasoning_bn: '', entry_tip_en: '', entry_tip_bn: '', risk: 'high' };
  const request = vi.fn(async () => new Response(`data: ${JSON.stringify({ type: 'response.output_text.delta', delta: JSON.stringify(result) })}\n\n`));
  vi.stubGlobal('fetch', request);
  expect((await analyzeImage('data:image/png;base64,dGVzdA==')).signal).toBe('CALL');
  const init = request.mock.calls[0]?.[1] as RequestInit | undefined;
  const body = JSON.parse(String(init?.body));
  expect(body.model).toBe('openai/gpt-6-astra');
  expect(body.reasoning.effort).toBe('low');
  expect(body.stream).toBe(true);
});