import type { Character, Comic, ComicPlan, User } from '../types';

async function request<T>(
  url: string,
  options?: RequestInit,
  timeoutMs = 60000
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      credentials: 'include',
      signal: controller.signal,
      ...options,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('サーバーからの応答がタイムアウトしました。サーバーのログを確認してください。');
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  auth: {
    me: () => request<{ user: User }>('/api/auth/me'),
    login: (username: string, password: string) =>
      request<{ user: User }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      }),
    logout: () =>
      request<{ ok: boolean }>('/api/auth/logout', {
        method: 'POST',
      }),
  },
  admin: {
    listUsers: () => request<{ users: User[] }>('/api/admin/users'),
    createUser: (username: string, password: string, role: 'user' | 'admin') =>
      request<{ user: User }>('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      }),
    deleteUser: (id: string) =>
      request<{ ok: boolean }>(`/api/admin/users/${id}`, {
        method: 'DELETE',
      }),
  },
  character: {
    get: () => request<{ character: Character | null }>('/api/character'),
    save: (formData: FormData) =>
      request<{ character: Character }>('/api/character', {
        method: 'PUT',
        body: formData,
      }),
  },
  comics: {
    list: () => request<{ comics: Comic[] }>('/api/comics'),
    plan: (synopsis: string) =>
      request<{ plan: ComicPlan }>('/api/comics/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ synopsis }),
      }),
    generate: (synopsis: string, plan: ComicPlan) =>
      request<{ comic: Comic }>(
        '/api/comics/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ synopsis, plan }),
        },
        120000
      ),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/comics/${id}`, {
        method: 'DELETE',
      }),
  },
};
