'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Building,
  Hash,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';

interface QueryLetterUploaderProps {
  patientId: string;
  patientCode: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export function QueryLetterUploader({
  patientId,
  patientCode,
  isOpen,
  onClose,
  onUploadSuccess,
}: QueryLetterUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [insurerName, setInsurerName] = useState('');
  const [claimNumber, setClaimNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('Please upload a valid PDF, JPEG, JPG, or PNG document.');
      return;
    }

    if (selected.size > MAX_SIZE) {
      setError('File exceeds 20MB limit.');
      return;
    }

    setFile(selected);
  };

  const handleUploadAndProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProcessingStage('Uploading query letter to private storage...');

    try {
      const formData = new FormData();
      formData.append('patient_id', patientId);
      formData.append('file', file);
      if (insurerName.trim()) formData.append('insurer_name', insurerName.trim());
      if (claimNumber.trim()) formData.append('claim_number', claimNumber.trim());

      setProcessingStage('Running Gemini AI: Extracting requirements & matching with vault...');
      const res = await fetch('/api/queries', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload and process query letter');
      }

      setProcessingStage('Analysis complete! Updating patient query history...');
      setTimeout(() => {
        resetForm();
        onUploadSuccess();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Error uploading query letter');
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setInsurerName('');
    setClaimNumber('');
    setError(null);
    setIsProcessing(false);
    setProcessingStage('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetForm}
      title="Upload Insurance Query Letter"
      description={`Automated AI requirement extraction & document matching for ${patientCode}`}
      maxWidth="lg"
    >
      <form onSubmit={handleUploadAndProcess} className="space-y-4 text-xs">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Dropzone */}
        {!file ? (
          <label
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E7E3EF] p-8 text-center cursor-pointer hover:border-[#7956B5] hover:bg-[#F2EEFA]/30 transition-all"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="rounded-xl bg-[#F2EEFA] p-3 text-[#7956B5] mb-3 border border-[#E7E3EF] shadow-2xs">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-[#111111]">
              Select Query Letter (PDF or Image)
            </p>
            <p className="text-[11px] text-[#6B7280] mt-1">
              Supports Star Health, Medi Assist, Care, HDFC Ergo, ICICI, etc. (Max 20MB)
            </p>
          </label>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-[#E7E3EF] bg-[#F2EEFA]/40 p-3">
            <div className="flex items-center gap-2.5">
              <FileText className="h-5 w-5 text-[#7956B5]" />
              <div>
                <p className="font-bold text-[#111111]">{file.name}</p>
                <p className="text-[11px] text-[#6B7280]">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!isProcessing && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Change
              </button>
            )}
          </div>
        )}

        {/* Optional Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Insurer / TPA Name (Optional)
            </label>
            <div className="relative">
              <Building className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                disabled={isProcessing}
                placeholder="e.g. Star Health / Medi Assist"
                value={insurerName}
                onChange={(e) => setInsurerName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-800 focus:border-lavender-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Claim Ref # (Optional)
            </label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                disabled={isProcessing}
                placeholder="e.g. CIR-40912-A"
                value={claimNumber}
                onChange={(e) => setClaimNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-800 focus:border-lavender-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="rounded-xl border border-lavender-200 bg-lavender-50/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-lavender-900 font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-lavender-700" />
              <span>AI Processing in Progress...</span>
            </div>
            <p className="text-[11px] text-slate-600">{processingStage}</p>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={isProcessing}
            onClick={resetForm}
            className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!file || isProcessing}
            className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2 font-bold text-white shadow-2xs hover:bg-[#171417] disabled:opacity-50 transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Processing AI Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Upload & Start AI Engine</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

