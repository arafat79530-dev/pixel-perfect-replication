import { describe, expect, it } from 'vitest';
import { isApproved, canDecideAccess } from '@/lib/access';
describe('Owner approval rules', () => {
  it('new pending signups cannot enter the app', () => expect(isApproved('pending')).toBe(false));
  it('approved users can enter', () => expect(isApproved('approved')).toBe(true));
  it('rejected users cannot enter', () => expect(isApproved('rejected')).toBe(false));
  it('revoked users lose access', () => expect(isApproved('revoked')).toBe(false));
  it('ordinary users cannot approve accounts', () => expect(canDecideAccess(false, false)).toBe(false));
  it('owner can decide non-owner access', () => expect(canDecideAccess(true, false)).toBe(true));
  it('owner access cannot be revoked', () => expect(canDecideAccess(true, true)).toBe(false));
});