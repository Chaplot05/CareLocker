'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Upload,
  FolderLock,
  ChevronRight,
  Loader2,
  FileText,
  AlertCircle,
  Eye,
  ShieldCheck,
  Phone,
  Mail,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { CsvImportModal } from '@/components/patients/CsvImportModal';
import { PatientWithStats } from '@/types';
import { maskPhoneNumber, maskEmail, formatDate } from '@/lib/utils';

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientWithStats[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [revealMasked, setRevealMasked] = useState(false);

  const fetchPatients = async (searchTerm = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const url = searchTerm
        ? `/api/patients?search=${encodeURIComponent(searchTerm)}`
        : '/api/patients';
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch patients list');
      }

      setPatients(data.patients || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(search);
  };

  return (
    <div className="space-y-6">
      <Header
        title="Patients Directory"
        subtitle="Manage patient profiles, documents vaults, and active insurance query records."
        showAddPatient={false}
      />

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient name, code, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-20 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-lavender-500 focus:outline-none focus:ring-2 focus:ring-lavender-100 shadow-2xs"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            Search
          </button>
        </form>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {/* Mask toggle button */}
          <button
            type="button"
            onClick={() => setRevealMasked(!revealMasked)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Toggle sensitive patient contact masking"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-lavender-700" />
            <span>{revealMasked ? 'Mask Details' : 'Reveal Contact'}</span>
          </button>

          {/* CSV Import */}
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-lavender-200 bg-lavender-50 px-3.5 py-2 text-xs font-semibold text-lavender-800 hover:bg-lavender-100 transition-colors shadow-2xs"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import CSV</span>
          </button>

          {/* Add Patient */}
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#111111] px-4 py-2 text-xs font-bold text-white hover:bg-[#171417] active:scale-[0.98] transition-all shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5 text-[#B7A2DE]" />
            <span>Register Patient</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Patients Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E7E3EF] bg-white shadow-xs">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-[#7956B5]" />
            <p className="text-xs text-[#6B7280]">Loading patients from Supabase database...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-[#F2EEFA] p-3 text-[#7956B5] mb-3 border border-[#E7E3EF]">
              <Users className="h-8 w-8" />
            </div>
            <h4 className="text-sm font-bold text-[#111111]">No patients registered</h4>
            <p className="text-xs text-[#6B7280] max-w-sm mt-1 mb-4">
              Get started by adding an individual patient profile or bulk importing via CSV.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCsvModalOpen(true)}
                className="rounded-xl border border-[#E7E3EF] px-3 py-1.5 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA]"
              >
                Upload CSV
              </button>
              <Link
                href="/patients/new"
                className="rounded-xl bg-[#111111] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#171417]"
              >
                Add First Patient
              </Link>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3">Patient ID</th>
                <th className="px-5 py-3">Full Name</th>
                <th className="px-5 py-3">Contact Details</th>
                <th className="px-5 py-3 text-center">Documents Vault</th>
                <th className="px-5 py-3 text-center">Query Letters</th>
                <th className="px-5 py-3">Registered On</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => (window.location.href = `/patients/${patient.id}`)}
                >
                  <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
                      {patient.patient_code}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="hover:text-lavender-700 font-semibold flex items-center gap-1.5"
                    >
                      {patient.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{revealMasked ? patient.phone : maskPhoneNumber(patient.phone)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span>{revealMasked ? patient.email : maskEmail(patient.email)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender-50 border border-lavender-200 px-2.5 py-0.5 text-[11px] font-semibold text-lavender-800">
                      <FolderLock className="h-3 w-3" />
                      {patient.documents_count || 0} doc{(patient.documents_count || 0) === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        (patient.query_letters_count || 0) > 0
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-50 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {patient.query_letters_count || 0} Quer{(patient.query_letters_count || 0) === 1 ? 'y' : 'ies'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                    {formatDate(patient.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-lavender-800 transition-colors shadow-2xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>Open Profile</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={() => {
          fetchPatients();
        }}
      />
    </div>
  );
}

