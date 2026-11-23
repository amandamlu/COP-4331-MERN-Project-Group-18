import { useMemo, useState } from 'react';
import EmailForwardingCard from './EmailForwardingCard';
import EmailImportEditModal from './EmailImportEditModal';
import EmailImportSwipeDeck from './EmailImportSwipeDeck';
import type { ApproveResult } from '../hooks/useEmailImports';
import { ApiError } from '../services/apiClient';
import type {
  ApplicationLookup,
  EmailImportApprovePayload,
  EmailImportEditPayload,
  EmailImportRecord,
} from '../types/emailImport';

interface EmailReviewTabProps {
  applications: ApplicationLookup[];
  searchQuery: string;
  forwardingAddress: string | null;
  isLoadingAddress: boolean;
  addressError: string | null;
  onRetryAddress: () => void;
  imports: EmailImportRecord[];
  isLoadingImports: boolean;
  importsError: string | null;
  approvedCount: number;
  dismissedCount: number;
  onRefreshImports: () => void;
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
}

interface FeedbackState {
  type: 'success' | 'danger' | 'info';
  text: string;
}

function EmailReviewTab({
  applications,
  searchQuery,
  forwardingAddress,
  isLoadingAddress,
  addressError,
  onRetryAddress,
  imports,
  isLoadingImports,
  importsError,
  approvedCount,
  dismissedCount,
  onRefreshImports,
  onFetchDetails,
  onSaveEdit,
  onApprove,
  onDismiss,
}: EmailReviewTabProps) {
  const [editingState, setEditingState] = useState<{
    record: EmailImportRecord;
    notice?: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const appById = useMemo(() => {
    const map = new Map<string, ApplicationLookup>();
    for (const app of applications) {
      map.set(app.id, app);
    }
    return map;
  }, [applications]);

  const filteredImports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return imports;
    return imports.filter((item) => {
      const haystack = [
        item.Parsed?.company,
        item.Parsed?.role,
        item.Parsed?.status,
        item.Subject,
        item.From,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [imports, searchQuery]);

  async function handleSwipeRightApprove(record: EmailImportRecord) {
    setFeedback(null);
    setBusyId(record._id);
    try {
      const result = await onApprove(record._id, {});
      if (result.ok) {
        const app = result.application;
        const verb =
          result.importRecord?.Match?.action === 'create'
            ? 'Created application'
            : result.importRecord?.Match?.action === 'update'
              ? 'Updated application'
              : 'Approved email import';
        const label = app
          ? `${app.Company} — ${app.Role} (${app.Status})`
          : record.Parsed?.company || record.Subject || 'import';
        setFeedback({ type: 'success', text: `${verb}: ${label}.` });
        return;
      }

      if (result.status === 409 || result.status === 422) {
        const updatedRecord = result.match
          ? { ...record, Match: result.match }
          : record;
        setEditingState({
          record: updatedRecord,
          notice: result.error || 'Please review this email import before approving.',
        });
        return;
      }

      setFeedback({
        type: 'danger',
        text: result.error || 'Failed to approve email import.',
      });
    } finally {
      setBusyId(null);
    }
  }

  function handleSwipeLeftEdit(record: EmailImportRecord, notice?: string) {
    setFeedback(null);
    setEditingState({ record, notice });
  }

  async function handleDismiss(record: EmailImportRecord) {
    setFeedback(null);
    setBusyId(record._id);
    try {
      await onDismiss(record._id);
      const label = record.Parsed?.company || record.Subject || 'email import';
      setFeedback({ type: 'info', text: `Dismissed pending import for "${label}".` });
    } catch (err) {
      setFeedback({
        type: 'danger',
        text:
          err instanceof ApiError
            ? err.message
            : 'Failed to dismiss email import.',
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pb-2 mb-3 border-bottom">
        <h1 className="h2 mb-0">Email Review</h1>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onRefreshImports}
          disabled={isLoadingImports}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      {/* Compact Forwarding Address Bar */}
      <EmailForwardingCard
        address={forwardingAddress}
        isLoading={isLoadingAddress}
        error={addressError}
        onRetry={onRetryAddress}
      />

      {/* Action Feedback Banner */}
      {feedback && (
        <div
          className={`alert alert-${feedback.type} alert-dismissible fade show py-2 small`}
          role="status"
        >
          {feedback.text}
          <button
            type="button"
            className="btn-close"
            aria-label="Close notification"
            onClick={() => setFeedback(null)}
          ></button>
        </div>
      )}

      {/* Pending Email Imports Swipe Deck + Queue */}
      <EmailImportSwipeDeck
        imports={filteredImports}
        approvedCount={approvedCount}
        dismissedCount={dismissedCount}
        isLoading={isLoadingImports}
        error={importsError}
        busyId={busyId}
        appById={appById}
        onSwipeRightApprove={handleSwipeRightApprove}
        onSwipeLeftEdit={handleSwipeLeftEdit}
        onDismiss={handleDismiss}
        onRefresh={onRefreshImports}
      />

      {/* Edit & Review Modal (opened on swipe left or when review is required) */}
      {editingState && (
        <EmailImportEditModal
          record={editingState.record}
          initialNotice={editingState.notice}
          appById={appById}
          onFetchDetails={onFetchDetails}
          onSaveEdit={onSaveEdit}
          onApprove={onApprove}
          onDismiss={onDismiss}
          onClose={() => setEditingState(null)}
          onSuccessMessage={(text) => setFeedback({ type: 'success', text })}
        />
      )}
    </div>
  );
}

export default EmailReviewTab;
