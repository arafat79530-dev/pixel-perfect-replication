import { describe, it, expect } from 'vitest';
import { validSecret, webhookSecret } from '@/lib/telegram.server';
describe('Telegram webhook authorization', () => {
  it('rejects a forged secret', () => { expect(validSecret('forged', webhookSecret('test-key'))).toBe(false); });
  it('accepts only the connection-derived secret', () => { expect(validSecret(webhookSecret('test-key'), webhookSecret('test-key'))).toBe(true); });
});