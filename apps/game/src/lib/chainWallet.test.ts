import { describe, it, expect } from 'vitest';
import { overrideWalletIdentity } from './chainWallet';

describe('overrideWalletIdentity', () => {
  it('overrides wallet keys in a JSON body', () => {
    const r = overrideWalletIdentity('api/secure', '', { wallet_index: 99, duration: 5 }, 1);
    expect(r.body).toEqual({ wallet_index: 1, duration: 5 });
  });
  it('overrides sender_wallet in a JSON body', () => {
    const r = overrideWalletIdentity('api/transact', '', { sender_wallet: 99, amount: 10 }, 1);
    expect(r.body).toEqual({ sender_wallet: 1, amount: 10 });
  });
  it('overrides wallet query params', () => {
    const r = overrideWalletIdentity('api/agents', '?user_count=3&self_wallet=99', undefined, 1);
    expect(r.search).toContain('self_wallet=1');
    expect(r.search).toContain('user_count=3');
  });
  it('rewrites a trailing wallet_index path segment for user-scoped reads', () => {
    const r = overrideWalletIdentity('api/balance/99', '', undefined, 1);
    expect(r.path).toBe('api/balance/1');
  });
  it('rewrites the wallet segment in /api/resources/{wi}/assign', () => {
    const r = overrideWalletIdentity('api/resources/99/assign', '', undefined, 1);
    expect(r.path).toBe('api/resources/1/assign');
  });
  it('leaves non-wallet paths untouched', () => {
    const r = overrideWalletIdentity('api/status', '', undefined, 1);
    expect(r.path).toBe('api/status');
  });
  it('rewrites the wallet index in an api/nonce/{n} sign-context path', () => {
    const r = overrideWalletIdentity('api/nonce/0', '', undefined, 7);
    expect(r.path).toBe('api/nonce/7');
  });
});
