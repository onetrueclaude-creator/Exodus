import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VaultTokenPanel from '../VaultTokenPanel';

beforeEach(() => { vi.restoreAllMocks(); });

describe('VaultTokenPanel', () => {
  it('mints and shows the token once, with tier + limits + custody disclosure', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'jwt-abc', jti: 'jti-1', expiresAt: '2026-07-09T13:00:00.000Z',
        tier: 'standing', scope: ['memory:read', 'memory:write'],
        limits: { search_per_min: 30, writes_per_day: 32 } }),
    }) as unknown as typeof fetch;
    render(<VaultTokenPanel />);
    expect(screen.getByText(/never indexed/i)).toBeInTheDocument();   // custody snippet visible
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    await waitFor(() => expect(screen.getByDisplayValue('jwt-abc')).toBeInTheDocument());
    // Scoped to the tier <span> specifically: the panel's own honesty copy
    // ("earned standing — audits passed...", the load-bearing never-
    // purchasable Howey framing) also legitimately contains "standing", so a
    // bare /standing/ text query is ambiguous (matches both nodes).
    expect(screen.getByText('standing', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/32/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/vault/token', { method: 'POST' });
  });

  it('surfaces the 409 onboarding error', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false, status: 409, json: async () => ({ error: 'Complete onboarding first' }),
    }) as unknown as typeof fetch;
    render(<VaultTokenPanel />);
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    await waitFor(() => expect(screen.getByText(/complete onboarding/i)).toBeInTheDocument());
  });

  it('revokes the shown token', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'jwt-abc', jti: 'jti-1',
        expiresAt: '2026-07-09T13:00:00.000Z', tier: 'wallet',
        scope: ['memory:read'], limits: { search_per_min: 30, writes_per_day: 8 } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ revoked: true }) }) as unknown as typeof fetch;
    render(<VaultTokenPanel />);
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    await waitFor(() => screen.getByDisplayValue('jwt-abc'));
    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));
    await waitFor(() => expect(screen.getByText(/revoked/i)).toBeInTheDocument());
    expect(global.fetch).toHaveBeenLastCalledWith('/api/vault/token', expect.objectContaining({ method: 'DELETE' }));
  });
});
