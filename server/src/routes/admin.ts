import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { hashPassword } from '../utils/password.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/users', async (_req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ users: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ユーザー一覧の取得に失敗しました。';
    res.status(500).json({ error: message });
  }
});

adminRouter.post('/users', async (req, res) => {
  const { username, password, role } = req.body as {
    username?: string;
    password?: string;
    role?: 'admin' | 'user';
  };

  const trimmedUsername = username?.trim() ?? '';
  if (!trimmedUsername || !password || password.length < 4) {
    res.status(400).json({
      error: 'ユーザーIDと4文字以上のパスワードを入力してください。',
    });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: trimmedUsername,
        password_hash: hashPassword(password),
        role: role === 'admin' ? 'admin' : 'user',
      })
      .select('id, username, role, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'このユーザーIDはすでに使われています。' });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ user: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ユーザー作成に失敗しました。';
    res.status(500).json({ error: message });
  }
});

adminRouter.delete('/users/:id', async (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user?.id) {
    res.status(400).json({ error: '現在ログイン中の管理者自身は削除できません。' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('users').delete().eq('id', targetId);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ユーザー削除に失敗しました。';
    res.status(500).json({ error: message });
  }
});
