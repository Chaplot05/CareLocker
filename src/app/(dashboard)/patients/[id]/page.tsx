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
  Plus,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DocumentUploader } from '@/components/documents/DocumentUploader';
import { DocumentList } from '@/components/documents/DocumentList';
import { QueryLetterUploader } from '@/components/queries/QueryLetterUploader';
import { QueryLetterDetail } from '@/components/queries/QueryLetterDetail';
import { PatientDetail } from '@/types';
import { formatDate, formatDateTime, maskPhoneNumber, maskEmail } from '@/lib/utils';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'queries' | 'audit'>('documents');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'agent'>('agent');
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [revealContact, setRevealContact] = useState(false);

  const fetchPatient = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
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
      if (!isSilent) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchPatient();
    }
  }, [id, fetchPatient]);

  // Live polling: if any query letter is extracting or matching, refresh silently every 3s
  useEffect(() => {
    const hasActiveProcessing = patient?.query_letters?.some(
      (l) => l.status === 'extracting' || l.status === 'matching'
    );

    if (!hasActiveProcessing) return;

    const interval = setInterval(() => {
      fetchPatient(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [patient?.query_letters, fetchPatient]);

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#7956B5]" />
        <p className="text-xs font-semibold text-[#6B7280]">Loading patient locker and query history...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center space-y-4 max-w-xl mx-auto my-12">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h3 className="text-base font-bold text-[#111111]">Patient Record Unavailable</h3>
        <p className="text-xs text-red-700">{error || 'The requested patient profile could not be found.'}</p>
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-2 text-xs font-bold text-white hover:bg-[#171417] transition-all"
        >
          <ArrowLeft className="h-4 w-4 text-[#B7A2DE]" />
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
          className="inline-flex items-center gap-2 text-xs font-bold text-[#6B7280] hover:text-[#111111] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Patients Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRevealContact(!revealContact)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E3EF] bg-white px-3.5 py-2 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA] shadow-2xs transition-colors"
          >
            {revealContact ? <EyeOff className="h-3.5 w-3.5 text-[#7956B5]" /> : <Eye className="h-3.5 w-3.5 text-[#7956B5]" />}
            <span>{revealContact ? 'Mask Contact' : 'Reveal Contact'}</span>
          </button>

          <Link
            href={`/patients/${patient.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E3EF] bg-white px-3.5 py-2 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA] shadow-2xs transition-colors"
          >
            <Edit className="h-3.5 w-3.5 text-[#7956B5]" />
            <span>Edit Profile</span>
          </Link>
        </div>
      </div>

      {/* Patient Header Card */}
      <div className="rounded-2xl border border-[#E7E3EF] bg-white p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#111111] text-[#B7A2DE] text-xl font-black border border-[#E7E3EF]">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-black text-[#111111]">{patient.name}</h1>
                <span className="font-mono rounded-lg bg-[#F2EEFA] border border-[#E7E3EF] px-2.5 py-0.5 text-xs font-bold text-[#7956B5]">
                  {patient.patient_code}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-1 font-medium">
                Registered on {formatDate(patient.created_at)}
              </p>
            </div>
          </div>

          {/* Contact Details & Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs border-t md:border-t-0 md:border-l border-[#E7E3EF] pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="text-[11px] font-bold text-[#6B7280] block uppercase tracking-wider">
                Phone Contact
              </span>
              <span className="font-bold text-[#111111] flex items-center gap-1.5 mt-1 font-mono">
                <Phone className="h-3.5 w-3.5 text-[#7956B5]" />
                {revealContact ? patient.phone : maskPhoneNumber(patient.phone)}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#6B7280] block uppercase tracking-wider">
                Email Address
              </span>
              <span className="font-bold text-[#111111] flex items-center gap-1.5 mt-1">
                <Mail className="h-3.5 w-3.5 text-[#7956B5]" />
                {revealContact ? patient.email : maskEmail(patient.email)}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#6B7280] block uppercase tracking-wider">
                Date of Birth
              </span>
              <span className="font-bold text-[#111111] flex items-center gap-1.5 mt-1">
                <Calendar className="h-3.5 w-3.5 text-[#7956B5]" />
                {formatDate(patient.date_of_birth)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E7E3EF]">
        <nav className="flex space-x-6 text-sm font-bold">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
              activeTab === 'documents'
                ? 'border-[#7956B5] text-[#111111] font-black'
                : 'border-transparent text-[#6B7280] hover:text-[#111111]'
            }`}
          >
            <FolderLock className={`h-4 w-4 ${activeTab === 'documents' ? 'text-[#7956B5]' : 'text-[#6B7280]'}`} />
            <span>Document Locker ({patient.documents?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('queries')}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
              activeTab === 'queries'
                ? 'border-[#7956B5] text-[#111111] font-black'
                : 'border-transparent text-[#6B7280] hover:text-[#111111]'
            }`}
          >
            <FileQuestion className={`h-4 w-4 ${activeTab === 'queries' ? 'text-[#7956B5]' : 'text-[#6B7280]'}`} />
            <span>Insurance Queries & Outreach ({patient.query_letters?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${
              activeTab === 'audit'
                ? 'border-[#7956B5] text-[#111111] font-black'
                : 'border-transparent text-[#6B7280] hover:text-[#111111]'
            }`}
          >
            <History className={`h-4 w-4 ${activeTab === 'audit' ? 'text-[#7956B5]' : 'text-[#6B7280]'}`} />
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
            onUploadComplete={() => fetchPatient(true)}
          />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-[#111111]">
                Vault Documents ({patient.documents?.length || 0})
              </h3>
              <span className="text-xs font-semibold text-[#6B7280]">
                Private encrypted storage with signed URL access
              </span>
            </div>
            <DocumentList
              documents={patient.documents || []}
              onDocumentDeleted={() => fetchPatient(true)}
              userRole={userRole}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Insurance Query History & Automated Notifications */}
      {activeTab === 'queries' && (
        <div className="space-y-6">
          {/* Query Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E7E3EF] shadow-2xs">
            <div>
              <h3 className="font-black text-[#111111] text-sm">
                Insurance Query Letters & Automated Outreach
              </h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Upload insurer query letters for automatic requirement extraction, forensic document matching, and instant email dispatch.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsQueryModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#171417] shadow-2xs transition-all shrink-0 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 text-[#B7A2DE]" />
              <span>Upload Query Letter</span>
            </button>
          </div>

          {(!patient.query_letters || patient.query_letters.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-[#E7E3EF] bg-white p-12 text-center">
              <div className="rounded-2xl bg-[#F2EEFA] p-3.5 text-[#7956B5] mb-3 mx-auto w-fit border border-[#E7E3EF]">
                <FileQuestion className="h-8 w-8" />
              </div>
              <h4 className="text-sm font-black text-[#111111]">No Query Letters Uploaded</h4>
              <p className="text-xs text-[#6B7280] max-w-md mx-auto mt-1 mb-5">
                Whenever Star Health, Medi Assist, Care, or TPAs raise claim queries, upload the PDF or scan here.
                Gemini will extract every requirement, match against vault documents, and automatically notify the patient.
              </p>
              <button
                type="button"
                onClick={() => setIsQueryModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#171417] shadow-2xs"
              >
                <Plus className="h-4 w-4 text-[#B7A2DE]" />
                <span>Upload First Query Letter</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {patient.query_letters.map((letter) => (
                <QueryLetterDetail
                  key={letter.id}
                  queryLetter={letter}
                  messages={patient.messages || []}
                  patientName={patient.name}
                  patientEmail={patient.email}
                  patientPhone={patient.phone}
                  onRefresh={() => fetchPatient()}
                  userRole={userRole}
                />
              ))}
            </div>
          )}

          {/* Upload Query Letter Modal */}
          <QueryLetterUploader
            patientId={patient.id}
            patientCode={patient.patient_code}
            isOpen={isQueryModalOpen}
            onClose={() => setIsQueryModalOpen(false)}
            onUploadSuccess={() => {
              fetchPatient();
            }}
          />
        </div>
      )}

      {/* Tab 3: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-[#E7E3EF] bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4 border-b border-[#E7E3EF] pb-3">
            <h3 className="text-sm font-black text-[#111111]">Patient Audit Trail</h3>
            <span className="text-xs font-semibold text-[#6B7280]">Immutable compliance record</span>
          </div>
          {(!patient.audit_logs || patient.audit_logs.length === 0) ? (
            <p className="text-xs text-[#6B7280]">No activity recorded for this patient.</p>
          ) : (
            <div className="space-y-3">
              {patient.audit_logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between rounded-xl bg-[#F8F7FB] p-3.5 text-xs border border-[#E7E3EF]"
                >
                  <div className="space-y-1">
                    <span className="font-mono font-bold text-[#111111] uppercase tracking-wider text-[11px] bg-white px-2 py-0.5 rounded-md border border-[#E7E3EF] inline-block">
                      {log.action}
                    </span>
                    <pre className="text-[11px] text-[#6B7280] font-sans mt-1">
                      {JSON.stringify(log.details)}
                    </pre>
                  </div>
                  <span className="text-[11px] text-[#6B7280] whitespace-nowrap ml-4 font-mono">
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
