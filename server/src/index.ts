import app from './app.js';
import { config } from './config.js';
import { ensureAdminUser } from './db/supabase.js';

async function start() {
  await ensureAdminUser();
  app.listen(config.port, () => {
    console.log(
      `[server] Running on http://localhost:${config.port} (AI_PROVIDER=${config.aiProvider})`
    );
  });
}

start();
