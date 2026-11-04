'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
} from 'lucide-react';
import { DOCUMENT_CATEGORIES, DocumentCategory } from '@/types/database';
import { formatBytes } from '@/lib/utils';

interface DocumentUploaderProps {
  patientId: string;
  patientCode: string;
  onUploadComplete: () => void;
}

interface QueuedFile {
  id: string;
  file: File;
  category: DocumentCategory;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

export function DocumentUploader({
  patientId,
  patientCode,
  onUploadComplete,
}: DocumentUploaderProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [selectedDefaultCategory, setSelectedDefaultCategory] =
    useState<DocumentCategory>('Discharge Summary');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newQueued: QueuedFile[] = [];

    Array.from(files).forEach((file) => {
      let error: string | undefined;
      if (!ALLOWED_TYPES.includes(file.type)) {
        error = 'Unsupported format (allowed: PDF, JPG, PNG)';
      } else if (file.size > MAX_SIZE) {
        error = 'File exceeds 20MB limit';
      }

      newQueued.push({
        id: Math.random().toString(36).substring(7),
        file,
        category: selectedDefaultCategory,
        progress: 0,
        status: error ? 'error' : 'pending',
        errorMessage: error,
      });
    });

    setQueue((prev) => [...prev, ...newQueued]);
  };

  const removeQueued = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemCategory = (id: string, category: DocumentCategory) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category } : item))
    );
  };

  const uploadAll = async () => {
    const pendingItems = queue.filter((item) => item.status === 'pending');
    if (!pendingItems.length) return;

    for (const item of pendingItems) {
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 30 } : q))
      );

      try {
        const formData = new FormData();
        formData.append('patient_id', patientId);
        formData.append('category', item.category);
        formData.append('file', item.file);

        const res = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'completed', progress: 100 } : q
          )
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'error', errorMessage: err.message, progress: 0 }
              : q
          )
        );
      }
    }

    onUploadComplete();
  };

  const pendingCount = queue.filter((i) => i.status === 'pending').length;
  const isUploading = queue.some((i) => i.status === 'uploading');

  return (
    <div className="space-y-4 rounded-2xl border border-[#E7E3EF] bg-white p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E3EF] pb-4">
        <div>
          <h3 className="text-sm font-black text-[#111111]">Upload Patient Documents</h3>
          <p className="text-xs text-[#6B7280]">
            Secure encrypted vault for patient <span className="font-mono font-bold text-[#7956B5]">{patientCode}</span>.
          </p>
        </div>

        {/* Default category selector for quick uploads */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[#6B7280] whitespace-nowrap">
            Default Category:
          </label>
          <select
            value={selectedDefaultCategory}
            onChange={(e) => setSelectedDefaultCategory(e.target.value as DocumentCategory)}
            className="rounded-xl border border-[#E7E3EF] bg-[#F8F7FB] px-3 py-1.5 text-xs font-bold text-[#111111] focus:border-[#7956B5] focus:outline-none"
          >
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-[#7956B5] bg-[#F2EEFA]'
            : 'border-[#E7E3EF] bg-[#F8F7FB] hover:border-[#7956B5] hover:bg-[#F2EEFA]/40'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
        />
        <div className="rounded-xl bg-white p-3 text-[#7956B5] shadow-2xs mb-3 border border-[#E7E3EF]">
          <UploadCloud className="h-6 w-6" />
        </div>
        <p className="text-sm font-bold text-[#111111]">
          Click to upload or drag & drop files here
        </p>
        <p className="text-xs text-[#6B7280] mt-1">
          Supports multi-file upload: PDF, JPEG, JPG, PNG (Max 20MB per file)
        </p>
      </div>

      {/* Upload Queue List */}
      {queue.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280] px-1">
            <span>Selected Files ({queue.length})</span>
            {queue.some((i) => i.status === 'completed') && (
              <button
                type="button"
                onClick={() => setQueue((prev) => prev.filter((i) => i.status !== 'completed'))}
                className="text-[#6B7280] hover:text-[#111111]"
              >
                Clear Completed
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E7E3EF] bg-[#F8F7FB] p-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="rounded-lg bg-white p-2 border border-[#E7E3EF] text-[#7956B5] shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#111111] truncate">{item.file.name}</p>
                    <p className="text-[10px] text-[#6B7280] font-mono mt-0.5">
                      {formatBytes(item.file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={item.category}
                    disabled={item.status !== 'pending'}
                    onChange={(e) =>
                      updateItemCategory(item.id, e.target.value as DocumentCategory)
                    }
                    className="rounded-lg border border-[#E7E3EF] bg-white px-2 py-1 text-[11px] font-bold text-[#111111] focus:border-[#7956B5] focus:outline-none disabled:opacity-50"
                  >
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {item.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => removeQueued(item.id)}
                      className="rounded-lg p-1 text-[#6B7280] hover:bg-white hover:text-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {item.status === 'uploading' && (
                    <div className="flex items-center gap-1.5 text-[#7956B5] font-bold">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-[11px]">Saving...</span>
                    </div>
                  )}

                  {item.status === 'completed' && (
                    <div className="flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-[11px]">Saved</span>
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div
                      className="flex items-center gap-1 text-red-600 font-bold"
                      title={item.errorMessage}
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-[11px]">Failed</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-[#E7E3EF] pt-3">
            <span className="text-xs text-[#6B7280]">
              {pendingCount} file{pendingCount !== 1 ? 's' : ''} ready to deposit
            </span>
            <button
              type="button"
              disabled={pendingCount === 0 || isUploading}
              onClick={uploadAll}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#111111] px-4 py-2 text-xs font-bold text-white hover:bg-[#171417] shadow-2xs transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#B7A2DE]" />
                  <span>Uploading to Vault...</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 text-[#B7A2DE]" />
                  <span>Deposit {pendingCount > 0 ? `${pendingCount} Files` : 'Files'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
