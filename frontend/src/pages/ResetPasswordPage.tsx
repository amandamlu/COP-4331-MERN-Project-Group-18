import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  async function handleRequestLink(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter your email address.');
      setMessage('');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(
          data.message ||
            'If an account exists with this email, a password reset link will be sent.',
        );
      } else {
        setError(data.error || 'Unable to request password reset.');
      }
    } catch {
      setError('Unable to connect to the backend.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      setMessage('');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setMessage('');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetComplete(true);
        setMessage(data.message || 'Password reset successfully!');
      } else {
        setError(data.error || 'Password reset link is invalid or expired.');
      }
    } catch {
      setError('Unable to connect to the backend.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container app-container py-3">
      <main className="mx-auto mt-4" style={{ maxWidth: '420px' }}>
        <h2 className="text-center mb-4">Reset Password</h2>

        {!token ? (
          <form onSubmit={handleRequestLink}>
            <div className="mb-3">
              <label htmlFor="resetEmail" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                id="resetEmail"
                className="form-control"
                placeholder="Enter your account email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>

            {error && <p className="text-danger text-center mt-3">{error}</p>}
            {message && <p className="text-success text-center mt-3">{message}</p>}

            <p className="text-center mt-3">
              <Link to="/login">Back to Sign In</Link>
            </p>
          </form>
        ) : resetComplete ? (
          <div className="text-center">
            <p className="text-success mb-3">{message}</p>
            <Link to="/login" className="btn btn-primary w-100">
              Sign In with New Password
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="mb-3">
              <label htmlFor="newPassword" className="form-label">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                className="form-control"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="confirmNewPassword" className="form-label">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmNewPassword"
                className="form-control"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Reset Password'}
            </button>

            {error && <p className="text-danger text-center mt-3">{error}</p>}
            {message && <p className="text-success text-center mt-3">{message}</p>}

            <p className="text-center mt-3">
              <Link to="/login">Back to Sign In</Link>
            </p>
          </form>
        )}
      </main>
    </div>
  );
};

export default ResetPasswordPage;
