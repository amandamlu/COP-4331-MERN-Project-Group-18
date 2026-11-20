import { useState, useRef, type PointerEvent } from 'react';
import type { CompanyCardData, SwipeDirection } from '../hooks/useApplications';

interface CompanySwipeDeckProps {
  cards: CompanyCardData[];
  heardBackCount: number;
  noResponseCount: number;
  canUndo: boolean;
  onSwipeLeft: (company: string) => void;
  onSwipeRight: (company: string) => void;
  onUndo: () => void;
  onReset: () => void;
}

const SWIPE_THRESHOLD = 95;

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Heard Back':
    case 'Offer':
      return 'bg-success';
    case 'Interviewing':
      return 'bg-primary';
    case "Haven't Heard Back":
    case 'Rejected':
      return 'bg-secondary';
    default:
      return 'bg-info text-dark';
  }
}

function CompanySwipeDeck({
  cards,
  heardBackCount,
  noResponseCount,
  canUndo,
  onSwipeLeft,
  onSwipeRight,
  onUndo,
  onReset,
}: CompanySwipeDeckProps) {
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const topCard = cards[0];
  const nextCard = cards[1];

  function triggerSwipe(direction: SwipeDirection) {
    if (!topCard || exitDirection) return;
    setExitDirection(direction);
    setIsDragging(false);

    setTimeout(() => {
      if (direction === 'right') {
        onSwipeRight(topCard.company);
      } else {
        onSwipeLeft(topCard.company);
      }
      setExitDirection(null);
      setDragX(0);
      setDragY(0);
    }, 240);
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!topCard || exitDirection) return;
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

  return (
    <div className="swipe-deck-section py-2">
      {/* Live Status Counters */}
      <div className="d-flex justify-content-center flex-wrap gap-2 mb-3">
        <span className="badge rounded-pill bg-secondary px-3 py-2 fs-6">
          <i className="bi bi-hourglass-split me-1"></i>
          Haven&apos;t Heard Back: {noResponseCount}
        </span>
        <span className="badge rounded-pill bg-dark px-3 py-2 fs-6">
          <i className="bi bi-stack me-1"></i>
          Remaining: {cards.length}
        </span>
        <span className="badge rounded-pill bg-success px-3 py-2 fs-6">
          <i className="bi bi-check-circle me-1"></i>
          Heard Back: {heardBackCount}
        </span>
      </div>

      {/* Card Stack Container */}
      <div className="swipe-stage mx-auto position-relative">
        {!topCard ? (
          <div className="card shadow-sm border-0 rounded-4 p-5 text-center bg-white my-3">
            <div className="mb-3 text-secondary">
              <i className="bi bi-check2-all display-4 text-success"></i>
            </div>
            <h3 className="h5 fw-bold">All Caught Up!</h3>
            <p className="text-secondary mb-4">
              You have reviewed every company in your deck.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i>
                Undo Last
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onReset}
                disabled={!canUndo}
              >
                <i className="bi bi-arrow-repeat me-1"></i>
                Reset Deck
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Next card peeking underneath */}
            {nextCard && (
              <div
                key={`next-${nextCard.company}`}
                className="card swipe-card swipe-card-next shadow-sm border rounded-4 p-4 bg-white"
                aria-hidden="true"
              >
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="company-avatar bg-light text-secondary fw-bold rounded-circle d-flex align-items-center justify-content-center">
                    {nextCard.initials}
                  </div>
                  <div>
                    <h3 className="h5 fw-bold mb-0">{nextCard.company}</h3>
                    <small className="text-secondary">
                      {nextCard.applications.length} active application(s)
                    </small>
                  </div>
                </div>
              </div>
            )}

            {/* Active Top Swipe Card */}
            <div
              key={topCard.company}
              className="card swipe-card shadow border rounded-4 p-4 bg-white position-relative"
              style={{
                transform: `translate3d(${effectiveX}px, ${effectiveY}px, 0) rotate(${rotation}deg)`,
                transition: isDragging
                  ? 'none'
                  : 'transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.24s ease',
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
                  className="swipe-stamp swipe-stamp-right border border-3 border-success text-success fw-bold px-2 py-1 rounded"
                  style={{ opacity: stampOpacity }}
                >
                  HEARD BACK
                </div>
              )}
              {effectiveX < -15 && (
                <div
                  className="swipe-stamp swipe-stamp-left border border-3 border-danger text-danger fw-bold px-2 py-1 rounded"
                  style={{ opacity: stampOpacity }}
                >
                  NO RESPONSE
                </div>
              )}

              {/* Company Header */}
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div className="d-flex align-items-center gap-3">
                  <div className="company-avatar bg-primary text-white fw-bold rounded-circle d-flex align-items-center justify-content-center shadow-sm">
                    {topCard.initials}
                  </div>
                  <div>
                    <h3 className="h4 fw-bold mb-0">{topCard.company}</h3>
                    <span className="text-secondary small">
                      {topCard.applications.length}{' '}
                      {topCard.applications.length === 1
                        ? 'application'
                        : 'applications'}
                    </span>
                  </div>
                </div>
                <span className={`badge ${getStatusBadgeClass(topCard.latestStatus)}`}>
                  {topCard.latestStatus}
                </span>
              </div>

              {/* Applications List on Card Face */}
              <div className="mb-2">
                <div className="text-uppercase text-secondary fw-semibold small mb-2">
                  Applied Roles
                </div>
                <div className="d-flex flex-column gap-2">
                  {topCard.applications.map((app) => (
                    <div
                      key={app.id}
                      className="p-2 rounded-3 bg-light border-start border-4 border-primary"
                    >
                      <div className="fw-semibold text-dark">{app.role}</div>
                      <div className="d-flex flex-wrap gap-3 small text-secondary mt-1">
                        <span>
                          <i className="bi bi-geo-alt me-1"></i>
                          {app.location || 'Remote'}
                        </span>
                        <span>
                          <i className="bi bi-currency-dollar"></i>
                          {app.salaryHourly}/hr
                        </span>
                        <span>
                          <i className="bi bi-calendar3 me-1"></i>
                          {app.dateApplied}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center text-muted small mt-3 pt-2 border-top">
                <i className="bi bi-hand-index-thumb me-1"></i>
                Drag card left or right, or use the buttons below
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons Below Stack */}
      <div className="d-flex justify-content-center align-items-center flex-wrap gap-2 mt-3">
        <button
          type="button"
          className="btn btn-outline-danger px-3 py-2 fw-semibold"
          onClick={() => triggerSwipe('left')}
          disabled={!topCard || Boolean(exitDirection)}
        >
          <i className="bi bi-x-lg me-1"></i>
          Haven&apos;t Heard Back
        </button>

        <button
          type="button"
          className="btn btn-outline-secondary px-3 py-2"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last swipe"
        >
          <i className="bi bi-arrow-counterclockwise me-1"></i>
          Undo
        </button>

        <button
          type="button"
          className="btn btn-outline-secondary px-3 py-2"
          onClick={onReset}
          disabled={!canUndo}
          title="Reset all swiped cards"
        >
          <i className="bi bi-arrow-repeat me-1"></i>
          Reset
        </button>

        <button
          type="button"
          className="btn btn-success px-3 py-2 fw-semibold"
          onClick={() => triggerSwipe('right')}
          disabled={!topCard || Boolean(exitDirection)}
        >
          <i className="bi bi-check-lg me-1"></i>
          Heard Back
        </button>
      </div>
    </div>
  );
}

export default CompanySwipeDeck;
