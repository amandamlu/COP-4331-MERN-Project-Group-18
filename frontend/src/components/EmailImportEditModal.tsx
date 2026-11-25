import { useState, useEffect, type FormEvent } from 'react';
import type { ApproveResult } from '../hooks/useEmailImports';
import { ApiError } from '../services/apiClient';
import {
  APPLICATION_STATUSES,
  type ApplicationLookup,
  type ApplicationStatus,
  type EmailImportApprovePayload,
  type EmailImportEditPayload,
  type EmailImportRecord,
} from '../types/emailImport';
import {
  describeMatchAction,
  formatEmailDate,
  isValidApplicationStatus,
} from '../utils/emailImportHelpers';

interface EmailImportEditModalProps {
  record: EmailImportRecord;
  initialNotice?: string | null;
  appById: Map<string, ApplicationLookup>;
  onFetchDetails: (id: string) => Promise<EmailImportRecord>;
  onSaveEdit: (
    id: string,
    payload: EmailImportEditPayload,
  ) => Promise<EmailImportRecord>;
  onApprove: (
    id: string,
    payload?: EmailImportApprovePayload,
  ) => Promise<ApproveResult>;
  onDismiss: (id: string) => Promise<void>;
  onClose: () => void;
  onSuccessMessage: (message: string) => void;
}

function getDefaultTargetChoice(record: EmailImportRecord): string {
  const match = record.Match;
  if (!match) return 'auto';
  if (match.action === 'review') {
    const candidates = match.candidateIds ?? [];
    if (candidates.length === 1) return `app:${candidates[0]}`;
    if (match.reason === 'company_only_match') return 'create';
    if (candidates.length > 0) return `app:${candidates[0]}`;
  }
  return 'auto';
}

