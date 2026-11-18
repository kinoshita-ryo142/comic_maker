import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { TEXTS } from '../constants/texts';
import type { Character, Comic, ComicPlan } from '../types';

interface ComicStudioPageProps {
  character: Character | null;
  onGoToCharacter: () => void;
}

export function ComicStudioPage({ character, onGoToCharacter }: ComicStudioPageProps) {
  const [synopsis, setSynopsis] = useState('');
  const [plan, setPlan] = useState<ComicPlan | null>(null);
  const [latestComic, setLatestComic] = useState<Comic | null>(null);
  const [history, setHistory] = useState<Comic[]>([]);
  const [planning, setPlanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    try {
      const { comics } = await api.comics.list();
      setHistory(comics);
    } catch {
      // ignore initial history load failure
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  async function handleGeneratePlan(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setPlanning(true);
    setLatestComic(null);
    try {
      const { plan: createdPlan } = await api.comics.plan(synopsis);
      setPlan(createdPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : '構成案の生成に失敗しました。');
    } finally {
      setPlanning(false);
    }
  }

  async function handleGenerateImage() {
    if (!plan) return;
    setError(null);
    setGenerating(true);
    try {
      const { comic } = await api.comics.generate(synopsis, plan);
      setLatestComic(comic);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : '4コマ画像の生成に失敗しました。');
    } finally {
      setGenerating(false);
    }
  }

  function updatePanel(index: number, field: 'scene' | 'dialogue', value: string) {
    if (!plan) return;
    const nextPanels = plan.panels.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    );
    setPlan({ ...plan, panels: nextPanels });
  }

  async function handleDownload(comic: Comic) {
    const ext = comic.image_url.split('.').pop()?.split('?')[0] || 'png';
    const filename = `${comic.title}.${ext}`;
    try {
      const res = await fetch(comic.image_url);
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(comic.image_url, '_blank', 'noreferrer');
    }
  }

  async function handleDeleteComic(comic: Comic) {
    if (!window.confirm(`「${comic.title}」を削除しますか？`)) return;
    setError(null);
    setDeletingId(comic.id);
    try {
      await api.comics.delete(comic.id);
      if (latestComic?.id === comic.id) {
        setLatestComic(null);
      }
      setHistory((prev) => prev.filter((item) => item.id !== comic.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '作品の削除に失敗しました。');
    } finally {
      setDeletingId(null);
    }
  }

  if (!character) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{TEXTS.studio.title}</h2>
        <div className="alert-error">{TEXTS.studio.noCharacterWarning}</div>
        <button type="button" className="btn btn-primary" onClick={onGoToCharacter}>
          {TEXTS.studio.goToCharacterButton}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{TEXTS.studio.title}</h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid var(--border)',
            marginBottom: '1rem',
          }}
        >
          <img
            src={character.image_url}
            alt={character.name}
            style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }}
          />
          <div>
            <strong>主人公: {character.name}</strong>
            <div className="muted">{character.profile}</div>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleGeneratePlan}>
          <div className="field">
            <label htmlFor="synopsis">{TEXTS.studio.synopsisLabel}</label>
            <textarea
              id="synopsis"
              rows={3}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder={TEXTS.studio.synopsisPlaceholder}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={planning || generating}>
            {planning ? TEXTS.studio.generatingPlanButton : TEXTS.studio.generatePlanButton}
          </button>
        </form>
      </div>

      {plan && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{TEXTS.studio.planSectionTitle}</h3>

          <div className="field">
            <label htmlFor="plan-title">{TEXTS.studio.planTitleLabel}</label>
            <input
              id="plan-title"
              type="text"
              value={plan.title}
              onChange={(e) => setPlan({ ...plan, title: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="plan-scenario">{TEXTS.studio.planScenarioLabel}</label>
            <textarea
              id="plan-scenario"
              rows={2}
              value={plan.scenario}
              onChange={(e) => setPlan({ ...plan, scenario: e.target.value })}
            />
          </div>

          <div className="panel-grid">
            {plan.panels.map((panel, idx) => (
              <div key={panel.panelNumber} className="panel-card">
                <strong>{panel.panelNumber}コマ目</strong>
                <div className="field" style={{ marginTop: '0.5rem' }}>
                  <label>シーン描写</label>
                  <textarea
                    rows={2}
                    value={panel.scene}
                    onChange={(e) => updatePanel(idx, 'scene', e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>セリフ</label>
                  <input
                    type="text"
                    value={panel.dialogue}
                    onChange={(e) => updatePanel(idx, 'dialogue', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={() => handleGeneratePlan()}
              disabled={planning || generating}
            >
              {TEXTS.studio.regeneratePlanButton}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerateImage}
              disabled={planning || generating}
            >
              {generating ? TEXTS.studio.generatingImageButton : TEXTS.studio.generateImageButton}
            </button>
          </div>
        </div>
      )}

      {latestComic && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{TEXTS.studio.resultTitle}</h3>
          <p>
            <strong>{latestComic.title}</strong>
          </p>
          <img
            src={latestComic.image_url}
            alt={latestComic.title}
            className="comic-preview"
          />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleDownload(latestComic)}
            >
              {TEXTS.studio.downloadButton}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => handleDeleteComic(latestComic)}
              disabled={deletingId === latestComic.id}
            >
              {deletingId === latestComic.id
                ? TEXTS.studio.deletingButton
                : TEXTS.studio.deleteButton}
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{TEXTS.studio.historyTitle}</h3>
          <div className="panel-grid">
            {history.map((item) => (
              <div key={item.id} className="panel-card">
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{item.title}</div>
                <div className="muted" style={{ marginBottom: '0.75rem' }}>
                  {new Date(item.created_at).toLocaleString('ja-JP')}
                </div>
                <img
                  src={item.image_url}
                  alt={item.title}
                  style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleDownload(item)}
                  >
                    {TEXTS.studio.downloadButton}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDeleteComic(item)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id
                      ? TEXTS.studio.deletingButton
                      : TEXTS.studio.deleteButton}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
