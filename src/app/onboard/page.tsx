"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function OnboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid = USERNAME_REGEX.test(username);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to set username');
        setSubmitting(false);
        return;
      }
      router.push('/subscribe');
    } catch {
      setError('Network error');
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center w-full max-w-sm px-6">
        <h1 className="text-2xl font-heading text-text-primary mb-2">
          Choose Your Identity
        </h1>
        <p className="text-sm text-text-muted mb-8 text-center">
          This is your public name on the Agentic Chain network.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="username"
              maxLength={20}
              className="w-full px-4 py-3 rounded-lg bg-background-light border border-card-border
                text-text-primary text-sm font-mono placeholder:text-text-muted/40
                focus:outline-none focus:border-accent-cyan/50 transition-colors"
              autoFocus
            />
            <div className="flex justify-between mt-1.5 px-1">
              <span className={`text-[11px] ${isValid ? 'text-green-400' : 'text-text-muted/40'}`}>
                {username.length > 0
                  ? isValid ? 'Available format' : '3-20 chars, letters/numbers/underscore'
                  : '3-20 characters'}
              </span>
              <span className="text-[11px] text-text-muted/40 font-mono">
                {username.length}/20
              </span>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-400 text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full py-3 rounded-lg text-sm font-semibold transition-all
              bg-accent-cyan text-background hover:bg-accent-cyan/80
              disabled:bg-card-border/30 disabled:text-text-muted disabled:cursor-not-allowed"
          >
            {submitting ? 'Setting...' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  );
}
