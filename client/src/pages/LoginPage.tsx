import { useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { TEXTS } from '../constants/texts';
import type { User } from '../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await api.auth.login(username, password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: '4rem' }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>{TEXTS.login.title}</h1>
        <p className="muted">{TEXTS.login.subtitle}</p>
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">{TEXTS.login.usernameLabel}</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="password">{TEXTS.login.passwordLabel}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? TEXTS.login.submittingButton : TEXTS.login.submitButton}
          </button>
        </form>
      </div>
    </div>
  );
}
