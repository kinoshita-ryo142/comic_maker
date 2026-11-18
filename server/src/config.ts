import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from workspace root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin1234',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'comic-assets',
  aiProvider: (process.env.AI_PROVIDER || 'mock') as 'mock' | 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiTextModel: process.env.GEMINI_TEXT_MODEL || 'gemini-3.1-flash-lite',
  geminiImageModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-nano-banana-2.1',
};
