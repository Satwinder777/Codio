'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Code2, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Authenticate against registered auth service
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If not registered or invalid password, also check Supabase directly before rejecting
        const supabase = getSupabaseBrowserClient();
        let supabaseSuccess = false;
        let supabaseUser: { id: string; name?: string; email: string } | null = null;

        if (supabase) {
          try {
            const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });
            if (!supaErr && supaData.user) {
              supabaseSuccess = true;
              supabaseUser = {
                id: supaData.user.id,
                name: supaData.user.user_metadata?.full_name || cleanEmail.split('@')[0],
                email: supaData.user.email || cleanEmail,
              };
            }
          } catch {
            // ignore network errors
          }
        }

        if (!supabaseSuccess || !supabaseUser) {
          // Strictly reject login! User has NOT signed up or entered wrong password
          const errText = data.error || 'Invalid email or password. Please check your credentials or sign up.';
          setErrorMessage(errText);
          toast.error(errText);
          return;
        }

        // Supabase logged in successfully
        localStorage.setItem('codio_user_id', supabaseUser.id);
        localStorage.setItem('codio_user_name', supabaseUser.name || 'Coder');
        localStorage.setItem('codio_user_email', supabaseUser.email);
        window.dispatchEvent(new Event('codio-auth-change'));
        toast.success('Welcome back to Codio!');
        router.push('/dashboard');
        return;
      }

      // Login API succeeded!
      // Sync with Supabase session if available
      try {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
        }
      } catch {
        // Handled silently
      }

      localStorage.setItem('codio_user_id', data.user.id);
      localStorage.setItem('codio_user_name', data.user.name);
      localStorage.setItem('codio_user_email', data.user.email);
      window.dispatchEvent(new Event('codio-auth-change'));

      toast.success('Welcome back to Codio!');
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0b0f17] transition-colors">
      <div className="bg-white dark:bg-[#111622] max-w-sm w-full p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-5">
        <div className="text-center space-y-1.5">
          <div className="w-9 h-9 mx-auto rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center font-bold shadow-sm">
            <Code2 className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Sign in to Codio</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter your email and password to access your dashboard.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
              <Link href="/forgot-password" className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white transition">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-medium shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-slate-900 dark:text-white font-medium hover:underline transition">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
