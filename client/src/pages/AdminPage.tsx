import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { TEXTS } from '../constants/texts';
import type { User } from '../types';

interface AdminPageProps {
  currentUser: User;
}

export function AdminPage({ currentUser }: AdminPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadUsers() {
    try {
      const data = await api.admin.listUsers();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザー一覧の取得に失敗しました。');
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await api.admin.createUser(username, password, role);
      setSuccess(`ユーザー「${username}」を発行しました。`);
      setUsername('');
      setPassword('');
      setRole('user');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザー発行に失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(target: User) {
    if (!window.confirm(`ユーザー「${target.username}」を削除しますか？`)) return;
    setError(null);
    setSuccess(null);
    try {
      await api.admin.deleteUser(target.id);
      setSuccess(`ユーザー「${target.username}」を削除しました。`);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました。');
    }
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{TEXTS.admin.title}</h2>
        <p className="muted">{TEXTS.admin.subtitle}</p>
        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        <h3>{TEXTS.admin.createTitle}</h3>
        <form onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="new-username">{TEXTS.admin.usernameLabel}</label>
            <input
              id="new-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-password">{TEXTS.admin.passwordLabel}</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={4}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-role">{TEXTS.admin.roleLabel}</label>
            <select
              id="new-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
            >
              <option value="user">一般ユーザー</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {TEXTS.admin.createButton}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{TEXTS.admin.listTitle}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>権限</th>
              <th>作成日時</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.role === 'admin' ? '管理者' : '一般'}</td>
                <td>{u.created_at ? new Date(u.created_at).toLocaleString('ja-JP') : '-'}</td>
                <td style={{ textAlign: 'right' }}>
                  {u.id !== currentUser.id && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDelete(u)}
                    >
                      {TEXTS.admin.deleteButton}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
