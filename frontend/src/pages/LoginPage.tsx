import PageTitle from '../components/PageTitle';
import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';


const LoginPage = () => {

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!login.trim() || !password.trim()) {
      setError('Please enter a valid username and password.');
      setMessage('');
      return;
    }

    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          login: login.trim(),
          password: password
        })
      });

      const data = await response.json();

      if (response.ok && typeof data.token === 'string') {
        sessionStorage.setItem('authToken', data.token);

        navigate('/dashboard');
      } else {
        setError(data.error || 'Login failed.');
      }

    } catch {
      setError('Unable to connect to the backend.');
    }
  }

  return (
    <div className="container app-container py-3">
      <PageTitle />

      <main className="mx-auto mt-4" style={{ maxWidth: '420px' }}>
        <h2 className="text-center mb-4">Sign In</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="login" className="form-label">
              Username or Email
            </label>
            <input
              type="text"
              id="login"
              className="form-control"
              placeholder="Enter username or email"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="form-control"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-100">
            Sign In
          </button>

          {error && (
            <p className="text-danger text-center mt-3">
              {error}
            </p>
          )}

          {message && (
            <p className="text-success text-center mt-3">
              {message}
            </p>
          )}

          <p className="text-center mt-3">
            Don't have an account?{' '}
            <Link to="/register">Create an account</Link>
          </p>

        </form>
      </main>
    </div>
  );
};

export default LoginPage;