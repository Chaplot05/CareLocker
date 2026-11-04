import React from 'react';
import {
  Shield,
  Key,
  Database,
  Lock,
  UserCheck,
  CheckCircle2,
  Server,
  Terminal,
  ExternalLink,
  Sparkles,
  Bot,
  Cpu,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { ConfigAlert } from '@/components/common/ConfigAlert';
import { isGeminiConfigured, getGeminiModel } from '@/lib/gemini/client';

export default async function SettingsPage() {
  const isConfigured = isSupabaseServerConfigured();
  const hasGemini = isGeminiConfigured();
  const geminiModel = getGeminiModel();

  let userProfile: any = null;
  let userEmail = 'Not Authenticated';

  if (isConfigured) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userEmail = user.email || '';
      const { data: profile } = (await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()) as { data: any };
      userProfile = profile;
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Header
        title="Settings & AI System Configuration"
        subtitle="Manage hospital staff roles, database connectivity, and the Google Gemini AI processing engine."
        showAddPatient={false}
      />

      {(!isConfigured || !hasGemini) && <ConfigAlert />}

      {/* Stage 2 Gemini AI Engine Status */}
      <div className="rounded-2xl border border-lavender-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-lavender-100 p-2.5 text-lavender-700">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Google Gemini AI Engine (Stage 2)</h2>
              <p className="text-xs text-slate-400">Multimodal document understanding, query extraction & matching</p>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
              hasGemini
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {hasGemini ? 'Active & Ready' : 'Key Missing'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-slate-400 uppercase font-semibold text-[10px] block">Model in Use</span>
            <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-lavender-600" />
              {geminiModel}
            </span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-slate-400 uppercase font-semibold text-[10px] block">Multimodal Engine</span>
            <span className="font-medium text-slate-800 text-xs mt-0.5 block">
              PDF, JPEG, JPG, PNG
            </span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-slate-400 uppercase font-semibold text-[10px] block">Pipeline Modules</span>
            <span className="font-medium text-slate-800 text-xs mt-0.5 block">
              Extract • Match • Draft
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-[#F2EEFA]/60 p-4 border border-[#E7E3EF] text-xs text-[#111111] space-y-1.5">
          <span className="font-bold text-[#111111] block">AI Processing Guarantees:</span>
          <p className="text-[#6B7280]">
            • <strong>Never marks available by category alone</strong>: Compares actual clinical text, invoice breakups, and dates.
          </p>
          <p className="text-[#6B7280]">
            • <strong>Multi-document Support</strong>: Identifies when requirements are satisfied across multiple separate files.
          </p>
          <p className="text-[#6B7280]">
            • <strong>Zero Hallucinations</strong>: If facts are ambiguous or contradictory, marks <code className="bg-white px-1 py-0.5 rounded font-mono text-amber-800 border border-amber-200">needs_review</code>.
          </p>
          <p className="text-[#6B7280]">
            • <strong>Patient Messages</strong>: Requests <strong className="text-[#7956B5]">ONLY genuinely missing items</strong>, omitting already available documents.
          </p>
        </div>
      </div>

      {/* Staff Account Info */}
      <div className="rounded-2xl border border-[#E7E3EF] bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7E3EF] pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#F2EEFA] p-2 text-[#7956B5]">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Current Staff Profile</h2>
              <p className="text-xs text-[#6B7280]">Authenticated Supabase user session</p>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
              userProfile?.role === 'admin'
                ? 'bg-[#111111] text-white'
                : 'bg-[#7956B5] text-white'
            }`}
          >
            {userProfile?.role || 'Agent'} Role
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 uppercase tracking-wider font-semibold block text-[11px]">
              Full Name
            </span>
            <span className="font-medium text-slate-800 text-sm mt-0.5 block">
              {userProfile?.full_name || 'Staff Member'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase tracking-wider font-semibold block text-[11px]">
              Email Address
            </span>
            <span className="font-medium text-slate-800 text-sm mt-0.5 block">
              {userEmail}
            </span>
          </div>
        </div>
      </div>

      {/* Role-Based Access Control Architecture */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="rounded-xl bg-peach-100 p-2 text-peach-600">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Role-Based Access Control (RBAC)</h3>
            <p className="text-xs text-slate-400">Security enforcement across tables and storage</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-peach-200 bg-peach-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-peach-900">Administrator (Admin)</span>
              <span className="rounded bg-peach-200 px-2 py-0.5 text-[10px] font-bold text-peach-800">
                Full Privileges
              </span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-peach-600 shrink-0" />
                <span>Register, update, and delete patient records</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-peach-600 shrink-0" />
                <span>Upload and permanently delete documents</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-peach-600 shrink-0" />
                <span>Trigger and reprocess AI query letter evaluations</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-peach-600 shrink-0" />
                <span>Delete query letters and review audit trails</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-lavender-200 bg-lavender-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-lavender-900">Desk Agent (Agent)</span>
              <span className="rounded bg-lavender-200 px-2 py-0.5 text-[10px] font-bold text-lavender-800">
                Operational Staff
              </span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-lavender-700 shrink-0" />
                <span>Register and edit patient contact information</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-lavender-700 shrink-0" />
                <span>Upload documents & trigger automated AI summaries</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-lavender-700 shrink-0" />
                <span>Upload query letters & view AI matching results</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <span className="h-3.5 w-3.5 shrink-0 text-center font-bold">✕</span>
                <span>Cannot delete existing documents or query letters</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
