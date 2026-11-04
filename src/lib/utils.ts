import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return dateString;
  }
}

export function maskPhoneNumber(phone: string): string {
  if (!phone) return '—';
  const cleaned = phone.trim();
  if (cleaned.length < 8) return cleaned;
  // Preserve country code / first 4 and last 3 chars
  const visibleStart = cleaned.slice(0, Math.min(5, cleaned.length - 4));
  const visibleEnd = cleaned.slice(-3);
  return `${visibleStart} •••• ${visibleEnd}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local.slice(0, 2)}•••${local.slice(-1)}@${domain}`;
}

export function getCategoryBadgeColor(category: string): { bg: string; text: string; border: string } {
  switch (category) {
    case 'Discharge Summary':
      return { bg: 'bg-lavender-100', text: 'text-lavender-800', border: 'border-lavender-200' };
    case 'Hospital Bill':
    case 'Pharmacy Bills':
      return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' };
    case 'Investigation Reports':
      return { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' };
    case 'KYC':
    case 'Cancelled Cheque':
      return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' };
    case 'Policy Copy':
      return { bg: 'bg-peach-100', text: 'text-peach-800', border: 'border-peach-200' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
  }
}

export function getDecisionBadge(status: string) {
  switch (status) {
    case 'available':
      return { label: 'Available', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'missing':
      return { label: 'Missing', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    case 'needs_review':
    default:
      return { label: 'Needs Review', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
  }
}

