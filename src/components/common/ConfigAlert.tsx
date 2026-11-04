'use client';

import React from 'react';
import { AlertTriangle, Terminal, Sparkles } from 'lucide-react';

interface ConfigAlertProps {
  className?: string;
}

export function ConfigAlert({ className = '' }: ConfigAlertProps) {
  return (
    <div className={`rounded-xl border border-[#E7E3EF] bg-[#F2EEFA]/70 p-5 text-[#111111] shadow-2xs ${className}`}>
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-[#7956B5]/10 p-2.5 text-[#7956B5]">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#111111]">Environment & Storage Setup</h3>
            <span className="rounded-full bg-[#111111] px-2.5 py-0.5 text-xs font-bold text-white">
              Configuration Active
            </span>
          </div>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            CareLocker runs on real persistent PostgreSQL tables, private Supabase Storage, and the Google Gemini Multimodal AI Engine.
            To verify setup, ensure credentials exist in <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-[#7956B5] border border-[#E7E3EF]">.env.local</code>.
          </p>

          <div className="mt-3 rounded-lg bg-white p-3 border border-[#E7E3EF] font-mono text-xs text-[#111111] space-y-1">
            <p className="text-[#6B7280] font-sans text-[11px] uppercase tracking-wider font-bold">Required in .env.local:</p>
            <p className="select-all text-[#111111]">NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co</p>
            <p className="select-all text-[#111111]">NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...</p>
            <p className="select-all text-[#111111]">SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...</p>
            <p className="select-all text-[#7956B5] font-bold">GEMINI_API_KEY=AIzaSy...</p>
            <p className="select-all text-[#6B7280]">GEMINI_MODEL=gemini-3.5-flash-lite</p>
          </div>

          <div className="mt-2 text-xs text-[#6B7280] flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#7956B5] shrink-0" />
              <span>Core Schema Migration:</span>
              <code className="font-mono font-bold text-[#111111]">supabase/migrations/20261104000001_initial_schema.sql</code>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#7956B5] shrink-0" />
              <span>AI Query Matching Migration:</span>
              <code className="font-mono font-bold text-[#7956B5]">supabase/migrations/20261104000002_stage2_query_matching.sql</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
