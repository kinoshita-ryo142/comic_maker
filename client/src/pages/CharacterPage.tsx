import { useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api/client';
import { TEXTS } from '../constants/texts';
import type { Character } from '../types';

interface CharacterPageProps {
  character: Character | null;
  onSaved: (character: Character) => void;
}

export function CharacterPage({ character, onSaved }: CharacterPageProps) {
  const [name, setName] = useState(character?.name ?? '');
  const [profile, setProfile] = useState(character?.profile ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(character?.image_url ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      setPreviewUrl(URL.createObjectURL(selected));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('profile', profile);
      if (file) {
        formData.append('image', file);
      }
      const { character: saved } = await api.character.save(formData);
      onSaved(saved);
      setPreviewUrl(saved.image_url);
      setFile(null);
      setSuccess(TEXTS.character.savedMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{TEXTS.character.title}</h2>
      <p className="muted">{TEXTS.character.subtitle}</p>
      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="char-name">{TEXTS.character.nameLabel}</label>
          <input
            id="char-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={TEXTS.character.namePlaceholder}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="char-profile">{TEXTS.character.profileLabel}</label>
          <textarea
            id="char-profile"
            rows={4}
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder={TEXTS.character.profilePlaceholder}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="char-image">{TEXTS.character.imageLabel}</label>
          <input
            id="char-image"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            required={!character}
          />
        </div>

        {previewUrl && (
          <div style={{ marginBottom: '1rem' }}>
            <img
              src={previewUrl}
              alt="キャラクタープレビュー"
              style={{
                maxWidth: 200,
                maxHeight: 200,
                borderRadius: 8,
                border: '1px solid var(--border)',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? TEXTS.character.savingButton : TEXTS.character.saveButton}
        </button>
      </form>
    </div>
  );
}
