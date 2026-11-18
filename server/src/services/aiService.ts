import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { config } from '../config.js';

export interface PanelPlan {
  panelNumber: 1 | 2 | 3 | 4;
  scene: string;
  dialogue: string;
}

export interface ComicPlan {
  title: string;
  scenario: string;
  panels: PanelPlan[];
}

export interface CharacterContext {
  name: string;
  profile: string;
  imageUrl: string;
}

export interface GeneratedImageResult {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = msg.includes('503') || msg.includes('UNAVAILABLE');
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      console.warn(`[aiService] Temporary 503 error, retrying (${attempt + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw lastError;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const chars = Array.from(text.replace(/\r?\n/g, ' '));
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i += maxCharsPerLine) {
    lines.push(chars.slice(i, i + maxCharsPerLine).join(''));
    if (lines.length >= maxLines) break;
  }
  if (chars.length > maxCharsPerLine * maxLines && lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.slice(0, Math.max(0, last.length - 1)) + '…';
  }
  return lines;
}

function renderVerticalFourPanelSvg(
  characterName: string,
  plan: ComicPlan
): string {
  const width = 600;
  const headerHeight = 96;
  const panelWidth = 520;
  const panelHeight = 320;
  const panelGap = 24;
  const sideMargin = (width - panelWidth) / 2;
  const totalHeight = headerHeight + 4 * panelHeight + 4 * panelGap + 32;

  const kishuLabels = ['起', '承', '転', '結'];
  const panelColors = ['#f8fafc', '#f0f9ff', '#fefce8', '#fdf2f8'];

  const panelsSvg = plan.panels
    .map((panel, idx) => {
      const y = headerHeight + idx * (panelHeight + panelGap);
      const sceneLines = wrapLines(panel.scene, 28, 3);
      const dialogueLines = wrapLines(panel.dialogue, 22, 3);

      const sceneText = sceneLines
        .map(
          (line, lineIdx) =>
            `<text x="${sideMargin + 24}" y="${y + 78 + lineIdx * 22}" font-size="15" fill="#334155" font-family="sans-serif">${escapeXml(line)}</text>`
        )
        .join('\n');

      const dialogueText = dialogueLines
        .map(
          (line, lineIdx) =>
            `<text x="${sideMargin + 44}" y="${y + 216 + lineIdx * 24}" font-size="16" font-weight="600" fill="#0f172a" font-family="sans-serif">${escapeXml(line)}</text>`
        )
        .join('\n');

      return `
  <g>
    <rect x="${sideMargin}" y="${y}" width="${panelWidth}" height="${panelHeight}" rx="8" fill="${panelColors[idx % 4]}" stroke="#0f172a" stroke-width="3" />
    <rect x="${sideMargin + 14}" y="${y + 14}" width="64" height="28" rx="14" fill="#0f172a" />
    <text x="${sideMargin + 46}" y="${y + 33}" text-anchor="middle" font-size="13" font-weight="700" fill="#ffffff" font-family="sans-serif">${panel.panelNumber}コマ (${kishuLabels[idx]})</text>
    <text x="${sideMargin + 92}" y="${y + 33}" font-size="13" fill="#64748b" font-family="sans-serif">登場: ${escapeXml(characterName)}</text>
    ${sceneText}
    <rect x="${sideMargin + 24}" y="${y + 180}" width="${panelWidth - 48}" height="114" rx="16" fill="#ffffff" stroke="#0f172a" stroke-width="2" />
    ${dialogueText}
  </g>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">
  <rect width="${width}" height="${totalHeight}" fill="#ffffff" />
  <text x="${width / 2}" y="44" text-anchor="middle" font-size="24" font-weight="800" fill="#0f172a" font-family="sans-serif">${escapeXml(plan.title)}</text>
  <text x="${width / 2}" y="70" text-anchor="middle" font-size="13" fill="#64748b" font-family="sans-serif">主人公: ${escapeXml(characterName)}（モック生成画像）</text>
  ${panelsSvg}
</svg>`;
}

export async function generateComicPlan(
  character: CharacterContext,
  synopsis: string
): Promise<ComicPlan> {
  if (config.aiProvider === 'gemini') {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY が設定されていません。');
    }

    const startedAt = Date.now();
    console.log(`[aiService] generateComicPlan start (model=${config.geminiTextModel})`);

    const ai = new GoogleGenAI({
      apiKey: config.geminiApiKey,
      httpOptions: { timeout: 45000 },
    });
    const thinkingLevel = config.geminiTextModel.includes('lite')
      ? ThinkingLevel.MINIMAL
      : ThinkingLevel.LOW;
    const prompt = [
      'あなたは日本の4コマ漫画（起・承・転・結）の構成作家です。',
      '以下の主人公キャラクターとあらすじをもとに、楽しくテンポの良い4コマ漫画のタイトル・全体シナリオ・1〜4コマそれぞれのシーン描写とセリフを作成してください。',
      '',
      `【主人公キャラクター名】${character.name}`,
      `【キャラクタープロフィール】${character.profile}`,
      `【あらすじ】${synopsis.trim()}`,
      '',
      '出力は日本語で、各コマのセリフは吹き出しに収まるよう簡潔にしてください。',
    ].join('\n');

    const response = await withRetry(
      () =>
        ai.models.generateContent({
          model: config.geminiTextModel,
          contents: prompt,
          config: {
            thinkingConfig: {
              thinkingLevel,
            },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                scenario: { type: Type.STRING },
                panels: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      panelNumber: { type: Type.INTEGER },
                      scene: { type: Type.STRING },
                      dialogue: { type: Type.STRING },
                    },
                    required: ['panelNumber', 'scene', 'dialogue'],
                  },
                },
              },
              required: ['title', 'scenario', 'panels'],
            },
          },
        }),
      1
    );

    console.log(`[aiService] generateComicPlan done (${Date.now() - startedAt}ms)`);

    const text = response.text;
    if (!text) {
      throw new Error('Gemini API から構成案の応答を取得できませんでした。');
    }

    const parsed = JSON.parse(text) as ComicPlan;
    if (!Array.isArray(parsed.panels) || parsed.panels.length !== 4) {
      throw new Error('4コマ分の構成案を正しく生成できませんでした。再試行してください。');
    }

    return {
      title: parsed.title,
      scenario: parsed.scenario,
      panels: parsed.panels.map((p, idx) => ({
        panelNumber: (idx + 1) as 1 | 2 | 3 | 4,
        scene: p.scene,
        dialogue: p.dialogue,
      })),
    };
  }

  // Mock implementation
  const shortSynopsis = synopsis.trim().slice(0, 40);
  return {
    title: `${character.name}の日常：${shortSynopsis}${synopsis.trim().length > 40 ? '…' : ''}`,
    scenario: `主人公「${character.name}」が「${synopsis.trim()}」という出来事に直面し、最後に思わぬオチを迎える4コマ漫画です。`,
    panels: [
      {
        panelNumber: 1,
        scene: `${character.name}がいつものように過ごしているところに、今回の出来事（${shortSynopsis}）が始まる。`,
        dialogue: `「よし、今日も気合を入れていくぞ！」`,
      },
      {
        panelNumber: 2,
        scene: `張り切って行動してみたものの、少しずつ予想外の方向に話が進み始める。`,
        dialogue: `「あれ？ なんだか思っていたのと違うような…？」`,
      },
      {
        panelNumber: 3,
        scene: `予想外のハプニングが発生し、${character.name}は思わず慌ててしまう。`,
        dialogue: `「ええっ！？ そっちに転がるの！？」`,
      },
      {
        panelNumber: 4,
        scene: `結局、マイペースな${character.name}らしいオチに落ち着いてほっこり終わる。`,
        dialogue: `「ま、結果オーライってことで！」`,
      },
    ],
  };
}

export async function generateComicImage(
  character: CharacterContext,
  plan: ComicPlan
): Promise<GeneratedImageResult> {
  if (config.aiProvider === 'gemini') {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY が設定されていません。');
    }

    const imageRes = await fetch(character.imageUrl);
    if (!imageRes.ok) {
      throw new Error('キャラクター画像の取得に失敗しました。');
    }
    const arrayBuffer = await imageRes.arrayBuffer();
    const charBase64 = Buffer.from(arrayBuffer).toString('base64');
    const charMimeType = imageRes.headers.get('content-type') || 'image/png';

    const panelPrompt = plan.panels
      .map(
        (p) =>
          `${p.panelNumber}コマ目: シーン「${p.scene}」 / セリフ「${p.dialogue}」`
      )
      .join('\n');

    const prompt = [
      '添付のキャラクター画像を主人公として、上から順番に1コマ目・2コマ目・3コマ目・4コマ目が縦1列に並んだ4コマ漫画を1枚の縦長画像として描いてください。',
      '全4コマを通じて、主人公の見た目・服装・雰囲気を一貫させてください。',
      '各コマの吹き出しは、横長の楕円形または横長の角丸長方形（wide horizontal speech bubble）で描いてください。',
      '吹き出し内の日本語セリフは、Web漫画や横書き書籍と同じ水平方向の横書き（左から右へ文字を並べ、改行は上から下へ進むレイアウト）で描いてください。',
      'Important layout rule: Every speech bubble must be horizontally wide and contain horizontal left-to-right Japanese text only (no vertical tategaki text).',
      '台本（各コマのセリフ）に記載された文字のみを描画し、擬音語・擬態語・効果音・描き文字などの追加テキストは入れないでください。',
      '',
      `【タイトル】${plan.title}`,
      `【主人公】${character.name}（${character.profile}）`,
      '【各コマの内容】',
      panelPrompt,
    ].join('\n');

    const startedAt = Date.now();
    console.log(`[aiService] generateComicImage start (model=${config.geminiImageModel})`);

    const ai = new GoogleGenAI({
      apiKey: config.geminiApiKey,
      httpOptions: { timeout: 90000 },
    });
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: config.geminiImageModel,
        contents: [
          {
            inlineData: {
              data: charBase64,
              mimeType: charMimeType,
            },
          },
          prompt,
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            imageSize: '1K',
          },
        },
      })
    );

    console.log(`[aiService] generateComicImage done (${Date.now() - startedAt}ms)`);

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((part) => part.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      throw new Error('Gemini API から画像データを取得できませんでした。');
    }

    const mimeType = imagePart.inlineData.mimeType || 'image/png';
    const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';

    return {
      buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
      mimeType,
      extension,
    };
  }

  const svg = renderVerticalFourPanelSvg(character.name, plan);
  return {
    buffer: Buffer.from(svg, 'utf-8'),
    mimeType: 'image/svg+xml',
    extension: 'svg',
  };
}
