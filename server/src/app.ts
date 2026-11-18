import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { ensureAdminUser } from './db/supabase.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { characterRouter } from './routes/character.js';
import { comicsRouter } from './routes/comics.js';

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

let adminInitPromise: Promise<void> | null = null;
app.use(async (_req, _res, next) => {
  if (!adminInitPromise) {
    adminInitPromise = ensureAdminUser().catch((err) => {
      console.warn('[init] ensureAdminUser failed:', err);
      adminInitPromise = null;
    });
  }
  await adminInitPromise;
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, aiProvider: config.aiProvider });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/character', characterRouter);
app.use('/api/comics', comicsRouter);

export default app;
