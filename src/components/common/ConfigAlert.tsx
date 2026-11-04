'use client';

import React from 'react';
import { AlertTriangle, Key, Terminal, ExternalLink } from 'lucide-react';

interface ConfigAlertProps {
  className?: string;
}

export function ConfigAlert({ className = '' }: ConfigAlertProps) {
  return (
    <div className={`rounded-xl border border-peach-200 bg-peach-50/70 p-5 text-slate-800 shadow-sm ${className}`}>
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-peach-500/10 p-2.5 text-peach-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Supabase Connection Required</h3>
            <span className="rounded-full bg-peach-100 px-2.5 py-0.5 text-xs font-medium text-peach-700">
              Setup Required
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            CareLocker is configured to use real persistent PostgreSQL tables and private Supabase storage. 
            To connect your database, create a free project at{' '}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-peach-600 underline hover:text-peach-700"
            >
              supabase.com <ExternalLink className="h-3 w-3" />
            </a>{' '}
            and add your credentials to <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-peach-700 border border-peach-200">.env.local</code>.
          </p>

          <div className="mt-3 rounded-lg bg-white p-3 border border-slate-200 font-mono text-xs text-slate-700 space-y-1">
            <p className="text-slate-400 font-sans text-[11px] uppercase tracking-wider font-semibold">Required in .env.local:</p>
            <p className="select-all text-slate-800">NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co</p>
            <p className="select-all text-slate-800">NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...</p>
            <p className="select-all text-slate-800">SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...</p>
          </div>

          <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-slate-400" />
            <span>Apply the database schema via SQL Editor using:</span>
            <code className="font-mono font-semibold text-slate-700">supabase/migrations/20261104000001_initial_schema.sql</code>
          </div>
        </div>
      </div>
    </div>
  );
}
