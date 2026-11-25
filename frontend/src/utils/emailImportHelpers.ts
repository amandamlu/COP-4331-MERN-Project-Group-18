import {
  APPLICATION_STATUSES,
  type ApplicationLookup,
  type ApplicationStatus,
  type EmailImportRecord,
} from '../types/emailImport';

const STATUS_SET = new Set<string>(APPLICATION_STATUSES);

export function isValidApplicationStatus(
  value: string | null | undefined,
): value is ApplicationStatus {
  return typeof value === 'string' && STATUS_SET.has(value);
}

export function getCompanyInitials(name: string | null | undefined): string {
  const cleaned = (name ?? '').trim();
  if (!cleaned) return '??';
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function getStatusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case 'Offer':
      return 'bg-success';
    case 'Interviewing':
      return 'bg-primary';
    case 'Applied':
      return 'bg-info text-dark';
    case 'Rejected':
      return 'bg-danger';
    case 'Withdrawn':
      return 'bg-secondary';
    default:
      return 'bg-warning text-dark';
  }
}

export function formatEmailDate(iso?: string): string {
  if (!iso) return 'Unknown date';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function needsReviewBeforeApprove(record: EmailImportRecord): boolean {
  const parsed = record.Parsed;
  if (!parsed) return true;
  if (parsed.requiresReview) return true;
  if (!parsed.company?.trim() || !parsed.role?.trim()) return true;
  if (!isValidApplicationStatus(parsed.status)) return true;
  if (record.Match?.action === 'review') return true;
  return false;
}

export interface MatchSummary {
  badgeLabel: string;
  badgeClass: string;
  description: string;
  requiresAction: boolean;
}

export function describeMatchReason(reason?: string): string {
  switch (reason) {
    case 'company_only_match':
      return 'Found existing application(s) at this company. Choose one to update or create a new application.';
    case 'multiple_matches':
      return 'Multiple matching applications were found. Choose which application to update.';
    case 'reference_conflict':
      return 'Reference number conflicts with an existing application. Review details or pick the right match.';
    case 'status_change_requires_review':
      return 'The existing application is already at a later or final status. Review the status or dismiss this email.';
    case 'missing_company_or_reference':
      return 'Company name could not be extracted from the email. Please fill in the missing details.';
    case 'uncertain_email_details':
      return 'Some extracted fields need verification before this import can be approved.';
    default:
      return 'Please review and confirm the extracted details before approving.';
  }
}

export function describeMatchAction(
  record: EmailImportRecord,
  appById: Map<string, ApplicationLookup>,
): MatchSummary {
  const parsed = record.Parsed;
  const match = record.Match;
  const matchedApp = match?.applicationId
    ? appById.get(String(match.applicationId))
    : undefined;
  const appLabel = matchedApp
    ? `${matchedApp.company} — ${matchedApp.role}`
    : 'existing application';

  if (parsed?.requiresReview || !parsed?.company || !parsed?.role || !isValidApplicationStatus(parsed?.status)) {
    return {
      badgeLabel: 'Needs Review',
      badgeClass: 'bg-warning text-dark',
      description: describeMatchReason(match?.reason ?? 'uncertain_email_details'),
      requiresAction: true,
    };
  }

  switch (match?.action) {
    case 'create':
      return {
        badgeLabel: 'Create New Application',
        badgeClass: 'bg-success-subtle text-success-emphasis border border-success-subtle',
        description: `Will create a new "${parsed.status}" application for ${parsed.company} (${parsed.role}).`,
        requiresAction: false,
      };
    case 'update':
      return {
        badgeLabel: 'Update Existing Application',
        badgeClass: 'bg-primary-subtle text-primary-emphasis border border-primary-subtle',
        description: `Will update ${appLabel} from ${match.currentStatus ?? 'current status'} to ${match.proposedStatus ?? parsed.status}.`,
        requiresAction: false,
      };
    case 'none':
      return {
        badgeLabel: 'No Status Change',
        badgeClass: 'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle',
        description: `${appLabel} is already marked "${match.currentStatus ?? parsed.status}". Approving records this email without changing the status.`,
        requiresAction: false,
      };
    case 'review':
    default:
      return {
        badgeLabel: 'Needs Review',
        badgeClass: 'bg-warning text-dark',
        description: describeMatchReason(match?.reason),
        requiresAction: true,
      };
  }
}
