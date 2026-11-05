import PageTitle from '../components/PageTitle';
import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const RegisterPage = () => {

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [login, setLogin] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        // Check required fields
        if (
            !firstName.trim() ||
            !lastName.trim() ||
            !login.trim() ||
            !email.trim() ||
            !password ||
            !confirmPassword
        ) {
            setError('Please fill out all required fields.');
            setMessage('');
            return;
        }

        // Check password confirmation
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setMessage('');
            return;
        }

        setError('');
        setMessage('');

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/auth/register`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                        login: login.trim(),
                        email: email.trim(),
                        password: password,
                        degree: '',
                        major: ''
                    })
                }
            );

            const data = await response.json();

            if (response.ok) {
                setMessage('Account created successfully!');
            } else {
                setError(data.error || 'Registration failed.');
            }

        } catch {
            setError('Unable to connect to the backend.');
        }
    }

    return (
        <div className="container app-container py-3">
            <PageTitle />

            <main className="mx-auto mt-4" style={{ maxWidth: '420px' }}>
                <h2 className="text-center mb-4">Create Account</h2>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="firstName" className="form-label">
                            First Name
                        </label>
                        <input
                            type="text"
                            id="firstName"
                            className="form-control"
                            placeholder="Enter first name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="lastName" className="form-label">
                            Last Name
                        </label>
                        <input
                            type="text"
                            id="lastName"
                            className="form-control"
                            placeholder="Enter last name"
                            value={lastName}	
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="username" className="form-label">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            className="form-control"
                            placeholder="Choose a username"
                            value={login}	
                            onChange={(e) => setLogin(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        className="form-control"
                        placeholder="Enter your email"
                        value={email}	
                        onChange={(e) => setEmail(e.target.value)}
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
                            placeholder="Create a password"
                            value={password}	
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        </div>

                        <div className="mb-3">
                        <label htmlFor="confirmPassword" className="form-label">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            className="form-control"
                            placeholder="Re-enter your password"
                            value={confirmPassword}	
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        </div>

                        <button type="submit" className="btn btn-primary w-100">
                            Create Account
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
                            Already have an account?{' '}
                            <Link to="/login">Sign In</Link>
                        </p>
                </form>
            </main>
        </div>
  );
};

export default RegisterPage;