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
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Upload Patient Documents</h3>
          <p className="text-xs text-slate-500">
            Secure private document vault for patient <span className="font-mono font-medium text-slate-800">{patientCode}</span>.
          </p>
        </div>

        {/* Default category selector for quick uploads */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Default Category:
          </label>
          <select
            value={selectedDefaultCategory}
            onChange={(e) => setSelectedDefaultCategory(e.target.value as DocumentCategory)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-lavender-500 focus:outline-none"
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
            : 'border-[#E7E3EF] bg-[#F2EEFA]/20 hover:border-[#7956B5] hover:bg-[#F2EEFA]/40'
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
        <div className="rounded-xl bg-white p-3 text-lavender-600 shadow-xs mb-3 border border-slate-100">
          <UploadCloud className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-800">
          Click to upload or drag & drop documents here
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Supports multiple files: PDF, JPEG, JPG, PNG (Max 20MB per file)
        </p>
      </div>

      {/* Upload Queue List */}
      {queue.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
            <span>Selected Files ({queue.length})</span>
            {queue.some((i) => i.status === 'completed') && (
              <button
                type="button"
                onClick={() => setQueue((prev) => prev.filter((i) => i.status !== 'completed'))}
                className="text-slate-400 hover:text-slate-600"
              >
                Clear Completed
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="rounded-lg bg-white p-2 border border-slate-200 text-slate-600 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate">{item.file.name}</p>
                    <p className="text-slate-400">{formatBytes(item.file.size)}</p>
                  </div>
                </div>

                {/* Per-item Category Selector */}
                <select
                  disabled={item.status !== 'pending'}
                  value={item.category}
                  onChange={(e) =>
                    updateItemCategory(item.id, e.target.value as DocumentCategory)
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
                >
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {/* Status Indicator */}
                <div className="w-24 text-right">
                  {item.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => removeQueued(item.id)}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {item.status === 'uploading' && (
                    <span className="inline-flex items-center gap-1 text-lavender-700 font-medium">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span
                      title={item.errorMessage}
                      className="inline-flex items-center gap-1 text-red-600 font-semibold cursor-help"
                    >
                      <AlertCircle className="h-3.5 w-3.5" /> Error
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          {pendingCount > 0 && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={uploadAll}
                disabled={isUploading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#171417] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Uploading documents...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 text-[#B7A2DE]" />
                    <span>Confirm & Upload {pendingCount} Document{pendingCount > 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

