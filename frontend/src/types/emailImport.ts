export const APPLICATION_STATUSES = [
  'Applied',
  'Interviewing',
  'Offer',
  'Rejected',
  'Withdrawn',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface BackendApplication {
  _id: string;
  UserId?: string;
  Company: string;
  Role: string;
  ReferenceNumber?: string;
  Location?: string;
  Status: ApplicationStatus | string;
  SalaryHourly?: number;
  DateApplied?: string;
  JobLink?: string;
  Notes?: string;
  LastUpdated?: string;
}

export interface ApplicationLookup {
  id: string;
  company: string;
  role: string;
  status: string;
  dateApplied: string;
}

export interface ParsedEmail {
  event?: string | null;
  status?: ApplicationStatus | string | null;
  company?: string | null;
  role?: string | null;
  referenceNumber?: string | null;
  dateApplied?: string | null;
  requiresReview?: boolean;
}

export type MatchAction = 'create' | 'update' | 'review' | 'none';

export interface ApplicationMatch {
  action?: MatchAction;
  reason?: string;
  applicationId?: string | null;
  candidateIds?: string[];
  currentStatus?: string | null;
  proposedStatus?: string | null;
}

export interface EmailImportRecord {
  _id: string;
  UserId?: string;
  ResendEmailId?: string;
  From: string;
  Subject: string;
  BodyText?: string;
  BodyTruncated?: boolean;
  Parsed?: ParsedEmail;
  Match?: ApplicationMatch;
  ApplicationId?: string;
  Status: 'pending' | 'approved' | 'dismissed';
  CreatedAt?: string;
  LastUpdated?: string;
}

export interface EmailImportListResponse {
  data: EmailImportRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface EmailImportEditPayload {
  company?: string | null;
  role?: string | null;
  status?: ApplicationStatus | null;
  referenceNumber?: string | null;
  dateApplied?: string | null;
}

export type EmailImportApprovePayload =
  | Record<string, never>
  | { action: 'create' }
  | { applicationId: string };

export interface EmailImportApproveResponse {
  import: EmailImportRecord;
  application: BackendApplication | null;
}
