"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function OnboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isValid = USERNAME_REGEX.test(username);

  // Debounced real-time uniqueness check
  useEffect(() => {
    setAvailable(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isValid) return;

    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        setAvailable(data.available);
        if (!data.available) {
          triggerShake('Username already taken');
        } else {
          setError('');
        }
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, isValid]);

  const triggerShake = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || available === false) return;
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
        triggerShake(data.error || 'Failed to set username');
        setSubmitting(false);
        return;
      }
      router.push('/subscribe');
    } catch {
      triggerShake('Network error');
      setSubmitting(false);
    }
  };

  // Status message and color
  const statusText = error
    ? error
    : !username.length
      ? '3-20 characters'
      : !isValid
        ? '3-20 chars, letters/numbers/underscore'
        : checking
          ? 'Checking...'
          : available === true
            ? 'Available'
            : available === false
              ? 'Username already taken'
              : 'Checking...';

  const statusColor = error || available === false
    ? 'text-red-400'
    : available === true
      ? 'text-green-400/70'
      : 'text-text-muted/30';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .shake { animation: shake 0.5s ease-in-out; }
      `}</style>
      <div className="flex flex-col items-center w-full max-w-sm px-6">
        <h1
          className="text-[22px] font-semibold text-text-primary mb-2"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Choose Your Identity
        </h1>
        <p className="text-[13px] text-text-muted mb-8 text-center">
          This is your public name on the Agentic Chain network.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className={shake ? 'shake' : ''}>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="your_username"
              maxLength={20}
              className={`w-full px-4 py-3 rounded-lg bg-white/[0.03] border text-[14px] text-text-primary
                placeholder:text-text-muted/30 focus:outline-none transition-all duration-200
                ${error || available === false
                  ? 'border-red-400/60 focus:border-red-400/80 bg-red-400/[0.03]'
                  : available === true
                    ? 'border-green-400/40 focus:border-green-400/60'
                    : 'border-white/[0.08] focus:border-white/[0.2]'
                }`}
              style={{ fontFamily: "'Fira Code', monospace" }}
              autoFocus
            />
            <div className="flex justify-between mt-1.5 px-1">
              <span className={`text-[11px] transition-colors ${statusColor}`}>
                {statusText}
              </span>
              <span className="text-[11px] text-text-muted/30 font-mono">
                {username.length}/20
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid || available !== true || submitting}
            className="w-full py-3 rounded-lg text-[14px] font-medium transition-all duration-150
              bg-white text-gray-800 hover:bg-gray-50
              disabled:opacity-20 disabled:cursor-not-allowed"
          >
            {submitting ? 'Setting...' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  );
}
