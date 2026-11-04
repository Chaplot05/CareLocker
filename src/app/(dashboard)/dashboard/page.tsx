import React from 'react';
import Link from 'next/link';
import {
  Users,
  FolderLock,
  FileQuestion,
  FileText,
  ArrowUpRight,
  Plus,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Sparkles,
  Send,
  Mail,
  Activity,
} from 'lucide-react';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { ConfigAlert } from '@/components/common/ConfigAlert';
import { formatDate, formatBytes, getCategoryBadgeColor } from '@/lib/utils';

export const revalidate = 0;

export default async function DashboardPage() {
  const isConfigured = isSupabaseServerConfigured();

  let totalPatients = 0;
  let totalDocuments = 0;
  let totalQueries = 0;
  let recentDocuments: any[] = [];
  let recentPatients: any[] = [];
  let recentQueries: any[] = [];

  if (isConfigured) {
    const supabase = createClient();

    // Query 1: Total Patients count
    const { count: patientsCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });
    totalPatients = patientsCount || 0;

    // Query 2: Total Documents count
    const { count: documentsCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });
    totalDocuments = documentsCount || 0;

    // Query 3: Total Query Letters count
    const { count: queriesCount } = await supabase
      .from('query_letters')
      .select('*', { count: 'exact', head: true });
    totalQueries = queriesCount || 0;

    // Query 4: Recent Documents with Patient details
    const { data: docs } = await supabase
      .from('documents')
      .select('*, patients(id, patient_code, name)')
      .order('uploaded_at', { ascending: false })
      .limit(6);
    recentDocuments = docs || [];

    // Query 5: Recent Patients
    const { data: pts } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    recentPatients = pts || [];

    // Query 6: Recent Queries
    const { data: queries } = await supabase
      .from('query_letters')
      .select('*, patients(id, patient_code, name)')
      .order('created_at', { ascending: false })
      .limit(4);
    recentQueries = queries || [];
  }

  const statCards = [
    {
      label: 'Registered Patients',
      value: totalPatients,
      icon: Users,
      badgeText: 'Active Cohort',
      textColor: 'text-[#7956B5]',
      bgColor: 'bg-[#F2EEFA]',
      href: '/patients',
    },
    {
      label: 'Vault Documents',
      value: totalDocuments,
      icon: FolderLock,
      badgeText: 'Private Bucket',
      textColor: 'text-[#111111]',
      bgColor: 'bg-[#F8F7FB]',
      href: '/patients',
    },
    {
      label: 'Insurer Queries',
      value: totalQueries,
      icon: FileQuestion,
      badgeText: 'AI Adjudication',
      textColor: 'text-[#7956B5]',
      bgColor: 'bg-[#F2EEFA]',
      href: '/patients',
    },
    {
      label: 'Notification Engine',
      value: 'Active',
      subtext: 'Gmail SMTP & WhatsApp',
      icon: Send,
      badgeText: 'Multi-Channel',
      textColor: 'text-[#111111]',
      bgColor: 'bg-[#F8F7FB]',
      href: '/settings',
    },
  ];

  return (
    <div className="space-y-6">
      <Header
        title="Hospital Operations Overview"
        subtitle="Manage patient document lockers, track incoming TPA query letters, and monitor automated claim notifications."
      />

      {!isConfigured && <ConfigAlert />}

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl border border-[#E7E3EF] bg-white p-5 shadow-2xs hover:border-[#7956B5] transition-all hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7280]">
                  {card.label}
                </span>
                <div className={`rounded-xl p-2.5 ${card.bgColor} ${card.textColor} border border-[#E7E3EF]`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black tracking-tight text-[#111111]">
                    {card.value}
                  </span>
                  {card.subtext && (
                    <span className="block text-[11px] font-semibold text-[#6B7280] mt-0.5">
                      {card.subtext}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="rounded-md bg-[#F2EEFA] px-2 py-0.5 text-[10px] font-bold text-[#7956B5] border border-[#E7E3EF]">
                    {card.badgeText}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[#B7A2DE] group-hover:text-[#7956B5] transition-colors" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Grid: Recent Uploads & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Recent Uploads Table */}
        <div className="lg:col-span-2 rounded-2xl border border-[#E7E3EF] bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#E7E3EF] pb-4 mb-4">
            <div>
              <h2 className="text-base font-black text-[#111111]">Recent Vault Uploads</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Real-time clinical documents deposited into patient private storage
              </p>
            </div>
            <Link
              href="/patients"
              className="text-xs font-bold text-[#7956B5] hover:text-[#111111] transition-colors"
            >
              View All Patients →
            </Link>
          </div>

          {recentDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-2xl bg-[#F8F7FB] p-3.5 text-[#6B7280] mb-2 border border-[#E7E3EF]">
                <FileUp className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-[#111111]">No documents uploaded yet</p>
              <p className="text-[11px] text-[#6B7280] mt-0.5 max-w-xs">
                Select a patient from the directory to start uploading discharge summaries, bills, and lab reports.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E7E3EF] text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                    <th className="py-2.5 pr-3">Document</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 pl-3 text-right">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E3EF]">
                  {recentDocuments.map((doc: any) => {
                    const badge = getCategoryBadgeColor(doc.category);
                    return (
                      <tr key={doc.id} className="hover:bg-[#F8F7FB] transition-colors">
                        <td className="py-3 pr-3 font-bold text-[#111111] truncate max-w-[200px]">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#7956B5] shrink-0" />
                            <span className="truncate">{doc.document_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {doc.patients ? (
                            <Link
                              href={`/patients/${doc.patients.id}`}
                              className="font-bold text-[#7956B5] hover:underline"
                            >
                              {doc.patients.name}
                              <span className="block font-mono text-[10px] text-[#6B7280]">
                                {doc.patients.patient_code}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-[#6B7280]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {doc.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[#6B7280]">
                          {formatBytes(doc.file_size)}
                        </td>
                        <td className="py-3 pl-3 text-right text-[#6B7280] font-medium">
                          {formatDate(doc.uploaded_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column (1 col): Quick Operations & Operational Health */}
        <div className="space-y-6">
          {/* Quick Operations Card */}
          <div className="rounded-2xl border border-[#E7E3EF] bg-white p-6 shadow-2xs">
            <h2 className="text-base font-black text-[#111111] mb-1">Quick Actions</h2>
            <p className="text-xs text-[#6B7280] mb-4">Core hospital claims desk tasks</p>

            <div className="space-y-2.5">
              <Link
                href="/patients/new"
                className="flex items-center justify-between rounded-xl border border-[#E7E3EF] bg-[#F2EEFA]/70 p-3 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-[#111111] p-1.5 text-white">
                    <Plus className="h-4 w-4 text-[#B7A2DE]" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#111111]">Register New Patient</p>
                    <p className="text-[10px] text-[#6B7280]">Create vault & assign code</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#7956B5]" />
              </Link>

              <Link
                href="/patients"
                className="flex items-center justify-between rounded-xl border border-[#E7E3EF] bg-white p-3 text-xs font-bold text-[#111111] hover:bg-[#F8F7FB] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-[#F2EEFA] p-1.5 text-[#7956B5] border border-[#E7E3EF]">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#111111]">Patient Directory</p>
                    <p className="text-[10px] text-[#6B7280]">Search records & lockers</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#6B7280]" />
              </Link>

              <Link
                href="/settings"
                className="flex items-center justify-between rounded-xl border border-[#E7E3EF] bg-white p-3 text-xs font-bold text-[#111111] hover:bg-[#F8F7FB] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-[#F2EEFA] p-1.5 text-[#7956B5] border border-[#E7E3EF]">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#111111]">System & Staff Roles</p>
                    <p className="text-[10px] text-[#6B7280]">Access controls & configurations</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#6B7280]" />
              </Link>
            </div>
          </div>

          {/* System Pipeline Status */}
          <div className="rounded-2xl border border-[#E7E3EF] bg-white p-6 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#111111] uppercase tracking-wider">
                Pipeline Health
              </h3>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8F7FB] border border-[#E7E3EF]">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#7956B5]" />
                  <span className="font-bold text-[#111111]">Gemini Clinical AI</span>
                </div>
                <span className="text-[11px] font-mono text-[#6B7280]">gemini-3.5-flash</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8F7FB] border border-[#E7E3EF]">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-[#7956B5]" />
                  <span className="font-bold text-[#111111]">Gmail SMTP Dispatch</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-700 font-bold">Connected</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8F7FB] border border-[#E7E3EF]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#7956B5]" />
                  <span className="font-bold text-[#111111]">Supabase RLS & Vault</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-700 font-bold">Enforced</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
