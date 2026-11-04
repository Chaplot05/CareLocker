'use client';

import React, { useState } from 'react';
import {
  FileText,
  Eye,
  Download,
  Trash2,
  FolderOpen,
  Filter,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { DOCUMENT_CATEGORIES } from '@/types/database';
import { Document } from '@/types';
import { formatBytes, formatDate, getCategoryBadgeColor } from '@/lib/utils';
import { Modal } from '@/components/common/Modal';
import { DocumentSummaryModal } from '@/components/documents/DocumentSummaryModal';

interface DocumentListProps {
  documents: Document[];
  onDocumentDeleted: () => void;
  userRole?: string;
}

export function DocumentList({
  documents,
  onDocumentDeleted,
  userRole = 'agent',
}: DocumentListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [summaryDoc, setSummaryDoc] = useState<Document | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingSignedUrl, setIsLoadingSignedUrl] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const filteredDocs =
    selectedCategory === 'ALL'
      ? documents
      : documents.filter((doc) => doc.category === selectedCategory);

  const handlePreview = async (doc: Document) => {
    setPreviewDoc(doc);
    setSignedUrl(null);
    setPreviewError(null);
    setIsLoadingSignedUrl(true);

    try {
      const res = await fetch(`/api/documents/${doc.id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch secure document access URL.');
      }

      setSignedUrl(data.signedUrl);
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to retrieve document.');
    } finally {
      setIsLoadingSignedUrl(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}`);
      const data = await res.json();
      if (res.ok && data.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = doc.document_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(data.error || 'Could not download file');
      }
    } catch (err: any) {
      alert(err.message || 'Download error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmDoc) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/documents/${deleteConfirmDoc.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete document.');
      }

      setDeleteSuccess(data.message || `Document "${deleteConfirmDoc.document_name}" deleted.`);
      setTimeout(() => {
        setDeleteConfirmDoc(null);
        setDeleteSuccess(null);
        onDocumentDeleted();
      }, 500);
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const isPdf =
    previewDoc?.file_type?.toLowerCase().includes('pdf') ||
    previewDoc?.document_name?.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-4">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="flex items-center gap-1 font-bold text-[#6B7280] pl-1">
          <Filter className="h-3.5 w-3.5 text-[#7956B5]" /> Filter:
        </span>
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`rounded-full px-3 py-1 font-bold transition-colors ${
            selectedCategory === 'ALL'
              ? 'bg-[#111111] text-white shadow-2xs'
              : 'bg-white text-[#6B7280] border border-[#E7E3EF] hover:bg-[#F2EEFA]/60 hover:text-[#111111]'
          }`}
        >
          All ({documents.length})
        </button>
        {DOCUMENT_CATEGORIES.map((cat) => {
          const count = documents.filter((d) => d.category === cat).length;
          if (count === 0) return null;
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 font-bold transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#7956B5] text-white shadow-2xs'
                  : 'bg-white text-[#6B7280] border border-[#E7E3EF] hover:bg-[#F2EEFA]/60 hover:text-[#111111]'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Document Listing */}
      {filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E7E3EF] bg-white p-12 text-center">
          <div className="rounded-full bg-[#F2EEFA] p-3 text-[#7956B5] mb-3 border border-[#E7E3EF]">
            <FolderOpen className="h-8 w-8" />
          </div>
          <h4 className="text-sm font-bold text-[#111111]">No documents found</h4>
          <p className="text-xs text-[#6B7280] max-w-sm mt-1">
            {selectedCategory === 'ALL'
              ? 'No medical or claim documents have been uploaded for this patient yet.'
              : `No documents in the "${selectedCategory}" category.`}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E7E3EF] bg-white shadow-xs">
          <table className="min-w-full divide-y divide-[#E7E3EF] text-left text-xs">
            <thead className="bg-[#FAFAFC] font-bold text-[#111111] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Document Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded On</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E3EF] bg-white">
              {filteredDocs.map((doc) => {
                const badge = getCategoryBadgeColor(doc.category);
                return (
                  <tr key={doc.id} className="hover:bg-[#F2EEFA]/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-[#F2EEFA] p-2 text-[#7956B5] shrink-0 border border-[#E7E3EF]">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-[#111111] truncate max-w-xs sm:max-w-md">
                          {doc.document_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] font-mono">
                      {formatBytes(doc.file_size)}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {formatDate(doc.uploaded_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSummaryDoc(doc)}
                          title="View AI Clinical Summary"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E7E3EF] bg-[#F2EEFA] px-2.5 py-1 text-[11px] font-bold text-[#7956B5] hover:bg-[#EBE4F7] transition-colors shadow-2xs"
                        >
                          <Sparkles className="h-3 w-3 text-[#7956B5]" />
                          <span>AI Summary</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreview(doc)}
                          title="Preview Securely"
                          className="rounded-lg border border-[#E7E3EF] bg-white p-1.5 text-[#111111] hover:bg-[#F2EEFA] hover:text-[#7956B5] transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(doc)}
                          title="Download"
                          className="rounded-lg border border-[#E7E3EF] bg-white p-1.5 text-[#111111] hover:bg-[#F2EEFA] hover:text-[#7956B5] transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {/* Delete action available for all authenticated staff */}
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteSuccess(null);
                            setDeleteConfirmDoc(doc);
                          }}
                          title="Delete Document"
                          className="rounded-lg border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Document Secure Preview Modal */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => {
          setPreviewDoc(null);
          setSignedUrl(null);
        }}
        title={previewDoc?.document_name || 'Document Preview'}
        description={`Category: ${previewDoc?.category} • Temporary signed access URL`}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {isLoadingSignedUrl && (
            <div className="flex h-96 flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#7956B5]" />
              <p className="text-xs text-[#6B7280]">Generating secure temporary signed URL...</p>
            </div>
          )}

          {previewError && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-800">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>{previewError}</span>
            </div>
          )}

          {!isLoadingSignedUrl && signedUrl && (
            <div className="rounded-xl border border-[#E7E3EF] bg-[#111111]/5 p-2 overflow-hidden">
              {isPdf ? (
                <iframe
                  src={signedUrl}
                  title="PDF Document Preview"
                  className="w-full h-[65vh] rounded-lg bg-white"
                />
              ) : (
                <div className="flex justify-center bg-black/5 rounded-lg p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signedUrl}
                    alt={previewDoc?.document_name || 'Document preview'}
                    className="max-h-[65vh] object-contain rounded-md shadow-md"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[#E7E3EF]">
            <span className="text-[11px] text-[#6B7280]">
              Accessed securely via private storage signed token.
            </span>
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E3EF] bg-white px-3 py-1.5 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA] transition-colors"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="h-3.5 w-3.5 text-[#7956B5]" />
              </a>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal (Available for all authorized staff) */}
      <Modal
        isOpen={!!deleteConfirmDoc}
        onClose={() => {
          if (!isDeleting) {
            setDeleteConfirmDoc(null);
            setDeleteError(null);
            setDeleteSuccess(null);
          }
        }}
        title="Confirm Document Deletion"
        description="Permanently removes the document and updates query matching."
        maxWidth="md"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {deleteError}
            </div>
          )}

          {deleteSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              {deleteSuccess}
            </div>
          )}

          <div className="rounded-xl bg-red-50/80 p-3.5 border border-red-200 text-xs text-red-900 space-y-2">
            <p className="font-bold">Are you sure you want to delete this document?</p>
            <p className="font-mono font-bold text-red-950 bg-white p-2 rounded border border-red-200 break-all">
              {deleteConfirmDoc?.document_name}
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-red-800">
              <li>The file will be permanently deleted from private Supabase Storage.</li>
              <li>The document database record will be purged.</li>
              <li>An entry will be recorded in the audit trail.</li>
              <li>If this document was used as evidence in insurance queries, affected matches will be marked for review.</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setDeleteConfirmDoc(null);
                setDeleteError(null);
                setDeleteSuccess(null);
              }}
              className="rounded-xl border border-[#E7E3EF] bg-white px-4 py-2 text-xs font-bold text-[#6B7280] hover:bg-[#F2EEFA] hover:text-[#111111] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-2xs"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete Permanently</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* AI Clinical Summary Modal */}
      <DocumentSummaryModal
        document={summaryDoc}
        isOpen={!!summaryDoc}
        onClose={() => setSummaryDoc(null)}
        onSummaryUpdated={(updatedDoc) => {
          if (updatedDoc) {
            setSummaryDoc(updatedDoc);
          }
          onDocumentDeleted(); // Refresh list silently
        }}
      />
    </div>
  );
}
