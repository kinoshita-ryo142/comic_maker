import crypto from 'node:crypto';
import { config } from '../config.js';
import { getSupabase } from '../db/supabase.js';

export async function uploadToStorage(
  folder: 'characters' | 'comics',
  buffer: Buffer,
  contentType: string,
  extension: string
): Promise<string> {
  const supabase = getSupabase();
  const filename = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(config.supabaseStorageBucket)
    .upload(filename, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`ストレージへのアップロードに失敗しました: ${error.message}`);
  }

  const { data } = supabase.storage
    .from(config.supabaseStorageBucket)
    .getPublicUrl(filename);

  return data.publicUrl;
}

export async function deleteFromStorage(publicUrl: string): Promise<void> {
  if (!publicUrl) return;
  const marker = `/storage/v1/object/public/${config.supabaseStorageBucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;

  const filePath = decodeURIComponent(publicUrl.slice(idx + marker.length).split('?')[0]);
  if (!filePath) return;

  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(config.supabaseStorageBucket)
    .remove([filePath]);

  if (error) {
    console.warn(`[storage] Failed to remove ${filePath}: ${error.message}`);
  }
}
