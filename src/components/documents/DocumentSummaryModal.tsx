'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Document, DocumentAiSummary } from '@/types';
import {
  Sparkles,
  Building2,
  Calendar,
  IndianRupee,
  Activity,
  FileCheck2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { formatBytes, formatDate } from '@/lib/utils';

interface DocumentSummaryModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onSummaryUpdated?: () => void;
}

export function DocumentSummaryModal({
  document,
  isOpen,
  onClose,
  onSummaryUpdated,
}: DocumentSummaryModalProps) {
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!document) return null;

  const summary = (document.ai_summary as unknown as DocumentAiSummary) || null;

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${document.id}/analyze`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze document');
      }
      if (onSummaryUpdated) {
        onSummaryUpdated();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsReanalyzing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Clinical & Billing Document Summary"
      description={`Automated multimodal extraction for ${document.document_name}`}
      maxWidth="2xl"
    >
      <div className="space-y-5 text-xs">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-peach-200 bg-peach-50 p-3 text-peach-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-peach-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="rounded-xl border border-lavender-200 bg-lavender-50/70 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-lavender-200/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-lavender-600 p-1.5 text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm">
                  {summary?.document_type || document.category}
                </span>
                <span className="block text-[11px] text-slate-500">
                  Folder Category: <strong className="text-slate-700">{document.category}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {summary?.confidence_score && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  {Math.round(summary.confidence_score * 100)}% Confidence
                </span>
              )}
              <button
                type="button"
                onClick={handleReanalyze}
                disabled={isReanalyzing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-lavender-300 bg-white px-2.5 py-1 text-xs font-semibold text-lavender-800 hover:bg-lavender-50 transition-colors shadow-2xs"
              >
                <RefreshCw className={`h-3 w-3 ${isReanalyzing ? 'animate-spin' : ''}`} />
                <span>{isReanalyzing ? 'Analyzing...' : 'Re-analyze'}</span>
              </button>
            </div>
          </div>

          {/* Key Identifiers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600 text-[11px]">
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Patient Name</span>
              <span className="font-medium text-slate-800">
                {summary?.patient_name || 'Not detected'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Hospital / Lab</span>
              <span className="font-medium text-slate-800 truncate block">
                {summary?.hospital?.name || 'Not detected'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Total Amount</span>
              <span className="font-medium text-slate-800">
                {summary?.financials?.total_amount != null
                  ? `₹${summary.financials.total_amount.toLocaleString('en-IN')}`
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Discharge / Report Date</span>
              <span className="font-medium text-slate-800">
                {summary?.dates?.discharge_date || summary?.dates?.report_date || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Summary & Diagnoses */}
        {summary?.clinical_summary && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
            <h4 className="font-semibold text-slate-900 flex items-center gap-1.5 text-xs">
              <Activity className="h-3.5 w-3.5 text-lavender-700" />
              <span>Clinical Diagnoses & Interventions</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              {summary.clinical_summary.diagnoses && summary.clinical_summary.diagnoses.length > 0 && (
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                    Diagnoses:
                  </span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {summary.clinical_summary.diagnoses.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.clinical_summary.procedures && summary.clinical_summary.procedures.length > 0 && (
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                    Procedures / Surgery:
                  </span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {summary.clinical_summary.procedures.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Key Findings */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
          <h4 className="font-semibold text-slate-900 flex items-center gap-1.5 text-xs">
            <FileCheck2 className="h-3.5 w-3.5 text-peach-600" />
            <span>Key Factual Contents</span>
          </h4>
          {summary?.key_findings && summary.key_findings.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              {summary.key_findings.map((finding, idx) => (
                <li key={idx} className="leading-relaxed">{finding}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 italic">No summary points generated yet.</p>
          )}
        </div>

        {/* Insurance Relevance */}
        {summary?.insurance_relevance && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-1 text-slate-700">
            <span className="font-semibold text-blue-900 text-[11px] block">
              Insurance Claim Relevance:
            </span>
            <p className="text-slate-600 leading-relaxed">{summary.insurance_relevance}</p>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-[10px] text-slate-400">
            Analyzed {summary?.analyzed_at ? formatDate(summary.analyzed_at) : 'recently'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
