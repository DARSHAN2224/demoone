import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading .env from multiple candidate locations
const candidates = [
  // Repo root: FoodApp/.env (three levels up from src/config)
  path.resolve(__dirname, '../../../.env'),
  // Backend root: FoodBackend/.env (two levels up)
  path.resolve(__dirname, '../../.env'),
  // Process CWD fallback
  path.resolve(process.cwd(), '.env')
];

for (const p of candidates) {
  try {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      // Optional: uncomment for debugging
      // console.log('[ENV] Loaded .env from', p);
      break;
    }
  } catch {}
}
