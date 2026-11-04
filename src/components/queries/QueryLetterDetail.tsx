'use client';

import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Copy,
  Check,
  Edit2,
  Save,
  MessageSquare,
  FileCheck,
  FolderLock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  Phone,
  Mail,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { QueryLetter, QueryPoint, Document, Message } from '@/types';
import { formatDate, formatDateTime, getDecisionBadge } from '@/lib/utils';
import { Modal } from '@/components/common/Modal';

interface QueryLetterDetailProps {
  queryLetter: QueryLetter & {
    query_points?: (QueryPoint & {
      matched_documents?: Document[];
    })[];
  };
  messages?: Message[];
  patientName: string;
  onRefresh: () => void;
  userRole?: string;
}

export function QueryLetterDetail({
  queryLetter,
  messages = [],
  patientName,
  onRefresh,
  userRole = 'agent',
}: QueryLetterDetailProps) {
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessError, setReprocessError] = useState<string | null>(null);

  // Message draft state
  const whatsAppMessage = messages.find((m) => m.query_letter_id === queryLetter.id && m.channel === 'WhatsApp');
  const emailMessage = messages.find((m) => m.query_letter_id === queryLetter.id && m.channel === 'Email');
  const queryMessage = whatsAppMessage || emailMessage || messages.find((m) => m.query_letter_id === queryLetter.id);
  const [draftContent, setDraftContent] = useState(queryMessage?.message_content || '');
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isRegeneratingDraft, setIsRegeneratingDraft] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // Stage 3: Multi-channel delivery state
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // Preview supporting doc modal
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
  const [isLoadingSignedUrl, setIsLoadingSignedUrl] = useState(false);

  // Preview original query letter
  const [letterSignedUrl, setLetterSignedUrl] = useState<string | null>(null);
  const [isPreviewingLetter, setIsPreviewingLetter] = useState(false);

  const points = queryLetter.query_points || [];
  const availableCount = points.filter((p) => p.decision_status === 'available').length;
  const missingCount = points.filter((p) => p.decision_status === 'missing').length;
  const reviewCount = points.filter((p) => p.decision_status === 'needs_review').length;

  const handleReprocess = async () => {
    setIsReprocessing(true);
    setReprocessError(null);
    try {
      const res = await fetch(`/api/queries/${queryLetter.id}/reprocess`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reprocess query letter');
      }
      onRefresh();
    } catch (err: any) {
      setReprocessError(err.message);
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleCopyMessage = () => {
    const textToCopy = draftContent || queryMessage?.message_content || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleRegenerateDraft = async () => {
    setIsRegeneratingDraft(true);
    try {
      const res = await fetch(`/api/queries/${queryLetter.id}/draft`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.messageContent) {
        setDraftContent(data.messageContent);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegeneratingDraft(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const res = await fetch(`/api/queries/${queryLetter.id}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_content: draftContent }),
      });
      if (res.ok) {
        setIsEditingDraft(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSendNotifications = async (channel?: 'WhatsApp' | 'Email') => {
    setIsSendingNotification(true);
    setSendError(null);
    setSendSuccess(null);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_letter_id: queryLetter.id,
          channel,
          force: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch notifications');
      }

      const waStatus = data.result?.whatsapp?.status;
      const emStatus = data.result?.email?.status;

      let msg = 'Dispatch finished. ';
      if (channel === 'WhatsApp') {
        msg = waStatus === 'sent' ? 'WhatsApp message dispatched successfully!' : `WhatsApp dispatch: ${waStatus}`;
      } else if (channel === 'Email') {
        msg = emStatus === 'sent' ? 'Email dispatched successfully!' : `Email dispatch: ${emStatus}`;
      } else {
        msg = `Dispatched: WhatsApp (${waStatus}), Email (${emStatus})`;
      }

      setSendSuccess(msg);
      onRefresh();
    } catch (err: any) {
      setSendError(err.message || 'Notification dispatch failed');
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handlePreviewSupportingDoc = async (doc: Document) => {
    setPreviewDoc(doc);
    setPreviewSignedUrl(null);
    setIsLoadingSignedUrl(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`);
      const data = await res.json();
      if (res.ok && data.signedUrl) {
        setPreviewSignedUrl(data.signedUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSignedUrl(false);
    }
  };

  const handlePreviewOriginalLetter = async () => {
    setIsPreviewingLetter(true);
    try {
      const res = await fetch(`/api/documents/${queryLetter.id}`); // Or query endpoint
      // We can fetch via /api/queries/[id]
      const queryRes = await fetch(`/api/queries/${queryLetter.id}`);
      const data = await queryRes.json();
      if (data.queryLetter?.signedUrl) {
        window.open(data.queryLetter.signedUrl, '_blank');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPreviewingLetter(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Completed',
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          icon: CheckCircle2,
        };
      case 'extracting':
        return {
          label: 'Extracting Requirements...',
          bg: 'bg-lavender-50',
          text: 'text-lavender-800',
          border: 'border-lavender-200',
          icon: Sparkles,
        };
      case 'matching':
        return {
          label: 'Matching with Vault...',
          bg: 'bg-amber-50',
          text: 'text-amber-800',
          border: 'border-amber-200',
          icon: RefreshCw,
        };
      case 'failed':
        return {
          label: 'Processing Failed',
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          icon: AlertTriangle,
        };
      case 'uploaded':
      default:
        return {
          label: 'Uploaded',
          bg: 'bg-[#F2EEFA]',
          text: 'text-[#7956B5]',
          border: 'border-[#E7E3EF]',
          icon: FileText,
        };
    }
  };

  const statusBadge = getStatusBadge(queryLetter.status);
  const StatusIcon = statusBadge.icon;

  return (
    <div className="space-y-6 rounded-2xl border border-[#E7E3EF] bg-white p-6 shadow-xs">
      {/* Query Letter Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7E3EF] pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-xl bg-[#F2EEFA] p-2 text-[#7956B5] border border-[#E7E3EF]">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-[#111111]">{queryLetter.file_name}</h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
            >
              <StatusIcon className={`h-3 w-3 ${queryLetter.status === 'extracting' || queryLetter.status === 'matching' ? 'animate-spin' : ''}`} />
              <span>{statusBadge.label}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
            {queryLetter.insurer_name && (
              <span>
                Insurer: <strong className="text-slate-800">{queryLetter.insurer_name}</strong>
              </span>
            )}
            {queryLetter.claim_number && (
              <span>
                Claim Ref: <strong className="font-mono text-slate-800">{queryLetter.claim_number}</strong>
              </span>
            )}
            <span>Uploaded: {formatDate(queryLetter.created_at)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReprocess}
            disabled={isReprocessing || queryLetter.status === 'extracting' || queryLetter.status === 'matching'}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isReprocessing ? 'animate-spin text-peach-500' : 'text-slate-500'}`} />
            <span>{isReprocessing ? 'Reprocessing AI...' : 'Retry / Re-evaluate'}</span>
          </button>
        </div>
      </div>

      {reprocessError && (
        <div className="flex items-center gap-2 rounded-xl border border-peach-200 bg-peach-50 p-3 text-xs text-peach-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-peach-600" />
          <span>{reprocessError}</span>
        </div>
      )}

      {queryLetter.error_message && (
        <div className="rounded-xl border border-peach-200 bg-peach-50/70 p-3.5 text-xs text-peach-900 space-y-1">
          <span className="font-bold block">Processing Failure Notice:</span>
          <p>{queryLetter.error_message}</p>
        </div>
      )}

      {/* Summary Scoreboard */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-center">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Requirements</span>
          <span className="block text-xl font-bold text-slate-900 mt-0.5">{points.length}</span>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-center">
          <span className="text-[11px] text-emerald-700 uppercase font-semibold">Available in Vault</span>
          <span className="block text-xl font-bold text-emerald-800 mt-0.5">{availableCount}</span>
        </div>
        <div className="rounded-xl border border-peach-200 bg-peach-50/60 p-3 text-center">
          <span className="text-[11px] text-peach-700 uppercase font-semibold">Missing Documents</span>
          <span className="block text-xl font-bold text-peach-800 mt-0.5">{missingCount}</span>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-center">
          <span className="text-[11px] text-amber-700 uppercase font-semibold">Needs Staff Review</span>
          <span className="block text-xl font-bold text-amber-800 mt-0.5">{reviewCount}</span>
        </div>
      </div>

      {/* Extracted Query Requirements & Document Matching Results (Feature 3 & 4) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Extracted Query Requirements & Evidence Matching
        </h4>

        {points.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
            {queryLetter.status === 'extracting' || queryLetter.status === 'matching' ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-lavender-700" />
                <span>Gemini AI is extracting requirements and matching against patient vault...</span>
              </div>
            ) : (
              <span>No query requirements extracted. Click &quot;Retry / Re-evaluate&quot; to parse again.</span>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {points.map((pt, idx) => {
              const badge = getDecisionBadge(pt.decision_status);
              const matchedDocs = pt.matched_documents || [];

              return (
                <div
                  key={pt.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3 hover:border-lavender-300 transition-colors"
                >
                  {/* Point Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-xs text-slate-700 bg-lavender-50 text-lavender-800 px-2 py-0.5 rounded border border-lavender-200">
                          {pt.document_category}
                        </span>
                      </div>
                      <p className="font-medium text-slate-900 text-xs leading-relaxed pt-1">
                        &quot;{pt.requirement_text}&quot;
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`rounded-md border px-2.5 py-1 text-xs font-bold ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Supporting Documents (Support Multiple Documents) */}
                  {matchedDocs.length > 0 && (
                    <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-[11px] space-y-1.5">
                      <span className="font-semibold text-slate-600 flex items-center gap-1">
                        <FolderLock className="h-3 w-3 text-lavender-700" />
                        <span>Supporting Document(s) in Vault ({matchedDocs.length}):</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {matchedDocs.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => handlePreviewSupportingDoc(doc)}
                            className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-slate-800 hover:border-lavender-400 hover:text-lavender-800 shadow-2xs transition-colors"
                          >
                            <FileCheck className="h-3 w-3 text-emerald-600" />
                            <span className="truncate max-w-[200px]">{doc.document_name}</span>
                            <Eye className="h-2.5 w-2.5 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evidence Quote & Medical Reasoning */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1 border-t border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-400 block uppercase text-[10px]">
                        Forensic Evidence Quote:
                      </span>
                      {pt.evidence_quote ? (
                        <blockquote className="mt-0.5 italic text-slate-700 bg-slate-50 p-2 rounded border-l-2 border-emerald-400">
                          &quot;{pt.evidence_quote}&quot;
                        </blockquote>
                      ) : (
                        <span className="text-slate-400 italic">No direct quote (Document missing from vault)</span>
                      )}
                    </div>

                    <div>
                      <span className="font-semibold text-slate-400 block uppercase text-[10px]">
                        Adjudication Reasoning:
                      </span>
                      <p className="mt-0.5 text-slate-700 leading-relaxed">
                        {pt.reasoning || 'Reasoning details not recorded.'}
                      </p>
                      {pt.confidence && (
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Confidence score: {Math.round(pt.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature 5: Patient Notification Draft Card */}
      <div className="rounded-2xl border border-[#E7E3EF] bg-[#F2EEFA]/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E3EF] pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-[#7956B5] p-2 text-white shadow-2xs">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#111111]">
                Patient Notification Message Draft
              </h4>
              <p className="text-[11px] text-[#6B7280]">
                Automated plain-language request requesting <strong className="text-[#7956B5]">ONLY genuinely missing items</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E3EF] bg-white px-3 py-1.5 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA] shadow-2xs transition-colors"
            >
              {hasCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#7956B5]" />
                  <span>Copy Message</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleRegenerateDraft}
              disabled={isRegeneratingDraft}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E3EF] bg-white px-3 py-1.5 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA] shadow-2xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRegeneratingDraft ? 'animate-spin text-[#7956B5]' : 'text-[#7956B5]'}`} />
              <span>{isRegeneratingDraft ? 'Regenerating...' : 'Regenerate'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditingDraft(!isEditingDraft)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E3EF] bg-white px-3 py-1.5 text-xs font-bold text-[#7956B5] hover:bg-[#F2EEFA] shadow-2xs transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>{isEditingDraft ? 'Cancel Edit' : 'Edit Draft'}</span>
            </button>
          </div>
        </div>

        {/* Draft Content Display / Editor */}
        {isEditingDraft ? (
          <div className="space-y-3">
            <textarea
              rows={8}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className="w-full rounded-xl border border-[#E7E3EF] p-3 text-xs text-[#111111] font-sans focus:border-[#7956B5] focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingDraft(false)}
                className="rounded-xl border border-[#E7E3EF] bg-white px-3 py-1.5 text-xs font-bold text-[#6B7280] hover:bg-[#F2EEFA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#111111] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#171417] disabled:opacity-50 shadow-2xs"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSavingDraft ? 'Saving...' : 'Save Draft Changes'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white p-4 border border-[#E7E3EF] text-xs text-[#111111] font-sans whitespace-pre-wrap leading-relaxed shadow-2xs">
            {draftContent || queryMessage?.message_content || 'No draft message generated yet.'}
          </div>
        )}

        {/* Feedback alerts */}
        {sendError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{sendError}</span>
          </div>
        )}
        {sendSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{sendSuccess}</span>
          </div>
        )}

        {/* Multi-Channel Delivery Tracking Cards */}
        <div className="pt-2 border-t border-[#E7E3EF] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-[#111111] text-xs flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-[#7956B5]" />
                <span>Automated Multi-Channel Notification Dispatch</span>
              </span>
              <p className="text-[11px] text-[#6B7280]">
                Independent real-time delivery tracking for WhatsApp and Gmail SMTP
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleSendNotifications()}
              disabled={isSendingNotification}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#111111] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#171417] shadow-2xs transition-colors disabled:opacity-50"
            >
              {isSendingNotification ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 text-[#B7A2DE]" />
                  <span>{whatsAppMessage || emailMessage ? 'Resend Notifications' : 'Dispatch Notifications'}</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* WhatsApp Channel Card */}
            <div className="rounded-xl border border-emerald-200 bg-white p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-800">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">Twilio WhatsApp</span>
                    <span className="text-[10px] text-slate-400">Sandbox messaging</span>
                  </div>
                </div>

                {whatsAppMessage ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      whatsAppMessage.delivery_status === 'sent' || whatsAppMessage.delivery_status === 'delivered'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : whatsAppMessage.delivery_status === 'failed'
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {whatsAppMessage.delivery_status === 'sent' || whatsAppMessage.delivery_status === 'delivered' ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    ) : whatsAppMessage.delivery_status === 'failed' ? (
                      <XCircle className="h-3 w-3 text-red-600" />
                    ) : (
                      <Clock className="h-3 w-3 text-amber-600" />
                    )}
                    <span className="capitalize">{whatsAppMessage.delivery_status}</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-200">
                    Not Dispatched
                  </span>
                )}
              </div>

              {whatsAppMessage && (
                <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Provider SID:</span>
                    <span className="font-mono text-slate-800 truncate max-w-[180px]">
                      {whatsAppMessage.provider_message_id || '—'}
                    </span>
                  </div>
                  {whatsAppMessage.sent_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sent At:</span>
                      <span className="font-medium text-slate-800">
                        {formatDateTime(whatsAppMessage.sent_at)}
                      </span>
                    </div>
                  )}
                  {whatsAppMessage.delivery_status === 'failed' && whatsAppMessage.provider_message_id && (
                    <div className="p-2 mt-1 rounded-lg bg-red-50 border border-red-100 text-[10px] text-red-700">
                      {whatsAppMessage.provider_message_id}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleSendNotifications('WhatsApp')}
                  disabled={isSendingNotification}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${isSendingNotification ? 'animate-spin' : ''}`} />
                  <span>{whatsAppMessage ? 'Retry WhatsApp' : 'Send WhatsApp'}</span>
                </button>
              </div>
            </div>

            {/* Email Channel Card */}
            <div className="rounded-xl border border-blue-200 bg-white p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-100 p-1.5 text-blue-800">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">Gmail SMTP Email</span>
                    <span className="text-[10px] text-slate-400">Nodemailer delivery</span>
                  </div>
                </div>

                {emailMessage ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      emailMessage.delivery_status === 'sent' || emailMessage.delivery_status === 'delivered'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : emailMessage.delivery_status === 'failed'
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {emailMessage.delivery_status === 'sent' || emailMessage.delivery_status === 'delivered' ? (
                      <CheckCircle2 className="h-3 w-3 text-blue-600" />
                    ) : emailMessage.delivery_status === 'failed' ? (
                      <XCircle className="h-3 w-3 text-red-600" />
                    ) : (
                      <Clock className="h-3 w-3 text-amber-600" />
                    )}
                    <span className="capitalize">{emailMessage.delivery_status}</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-200">
                    Not Dispatched
                  </span>
                )}
              </div>

              {emailMessage && (
                <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Message ID:</span>
                    <span className="font-mono text-slate-800 truncate max-w-[180px]">
                      {emailMessage.provider_message_id || '—'}
                    </span>
                  </div>
                  {emailMessage.sent_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sent At:</span>
                      <span className="font-medium text-slate-800">
                        {formatDateTime(emailMessage.sent_at)}
                      </span>
                    </div>
                  )}
                  {emailMessage.delivery_status === 'failed' && emailMessage.provider_message_id && (
                    <div className="p-2 mt-1 rounded-lg bg-red-50 border border-red-100 text-[10px] text-red-700">
                      {emailMessage.provider_message_id}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleSendNotifications('Email')}
                  disabled={isSendingNotification}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${isSendingNotification ? 'animate-spin' : ''}`} />
                  <span>{emailMessage ? 'Retry Email' : 'Send Email'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supporting Document Preview Modal */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.document_name || 'Supporting Document Preview'}
        description={`Category: ${previewDoc?.category}`}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {isLoadingSignedUrl ? (
            <div className="flex h-64 items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-[#7956B5]" />
            </div>
          ) : previewSignedUrl ? (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900/5">
              {previewDoc?.file_type?.includes('pdf') || previewDoc?.document_name.endsWith('.pdf') ? (
                <iframe
                  src={previewSignedUrl}
                  title="Supporting Document"
                  className="w-full h-[65vh] rounded-lg bg-white"
                />
              ) : (
                <div className="flex justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSignedUrl}
                    alt={previewDoc?.document_name}
                    className="max-h-[65vh] object-contain rounded-md"
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Could not generate signed preview URL.</p>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setPreviewDoc(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close Preview
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
