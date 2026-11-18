import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import {
  generateComicImage,
  generateComicPlan,
  type ComicPlan,
} from '../services/aiService.js';
import { deleteFromStorage, uploadToStorage } from '../services/storage.js';

export const comicsRouter = Router();

comicsRouter.use(requireAuth);

comicsRouter.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('comics')
      .select('id, title, synopsis, scenario, panels, image_url, created_at')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ comics: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : '作品一覧の取得に失敗しました。';
    res.status(500).json({ error: message });
  }
});

comicsRouter.post('/plan', async (req, res) => {
  const { synopsis } = req.body as { synopsis?: string };
  if (!synopsis || !synopsis.trim()) {
    res.status(400).json({ error: 'あらすじを入力してください。' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data: character, error } = await supabase
      .from('characters')
      .select('id, name, profile, image_url')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (!character) {
      res.status(400).json({
        error: '先に「キャラクター設定」から主人公キャラクターを登録してください。',
      });
      return;
    }

    const plan = await generateComicPlan(
      {
        name: character.name,
        profile: character.profile,
        imageUrl: character.image_url,
      },
      synopsis
    );

    res.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : '構成案の生成に失敗しました。';
    res.status(500).json({ error: message });
  }
});

comicsRouter.post('/generate', async (req, res) => {
  const { synopsis, plan } = req.body as {
    synopsis?: string;
    plan?: ComicPlan;
  };

  if (!synopsis?.trim() || !plan || !Array.isArray(plan.panels) || plan.panels.length !== 4) {
    res.status(400).json({ error: 'あらすじと4コマ分の構成案が必要です。' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, name, profile, image_url')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (charError) {
      res.status(500).json({ error: charError.message });
      return;
    }

    if (!character) {
      res.status(400).json({
        error: '先に「キャラクター設定」から主人公キャラクターを登録してください。',
      });
      return;
    }

    const generated = await generateComicImage(
      {
        name: character.name,
        profile: character.profile,
        imageUrl: character.image_url,
      },
      plan
    );

    const imageUrl = await uploadToStorage(
      'comics',
      generated.buffer,
      generated.mimeType,
      generated.extension
    );

    const { data: savedComic, error: insertError } = await supabase
      .from('comics')
      .insert({
        user_id: req.user!.id,
        character_id: character.id,
        title: plan.title,
        synopsis: synopsis.trim(),
        scenario: plan.scenario,
        panels: plan.panels,
        image_url: imageUrl,
      })
      .select('id, title, synopsis, scenario, panels, image_url, created_at')
      .single();

    if (insertError) {
      res.status(500).json({ error: insertError.message });
      return;
    }

    res.status(201).json({ comic: savedComic });
  } catch (err) {
    const message = err instanceof Error ? err.message : '4コマ漫画の生成に失敗しました。';
    res.status(500).json({ error: message });
  }
});

comicsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const supabase = getSupabase();
    const { data: comic, error: findError } = await supabase
      .from('comics')
      .select('id, image_url')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (findError) {
      res.status(500).json({ error: findError.message });
      return;
    }

    if (!comic) {
      res.status(404).json({ error: '作品が見つかりません。' });
      return;
    }

    const { error: deleteError } = await supabase
      .from('comics')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user!.id);

    if (deleteError) {
      res.status(500).json({ error: deleteError.message });
      return;
    }

    await deleteFromStorage(comic.image_url);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '作品の削除に失敗しました。';
    res.status(500).json({ error: message });
  }
});
