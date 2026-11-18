# 4コマ漫画メーカー (最小構成プロトタイプ)

Vite (React + TypeScript) + Express (TypeScript) + Supabase を使用した、ブラウザ上で操作できる4コマ漫画作成アプリケーションです。

## 主な機能
1. **ログイン・管理者によるユーザー発行**
   - 管理者アカウントでログインし、「ユーザー管理（管理者）」タブから利用者用のID/パスワードを発行・削除できます。
2. **主人公キャラクター登録（1人）**
   - 名前、プロフィール（性格・口調・見た目など）、キャラクター画像を登録できます。
3. **4コマ漫画作成フロー**
   - あらすじを入力 → シナリオと4コマそれぞれの構成案（シーン・セリフ）を生成
   - 画面上で構成案の微調整（編集）や再生成が可能
   - 縦1列の4コマ漫画を1枚の画像として生成・保存（現在はモック生成モード）

## セットアップ手順

### 1. Supabase の準備
1. Supabase ダッシュボードの **SQL Editor** を開き、`supabase/schema.sql` の内容を実行してテーブルを作成します。
2. Supabase ダッシュボードの **Storage** から `comic-assets` という名前のバケットを作成し、**Public bucket** を ON にします。

### 2. 環境変数 (`.env`) の設定
`.env.example` をコピーして `.env` を作成し、Supabase の URL と Service Role Key 等を設定してください。

```bash
cp .env.example .env
```

- `SUPABASE_URL`: Supabase Project Settings -> API -> Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Project Settings -> API -> `service_role` secret key
- `ADMIN_USERNAME` / `ADMIN_PASSWORD`: 初回サーバー起動時に自動作成される管理者アカウント

### 3. 依存パッケージのインストールと起動

```bash
npm run install:all
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:3001

## 文言・UIのカスタマイズ
- 画面上のテキストやラベルは `client/src/constants/texts.ts` にまとめてあります。
- AI生成処理は `server/src/services/aiService.ts` に切り出しているため、後から Gemini API 等へ差し替えられます。
