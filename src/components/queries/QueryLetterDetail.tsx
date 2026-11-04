'use client';

import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
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
  ShieldCheck,
} from 'lucide-react';
import { QueryLetter, QueryPoint, Document, Message } from '@/types';
import { formatDate, formatDateTime, maskPhoneNumber, maskEmail, getDecisionBadge } from '@/lib/utils';
import { Modal } from '@/components/common/Modal';

interface QueryLetterDetailProps {
  queryLetter: QueryLetter & {
    query_points?: (QueryPoint & {
      matched_documents?: Document[];
    })[];
    messages?: Message[];
  };
  messages?: Message[];
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  onRefresh: () => void;
  userRole?: string;
}

export function QueryLetterDetail({
  queryLetter,
  messages = [],
  patientName,
  patientEmail,
  patientPhone,
  onRefresh,
  userRole = 'agent',
}: QueryLetterDetailProps) {
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessError, setReprocessError] = useState<string | null>(null);

  // Consolidate and sort messages latest first
  const allMessages = [
    ...(queryLetter.messages || []),
    ...(messages || []),
  ].filter((m, idx, self) => self.findIndex((x) => x.id === m.id) === idx);

  const sortedMessages = [...allMessages].sort((a, b) => {
    const timeA = new Date(a.sent_at || a.created_at || 0).getTime();
    const timeB = new Date(b.sent_at || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  const whatsAppMessage = sortedMessages.find(
    (m) => m.query_letter_id === queryLetter.id && m.channel === 'WhatsApp'
  );
  const emailMessage = sortedMessages.find(
    (m) => m.query_letter_id === queryLetter.id && m.channel === 'Email'
  );

  // Contact unmasking toggles
  const [revealEmail, setRevealEmail] = useState(false);
  const [revealPhone, setRevealPhone] = useState(false);

  // Message draft state
  const queryMessage = emailMessage || whatsAppMessage;
  const [draftContent, setDraftContent] = useState(queryMessage?.message_content || '');
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isRegeneratingDraft, setIsRegeneratingDraft] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // Manual Notification Dispatch State
  const [isDispatchingEmail, setIsDispatchingEmail] = useState(false);
  const [isDispatchingWhatsApp, setIsDispatchingWhatsApp] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  // Filter state for requirements
  const [activeFilter, setActiveFilter] = useState<'all' | 'missing' | 'available' | 'needs_review'>('all');

  // Preview supporting doc modal
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
  const [isLoadingSignedUrl, setIsLoadingSignedUrl] = useState(false);

  // Preview original query letter
  const [isPreviewingLetter, setIsPreviewingLetter] = useState(false);

  const points = queryLetter.query_points || [];
  const availableCount = points.filter((p) => p.decision_status === 'available').length;
  const missingCount = points.filter((p) => p.decision_status === 'missing').length;
  const reviewCount = points.filter((p) => p.decision_status === 'needs_review').length;

  const filteredPoints = points.filter((p) => {
    if (activeFilter === 'all') return true;
    return p.decision_status === activeFilter;
  });

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

  const handleManualDispatch = async (channel: 'Email' | 'WhatsApp') => {
    if (channel === 'Email') setIsDispatchingEmail(true);
    if (channel === 'WhatsApp') setIsDispatchingWhatsApp(true);
    setDispatchError(null);
    setDispatchSuccess(null);

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
        throw new Error(data.error || `Failed to dispatch ${channel} notification.`);
      }

      const outcome = channel === 'Email' ? data.result?.email : data.result?.whatsapp;

      if (outcome?.status === 'sent') {
        const idText = outcome.providerId ? ` (ID: ${outcome.providerId})` : '';
        setDispatchSuccess(`${channel} sent successfully${idText}!`);
      } else if (outcome?.status === 'failed') {
        setDispatchError(outcome.error || `${channel} delivery failed.`);
      } else {
        setDispatchSuccess(`Notification action processed: ${outcome?.status || 'dispatched'}`);
      }

      onRefresh();
    } catch (err: any) {
      setDispatchError(err.message || `Failed to dispatch ${channel}`);
    } finally {
      if (channel === 'Email') setIsDispatchingEmail(false);
      if (channel === 'WhatsApp') setIsDispatchingWhatsApp(false);
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
          bg: 'bg-[#F2EEFA]',
          text: 'text-[#7956B5]',
          border: 'border-[#E7E3EF]',
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
    <div className="space-y-6 rounded-2xl border border-[#E7E3EF] bg-white p-6 shadow-2xs">
      {/* 1. Query Letter Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7E3EF] pb-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-xl bg-[#F2EEFA] p-2 text-[#7956B5] border border-[#E7E3EF]">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="text-base font-black text-[#111111]">{queryLetter.file_name}</h3>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
            >
              <StatusIcon className={`h-3 w-3 ${queryLetter.status === 'extracting' || queryLetter.status === 'matching' ? 'animate-spin' : ''}`} />
              <span>{statusBadge.label}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280] pt-1">
            {queryLetter.insurer_name && (
              <span>
                Insurer: <strong className="text-[#111111]">{queryLetter.insurer_name}</strong>
              </span>
            )}
            {queryLetter.claim_number && (
              <span>
                Claim Ref: <strong className="font-mono text-[#111111]">{queryLetter.claim_number}</strong>
              </span>
            )}
            <span>
              Uploaded: <strong className="text-[#111111]">{formatDate(queryLetter.created_at)}</strong>
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePreviewOriginalLetter}
            disabled={isPreviewingLetter}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E3EF] bg-white px-3.5 py-2 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA] shadow-2xs transition-colors disabled:opacity-50"
          >
            <Eye className="h-3.5 w-3.5 text-[#7956B5]" />
            <span>{isPreviewingLetter ? 'Loading...' : 'View Original Letter'}</span>
          </button>

          <button
            type="button"
            onClick={handleReprocess}
            disabled={isReprocessing || queryLetter.status === 'extracting' || queryLetter.status === 'matching'}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#111111] px-4 py-2 text-xs font-bold text-white hover:bg-[#171417] shadow-2xs transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#B7A2DE] ${isReprocessing ? 'animate-spin' : ''}`} />
            <span>{isReprocessing ? 'Reprocessing AI...' : 'Reprocess Letter'}</span>
          </button>
        </div>
      </div>

      {reprocessError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{reprocessError}</span>
        </div>
      )}

      {/* 2. PROMINENT NOTIFICATION DELIVERY & OUTREACH SECTION */}
      <div className="rounded-2xl border border-[#E7E3EF] bg-[#F8F7FB] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E3EF] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-[#111111] p-2 text-white">
              <Send className="h-4 w-4 text-[#B7A2DE]" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#111111]">
                Notification Delivery & Patient Outreach
              </h4>
              <p className="text-xs text-[#6B7280]">
                Automatic multi-channel dispatch status triggered upon query matching
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {missingCount === 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Zero Missing Items (No Outreach Needed)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-red-800">
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                <span>{missingCount} Missing Item{missingCount > 1 ? 's' : ''} Requiring Patient Action</span>
              </span>
            )}
          </div>
        </div>

        {/* Global Feedback Banners */}
        {dispatchSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{dispatchSuccess}</span>
          </div>
        )}
        {dispatchError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{dispatchError}</span>
          </div>
        )}

        {/* Zero Missing Items Reassurance */}
        {missingCount === 0 && (
          <div className="rounded-xl border border-emerald-200 bg-white p-4 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>All Requested Requirements Are Available in Vault</span>
            </div>
            <p className="text-[#6B7280] pl-6 leading-relaxed">
              Care.locker verified all insurer requirements against existing medical records.
              No notification email or WhatsApp was dispatched to the patient because no documents are missing.
            </p>
          </div>
        )}

        {/* Delivery Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Channel 1: Gmail SMTP Email Card */}
          <div className="rounded-xl border border-[#E7E3EF] bg-white p-4.5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#E7E3EF] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-[#F2EEFA] p-2 text-[#7956B5] border border-[#E7E3EF]">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-[#111111]">Gmail SMTP Email</h5>
                  <span className="text-[11px] text-[#6B7280]">Direct patient email delivery</span>
                </div>
              </div>

              {/* Status Badge */}
              {emailMessage ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                    emailMessage.delivery_status === 'sent' || emailMessage.delivery_status === 'delivered'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : emailMessage.delivery_status === 'failed'
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {emailMessage.delivery_status === 'sent' || emailMessage.delivery_status === 'delivered' ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  ) : emailMessage.delivery_status === 'failed' ? (
                    <XCircle className="h-3 w-3 text-red-600" />
                  ) : (
                    <Clock className="h-3 w-3 text-amber-600" />
                  )}
                  <span className="capitalize">{emailMessage.delivery_status === 'sent' ? 'Sent via SMTP' : emailMessage.delivery_status}</span>
                </span>
              ) : (
                <span className="rounded-full bg-[#F8F7FB] px-2.5 py-0.5 text-[11px] font-bold text-[#6B7280] border border-[#E7E3EF]">
                  Not Dispatched
                </span>
              )}
            </div>

            {/* Recipient Info */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] font-medium">Patient Recipient:</span>
                {patientEmail ? (
                  <div className="flex items-center gap-1.5 font-bold text-[#111111]">
                    <span>{revealEmail ? patientEmail : maskEmail(patientEmail)}</span>
                    <button
                      type="button"
                      onClick={() => setRevealEmail(!revealEmail)}
                      className="text-[#7956B5] hover:text-[#111111]"
                      title={revealEmail ? 'Mask email' : 'Reveal email'}
                    >
                      {revealEmail ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                ) : (
                  <span className="text-red-600 font-bold">No Email On File</span>
                )}
              </div>

              {emailMessage?.sent_at && (
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280] font-medium">Last Sent:</span>
                  <span className="font-bold text-[#111111]">
                    {formatDateTime(emailMessage.sent_at)}
                  </span>
                </div>
              )}

              {emailMessage?.provider_message_id && !emailMessage.provider_message_id.startsWith('ERROR:') && (
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280] font-medium">Provider ID:</span>
                  <span className="font-mono text-[11px] text-[#7956B5] font-bold truncate max-w-[200px]" title={emailMessage.provider_message_id}>
                    {emailMessage.provider_message_id}
                  </span>
                </div>
              )}

              {/* Error Notice */}
              {emailMessage?.delivery_status === 'failed' && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-800 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <span>Provider Delivery Error:</span>
                  </div>
                  <p className="pl-4.5 font-mono text-[10px] break-all">
                    {emailMessage.provider_message_id?.replace(/^ERROR:\s*/, '') || 'SMTP transaction rejected'}
                  </p>
                </div>
              )}

              {!patientEmail && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                  Patient email is missing. Add an email to the patient profile to enable automated delivery.
                </div>
              )}
            </div>

            {/* Email Actions */}
            <div className="border-t border-[#E7E3EF] pt-3 flex items-center justify-between">
              <span className="text-[11px] text-[#6B7280]">
                {emailMessage?.delivery_status === 'sent' ? 'Delivered to inbox' : 'Manual send fallback'}
              </span>

              <button
                type="button"
                onClick={() => handleManualDispatch('Email')}
                disabled={isDispatchingEmail || !patientEmail}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#111111] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#171417] shadow-2xs transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {isDispatchingEmail ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#B7A2DE]" />
                    <span>Sending Email...</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-3.5 w-3.5 text-[#B7A2DE]" />
                    <span>{emailMessage?.delivery_status === 'sent' ? 'Resend Email' : emailMessage ? 'Retry Email' : 'Send Email'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Channel 2: Twilio WhatsApp Card */}
          <div className="rounded-xl border border-[#E7E3EF] bg-white p-4.5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#E7E3EF] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700 border border-emerald-200">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-[#111111]">Twilio WhatsApp</h5>
                  <span className="text-[11px] text-[#6B7280]">Sandbox mobile notification</span>
                </div>
              </div>

              {/* Status Badge */}
              {whatsAppMessage ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
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
                <span className="rounded-full bg-[#F8F7FB] px-2.5 py-0.5 text-[11px] font-bold text-[#6B7280] border border-[#E7E3EF]">
                  Not Dispatched
                </span>
              )}
            </div>

            {/* Recipient Info */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] font-medium">Phone Recipient:</span>
                {patientPhone ? (
                  <div className="flex items-center gap-1.5 font-bold text-[#111111] font-mono">
                    <span>{revealPhone ? patientPhone : maskPhoneNumber(patientPhone)}</span>
                    <button
                      type="button"
                      onClick={() => setRevealPhone(!revealPhone)}
                      className="text-[#7956B5] hover:text-[#111111]"
                      title={revealPhone ? 'Mask phone' : 'Reveal phone'}
                    >
                      {revealPhone ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                ) : (
                  <span className="text-red-600 font-bold">No Phone On File</span>
                )}
              </div>

              {whatsAppMessage?.sent_at && (
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280] font-medium">Last Sent:</span>
                  <span className="font-bold text-[#111111]">
                    {formatDateTime(whatsAppMessage.sent_at)}
                  </span>
                </div>
              )}

              {whatsAppMessage?.provider_message_id && !whatsAppMessage.provider_message_id.startsWith('ERROR:') && (
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280] font-medium">Twilio SID:</span>
                  <span className="font-mono text-[11px] text-emerald-700 font-bold truncate max-w-[200px]" title={whatsAppMessage.provider_message_id}>
                    {whatsAppMessage.provider_message_id}
                  </span>
                </div>
              )}

              {whatsAppMessage?.delivery_status === 'failed' && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-800 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <span>WhatsApp Error:</span>
                  </div>
                  <p className="pl-4.5 font-mono text-[10px] break-all">
                    {whatsAppMessage.provider_message_id?.replace(/^ERROR:\s*/, '') || 'Twilio rejected recipient'}
                  </p>
                </div>
              )}
            </div>

            {/* WhatsApp Actions */}
            <div className="border-t border-[#E7E3EF] pt-3 flex items-center justify-between">
              <span className="text-[11px] text-[#6B7280]">Independent mobile channel</span>

              <button
                type="button"
                onClick={() => handleManualDispatch('WhatsApp')}
                disabled={isDispatchingWhatsApp || !patientPhone}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E3EF] bg-white px-3.5 py-1.5 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA] shadow-2xs transition-all disabled:opacity-50"
              >
                {isDispatchingWhatsApp ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7956B5]" />
                    <span>Sending WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <Phone className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{whatsAppMessage?.delivery_status === 'sent' ? 'Resend WhatsApp' : whatsAppMessage ? 'Retry WhatsApp' : 'Send WhatsApp'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Query Points Scoreboard & Filter Tabs */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border border-[#E7E3EF] bg-white p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
              Total Requirements
            </span>
            <p className="mt-1 text-2xl font-black text-[#111111]">{points.length}</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Verified Available
            </span>
            <p className="mt-1 text-2xl font-black text-emerald-700">{availableCount}</p>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50/60 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-800">
              Missing Documents
            </span>
            <p className="mt-1 text-2xl font-black text-red-700">{missingCount}</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Needs Review
            </span>
            <p className="mt-1 text-2xl font-black text-amber-700">{reviewCount}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E7E3EF] pb-3">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              activeFilter === 'all'
                ? 'bg-[#111111] text-white shadow-2xs'
                : 'bg-white text-[#6B7280] border border-[#E7E3EF] hover:bg-[#F2EEFA]'
            }`}
          >
            All Points ({points.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('missing')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              activeFilter === 'missing'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
            }`}
          >
            Missing Only ({missingCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('available')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              activeFilter === 'available'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            Available ({availableCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('needs_review')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              activeFilter === 'needs_review'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            Needs Review ({reviewCount})
          </button>
        </div>

        {/* Requirements List */}
        {filteredPoints.length === 0 ? (
          <div className="rounded-xl border border-[#E7E3EF] bg-[#F8F7FB] p-8 text-center text-xs text-[#6B7280]">
            No requirements match the selected filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPoints.map((pt, idx) => {
              const badge = getDecisionBadge(pt.decision_status);
              return (
                <div
                  key={pt.id || idx}
                  className="rounded-xl border border-[#E7E3EF] bg-white p-4 space-y-3 hover:border-[#7956B5] transition-colors shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#7956B5]">
                          #{idx + 1}
                        </span>
                        <span className="rounded-md bg-[#F2EEFA] border border-[#E7E3EF] px-2 py-0.5 text-[10px] font-bold text-[#7956B5]">
                          {pt.document_category}
                        </span>
                        {pt.confidence !== null && pt.confidence !== undefined && (
                          <span className="text-[10px] font-mono text-[#6B7280]">
                            Confidence: {Math.round(pt.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-[#111111] leading-relaxed pt-1">
                        &ldquo;{pt.requirement_text}&rdquo;
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border uppercase tracking-wider shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {pt.decision_status === 'available' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : pt.decision_status === 'missing' ? (
                        <XCircle className="h-3.5 w-3.5 text-red-600" />
                      ) : (
                        <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                      )}
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* AI Evidence Quote & Reasoning */}
                  {pt.reasoning && (
                    <div className="rounded-lg bg-[#F8F7FB] p-3 text-xs border border-[#E7E3EF] space-y-1.5">
                      <div className="font-bold text-[#111111] flex items-center gap-1.5 text-[11px]">
                        <Sparkles className="h-3.5 w-3.5 text-[#7956B5]" />
                        <span>Clinical AI Matching Evidence</span>
                      </div>
                      <p className="text-[#6B7280] leading-relaxed pl-5">
                        {pt.reasoning}
                      </p>
                      {pt.evidence_quote && (
                        <blockquote className="border-l-2 border-[#7956B5] pl-3 italic text-[11px] text-[#111111] my-1 ml-5">
                          &ldquo;{pt.evidence_quote}&rdquo;
                        </blockquote>
                      )}
                    </div>
                  )}

                  {/* Matched Supporting Documents */}
                  {pt.matched_documents && pt.matched_documents.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-bold text-[#6B7280]">
                        Supporting Vault Documents:
                      </span>
                      {pt.matched_documents.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => handlePreviewSupportingDoc(doc)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E7E3EF] bg-white px-2.5 py-1 text-[11px] font-bold text-[#111111] hover:bg-[#F2EEFA] transition-colors"
                        >
                          <FileCheck className="h-3 w-3 text-[#7956B5]" />
                          <span>{doc.document_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. PATIENT-FRIENDLY NOTIFICATION DRAFT PREVIEW & EDITOR */}
      <div className="rounded-2xl border border-[#E7E3EF] bg-white p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E3EF] pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-[#F2EEFA] p-2 text-[#7956B5] border border-[#E7E3EF]">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#111111]">
                Patient-Friendly Notification Draft
              </h4>
              <p className="text-[11px] text-[#6B7280]">
                Pre-composed message sent automatically across WhatsApp and Gmail SMTP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E3EF] bg-white px-3 py-1.5 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA] shadow-2xs transition-colors"
            >
              {hasCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-[#7956B5]" />}
              <span>{hasCopied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleRegenerateDraft}
              disabled={isRegeneratingDraft}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E3EF] bg-white px-3 py-1.5 text-xs font-bold text-[#111111] hover:bg-[#F2EEFA] shadow-2xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#7956B5] ${isRegeneratingDraft ? 'animate-spin' : ''}`} />
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
                <span>{isSavingDraft ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-[#F8F7FB] p-4 border border-[#E7E3EF] text-xs text-[#111111] font-sans whitespace-pre-wrap leading-relaxed shadow-2xs">
            {draftContent || queryMessage?.message_content || 'No draft message generated yet.'}
          </div>
        )}
      </div>

      {/* Supporting Document Preview Modal */}
      {previewDoc && (
        <Modal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          title={`Supporting Evidence: ${previewDoc.document_name}`}
          description={`Category: ${previewDoc.category}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {isLoadingSignedUrl ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#7956B5]" />
                <p className="text-xs text-[#6B7280]">Generating temporary signed preview link...</p>
              </div>
            ) : previewSignedUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-[#F8F7FB] p-3 border border-[#E7E3EF]">
                  <span className="font-bold text-[#111111]">{previewDoc.document_name}</span>
                  <a
                    href={previewSignedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#7956B5] hover:underline"
                  >
                    <span>Open in new tab</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                {previewDoc.ai_summary && (
                  <div className="rounded-xl bg-[#F2EEFA]/50 border border-[#E7E3EF] p-4 space-y-2">
                    <span className="font-bold text-[#7956B5] block">AI Clinical Summary:</span>
                    <p className="text-[#111111] leading-relaxed">
                      {(previewDoc.ai_summary as any)?.summary || 'Summary generated by Gemini multimodal pipeline.'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-600">Failed to load preview for this document.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
