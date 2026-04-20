import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './RegisterPage.css';

const BACKEND_PORT = 5500;
const BASE_URL = `http://localhost:${BACKEND_PORT}`;

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !name || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/admin/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch {
      setError('Unable to connect to the server. Please try again later.');
    }
  };

  return (
    <main className="register">
      <section className="register__card">
        <h1 className="register__title">
          <span aria-hidden="true">🪄</span> Register
        </h1>

        <form className="register__form" onSubmit={handleSubmit}>
          <label className="register__label" htmlFor="register-name">
            Name
          </label>
          <input
            className="register__input"
            id="register-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />

          <label className="register__label" htmlFor="register-email">
            Email
          </label>
          <input
            className="register__input"
            id="register-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <label className="register__label" htmlFor="register-password">
            Password
          </label>
          <input
            className="register__input"
            id="register-password"
            type="password"
            placeholder="Choose a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />

          <label className="register__label" htmlFor="register-confirm-password">
            Confirm Password
          </label>
          <input
            className="register__input"
            id="register-confirm-password"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />

          {error && (
            <div className="register__error" role="alert">
              <span className="register__error-text">{error}</span>
              <button
                type="button"
                className="register__error-close"
                onClick={() => setError('')}
                aria-label="Close error message"
              >
                ✕
              </button>
            </div>
          )}

          <button type="submit" className="register__btn">
            Register
          </button>
        </form>

        <p className="register__footer">
          Already have an account?{' '}
          <Link to="/login" className="register__link">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;