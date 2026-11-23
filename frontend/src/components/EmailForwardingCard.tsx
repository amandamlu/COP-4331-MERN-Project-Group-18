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
      setCopyError('Could not copy automatically. Please copy the address manually.');
    }
  }

  return (
    <div className="card shadow-sm border-0 bg-white mb-4">
      <div className="card-body py-2 px-3">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <i className="bi bi-envelope-at text-primary fs-5"></i>
            <div>
              <div className="fw-semibold text-dark small lh-sm">
                Forwarding Address
              </div>
              <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                Forward internship emails here to import
              </div>
            </div>
          </div>

          <div className="flex-grow-1" style={{ maxWidth: '520px' }}>
            {isLoading ? (
              <div className="d-flex align-items-center gap-2 text-secondary small py-1">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading forwarding address...</span>
                </div>
                <span>Retrieving address...</span>
              </div>
            ) : error ? (
              <div
                className="alert alert-warning d-flex justify-content-between align-items-center gap-2 py-1 px-2 mb-0 small"
                role="alert"
              >
                <span className="text-truncate">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  {error}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark py-0 px-2"
                  onClick={onRetry}
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="input-group input-group-sm">
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
                  className={`btn ${copied ? 'btn-success' : 'btn-primary'} px-3`}
                  onClick={() => void handleCopy()}
                  disabled={!address}
                >
                  <i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'} me-1`}></i>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        </div>
        {copyError && (
          <div className="text-danger small mt-1">{copyError}</div>
        )}
      </div>
    </div>
  );
}

export default EmailForwardingCard;
