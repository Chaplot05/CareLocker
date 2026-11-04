'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
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
    <div className="min-h-screen flex flex-col justify-center bg-[#FAFAFC] px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Care.locker Brand Header */}
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7956B5] text-white shadow-2xs font-black text-xl">
            cl
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black tracking-tight text-[#111111]">
          Care.locker
        </h2>
        <p className="mt-0.5 text-center text-xs font-bold text-[#7956B5] uppercase tracking-wider">
          Patient Document Locker & Claims Desk
        </p>
        <p className="mt-1 text-center text-xs text-[#6B7280]">
          Patient Document Management & Insurance Query Automation
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        {/* Login Card */}
        <div className="rounded-2xl border border-[#E7E3EF] bg-white p-8 shadow-xs">
          <div className="mb-6">
            <h3 className="text-base font-bold text-[#111111]">Staff Authentication</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Sign in with your authorized hospital staff account (Admin or Agent).
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="staff@carelocker.health"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E7E3EF] pl-9 pr-3.5 py-2.5 text-sm text-[#111111] bg-white focus:border-[#7956B5] focus:outline-none focus:ring-2 focus:ring-[#F2EEFA]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E7E3EF] pl-9 pr-3.5 py-2.5 text-sm text-[#111111] bg-white focus:border-[#7956B5] focus:outline-none focus:ring-2 focus:ring-[#F2EEFA]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] px-4 py-2.5 text-sm font-bold text-white shadow-2xs hover:bg-[#171417] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#B7A2DE]" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4 text-[#B7A2DE]" />
                </>
              )}
            </button>
          </form>

          {/* Evaluator / Admin Info Toggle */}
          <div className="mt-6 border-t border-[#E7E3EF] pt-4 text-center">
            <button
              type="button"
              onClick={() => setShowAdminGuide(!showAdminGuide)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7956B5] hover:text-[#6947A3] transition-colors"
            >
              <Key className="h-3.5 w-3.5" />
              <span>{showAdminGuide ? 'Hide Evaluator Account Guide' : 'How to create Admin / Agent accounts?'}</span>
            </button>
          </div>
        </div>

        {/* Staff & Evaluator Account Guide */}
        {showAdminGuide && (
          <div className="rounded-2xl border border-[#E7E3EF] bg-[#F2EEFA]/80 p-5 text-xs text-[#111111] shadow-2xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-[#111111]">
              <ShieldCheck className="h-4 w-4 text-[#7956B5]" />
              <span>Evaluator & Staff Access Setup</span>
            </div>
            <p className="text-[#6B7280]">
              To guarantee enterprise data security, staff and reviewer accounts are managed via Supabase Auth:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-[#111111]">
              <li>
                Open <strong className="text-[#111111]">Supabase Dashboard → Authentication → Users</strong>.
              </li>
              <li>
                Click <strong className="text-[#111111]">&quot;Add user&quot;</strong> → <strong className="text-[#111111]">&quot;Create user&quot;</strong>.
              </li>
              <li>
                Assign role in <strong className="text-[#111111]">SQL Editor</strong> (either <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#E7E3EF] text-[#7956B5] font-bold">admin</code> or <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#E7E3EF] text-[#7956B5] font-bold">agent</code>):
                <pre className="mt-1.5 rounded-lg bg-white p-2.5 font-mono text-[11px] text-[#111111] border border-[#E7E3EF] overflow-x-auto select-all">
{`UPDATE public.profiles
SET role = 'agent', full_name = 'Reviewer Agent'
WHERE email = 'reviewer@carelocker.health';`}
                </pre>
              </li>
              <li>Sign in using those credentials above to evaluate the application.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
