/** Local Main-side AAMI Central contract. No provider connectivity is implied. */
export type CentralReportCategory = 'account' | 'order' | 'product' | 'zeeza' | 'safety' | 'privacy' | 'other';
export type CentralReportSourceType = 'order' | 'account' | 'product' | 'zeeza_message' | 'zeeza_room';
export type CentralReportStatus = 'submitted' | 'acknowledged' | 'in_review' | 'waiting' | 'resolved' | 'closed';

export interface CentralReportRequest {
  category: CentralReportCategory;
  summary: string;
  description: string;
  sourceType?: CentralReportSourceType;
  sourceId?: string;
}
export interface CentralReportUnavailableResponse {
  error: 'central_reporting_unavailable';
  message: string;
  retryable: true;
  requestId?: string;
  duplicateRequest?: boolean;
}
export interface CentralReportAcknowledgement {
  accepted: true;
  delivered: boolean;
  requestId: string;
  message?: string;
}

/** Fail closed: only a positive accepted+delivered response may be called delivery. */
export function isConfirmedCentralDelivery(value: unknown): value is CentralReportAcknowledgement & { delivered: true } {
  if (!value || typeof value !== 'object') return false;
  const response = value as Record<string, unknown>;
  return response.accepted === true && response.delivered === true && typeof response.requestId === 'string' && response.requestId.trim().length > 0;
}

export function normalizeCentralReportStatus(value: unknown): CentralReportStatus {
  const status = String(value || '').trim().toLowerCase();
  const map: Record<string, CentralReportStatus> = {
    submitted: 'submitted', acknowledged: 'acknowledged', received: 'acknowledged',
    open: 'in_review', reviewing: 'in_review', in_review: 'in_review',
    waiting: 'waiting', pending_user: 'waiting', resolved: 'resolved', closed: 'closed', dismissed: 'closed',
  };
  return map[status] || 'submitted';
}

/** Approved replies are rendered as plain text, normalized, bounded and control-cleaned. */
export function sanitizeApprovedCentralReply(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, 2000);
  return clean || null;
}
