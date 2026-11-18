import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import {
  requireAuth,
  signAuthToken,
  TOKEN_COOKIE_NAME,
  type AuthUser,
} from '../middleware/auth.js';
import { verifyPassword } from '../utils/password.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: 'IDとパスワードを入力してください。' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, role')
      .eq('username', username.trim())
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: 'ユーザー検索中にエラーが発生しました。' });
      return;
    }

    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'IDまたはパスワードが正しくありません。' });
      return;
    }

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    const token = signAuthToken(authUser);
    res.cookie(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: authUser });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ログインに失敗しました。';
    res.status(500).json({ error: message });
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(TOKEN_COOKIE_NAME);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
