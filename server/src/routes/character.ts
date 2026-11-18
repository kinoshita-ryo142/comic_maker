import { Router } from 'express';
import multer from 'multer';
import { getSupabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadToStorage } from '../services/storage.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export const characterRouter = Router();

characterRouter.use(requireAuth);

characterRouter.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('characters')
      .select('id, name, profile, image_url, updated_at')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ character: data ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'キャラクター情報の取得に失敗しました。';
    res.status(500).json({ error: message });
  }
});

characterRouter.put('/', upload.single('image'), async (req, res) => {
  const { name, profile } = req.body as { name?: string; profile?: string };
  const trimmedName = name?.trim() ?? '';
  const trimmedProfile = profile?.trim() ?? '';

  if (!trimmedName || !trimmedProfile) {
    res.status(400).json({ error: 'キャラクター名とプロフィールを入力してください。' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data: existing, error: fetchError } = await supabase
      .from('characters')
      .select('id, image_url')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (fetchError) {
      res.status(500).json({ error: fetchError.message });
      return;
    }

    let imageUrl = existing?.image_url ?? '';
    if (req.file) {
      const ext = req.file.mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
      imageUrl = await uploadToStorage('characters', req.file.buffer, req.file.mimetype, ext);
    } else if (!existing) {
      res.status(400).json({ error: '初回登録時はキャラクター画像を選択してください。' });
      return;
    }

    const { data, error } = await supabase
      .from('characters')
      .upsert(
        {
          user_id: req.user!.id,
          name: trimmedName,
          profile: trimmedProfile,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('id, name, profile, image_url, updated_at')
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ character: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'キャラクター保存に失敗しました。';
    res.status(500).json({ error: message });
  }
});
