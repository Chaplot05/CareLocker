'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderLock,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Info,
  Terminal,
  Key,
} from 'lucide-react';
import { ConfigAlert } from '@/components/common/ConfigAlert';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdminGuide, setShowAdminGuide] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gradient-to-br from-[#fcfbfe] via-[#f7f5fd] to-[#fbf7f6] px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-lavender-600 to-peach-500 text-white shadow-lg shadow-lavender-500/25">
            <FolderLock className="h-7 w-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          CareLocker Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Patient Document Management & Insurance Query Automation
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-slate-800">Staff Authentication</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your authorized staff credentials (Admin or Agent) to continue.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-peach-200 bg-peach-50 p-3.5 text-xs text-peach-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-peach-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="admin@carelocker.health"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-sm text-slate-800 focus:border-lavender-500 focus:outline-none focus:ring-2 focus:ring-lavender-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-sm text-slate-800 focus:border-lavender-500 focus:outline-none focus:ring-2 focus:ring-lavender-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-peach-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-peach-600 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to CareLocker</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle First Admin Instructions */}
          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <button
              type="button"
              onClick={() => setShowAdminGuide(!showAdminGuide)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-lavender-700 hover:text-lavender-900 transition-colors"
            >
              <Key className="h-3.5 w-3.5" />
              <span>{showAdminGuide ? 'Hide Admin Account Guide' : 'How to create the first Admin account?'}</span>
            </button>
          </div>
        </div>

        {/* First Admin Account Instructions Callout */}
        {showAdminGuide && (
          <div className="rounded-2xl border border-lavender-200 bg-lavender-50/80 p-5 text-xs text-slate-700 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-semibold text-lavender-950">
              <ShieldAlert className="h-4 w-4 text-lavender-700" />
              <span>Step-by-Step: Creating the First Admin Account</span>
            </div>
            <p className="text-slate-600">
              To guarantee zero unauthorized public registrations, staff accounts are managed via Supabase Auth:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-700">
              <li>
                Open your project at{' '}
                <strong className="text-slate-900">Supabase Dashboard → Authentication → Users</strong>.
              </li>
              <li>
                Click <strong className="text-slate-900">&quot;Add user&quot;</strong> → <strong className="text-slate-900">&quot;Create user&quot;</strong>.
              </li>
              <li>
                Enter email (e.g. <code className="font-mono bg-white px-1 py-0.5 rounded border border-lavender-200">admin@carelocker.health</code>) and a secure password.
              </li>
              <li>
                In the <strong className="text-slate-900">SQL Editor</strong>, assign the admin role:
                <pre className="mt-1 rounded-lg bg-white p-2.5 font-mono text-[11px] text-slate-800 border border-lavender-200 overflow-x-auto select-all">
{`UPDATE public.profiles
SET role = 'admin', full_name = 'Hospital Administrator'
WHERE email = 'admin@carelocker.health';`}
                </pre>
              </li>
              <li>Sign in using those credentials above!</li>
            </ol>
          </div>
        )}

        <ConfigAlert />
      </div>
    </div>
  );
}

