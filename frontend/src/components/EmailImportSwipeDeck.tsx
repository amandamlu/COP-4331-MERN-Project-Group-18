import { useState, useRef, type PointerEvent } from 'react';
import type { ApplicationLookup, EmailImportRecord } from '../types/emailImport';
import {
  describeMatchAction,
  formatEmailDate,
  getCompanyInitials,
  getStatusBadgeClass,
  needsReviewBeforeApprove,
} from '../utils/emailImportHelpers';

export type EmailSwipeDirection = 'left' | 'right';

interface EmailImportSwipeDeckProps {
  imports: EmailImportRecord[];
  approvedCount: number;
  dismissedCount: number;
  isLoading: boolean;
  error: string | null;
  busyId: string | null;
  appById: Map<string, ApplicationLookup>;
  onSwipeRightApprove: (record: EmailImportRecord) => void | Promise<void>;
  onSwipeLeftEdit: (record: EmailImportRecord, notice?: string) => void;
  onDismiss: (record: EmailImportRecord) => void | Promise<void>;
  onRefresh: () => void;
}

const SWIPE_THRESHOLD = 95;

function EmailImportSwipeDeck({
  imports,
  approvedCount,
  dismissedCount,
  isLoading,
  error,
  busyId,
  appById,
  onSwipeRightApprove,
  onSwipeLeftEdit,
  onDismiss,
  onRefresh,
}: EmailImportSwipeDeckProps) {
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<EmailSwipeDirection | null>(
    null,
  );
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const topCard = imports[0];
  const nextCard = imports[1];
  const isBusy = Boolean(exitDirection) || Boolean(busyId);

  function triggerSwipe(direction: EmailSwipeDirection) {
    if (!topCard || isBusy) return;

    // Swiping right on a card that requires field confirmation or match selection
    // smoothly opens the Review & Edit modal instead of discarding the card.
    if (direction === 'right' && needsReviewBeforeApprove(topCard)) {
      setIsDragging(false);
      setDragX(0);
      setDragY(0);
      const summary = describeMatchAction(topCard, appById);
      onSwipeLeftEdit(topCard, summary.description);
      return;
    }

    setExitDirection(direction);
    setIsDragging(false);

    window.setTimeout(() => {
      if (direction === 'right') {
        void onSwipeRightApprove(topCard);
      } else {
        onSwipeLeftEdit(topCard);
      }
      setExitDirection(null);
      setDragX(0);
      setDragY(0);
    }, 240);
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!topCard || isBusy) return;
    if ((e.target as HTMLElement).closest('button, a, input, select')) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!isDragging || !startPosRef.current) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = (e.clientY - startPosRef.current.y) * 0.25;
    setDragX(dx);
    setDragY(dy);
  }

  function handlePointerEnd() {
    if (!isDragging) return;
    setIsDragging(false);
    startPosRef.current = null;

    if (dragX > SWIPE_THRESHOLD) {
      triggerSwipe('right');
    } else if (dragX < -SWIPE_THRESHOLD) {
      triggerSwipe('left');
    } else {
      setDragX(0);
      setDragY(0);
    }
  }

  const effectiveX =
    exitDirection === 'right' ? 420 : exitDirection === 'left' ? -420 : dragX;
  const effectiveY = exitDirection ? 20 : dragY;
  const rotation = effectiveX * 0.06;
  const stampOpacity = Math.min(Math.abs(effectiveX) / SWIPE_THRESHOLD, 1);

  const topMatch = topCard ? describeMatchAction(topCard, appById) : null;
  const topNeedsReview = topCard ? needsReviewBeforeApprove(topCard) : false;

  return (
    <div>
      {/* Soft Status Counter Pills */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <span className="badge rounded-pill bg-white text-dark border fw-medium px-3 py-2">
          <i className="bi bi-stack text-primary me-1"></i>
          Pending: <strong>{imports.length}</strong>
        </span>
        <span className="badge rounded-pill bg-success-subtle text-success-emphasis border border-success-subtle fw-medium px-3 py-2">
          <i className="bi bi-check-circle me-1"></i>
          Approved: <strong>{approvedCount}</strong>
        </span>
        <span className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle fw-medium px-3 py-2">
          <i className="bi bi-x-circle me-1"></i>
          Dismissed: <strong>{dismissedCount}</strong>
        </span>
      </div>

      <div className="row g-4 align-items-start">
        {/* Left Column: Swipe Card Stack + Action Buttons */}
        <div className="col-12 col-lg-7">

        {/* Loading / Error / Card Stack */}
        {isLoading ? (
          <div className="swipe-stage mx-auto">
            <div className="card shadow-sm border-0 rounded-4 p-5 text-center bg-white">
              <div className="spinner-border text-primary mx-auto mb-3" role="status">
                <span className="visually-hidden">Loading pending email imports...</span>
              </div>
              <p className="text-secondary mb-0">Loading pending email imports...</p>
            </div>
          </div>
        ) : error ? (
          <div className="swipe-stage mx-auto">
            <div className="card shadow-sm border-0 rounded-4 p-4 text-center bg-white">
              <div className="text-danger mb-2">
                <i className="bi bi-exclamation-octagon display-6"></i>
              </div>
              <h3 className="h5 fw-bold">Could Not Load Pending Imports</h3>
              <p className="text-secondary small mb-3">{error}</p>
              <div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onRefresh}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="swipe-stage mx-auto position-relative">
            {!topCard ? (
              <div className="card shadow-sm border-0 rounded-4 p-5 text-center bg-white">
                <div className="mb-3 text-secondary">
                  <i className="bi bi-check2-all display-4 text-success"></i>
                </div>
                <h3 className="h5 fw-bold">All Caught Up!</h3>
                <p className="text-secondary small mb-4">
                  No pending email imports right now. Forward an internship email to
                  your address above and refresh to review it here.
                </p>
                <div className="d-flex justify-content-center">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm px-3"
                    onClick={onRefresh}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Check for New Emails
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Next Card Preview Underneath */}
                {nextCard && (
                  <div
                    className="card shadow-sm border-0 rounded-4 p-4 bg-white swipe-card-next"
                    aria-hidden="true"
                  >
                    <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                      <div className="d-flex align-items-center gap-3">
                        <div className="company-avatar bg-secondary text-white fw-bold rounded-circle d-flex align-items-center justify-content-center">
                          {getCompanyInitials(nextCard.Parsed?.company)}
                        </div>
                        <div>
                          <div className="h5 fw-bold mb-0">
                            {nextCard.Parsed?.company || 'Unknown Company'}
                          </div>
                          <div className="text-secondary small">
                            {nextCard.Parsed?.role || 'Unknown Position'}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`badge ${getStatusBadgeClass(nextCard.Parsed?.status)}`}
                      >
                        {nextCard.Parsed?.status || 'Unknown'}
                      </span>
                    </div>
                    <div className="small text-secondary text-truncate">
                      <i className="bi bi-envelope me-1"></i>
                      {nextCard.Subject || '(No subject)'}
                    </div>
                  </div>
                )}

                {/* Active Draggable Top Card */}
                <div
                  key={topCard._id}
                  className="card shadow border-0 rounded-4 p-4 bg-white swipe-card position-relative"
                  style={{
                    transform: `translate(${effectiveX}px, ${effectiveY}px) rotate(${rotation}deg)`,
                    transition: isDragging
                      ? 'none'
                      : 'transform 0.25s ease-out, opacity 0.25s ease-out',
                    opacity: exitDirection ? 0 : 1,
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                >
                  {/* Drag Stamp Overlays */}
                  {effectiveX > 15 && (
                    <div
                      className={`swipe-stamp swipe-stamp-right border border-3 fw-bold px-2 py-1 rounded ${
                        topNeedsReview
                          ? 'border-primary text-primary'
                          : 'border-success text-success'
                      }`}
                      style={{ opacity: stampOpacity }}
                    >
                      {topNeedsReview ? 'REVIEW & ACCEPT' : 'ACCEPT'}
                    </div>
                  )}
                  {effectiveX < -15 && (
                    <div
                      className="swipe-stamp swipe-stamp-left border border-3 border-warning text-warning fw-bold px-2 py-1 rounded"
                      style={{ opacity: stampOpacity }}
                    >
                      MAKE CHANGES
                    </div>
                  )}

                  {/* Company & Status Header */}
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-3 pb-3 border-bottom">
                    <div className="d-flex align-items-center gap-3 min-w-0">
                      <div className="company-avatar bg-primary text-white fw-bold rounded-circle d-flex align-items-center justify-content-center shadow-sm">
                        {getCompanyInitials(topCard.Parsed?.company)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="h4 fw-bold mb-0 text-truncate">
                          {topCard.Parsed?.company || (
                            <span className="text-warning-emphasis fst-italic">
                              Unknown Company
                            </span>
                          )}
                        </h3>
                        <div className="text-secondary small text-truncate">
                          {topCard.Parsed?.role || (
                            <span className="text-warning-emphasis fst-italic">
                              Position needs confirmation
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`badge flex-shrink-0 ${getStatusBadgeClass(
                        topCard.Parsed?.status,
                      )}`}
                    >
                      {topCard.Parsed?.status || 'Needs Status'}
                    </span>
                  </div>

                  {/* Clean Inline Action Callout */}
                  {topMatch && (
                    <div
                      className={`p-2 px-3 rounded-3 bg-light border-start border-4 mb-3 ${
                        topMatch.requiresAction
                          ? 'border-warning'
                          : topCard.Match?.action === 'create'
                            ? 'border-success'
                            : 'border-primary'
                      }`}
                    >
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className={`badge ${topMatch.badgeClass}`}>
                          {topMatch.badgeLabel}
                        </span>
                      </div>
                      <div className="small text-dark">{topMatch.description}</div>
                    </div>
                  )}

                  {/* Compact Email Metadata */}
                  <div className="px-1 mb-2">
                    <div className="fw-semibold text-dark small mb-1 text-truncate" title={topCard.Subject || '(No subject)'}>
                      <i className="bi bi-envelope-open me-2 text-primary"></i>
                      {topCard.Subject || '(No subject)'}
                    </div>
                    <div className="d-flex flex-wrap gap-x-3 gap-2 small text-secondary">
                      <span className="text-truncate" style={{ maxWidth: '100%' }}>
                        <i className="bi bi-person me-1"></i>
                        {topCard.From || 'Unknown sender'}
                      </span>
                      <span>
                        <i className="bi bi-clock me-1"></i>
                        {formatEmailDate(topCard.CreatedAt)}
                      </span>
                      {topCard.Parsed?.dateApplied && (
                        <span>
                          <i className="bi bi-calendar3 me-1"></i>
                          Applied {topCard.Parsed.dateApplied}
                        </span>
                      )}
                      {topCard.Parsed?.referenceNumber && (
                        <span>
                          <i className="bi bi-hash"></i>
                          {topCard.Parsed.referenceNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-center text-muted small mt-3 pt-2 border-top">
                    <i className="bi bi-hand-index-thumb me-1"></i>
                    Swipe right to accept &bull; Swipe left to make changes
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 3 Focused Action Buttons Below Stack */}
        {topCard && !isLoading && !error && (
          <div className="d-flex justify-content-center align-items-center flex-wrap gap-2 mt-3">
            <button
              type="button"
              className="btn btn-outline-secondary px-3 py-2 fw-medium"
              onClick={() => triggerSwipe('left')}
              disabled={isBusy}
            >
              <i className="bi bi-pencil-square me-1"></i>
              Make Changes
            </button>

            <button
              type="button"
              className="btn btn-outline-danger px-3 py-2 fw-medium"
              onClick={() => void onDismiss(topCard)}
              disabled={isBusy}
              title="Dismiss this email import without changing applications"
            >
              <i className="bi bi-x-lg me-1"></i>
              Dismiss
            </button>

            <button
              type="button"
              className="btn btn-success px-4 py-2 fw-semibold"
              onClick={() => triggerSwipe('right')}
              disabled={isBusy}
            >
              {busyId === topCard._id ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-1"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Approving...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg me-1"></i>
                  {topNeedsReview ? 'Review & Accept' : 'Accept'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Up Next Queue */}
      <div className="col-12 col-lg-5">
        <div className="card shadow-sm border-0 bg-white">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <h2 className="h6 fw-bold text-uppercase text-secondary mb-0">
                Up Next in Queue
              </h2>
              <span className="badge rounded-pill bg-light text-secondary border">
                {Math.max(0, imports.length - 1)}
              </span>
            </div>

            {imports.length <= 1 ? (
              <p className="text-secondary small mb-0 text-center py-3">
                {imports.length === 1
                  ? 'You are viewing the last pending email.'
                  : 'No queued emails waiting.'}
              </p>
            ) : (
              <div className="list-group list-group-flush">
                {imports.slice(1).map((item) => {
                  const summary = describeMatchAction(item, appById);
                  return (
                    <div
                      key={item._id}
                      className="list-group-item px-0 py-2"
                    >
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div className="min-w-0">
                          <div className="fw-semibold text-dark text-truncate">
                            {item.Parsed?.company || 'Unknown Company'}
                          </div>
                          <div className="small text-secondary text-truncate">
                            {item.Parsed?.role || 'Unknown Position'}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary py-0 px-2 flex-shrink-0"
                          onClick={() => onSwipeLeftEdit(item)}
                        >
                          Edit
                        </button>
                      </div>
                      <div className="d-flex align-items-center flex-wrap gap-1 mt-2">
                        <span className={`badge ${getStatusBadgeClass(item.Parsed?.status)}`}>
                          {item.Parsed?.status || 'Unknown'}
                        </span>
                        <span className={`badge ${summary.badgeClass}`}>
                          {summary.badgeLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default EmailImportSwipeDeck;
