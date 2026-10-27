import fs from 'node:fs';

try {
  fs.mkdirSync('data', { recursive: true });
  if (!fs.existsSync('src/config/db/schema.ts')) {
    await import('./db-setup.mjs');
  }
} catch (err) {
  console.warn('Postinstall warning:', err.message);
}
