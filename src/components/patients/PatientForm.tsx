'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wand2, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PatientFormProps {
  initialData?: {
    id?: string;
    patient_code?: string;
    name?: string;
    phone?: string;
    email?: string;
    date_of_birth?: string | null;
  };
  isEditing?: boolean;
}

export function PatientForm({ initialData, isEditing = false }: PatientFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    patient_code: initialData?.patient_code || '',
    name: initialData?.name || '',
    phone: initialData?.phone || '+91 ',
    email: initialData?.email || '',
    date_of_birth: initialData?.date_of_birth || '',
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const generatePatientCode = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    setFormData((prev) => ({ ...prev, patient_code: `PAT-${year}-${rand}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = isEditing ? `/api/patients/${initialData?.id}` : '/api/patients';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save patient information');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(isEditing ? `/patients/${initialData?.id}` : '/patients');
        router.refresh();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>Patient record {isEditing ? 'updated' : 'created'} successfully! Redirecting...</span>
        </div>
      )}

      <div className="rounded-2xl border border-[#E7E3EF] bg-white p-6 shadow-xs space-y-5">
        <h2 className="text-base font-bold text-[#111111] border-b border-[#E7E3EF] pb-3">
          Patient Identification & Contact Details
        </h2>

        {/* Patient Code */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-1.5">
            Patient Code / Identifier <span className="text-[#7956B5]">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              disabled={isEditing || isLoading}
              placeholder="e.g. PAT-2026-001"
              value={formData.patient_code}
              onChange={(e) =>
                setFormData({ ...formData, patient_code: e.target.value.toUpperCase() })
              }
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase text-slate-800 focus:border-lavender-500 focus:outline-none focus:ring-2 focus:ring-lavender-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            {!isEditing && (
              <button
                type="button"
                onClick={generatePatientCode}
                className="inline-flex items-center gap-1.5 rounded-xl border border-lavender-200 bg-lavender-50 px-3 py-2 text-xs font-semibold text-lavender-700 hover:bg-lavender-100 transition-colors"
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span>Auto-ID</span>
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Unique hospital or insurance patient identification number.
          </p>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Patient Full Name <span className="text-peach-500">*</span>
          </label>
          <input
            type="text"
            required
            disabled={isLoading}
            placeholder="e.g. Rajesh Sharma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-lavender-500 focus:outline-none focus:ring-2 focus:ring-lavender-100"
          />
        </div>

        {/* Contact Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Phone Number (WhatsApp Ready) <span className="text-peach-500">*</span>
            </label>
            <input
              type="tel"
              required
              disabled={isLoading}
              placeholder="+91 98201 44521"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-lavender-500 focus:outline-none focus:ring-2 focus:ring-lavender-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Email Address <span className="text-peach-500">*</span>
            </label>
            <input
              type="email"
              required
              disabled={isLoading}
              placeholder="rajesh.sharma@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-lavender-500 focus:outline-none focus:ring-2 focus:ring-lavender-100"
            />
          </div>
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Date of Birth (Optional)
          </label>
          <input
            type="date"
            disabled={isLoading}
            value={formData.date_of_birth || ''}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            className="w-full sm:w-1/2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-lavender-500 focus:outline-none focus:ring-2 focus:ring-lavender-100"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href={isEditing ? `/patients/${initialData?.id}` : '/patients'}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Cancel</span>
        </Link>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-6 py-2.5 text-sm font-bold text-white shadow-2xs hover:bg-[#171417] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#B7A2DE]" />
              <span>Saving Patient...</span>
            </>
          ) : (
            <span>{isEditing ? 'Save Changes' : 'Register Patient'}</span>
          )}
        </button>
      </div>
    </form>
  );
}

