import { describe, it, expect, afterEach } from 'vitest';
import { isFounderEmail } from './founders';

const ORIG = process.env.FOUNDER_EMAILS;
afterEach(() => { process.env.FOUNDER_EMAILS = ORIG; });

describe('isFounderEmail', () => {
  it('returns true for an allowlisted email (case-insensitive, trimmed)', () => {
    process.env.FOUNDER_EMAILS = 'a@x.com, Founder@X.com ';
    expect(isFounderEmail('founder@x.com')).toBe(true);
    expect(isFounderEmail('A@X.com')).toBe(true);
  });
  it('returns false for a non-allowlisted email', () => {
    process.env.FOUNDER_EMAILS = 'a@x.com';
    expect(isFounderEmail('b@x.com')).toBe(false);
  });
  it('returns false when the allowlist is empty or unset', () => {
    delete process.env.FOUNDER_EMAILS;
    expect(isFounderEmail('a@x.com')).toBe(false);
    process.env.FOUNDER_EMAILS = '';
    expect(isFounderEmail('a@x.com')).toBe(false);
  });
  it('returns false for null/undefined input', () => {
    process.env.FOUNDER_EMAILS = 'a@x.com';
    expect(isFounderEmail(null)).toBe(false);
    expect(isFounderEmail(undefined)).toBe(false);
  });
});
