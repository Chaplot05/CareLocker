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
  }

  const statCards = [
    {
      label: 'Registered Patients',
      value: totalPatients,
      icon: Users,
      textColor: 'text-[#7956B5]',
      bgColor: 'bg-[#F2EEFA]',
      borderColor: 'border-[#E7E3EF]',
      href: '/patients',
    },
    {
      label: 'Patient Documents',
      value: totalDocuments,
      icon: FolderLock,
      textColor: 'text-[#111111]',
      bgColor: 'bg-[#F8F7FB]',
      borderColor: 'border-[#E7E3EF]',
      href: '/patients',
    },
    {
      label: 'Insurer Query Letters',
      value: totalQueries,
      icon: FileQuestion,
      textColor: 'text-[#7956B5]',
      bgColor: 'bg-[#F2EEFA]',
      borderColor: 'border-[#E7E3EF]',
      href: '/patients',
    },
    {
      label: 'Storage Security',
      value: 'Private RLS',
      subtext: 'Encrypted & signed',
      icon: ShieldCheck,
      textColor: 'text-[#111111]',
      bgColor: 'bg-[#F8F7FB]',
      borderColor: 'border-[#E7E3EF]',
      href: '/settings',
    },
  ];

  return (
    <div className="space-y-6">
      <Header
        title="Hospital Operations Overview"
        subtitle="Manage patient document lockers, track incoming TPA query letters, and monitor claim compliance."
      />

      {!isConfigured && <ConfigAlert />}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl border border-[#E7E3EF] bg-white p-5 shadow-2xs hover:border-[#7956B5] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  {card.label}
                </span>
                <div className={`rounded-xl p-2.5 ${card.bgColor} ${card.textColor} border ${card.borderColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black tracking-tight text-[#111111]">
                    {card.value}
                  </span>
                  {card.subtext && (
                    <span className="ml-2 text-xs font-semibold text-[#6B7280]">
                      {card.subtext}
                    </span>
                  )}
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#B7A2DE] group-hover:text-[#7956B5] transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Grid: Recent Uploads & Quick Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Uploads Table (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Document Uploads</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time documents deposited into patient private vaults
              </p>
            </div>
            <Link
              href="/patients"
              className="text-xs font-semibold text-lavender-700 hover:text-lavender-900 transition-colors"
            >
              View All Patients →
            </Link>
          </div>

          {recentDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-slate-50 p-3 text-slate-400 mb-2 border border-slate-100">
                <FileUp className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No documents uploaded yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                Select a patient from the directory to start uploading discharge summaries, bills, and lab reports.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 pr-3">Document</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 pl-3 text-right">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDocuments.map((doc: any) => {
                    const badge = getCategoryBadgeColor(doc.category);
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pr-3 font-medium text-slate-900 truncate max-w-[180px]">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="truncate">{doc.document_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {doc.patients ? (
                            <Link
                              href={`/patients/${doc.patients.id}`}
                              className="font-medium text-lavender-700 hover:underline"
                            >
                              {doc.patients.name}
                              <span className="block font-mono text-[10px] text-slate-400">
                                {doc.patients.patient_code}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {doc.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {formatBytes(doc.file_size)}
                        </td>
                        <td className="py-3 pl-3 text-right text-slate-400">
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

        {/* Quick Patient Registration & Directory (1 col) */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Quick Actions</h2>
            <p className="text-xs text-slate-400 mb-4">Common hospital desk operations</p>

            <div className="space-y-2.5">
              <Link
                href="/patients/new"
                className="flex items-center justify-between rounded-xl border border-[#E7E3EF] bg-[#F2EEFA]/60 p-3 text-xs font-semibold text-[#111111] hover:bg-[#F2EEFA] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-[#111111] p-1.5 text-white">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#111111]">Add New Patient</p>
                    <p className="text-[11px] text-[#6B7280]">Create individual document locker</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#7956B5]" />
              </Link>

              <Link
                href="/patients"
                className="flex items-center justify-between rounded-xl border border-[#E7E3EF] bg-white p-3 text-xs font-semibold text-[#111111] hover:bg-[#F2EEFA]/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-[#7956B5] p-1.5 text-white">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#111111]">Bulk CSV Import</p>
                    <p className="text-[11px] text-[#6B7280]">Import hospital patient batch</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#7956B5]" />
              </Link>
            </div>
          </div>

          {/* Recently Added Patients */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Recently Registered</h3>
            {recentPatients.length === 0 ? (
              <p className="text-xs text-slate-400">No patients registered yet.</p>
            ) : (
              <div className="space-y-3">
                {recentPatients.map((p: any) => (
                  <Link
                    key={p.id}
                    href={`/patients/${p.id}`}
                    className="flex items-center justify-between rounded-xl p-2 hover:bg-slate-50 transition-colors group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-lavender-800">
                        {p.name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">{p.patient_code}</p>
                    </div>
                    <span className="text-[11px] text-slate-400">{formatDate(p.created_at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