function EmailImportEditModal({
  record: initialRecord,
  initialNotice,
  appById,
  onFetchDetails,
  onSaveEdit,
  onApprove,
  onDismiss,
  onClose,
  onSuccessMessage,
}: EmailImportEditModalProps) {
  const [record, setRecord] = useState<EmailImportRecord>(initialRecord);
  const [isLoadingDetails, setIsLoadingDetails] = useState(
    initialRecord.BodyText === undefined,
  );

  // Editable form state
  const [company, setCompany] = useState(initialRecord.Parsed?.company ?? '');
  const [role, setRole] = useState(initialRecord.Parsed?.role ?? '');
  const [status, setStatus] = useState<ApplicationStatus>(
    isValidApplicationStatus(initialRecord.Parsed?.status)
      ? initialRecord.Parsed.status
      : 'Applied',
  );
  const [dateApplied, setDateApplied] = useState(
    initialRecord.Parsed?.dateApplied ?? '',
  );
  const [referenceNumber, setReferenceNumber] = useState(
    initialRecord.Parsed?.referenceNumber ?? '',
  );
  const [isDirty, setIsDirty] = useState(false);

  // Target selection for ambiguous matches ('auto' | 'create' | 'app:<id>')
  const [targetChoice, setTargetChoice] = useState<string>(() =>
    getDefaultTargetChoice(initialRecord),
  );

  const [showEmailBody, setShowEmailBody] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialNotice ?? null,
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDetails() {
      setIsLoadingDetails(true);
      try {
        const detailed = await onFetchDetails(initialRecord._id);
        if (cancelled) return;
        setRecord(detailed);
        setTargetChoice(getDefaultTargetChoice(detailed));
        // Hydrate form if user hasn't started editing yet
        setCompany((prev) => prev || detailed.Parsed?.company || '');
        setRole((prev) => prev || detailed.Parsed?.role || '');
        if (isValidApplicationStatus(detailed.Parsed?.status) && !initialRecord.Parsed?.status) {
          setStatus(detailed.Parsed.status);
        }
        setDateApplied((prev) => prev || detailed.Parsed?.dateApplied || '');
        setReferenceNumber(
          (prev) => prev || detailed.Parsed?.referenceNumber || '',
        );
      } catch {
        // Non-fatal: user can still edit fields from the list summary
      } finally {
        if (!cancelled) setIsLoadingDetails(false);
      }
    }
    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [initialRecord._id, initialRecord.Parsed?.status, onFetchDetails]);

  const matchSummary = describeMatchAction(record, appById);
  const candidateIds = record.Match?.candidateIds ?? [];
  const showTargetPicker =
    record.Match?.action === 'review' &&
    (candidateIds.length > 0 || record.Match?.reason === 'company_only_match');
  const canCreateNewChoice =
    record.Match?.action === 'create' ||
    record.Match?.reason === 'company_only_match';

  function buildEditPayload(): EmailImportEditPayload | null {
    const trimmedCompany = company.trim();
    const trimmedRole = role.trim();
    const trimmedDate = dateApplied.trim();
    const trimmedRef = referenceNumber.trim();

    if (!trimmedCompany || !trimmedRole) {
      setErrorMessage('Company and Role are required.');
      return null;
    }

    if (trimmedDate && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setErrorMessage('Date Applied must be in YYYY-MM-DD format.');
      return null;
    }

    return {
      company: trimmedCompany,
      role: trimmedRole,
      status,
      dateApplied: trimmedDate || null,
      referenceNumber: trimmedRef || null,
    };
  }

  function buildApprovePayload(latestRecord: EmailImportRecord): EmailImportApprovePayload {
    const match = latestRecord.Match;
    if (match?.action === 'review') {
      if (targetChoice === 'create' && match.reason === 'company_only_match') {
        return { action: 'create' };
      }
      if (targetChoice.startsWith('app:')) {
        return { applicationId: targetChoice.slice(4) };
      }
    }
    return {};
  }

  async function handleSaveOnly(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSavedNotice(null);

    const payload = buildEditPayload();
    if (!payload) return;

    setIsSubmitting(true);
    try {
      const updated = await onSaveEdit(record._id, payload);
      setRecord((prev) => ({ ...prev, ...updated }));
      setTargetChoice(getDefaultTargetChoice(updated));
      setIsDirty(false);
      setSavedNotice('Changes saved and application match refreshed.');
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Failed to save changes.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveAndApprove() {
    setErrorMessage(null);
    setSavedNotice(null);

    const payload = buildEditPayload();
    if (!payload) return;

    setIsSubmitting(true);
    try {
      let latest = record;

      // Always PATCH if user edited fields OR backend requires confirmation (requiresReview / unparsed)
      if (isDirty || !record.Parsed || record.Parsed.requiresReview) {
        const updated = await onSaveEdit(record._id, payload);
        latest = { ...record, ...updated };
        setRecord(latest);
        setIsDirty(false);

        // If the freshly recomputed match now needs disambiguation that wasn't shown before,
        // stop here so the user can pick the right application instead of getting a surprise 409.
        if (
          latest.Match?.action === 'review' &&
          record.Match?.action !== 'review'
        ) {
          setTargetChoice(getDefaultTargetChoice(latest));
          setErrorMessage(
            'Changes saved! Please select how you want to apply this match below, then click Save & Approve again.',
          );
          setIsSubmitting(false);
          return;
        }
      }

      const approvePayload = buildApprovePayload(latest);
      const result = await onApprove(record._id, approvePayload);

      if (result.ok) {
        const app = result.application;
        const actionVerb =
          result.importRecord?.Match?.action === 'create'
            ? 'Created application'
            : result.importRecord?.Match?.action === 'update'
              ? 'Updated application'
              : 'Approved email import';
        const label = app ? `${app.Company} — ${app.Role} (${app.Status})` : company.trim();
        onSuccessMessage(`${actionVerb}: ${label}.`);
        onClose();
        return;
      }

      if (result.match) {
        const refreshed = { ...latest, Match: result.match };
        setRecord(refreshed);
        setTargetChoice(getDefaultTargetChoice(refreshed));
      }
      setErrorMessage(result.error || 'Could not approve email import.');
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Could not complete approval.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDismissClick() {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onDismiss(record._id);
      onSuccessMessage('Email import dismissed.');
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Failed to dismiss email import.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="email-edit-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-edit-modal-title"
    >
      <div className="email-edit-dialog card shadow-lg border-0 rounded-4">
        <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-3 px-4 rounded-top-4">
          <div>
            <h3 id="email-edit-modal-title" className="h5 fw-bold mb-0">
              <i className="bi bi-pencil-square text-primary me-2"></i>
              Review &amp; Edit Email Import
            </h3>
            <div className="text-secondary small text-truncate" style={{ maxWidth: '460px' }}>
              {record.Subject || '(No subject)'}
            </div>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={onClose}
            disabled={isSubmitting}
          ></button>
        </div>

        <form onSubmit={(e) => void handleSaveOnly(e)}>
          <div className="card-body px-4 py-3 email-edit-body">
            {errorMessage && (
              <div className="alert alert-warning py-2 small mb-3" role="alert">
                <i className="bi bi-exclamation-circle me-2"></i>
                {errorMessage}
              </div>
            )}

            {savedNotice && (
              <div className="alert alert-success py-2 small mb-3" role="status">
                <i className="bi bi-check-circle me-2"></i>
                {savedNotice}
              </div>
            )}

            {/* Suggested Match Banner */}
            <div className="p-3 rounded-3 bg-light border mb-3">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
                <span className="small fw-semibold text-uppercase text-secondary">
                  Suggested Action
                </span>
                <span className={`badge ${matchSummary.badgeClass}`}>
                  {matchSummary.badgeLabel}
                </span>
              </div>
              <p className="small mb-0 text-dark">{matchSummary.description}</p>
            </div>

            {/* Editable Extracted Fields */}
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label htmlFor="edit-import-company" className="form-label small fw-semibold">
                  Company <span className="text-danger">*</span>
                </label>
                <input
                  id="edit-import-company"
                  type="text"
                  className="form-control"
                  maxLength={200}
                  value={company}
                  onChange={(e) => {
                    setCompany(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="e.g. Google"
                  required
                />
              </div>

              <div className="col-md-6">
                <label htmlFor="edit-import-role" className="form-label small fw-semibold">
                  Position / Role <span className="text-danger">*</span>
                </label>
                <input
                  id="edit-import-role"
                  type="text"
                  className="form-control"
                  maxLength={200}
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="e.g. Software Engineering Intern"
                  required
                />
              </div>

              <div className="col-md-4">
                <label htmlFor="edit-import-status" className="form-label small fw-semibold">
                  Status <span className="text-danger">*</span>
                </label>
                <select
                  id="edit-import-status"
                  className="form-select"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as ApplicationStatus);
                    setIsDirty(true);
                  }}
                >
                  {APPLICATION_STATUSES.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label htmlFor="edit-import-date" className="form-label small fw-semibold">
                  Date Applied
                </label>
                <input
                  id="edit-import-date"
                  type="date"
                  className="form-control"
                  value={dateApplied}
                  onChange={(e) => {
                    setDateApplied(e.target.value);
                    setIsDirty(true);
                  }}
                />
              </div>

              <div className="col-md-4">
                <label htmlFor="edit-import-ref" className="form-label small fw-semibold">
                  Reference #
                </label>
                <input
                  id="edit-import-ref"
                  type="text"
                  className="form-control"
                  maxLength={80}
                  value={referenceNumber}
                  onChange={(e) => {
                    setReferenceNumber(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Optional (e.g. REQ-42)"
                />
              </div>
            </div>

            {/* Target Application Selection when Ambiguous */}
            {showTargetPicker && (
              <div className="p-3 rounded-3 border border-warning bg-warning-subtle mb-3">
                <div className="fw-semibold small mb-2">
                  <i className="bi bi-diagram-3 me-1"></i>
                  Choose how to apply this email:
                </div>
                <div className="d-flex flex-column gap-2">
                  {candidateIds.map((candidateId) => {
                    const app = appById.get(String(candidateId));
                    const value = `app:${candidateId}`;
                    return (
                      <label
                        key={candidateId}
                        className="form-check p-2 ps-4 rounded bg-white border mb-0"
                        style={{ cursor: 'pointer' }}
                      >
                        <input
                          className="form-check-input"
                          type="radio"
                          name="targetApplication"
                          value={value}
                          checked={targetChoice === value}
                          onChange={() => setTargetChoice(value)}
                        />
                        <span className="form-check-label small d-block">
                          <strong>
                            Update existing:{' '}
                            {app ? `${app.company} — ${app.role}` : `Application ${candidateId}`}
                          </strong>
                          {app && (
                            <span className="text-secondary d-block">
                              Current status: {app.status}
                              {app.dateApplied ? ` • Applied ${app.dateApplied}` : ''}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}

                  {canCreateNewChoice && (
                    <label
                      className="form-check p-2 ps-4 rounded bg-white border mb-0"
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        className="form-check-input"
                        type="radio"
                        name="targetApplication"
                        value="create"
                        checked={targetChoice === 'create'}
                        onChange={() => setTargetChoice('create')}
                      />
                      <span className="form-check-label small d-block">
                        <strong>Create a brand-new application</strong>
                        <span className="text-secondary d-block">
                          Keep existing application(s) separate and add a new entry.
                        </span>
                      </span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Collapsible Original Email Content */}
            <div className="border rounded-3 p-3 bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <div className="small">
                  <strong>From:</strong> {record.From || 'Unknown sender'}
                  <span className="text-secondary ms-2">
                    • {formatEmailDate(record.CreatedAt)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none p-0"
                  onClick={() => setShowEmailBody((prev) => !prev)}
                >
                  {showEmailBody ? 'Hide email body' : 'View email body'}
                </button>
              </div>

              {showEmailBody && (
                <div className="mt-2 pt-2 border-top">
                  {isLoadingDetails ? (
                    <div className="text-secondary small">Loading email text...</div>
                  ) : (
                    <>
                      {record.BodyTruncated && (
                        <div className="badge bg-warning text-dark mb-2">
                          Email body was truncated for length
                        </div>
                      )}
                      <pre className="email-body-preview mb-0">
                        {record.BodyText || '(Email body is empty)'}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card-footer bg-white border-top d-flex justify-content-between align-items-center flex-wrap gap-2 py-3 px-4 rounded-bottom-4">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => void handleDismissClick()}
              disabled={isSubmitting}
            >
              <i className="bi bi-x-circle me-1"></i>
              Dismiss
            </button>

            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Back to Deck
              </button>
              <button
                type="submit"
                className="btn btn-outline-primary btn-sm"
                disabled={isSubmitting}
              >
                <i className="bi bi-floppy me-1"></i>
                Save Changes
              </button>
              <button
                type="button"
                className="btn btn-success btn-sm fw-semibold"
                onClick={() => void handleSaveAndApprove()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Working...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-1"></i>
                    Save &amp; Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmailImportEditModal;
