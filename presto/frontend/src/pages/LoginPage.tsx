import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './LoginPage.css';


const BASE_URL = "https://z5557661-presto-deploy-2.vercel.app";

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please try again.');
        return;
      }

      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch {
      setError('Unable to connect to the server. Please try again later.');
    }
  };

  return (
    <main className="login">
      <section className="login__card">
        <h1 className="login__title">
          <span aria-hidden="true">🪄</span> Login
        </h1>

        <form className="login__form" onSubmit={handleSubmit}>
          <label className="login__label" htmlFor="login-email">
            Email
          </label>
          <input
            className="login__input"
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <label className="login__label" htmlFor="login-password">
            Password
          </label>
          <input
            className="login__input"
            id="login-password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error && (
            <div className="login__error" role="alert">
              <span className="login__error-text">{error}</span>
              <button
                type="button"
                className="login__error-close"
                onClick={() => setError('')}
                aria-label="Close error message"
              >
                ✕
              </button>
            </div>
          )}

          <button type="submit" className="login__btn">
            Login
          </button>
        </form>

        <p className="login__footer">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="login__link">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;