import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

type ProtectedRouteProps = {
  children: ReactNode;
};

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [status, setStatus] = useState<
    'checking' | 'valid' | 'invalid'
  >(() => sessionStorage.getItem('authToken') ? 'checking' : 'invalid');

  useEffect(() => {
    const token = sessionStorage.getItem('authToken');

    if (!token) {
      return;
    }

    let cancelled = false;

    async function verifyToken() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (cancelled) return;

        if (response.ok) {
          setStatus('valid');
        } else {
          sessionStorage.removeItem('authToken');
          setStatus('invalid');
        }

      } catch {
        if (!cancelled) {
          setStatus('invalid');
        }
      }
    }

    verifyToken();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'checking') {
    return <p className="text-center mt-5">Checking session...</p>;
  }

  if (status === 'invalid') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;