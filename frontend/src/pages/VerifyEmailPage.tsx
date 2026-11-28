import { useEffect, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>(
    token ? 'verifying' : 'idle',
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const verifiedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || verifiedTokenRef.current === token) {
      return;
    }
    verifiedTokenRef.current = token;

    async function verify() {
      setStatus('verifying');
      setError('');
      setMessage('');

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(token!)}`,
        );
        const data = await response.json();

        if (response.ok) {
          setStatus('verified');
          setMessage(data.message || 'Email verified successfully!');
        } else {
          setStatus('error');
          setError(data.error || 'Verification link is invalid or expired.');
        }
      } catch {
        setStatus('error');
        setError('Unable to connect to the backend.');
      }
    }

    void verify();
  }, [token]);

  async function handleResend(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) {
      setResendError('Please enter your email address.');
      setResendMessage('');
      return;
    }

    setIsSending(true);
    setResendError('');
    setResendMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendMessage(
          data.message ||
            'If this email has an unverified account, a verification link will be sent.',
        );
      } else {
        setResendError(data.error || 'Unable to resend verification email.');
      }
    } catch {
      setResendError('Unable to connect to the backend.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="container app-container py-3">
      <main className="mx-auto mt-4" style={{ maxWidth: '420px' }}>
        <h2 className="text-center mb-4">Verify Email</h2>

        {status === 'verifying' && (
          <p className="text-secondary text-center">Verifying your email...</p>
        )}

        {status === 'verified' && (
          <div className="text-center">
            <p className="text-success mb-3">{message}</p>
            <Link to="/login" className="btn btn-primary w-100">
              Continue to Sign In
            </Link>
          </div>
        )}

        {(status === 'idle' || status === 'error') && (
          <>
            {error && <p className="text-danger text-center mb-3">{error}</p>}

            <form onSubmit={handleResend}>
              <div className="mb-3">
                <label htmlFor="resendEmail" className="form-label">
                  Email Address
                </label>
                <input
                  type="email"
                  id="resendEmail"
                  className="form-control"
                  placeholder="Enter your email to resend link"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={isSending}
              >
                {isSending ? 'Sending...' : 'Resend Verification Email'}
              </button>

              {resendError && (
                <p className="text-danger text-center mt-3">{resendError}</p>
              )}

              {resendMessage && (
                <p className="text-success text-center mt-3">{resendMessage}</p>
              )}

              <p className="text-center mt-3">
                <Link to="/login">Back to Sign In</Link>
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default VerifyEmailPage;
