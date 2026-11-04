'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FolderLock,
  FileQuestion,
  History,
  Edit,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Loader2,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { DocumentUploader } from '@/components/documents/DocumentUploader';
import { DocumentList } from '@/components/documents/DocumentList';
import { PatientDetail, Document } from '@/types';
import { formatDate, formatDateTime, maskPhoneNumber, maskEmail, getDecisionBadge } from '@/lib/utils';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'queries' | 'audit'>('documents');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'agent'>('agent');

  const fetchPatient = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load patient profile');
      }

      setPatient(data.patient);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchPatient();
    }
  }, [id, fetchPatient]);

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-peach-500" />
        <p className="text-xs text-slate-400">Loading patient locker and query history...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="rounded-2xl border border-peach-200 bg-peach-50 p-8 text-center space-y-4 max-w-xl mx-auto my-12">
        <AlertCircle className="h-10 w-10 text-peach-600 mx-auto" />
        <h3 className="text-base font-semibold text-slate-900">Patient Record Unavailable</h3>
        <p className="text-xs text-slate-600">{error || 'The requested patient profile could not be found.'}</p>
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 rounded-xl bg-peach-500 px-4 py-2 text-xs font-semibold text-white hover:bg-peach-600"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Patients Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Patients</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/patients/${patient.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit Profile</span>
          </Link>
        </div>
      </div>

      {/* Patient Header Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-lavender-500 to-peach-500 text-white shadow-md text-xl font-bold">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900">{patient.name}</h1>
                <span className="font-mono rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {patient.patient_code}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Registered on {formatDate(patient.created_at)}
              </p>
            </div>
          </div>

          {/* Contact Details & Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                Phone Contact
              </span>
              <span className="font-medium text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {patient.phone}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                Email Address
              </span>
              <span className="font-medium text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {patient.email}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                Date of Birth
              </span>
              <span className="font-medium text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {formatDate(patient.date_of_birth)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
              activeTab === 'documents'
                ? 'border-peach-500 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <FolderLock className="h-4 w-4" />
            <span>Document Locker ({patient.documents?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('queries')}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
              activeTab === 'queries'
                ? 'border-peach-500 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <FileQuestion className="h-4 w-4" />
            <span>Insurance Query History ({patient.query_letters?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
              activeTab === 'audit'
                ? 'border-peach-500 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Audit Trail ({patient.audit_logs?.length || 0})</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Document Locker */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <DocumentUploader
            patientId={patient.id}
            patientCode={patient.patient_code}
            onUploadComplete={fetchPatient}
          />

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Locker Files ({patient.documents?.length || 0})
            </h3>
            <DocumentList
              documents={patient.documents || []}
              onDocumentDeleted={fetchPatient}
              userRole={userRole}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Insurance Query History */}
      {activeTab === 'queries' && (
        <div className="space-y-6">
          {(!patient.query_letters || patient.query_letters.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <div className="rounded-full bg-slate-50 p-3 text-slate-400 mb-3 mx-auto w-fit border border-slate-100">
                <FileQuestion className="h-8 w-8" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">No Query Letters Yet</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Insurance query letters received for this patient will be processed in Stage 2.
                The database schema and relation tables (<code className="font-mono text-slate-600">query_letters</code>, <code className="font-mono text-slate-600">query_points</code>, and <code className="font-mono text-slate-600">messages</code>) are already fully structured and ready.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {patient.query_letters.map((letter) => (
                <div
                  key={letter.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-lavender-700" />
                      <span className="font-semibold text-slate-900 text-sm">{letter.file_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">{formatDate(letter.created_at)}</span>
                      <span className="rounded-full bg-lavender-100 px-2 py-0.5 text-[10px] font-bold text-lavender-800 uppercase tracking-wider">
                        {letter.status}
                      </span>
                    </div>
                  </div>

                  {/* Query Points List */}
                  {letter.query_points && letter.query_points.length > 0 ? (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Insurer Document Requirements & AI Match Status
                      </h5>
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs">
                        {letter.query_points.map((pt) => {
                          const badge = getDecisionBadge(pt.decision_status);
                          return (
                            <div key={pt.id} className="p-3 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <p className="font-medium text-slate-800">{pt.requirement_text}</p>
                                <span className="inline-block font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  Required Category: {pt.document_category}
                                </span>
                                {pt.evidence_quote && (
                                  <p className="text-[11px] text-slate-500 italic">
                                    Evidence: &quot;{pt.evidence_quote}&quot;
                                  </p>
                                )}
                              </div>
                              <span
                                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No query points extracted.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Patient Audit Trail</h3>
          {(!patient.audit_logs || patient.audit_logs.length === 0) ? (
            <p className="text-xs text-slate-400">No activity recorded for this patient.</p>
          ) : (
            <div className="space-y-3">
              {patient.audit_logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between rounded-xl bg-slate-50 p-3 text-xs border border-slate-100"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                      {log.action}
                    </span>
                    <pre className="text-[11px] text-slate-500 font-sans mt-0.5">
                      {JSON.stringify(log.details)}
                    </pre>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap ml-4">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
