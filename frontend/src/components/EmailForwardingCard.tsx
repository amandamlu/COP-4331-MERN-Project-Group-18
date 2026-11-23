import { useState } from 'react';

interface EmailForwardingCardProps {
  address: string | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function EmailForwardingCard({
  address,
  isLoading,
  error,
  onRetry,
}: EmailForwardingCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function handleCopy() {
    if (!address) return;
    setCopyError(null);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(address);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = address;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError('Could not copy automatically. Please highlight and copy the address manually.');
    }
  }

  return (
    <div className="card shadow-sm border-0 bg-white mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h2 className="h5 fw-bold mb-1">
              <i className="bi bi-envelope-at text-primary me-2"></i>
              Your Email Forwarding Address
            </h2>
            <p className="text-secondary small mb-0">
              Forward internship confirmations, interview invites, offers, or updates to this unique
              address to review and import them into your tracker.
            </p>
          </div>
          <span className="badge bg-light text-secondary border">
            <i className="bi bi-shield-lock me-1"></i>
            Private to your account
          </span>
        </div>

        {isLoading ? (
          <div className="d-flex align-items-center gap-2 text-secondary py-2">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading forwarding address...</span>
            </div>
            <span>Retrieving your forwarding address...</span>
          </div>
        ) : error ? (
          <div
            className="alert alert-warning d-flex justify-content-between align-items-center flex-wrap gap-2 mb-0"
            role="alert"
          >
            <div>
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Forwarding address unavailable:</strong> {error}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-dark"
              onClick={onRetry}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="input-group">
              <span className="input-group-text bg-light text-secondary">
                <i className="bi bi-inbox"></i>
              </span>
              <input
                type="text"
                className="form-control font-monospace bg-light"
                value={address ?? ''}
                readOnly
                aria-label="Your unique email forwarding address"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
                onClick={() => void handleCopy()}
                disabled={!address}
              >
                <i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'} me-1`}></i>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            {copyError && (
              <div className="text-danger small mt-2">{copyError}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default EmailForwardingCard;
