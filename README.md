# ShipAny Video Lite

> 💡 **提示**：如有更多精选 SaaS 模板与全栈项目需求，欢迎访问 [TplCode](https://www.tplcode.cc/) 获取更多开箱即用的开发模版。

A production-ready AI **Video** Generation SaaS built on **TanStack Start**
(React 19, Vite 8, Nitro, TypeScript), **Cloudflare Workers / D1**,
**Drizzle ORM**, **better-auth**, and **shadcn/ui v4**.

Homepage is a video-first hero generator (`VideoHeroGenerator`): text-to-video,
image-to-video, and reference-to-video with MiniMax / Seedance / Wan / Kling
and related models. Credits, payments, subscriptions, RBAC, admin, i18n, and
SEO are included.

> The repo still contains image routes (`/text-to-image`, `/tools/*`, etc.) from
> the shared image-lite lineage. Product landing and primary UX are video;
> treat image pages as secondary / legacy SEO surfaces unless you remove them.

---

## Quick Start

```bash
pnpm install
cp .env.example .env.development   # configure DATABASE_URL, AUTH_SECRET, etc.
pnpm db:push
pnpm rbac:init --admin-email=admin@example.com --admin-password=your-password
pnpm dev                           # http://localhost:3000
```

> Local env: `.env.development`. Minimal boot vars: `VITE_APP_URL`,
> `DATABASE_PROVIDER`, `DATABASE_URL`, `AUTH_SECRET`. Video / image provider
> keys: Admin → Settings.

---

## Core Features

### 1. AI Video Generation

- **Home hero generator** — text / image / reference modes, duration &
  resolution controls, prompt inspirations, showcase reuse.
- **Video models** (`src/config/ai-models.ts` → `VIDEO_MODELS`):

| Model               | Typical duration | Resolutions (catalog) |
| ------------------- | ---------------- | --------------------- |
| Seedance 2.5        | 4–30s            | 480P / 720P / 1080P   |
| Wan 3.0             | 5s               | 720P / 1080P          |
| MiniMax H3          | 5–15s            | 768P / 2K / 4K        |
| Kling 3.0 Turbo     | 5–10s            | 720P / 1080P          |
| Hailuo 2.3          | catalog defaults | catalog defaults      |
| Wan 2.7             | catalog defaults | catalog defaults      |
| Doubao Seedance 2.0 | catalog defaults | catalog defaults      |

Billing: `creditsPerSecond × duration × resolution multiplier`, rounded up to
10 (aligned with pixany-agent anchors for MiniMax H3 / Seedance 2.5).

- **My Creations** — task polling, preview, download.
- **Admin**: `ai-video-dashboard` (+ image dashboard still present for shared routes).

### 2. Multi-Provider & Rate Limiting

- Providers: APIMart, KIE, Fal.ai, Replicate.
- Cloudflare Durable Object `ProviderGenerateRateLimiter`.
- Upfront credit deduction, async poll / webhook, refund on failure / cancel.
- R2 / S3 for outputs (required on Workers). Use `/api/storage/upload-media` for
  reference frames so providers get public URLs.

### 3. SaaS Business Engine

Credits, Waffo / Creem / Stripe / PayPal / Alipay / WeChat Pay, better-auth,
RBAC, Paraglide en/zh, CMS, analytics, announcements, SEO (`llms.txt`, sitemap).

---

## Tech Stack

TanStack Start + Query / Form / Table · Tailwind 4 + shadcn/ui · Drizzle ·
Cloudflare Workers + DO + D1 · better-auth · Paraglide JS 2.x

---

## Project Structure

```
src/
├── config/ai-models.ts          # IMAGE_MODELS + VIDEO_MODELS
├── components/sites/video-lite/ # VideoHeroGenerator, showcase, FAQ…
├── routes/
│   ├── index.tsx                # Video landing + hero generator
│   ├── my-creations.tsx · pricing.tsx · models/ · blog/
│   ├── text-to-image.tsx …      # Secondary image surfaces (legacy)
│   ├── admin/                   # ai-video-dashboard + ai-image-dashboard
│   └── api/ai/ · api/storage/
├── modules/ai/ · modules/creations/
└── durable-objects/             # ProviderGenerateRateLimiter
```

---

## Commands

| Command            | Description                 |
| ------------------ | --------------------------- |
| `pnpm dev`         | Dev server (port 3000)      |
| `pnpm build`       | Production Node build       |
| `pnpm start`       | Run production server       |
| `pnpm cf:build`    | Cloudflare Workers bundle   |
| `pnpm cf:deploy`   | Deploy to Cloudflare        |
| `pnpm db:push`     | Push schema (dev)           |
| `pnpm db:generate` | Generate migrations         |
| `pnpm rbac:init`   | Seed roles / optional admin |
| `pnpm test`        | Vitest                      |

---

## Environment Variables

```env
VITE_APP_URL=http://localhost:3000
VITE_APP_NAME=AI Video Lite
VITE_DEFAULT_LOCALE=en
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:data/local.db
AUTH_SECRET=generate-with-openssl-rand-base64-32
```

---

## License

Proprietary. All rights reserved.

**ShipAny** — [shipany.ai](https://shipany.ai)

## 更多模板

如需探索更多高品质的 SaaS 出海模板与全栈开发脚手架，欢迎访问 [TplCode 模板中心](https://www.tplcode.cc/) 获取最新资源与支持。
