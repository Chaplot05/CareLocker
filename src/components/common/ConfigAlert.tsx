'use client';

import React from 'react';
import { AlertTriangle, Key, Terminal, ExternalLink, Sparkles } from 'lucide-react';

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
            <h3 className="font-semibold text-slate-900">Environment & AI Setup Guide</h3>
            <span className="rounded-full bg-peach-100 px-2.5 py-0.5 text-xs font-medium text-peach-700">
              Setup Required
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            CareLocker runs on real persistent PostgreSQL tables, private Supabase Storage, and the Google Gemini Multimodal AI Engine. 
            To activate all capabilities, create your <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-peach-700 border border-peach-200">.env.local</code> file.
          </p>

          <div className="mt-3 rounded-lg bg-white p-3 border border-slate-200 font-mono text-xs text-slate-700 space-y-1">
            <p className="text-slate-400 font-sans text-[11px] uppercase tracking-wider font-semibold">Required in .env.local:</p>
            <p className="select-all text-slate-800">NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co</p>
            <p className="select-all text-slate-800">NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...</p>
            <p className="select-all text-slate-800">SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...</p>
            <p className="select-all text-lavender-800 font-semibold">GEMINI_API_KEY=AIzaSy...</p>
            <p className="select-all text-slate-700">GEMINI_MODEL=gemini-2.5-flash</p>
          </div>

          <div className="mt-2 text-xs text-slate-600 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Stage 1 DB Migration:</span>
              <code className="font-mono font-semibold text-slate-700">supabase/migrations/20261104000001_initial_schema.sql</code>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-lavender-600 shrink-0" />
              <span>Stage 2 AI Matching Migration:</span>
              <code className="font-mono font-semibold text-lavender-900">supabase/migrations/20261104000002_stage2_query_matching.sql</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
