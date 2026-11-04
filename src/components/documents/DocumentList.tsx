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
} from 'lucide-react';
import { DocumentCategory, DOCUMENT_CATEGORIES } from '@/types/database';
import { Document } from '@/types';
import { formatBytes, formatDate, getCategoryBadgeColor } from '@/lib/utils';
import { Modal } from '@/components/common/Modal';

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
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingSignedUrl, setIsLoadingSignedUrl] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        throw new Error(data.error || 'Failed to delete document');
      }

      setDeleteConfirmDoc(null);
      onDocumentDeleted();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const isPdf = previewDoc?.file_type?.toLowerCase().includes('pdf') ||
    previewDoc?.document_name?.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-4">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="flex items-center gap-1 font-semibold text-slate-400 pl-1">
          <Filter className="h-3.5 w-3.5" /> Filter:
        </span>
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`rounded-full px-3 py-1 font-medium transition-colors ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white font-semibold'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
              className={`rounded-full px-3 py-1 font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-lavender-700 text-white font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Document Listing */}
      {filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="rounded-full bg-slate-50 p-3 text-slate-400 mb-3 border border-slate-100">
            <FolderOpen className="h-8 w-8" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800">No documents found</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {selectedCategory === 'ALL'
              ? 'No medical or claim documents have been uploaded for this patient yet.'
              : `No documents in the "${selectedCategory}" category.`}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Document Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded On</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredDocs.map((doc) => {
                const badge = getCategoryBadgeColor(doc.category);
                return (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-slate-100 p-2 text-slate-600 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-slate-900 truncate max-w-xs sm:max-w-md">
                          {doc.document_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {formatBytes(doc.file_size)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(doc.uploaded_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePreview(doc)}
                          title="Preview Securely"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(doc)}
                          title="Download"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmDoc(doc)}
                            title="Delete Document (Admin)"
                            className="rounded-lg border border-red-100 p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
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
              <Loader2 className="h-8 w-8 animate-spin text-peach-500" />
              <p className="text-xs text-slate-500">Generating secure temporary signed URL...</p>
            </div>
          )}

          {previewError && (
            <div className="flex items-center gap-3 rounded-xl border border-peach-200 bg-peach-50 p-4 text-sm text-peach-800">
              <AlertTriangle className="h-5 w-5 text-peach-600" />
              <span>{previewError}</span>
            </div>
          )}

          {!isLoadingSignedUrl && signedUrl && (
            <div className="rounded-xl border border-slate-200 bg-slate-900/5 p-2 overflow-hidden">
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

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              Accessed securely via private storage signed token.
            </span>
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal (Admin Only) */}
      <Modal
        isOpen={!!deleteConfirmDoc}
        onClose={() => setDeleteConfirmDoc(null)}
        title="Confirm Document Deletion"
        description="This action cannot be undone."
        maxWidth="md"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {deleteError}
            </div>
          )}

          <div className="rounded-xl bg-red-50 p-3.5 border border-red-100 text-xs text-red-800">
            <p className="font-semibold mb-1">Warning (Admin Action):</p>
            <p>
              Are you sure you want to delete <span className="font-mono font-bold text-red-900">{deleteConfirmDoc?.document_name}</span>? 
              The file will be permanently removed from private storage and its database record will be purged with an audit entry.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteConfirmDoc(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
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
    </div>
  );
}
