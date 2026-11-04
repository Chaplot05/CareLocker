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
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { ConfigAlert } from '@/components/common/ConfigAlert';

export default async function SettingsPage() {
  const isConfigured = isSupabaseServerConfigured();

  let userProfile: any = null;
  let userEmail = 'Not Authenticated';

  if (isConfigured) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userEmail = user.email || '';
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      userProfile = profile;
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Header
        title="Settings & Security"
        subtitle="Manage hospital staff roles, database connectivity, and data protection policies."
        showAddPatient={false}
      />

      {!isConfigured && <ConfigAlert />}

      {/* Staff Account Info */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-lavender-100 p-2 text-lavender-700">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Current Staff Profile</h2>
              <p className="text-xs text-slate-400">Authenticated Supabase user session</p>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
              userProfile?.role === 'admin'
                ? 'bg-peach-100 text-peach-700 border border-peach-200'
                : 'bg-lavender-100 text-lavender-800 border border-lavender-200'
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
                <span>Bulk CSV patient batch import</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-peach-600 shrink-0" />
                <span>View full audit trails across all staff actions</span>
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
                <span>Upload patient documents into private storage</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-lavender-700 shrink-0" />
                <span>Preview and download documents via signed URLs</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <span className="h-3.5 w-3.5 shrink-0 text-center font-bold">✕</span>
                <span>Cannot delete existing documents or patients</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Guide: How to create Admin / Agent Staff */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Provisioning New Staff Accounts</h3>
            <p className="text-xs text-slate-400">Restricted onboarding via Supabase Auth</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          In compliance with healthcare data protection standards, public self-registration is disabled. 
          To add staff members:
        </p>

        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-700 space-y-3 font-mono">
          <div>
            <p className="text-slate-500 font-sans font-semibold mb-1">1. Create user in Supabase Authentication:</p>
            <p className="text-slate-800">Supabase Console → Authentication → Users → Add User</p>
          </div>
          <div>
            <p className="text-slate-500 font-sans font-semibold mb-1">2. Assign Admin or Agent role via SQL:</p>
            <pre className="rounded bg-white p-3 text-[11px] text-slate-900 border border-slate-200 overflow-x-auto select-all">
{`-- For Administrator:
UPDATE public.profiles
SET role = 'admin', full_name = 'Dr. Aditi Mukherjee'
WHERE email = 'aditi@hospital.org';

-- For Desk Agent:
UPDATE public.profiles
SET role = 'agent', full_name = 'Karan Singh'
WHERE email = 'karan@hospital.org';`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
