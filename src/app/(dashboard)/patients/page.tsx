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
  EyeOff,
  ShieldCheck,
  Phone,
  Mail,
  X,
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

  const handleClearSearch = () => {
    setSearch('');
    fetchPatients('');
  };

  return (
    <div className="space-y-6">
      <Header
        title="Patients Directory"
        subtitle="Manage patient profiles, document lockers, and active insurance query records."
        showAddPatient={false}
      />

      {/* Top Action & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E7E3EF] shadow-2xs">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search by patient name, code, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#E7E3EF] bg-[#F8F7FB] pl-10 pr-20 py-2.5 text-xs text-[#111111] placeholder:text-[#6B7280] focus:border-[#7956B5] focus:bg-white focus:outline-none transition-all"
          />
          {search ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-14 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111111]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-[#111111] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#171417]"
          >
            Search
          </button>
        </form>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mask toggle button */}
          <button
            type="button"
            onClick={() => setRevealMasked(!revealMasked)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E3EF] bg-white px-3.5 py-2 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA] transition-colors shadow-2xs"
            title="Toggle sensitive patient contact masking"
          >
            {revealMasked ? <EyeOff className="h-3.5 w-3.5 text-[#7956B5]" /> : <Eye className="h-3.5 w-3.5 text-[#7956B5]" />}
            <span>{revealMasked ? 'Mask Details' : 'Reveal Contact'}</span>
          </button>

          {/* CSV Import */}
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E3EF] bg-white px-3.5 py-2 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA] transition-colors shadow-2xs"
          >
            <Upload className="h-3.5 w-3.5 text-[#7956B5]" />
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
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Patients Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E7E3EF] bg-white shadow-2xs">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-[#7956B5]" />
            <p className="text-xs font-bold text-[#6B7280]">Loading patient records from database...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-2xl bg-[#F2EEFA] p-4 text-[#7956B5] mb-3 border border-[#E7E3EF]">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-base font-black text-[#111111]">No Patients Found</h3>
            <p className="text-xs text-[#6B7280] max-w-sm mt-1 mb-5">
              {search
                ? `No patients match "${search}". Try searching by another term.`
                : 'No patients registered in the directory yet. Add your first patient to begin.'}
            </p>
            {search ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E3EF] bg-white px-4 py-2 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA]"
              >
                Clear Search Filter
              </button>
            ) : (
              <Link
                href="/patients/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#111111] px-4 py-2 text-xs font-bold text-white hover:bg-[#171417]"
              >
                <Plus className="h-4 w-4 text-[#B7A2DE]" />
                <span>Register First Patient</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E7E3EF] text-left text-xs">
              <thead className="bg-[#F8F7FB]">
                <tr className="text-[11px] font-black uppercase tracking-wider text-[#6B7280]">
                  <th className="py-3 px-4">Patient Code</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4 text-center">Locker Docs</th>
                  <th className="py-3 px-4 text-center">Query Letters</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E3EF]">
                {patients.map((pt) => (
                  <tr key={pt.id} className="hover:bg-[#F8F7FB] transition-colors group">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#7956B5]">
                      <span className="rounded-md bg-[#F2EEFA] border border-[#E7E3EF] px-2 py-0.5">
                        {pt.patient_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/patients/${pt.id}`}
                        className="font-black text-[#111111] hover:text-[#7956B5] transition-colors flex items-center gap-2"
                      >
                        <div className="h-7 w-7 rounded-lg bg-[#111111] text-[#B7A2DE] text-xs font-black flex items-center justify-center shrink-0">
                          {pt.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{pt.name}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#111111]">
                      {revealMasked ? pt.phone : maskPhoneNumber(pt.phone)}
                    </td>
                    <td className="py-3.5 px-4 text-[#111111]">
                      {revealMasked ? pt.email : maskEmail(pt.email)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#F8F7FB] border border-[#E7E3EF] px-2 py-0.5 font-bold text-[#111111]">
                        <FolderLock className="h-3 w-3 text-[#7956B5]" />
                        <span>{pt.documents_count || 0}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#F8F7FB] border border-[#E7E3EF] px-2 py-0.5 font-bold text-[#111111]">
                        <FileText className="h-3 w-3 text-[#7956B5]" />
                        <span>{pt.query_letters_count || 0}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/patients/${pt.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E7E3EF] bg-white px-2.5 py-1 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA] transition-colors shadow-2xs group-hover:border-[#7956B5]"
                      >
                        <span>Open Vault</span>
                        <ChevronRight className="h-3.5 w-3.5 text-[#7956B5]" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={() => fetchPatients()}
      />
    </div>
  );
}
