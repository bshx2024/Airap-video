import { readFileSync } from 'node:fs';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

import { loadEnvFiles } from './src/lib/env';

// Populate process.env from .env.local / .env.{NODE_ENV} / .env for the
// dev server and build process (Vite only exposes VITE_* via import.meta.env;
// server code reads secrets from process.env). In production, env comes
// from the actual host/container environment.
loadEnvFiles();

// Cloudflare Workers build (pnpm cf:build / cf:deploy): stub out unused DB
// drivers — mysql2 crashes workerd at module evaluation (node:net,
// node:process requires); postgres.js runs fine under nodejs_compat but is
// dead weight when the backend is D1. Which driver the bundle keeps follows
// wrangler.jsonc `vars.DATABASE_PROVIDER` (the runtime truth on workerd) —
// d1 stubs both, postgresql keeps postgres.js for the Hyperdrive binding.
const isCloudflareBuild = (process.env.NITRO_PRESET || '').includes(
  'cloudflare'
);
const driverStub = new URL('./src/core/db/driver-stub.ts', import.meta.url)
  .pathname;

// Prefer wrangler.jsonc over the build-time env, which can be polluted by
// .env.local (e.g. DATABASE_PROVIDER=sqlite for local dev).
function readWranglerVars(): Record<string, string> {
  try {
    const raw = readFileSync(
      new URL('./wrangler.jsonc', import.meta.url),
      'utf8'
    )
      // JSONC comments: a commented-out `// "VITE_APP_URL": "http://localhost…"`
      // must not be read as a live var. Only whole-line `//` comments are
      // stripped so `https://` inside values survives.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const varsBlock = raw.match(/"vars"\s*:\s*\{([\s\S]*?)\n\s*\}/);
    if (!varsBlock) return {};
    const out: Record<string, string> = {};
    for (const m of varsBlock[1].matchAll(/"([^"]+)"\s*:\s*"([^"]*)"/g)) {
      out[m[1]] = m[2];
    }
    return out;
  } catch {
    return {};
  }
}

function workersDbProvider(): string {
  return (
    readWranglerVars().DATABASE_PROVIDER ||
    process.env.DATABASE_PROVIDER ||
    'd1'
  );
}

// Cloudflare builds often have no .env.production; wrangler.jsonc `vars`
// (VITE_APP_URL, …) are the source of truth — inject them so Vite inlines
// into import.meta.env and payment return URLs are not baked as localhost.
const wranglerVars = isCloudflareBuild ? readWranglerVars() : {};
if (isCloudflareBuild) {
  for (const [key, value] of Object.entries(wranglerVars)) {
    if (!key.startsWith('VITE_') && !key.startsWith('NEXT_PUBLIC_')) continue;
    if (!value) continue;
    process.env[key] = value;
  }
}

const workersDb = isCloudflareBuild ? workersDbProvider() : '';
const keepPostgres = workersDb === 'postgresql' || workersDb === 'postgres';

export default defineConfig({
  server: {
    port: 3000,
    // Cloud sandboxes (ShipAny Code / e2b) proxy the dev server through a
    // per-sandbox subdomain; without this Vite's host check blocks the
    // preview with "Blocked request. This host is not allowed."
    allowedHosts: true,
  },
  resolve: {
    tsconfigPaths: true,
    alias: isCloudflareBuild
      ? {
          mysql2: driverStub,
          ...(keepPostgres ? {} : { postgres: driverStub }),
        }
      : {},
  },
  plugins: [
    // MDX must run before the react plugin so JSX in compiled MDX gets transformed.
    // .claude/ holds agent skills served verbatim (`?raw`) — never compile them.
    {
      enforce: 'pre',
      ...mdx({
        providerImportSource: '@mdx-js/react',
        exclude: /\/\.claude\//,
      }),
    },
    tailwindcss(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      outputStructure: 'message-modules',
      cookieName: 'PARAGLIDE_LOCALE',
      strategy: ['url', 'cookie', 'baseLocale'],
      urlPatterns: [
        // API endpoints are never locale-prefixed.
        {
          pattern: '/api/:path(.*)?',
          localized: [
            ['en', '/api/:path(.*)?'],
            ['zh', '/api/:path(.*)?'],
          ],
        },
        // Bare locale homes match without a trailing-slash redirect.
        {
          pattern: '/',
          localized: [
            ['zh', '/zh'],
            ['en', '/'],
          ],
        },
        // "as-needed" prefix: zh under /zh, en (default) unprefixed.
        {
          pattern: '/:path(.*)?',
          localized: [
            ['zh', '/zh/:path(.*)?'],
            ['en', '/:path(.*)?'],
          ],
        },
      ],
    }),
    tanstackStart({
      srcDirectory: 'src',
    }),
    viteReact(),
    nitro({
      plugins: [
        'src/plugins/ai-storage-migration.ts',
        'src/plugins/billing-reconcile.ts',
      ],
    }),
  ],
});
